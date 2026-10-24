import { afterEach, describe, expect, it, vi } from "vitest";
import { KoraRail } from "./kora";

// Responses copied from Kora's official API collection (pau/ailo-planning/research/kora-verified.md).
const BASE = "https://api.korapay.com/merchant/api/v1";
const rail = new KoraRail(BASE, "sk_test_x");

function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
afterEach(() => vi.unstubAllGlobals());

describe("KoraRail.query (Verify Payout Transaction)", () => {
  it("calls GET /transactions/:reference with the secret key and maps a success", async () => {
    const fetchMock = stubFetch(200, {
      status: true, message: "Transaction retrieved successfully",
      data: { reference: "AL-pay_1", status: "success", amount: "100.00", fee: 10, currency: "NGN" },
    });

    const result = await rail.query("AL-pay_1");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${BASE}/transactions/AL-pay_1`);
    expect(init.method ?? "GET").toBe("GET");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk_test_x");
    expect(result).toMatchObject({ status: "settled", amount_kobo: 10000 });
  });

  it("maps processing and failed", async () => {
    stubFetch(200, { status: true, data: { reference: "AL-pay_2", status: "processing", amount: 1000 } });
    expect((await rail.query("AL-pay_2")).status).toBe("submitted");
    stubFetch(200, { status: true, data: { reference: "AL-pay_3", status: "failed", amount: 1000 } });
    expect((await rail.query("AL-pay_3")).status).toBe("failed");
  });

  it("treats Kora's 404 Transaction not found as unknown, never as failed", async () => {
    stubFetch(404, { status: false, message: "Transaction not found", data: null });
    expect((await rail.query("AL-pay_missing")).status).toBe("unknown");
  });
});

describe("KoraRail.payout", () => {
  const base = { payment_id: "pay_1", reference: "AL-pay_1", amount_kobo: 10000, payee_id: "payee_x", payee_name: "X" };

  it("refuses a payout with no destination account and never calls Kora", async () => {
    const fetchMock = stubFetch(200, {});
    const result = await rail.payout(base);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ status: "failed", error: expect.stringContaining("payout account") });
  });

  it("sends the payee's bank details and customer.email", async () => {
    const fetchMock = stubFetch(200, {
      status: true, data: { amount: "100.00", status: "processing", reference: "AL-pay_1", currency: "NGN" },
    });
    await rail.payout({ ...base, destination_bank_code: "033", destination_account_number: "0000000000", payee_email: "x@example.com" });
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.destination.bank_account).toEqual({ bank: "033", account: "0000000000" });
    expect(body.destination.customer.email).toBe("x@example.com");
  });
});
