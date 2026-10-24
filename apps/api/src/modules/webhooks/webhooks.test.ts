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

  it("verifies Kora's signature: HMAC-SHA256 of JSON.stringify(body.data), not the whole body", () => {
    const body = { event: "transfer.success", data: { reference: "AL-pay_01", status: "success" } };
    const koraSignature = createHmac("sha256", secretKey).update(JSON.stringify(body.data)).digest("hex");
    const wholeBodySignature = createHmac("sha256", secretKey).update(JSON.stringify(body)).digest("hex");

    expect(service.verifySignature(body.data, koraSignature, secretKey)).toBe(true);
    expect(service.verifySignature(body.data, wholeBodySignature, secretKey)).toBe(false);
    expect(service.verifySignature(body.data, "invalid_sig", secretKey)).toBe(false);
    expect(service.verifySignature(body.data, "", secretKey)).toBe(false);
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
