import { describe, expect, it, vi } from "vitest";
import { SimulatedRail } from "./simulated";
import { KoraRail } from "./kora";

describe("SimulatedRail", () => {
  it("payout returns settled with fixed reference and is_simulated: true", async () => {
    const rail = new SimulatedRail();
    const result = await rail.payout({
      payment_id: "pay_01",
      reference: "AL-pay_01",
      amount_kobo: 850000,
      payee_id: "payee_mama",
      payee_name: "Mama Ngozi Stores",
    });

    expect(result.reference).toBe("AL-pay_01");
    expect(result.status).toBe("settled");
    expect(result.is_simulated).toBe(true);
    expect(result.amount_kobo).toBe(850000);

    const queried = await rail.query("AL-pay_01");
    expect(queried.status).toBe("settled");
    expect(queried.amount_kobo).toBe(850000);
  });

  it("handles unknown references cleanly", async () => {
    const rail = new SimulatedRail();
    const queried = await rail.query("AL-unknown");
    expect(queried.status).toBe("unknown");
  });
});

describe("KoraRail", () => {
  it("re-queries on 5xx or duplicate reference instead of generating a new reference", async () => {
    const originalFetch = globalThis.fetch;
    let queryCalled = false;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/transactions/disburse")) {
        return {
          ok: false,
          status: 500,
          json: async () => ({ status: false, message: "Duplicate Transaction Reference" }),
        };
      }
      if (url.includes("/transactions/query")) {
        queryCalled = true;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: true,
            data: {
              reference: "AL-pay_02",
              status: "success",
              amount: "8500.00",
            },
          }),
        };
      }
      return { ok: false, status: 404 };
    });

    try {
      const rail = new KoraRail("https://api.korapay.com/merchant/api/v1", "secret");
      const result = await rail.payout({
        payment_id: "pay_02",
        reference: "AL-pay_02",
        amount_kobo: 850000,
        payee_id: "payee_mama",
        payee_name: "Mama Ngozi Stores",
      });

      expect(queryCalled).toBe(true);
      expect(result.reference).toBe("AL-pay_02");
      expect(result.status).toBe("settled");
      expect(result.amount_kobo).toBe(850000);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
