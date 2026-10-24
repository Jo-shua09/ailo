import { createHmac } from "node:crypto";
import { env } from "../../config/env";
import { AppError } from "../../shared/AppError";
import { eventsService } from "../events/events.service";
import { ledgerService } from "../ledger/ledger.service";
import { paymentsRepository } from "../payments/payments.repository";
import { getPayoutRail } from "../rails";
import { webhooksRepository, WebhooksRepository } from "./webhooks.repository";
import type { KoraWebhookPayload } from "./webhooks.dto";

export class WebhooksService {
  constructor(private repo: WebhooksRepository = webhooksRepository) {}

  verifySignature(
    rawBody: string | Buffer,
    signature: string,
    secret = env.KORA_SECRET_KEY,
    dataObject?: unknown
  ): boolean {
    if (!signature || !secret) return false;
    // 1. Raw body HMAC check (Ailo engine requirement)
    const computedRaw = createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    if (computedRaw.toLowerCase() === signature.toLowerCase()) return true;

    // 2. Data object HMAC check (Kora official documentation specification)
    if (dataObject !== undefined) {
      const computedData = createHmac("sha256", secret)
        .update(JSON.stringify(dataObject))
        .digest("hex");
      if (computedData.toLowerCase() === signature.toLowerCase()) return true;
    }

    return false;
  }

  async processWebhook(payload: KoraWebhookPayload): Promise<{ status: "processed" | "deduplicated" }> {
    const { event, data } = payload;
    const isNew = await this.repo.recordEvent(event, data.reference);
    if (!isNew) {
      return { status: "deduplicated" };
    }

    // Process re-query async per PRD 5.6
    this.reQueryAndReconcile(data.reference).catch((err) => {
      console.error(`Error reconciling webhook for reference ${data.reference}:`, err);
    });

    return { status: "processed" };
  }

  async reQueryAndReconcile(reference: string): Promise<void> {
    const rail = getPayoutRail();
    const queryResult = await rail.query(reference);

    const record = await paymentsRepository.findPaymentByReference(reference);
    if (!record) return;

    if (queryResult.status === "settled" && record.status !== "settled") {
      const updated = await paymentsRepository.updatePayment(
        record.id,
        { status: "settled" },
        [{ step: "payout", result: "pass", detail: "Kora webhook verified settlement" }]
      );
      await ledgerService.postHold(record.id);
      if (updated) eventsService.emitPaymentUpdated(updated);
    } else if (queryResult.status === "failed" && record.status !== "failed") {
      const updated = await paymentsRepository.updatePayment(
        record.id,
        { status: "failed" },
        [{ step: "payout", result: "fail", detail: "Kora webhook verified payout failure" }]
      );
      await ledgerService.releaseHold(record.id);
      if (updated) eventsService.emitPaymentUpdated(updated);
    }
  }
}

export const webhooksService = new WebhooksService();
