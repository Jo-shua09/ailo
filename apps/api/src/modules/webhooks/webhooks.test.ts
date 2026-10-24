import { beforeEach, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { resetMemoryDb } from "../../db/mongo";
import { WebhooksService } from "./webhooks.service";

describe("WebhooksService", () => {
  let service: WebhooksService;
  const secretKey = "test_kora_secret_key";

  beforeEach(() => {
    resetMemoryDb();
    service = new WebhooksService();
  });

  it("verifies HMAC-SHA256 signature on raw body", () => {
    const rawBody = JSON.stringify({ event: "charge.success", data: { reference: "AL-pay_01" } });
    const validSignature = createHmac("sha256", secretKey).update(rawBody).digest("hex");

    expect(service.verifySignature(rawBody, validSignature, secretKey)).toBe(true);
    expect(service.verifySignature(rawBody, "invalid_sig", secretKey)).toBe(false);
  });

  it("deduplicates multiple deliveries of the same webhook event", async () => {
    const payload = {
      event: "transfer.success",
      data: {
        reference: "AL-pay_dedupe",
        status: "success",
      },
    };

    const first = await service.processWebhook(payload);
    expect(first.status).toBe("processed");

    const second = await service.processWebhook(payload);
    expect(second.status).toBe("deduplicated");
  });
});
