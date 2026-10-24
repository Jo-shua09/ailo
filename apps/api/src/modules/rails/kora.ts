import { nairaToKobo } from "@ailo/core";
import { env } from "../../config/env";
import type { PayoutParams, PayoutRail, RailPayoutResult, RailQueryResult, RailStatus } from "./rails.interface";

export class KoraRail implements PayoutRail {
  private baseUrl: string;
  private secretKey: string;

  constructor(baseUrl?: string, secretKey?: string) {
    this.baseUrl = baseUrl ?? env.KORA_BASE_URL;
    this.secretKey = secretKey ?? env.KORA_SECRET_KEY;
  }

  /**
   * Translates Kora status string to standard RailStatus.
   */
  private mapKoraStatus(status: string | undefined): RailStatus {
    const s = String(status).toLowerCase();
    if (s === "success" || s === "successful" || s === "settled") return "settled";
    if (s === "pending" || s === "processing" || s === "submitted") return "submitted";
    if (s === "failed" || s === "reversed") return "failed";
    return "unknown";
  }

  async payout(params: PayoutParams): Promise<RailPayoutResult> {
    const notificationUrl = `${env.PUBLIC_BASE_URL}${env.KORA_WEBHOOK_PATH}`;
    const amountNaira = (params.amount_kobo / 100).toFixed(2);

    // Metadata rules: at most 5 keys, strictly no underscores in key names.
    const metadata = {
      paymentid: params.payment_id.slice(0, 32),
      payeeid: params.payee_id.slice(0, 32),
      rail: "kora",
    };

    const payload = {
      reference: params.reference,
      destination: {
        type: "bank_account",
        amount: Number(amountNaira),
        currency: "NGN",
        narration: params.narration ?? `Ailo: ${params.payment_id}`,
        bank_account: {
          bank: params.destination_bank_code ?? "044",
          account: params.destination_account_number ?? "0690000031",
        },
        customer: {
          name: params.payee_name,
        },
      },
      metadata,
      notification_url: notificationUrl,
    };

    try {
      const res = await fetch(`${this.baseUrl}/transactions/disburse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.secretKey}`,
        },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => null)) as any;

      if (!res.ok) {
        // If Kora reports Duplicate Transaction Reference or 5xx, re-query by reference!
        const msg = data?.message ?? "";
        if (res.status >= 500 || msg.toLowerCase().includes("duplicate")) {
          const queryResult = await this.query(params.reference);
          return {
            reference: params.reference,
            status: queryResult.status,
            amount_kobo: queryResult.amount_kobo ?? params.amount_kobo,
            raw_response: data ?? queryResult.raw_response,
          };
        }

        return {
          reference: params.reference,
          status: "failed",
          error: data?.message ?? `Kora error HTTP ${res.status}`,
          raw_response: data,
        };
      }

      const status = this.mapKoraStatus(data?.data?.status);
      return {
        reference: params.reference,
        status,
        amount_kobo: params.amount_kobo,
        raw_response: data,
      };
    } catch {
      // Network timeout / connection error: status is unknown, re-query!
      const queryResult = await this.query(params.reference);
      return {
        reference: params.reference,
        status: queryResult.status,
        amount_kobo: queryResult.amount_kobo ?? params.amount_kobo,
        raw_response: queryResult.raw_response,
      };
    }
  }

  async query(reference: string): Promise<RailQueryResult> {
    try {
      const res = await fetch(`${this.baseUrl}/transactions/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.secretKey}`,
        },
        body: JSON.stringify({ reference }),
      });

      if (!res.ok) {
        return {
          reference,
          status: "unknown",
          raw_response: await res.json().catch(() => null),
        };
      }

      const data = (await res.json()) as any;
      const txData = data?.data;
      const status = this.mapKoraStatus(txData?.status);

      let amountKobo: number | undefined;
      if (txData?.amount !== undefined) {
        try {
          amountKobo = nairaToKobo(txData.amount);
        } catch {
          amountKobo = undefined;
        }
      }

      return {
        reference,
        status,
        amount_kobo: amountKobo,
        raw_response: data,
      };
    } catch (err) {
      return {
        reference,
        status: "unknown",
        raw_response: { error: (err as Error).message },
      };
    }
  }
}

export const koraRail = new KoraRail();
