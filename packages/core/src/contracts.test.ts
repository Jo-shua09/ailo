import { describe, expect, it } from "vitest";
import { Payment, PaymentRequest, SecondLookResult, SpendPolicy } from "./contracts";

describe("PaymentRequest", () => {
  const ok = { payee_id: "payee_mama_ngozi", amount_kobo: 850000, category: "groceries", reason: "Restock rice" };

  it("accepts a valid request", () => {
    expect(PaymentRequest.parse(ok)).toEqual(ok);
  });

  it("rejects float, zero or negative kobo and over-long reasons", () => {
    expect(PaymentRequest.safeParse({ ...ok, amount_kobo: 8500.5 }).success).toBe(false);
    expect(PaymentRequest.safeParse({ ...ok, amount_kobo: 0 }).success).toBe(false);
    expect(PaymentRequest.safeParse({ ...ok, amount_kobo: -1 }).success).toBe(false);
    expect(PaymentRequest.safeParse({ ...ok, reason: "x".repeat(501) }).success).toBe(false);
  });
});

describe("Payment", () => {
  it("accepts the frontend handoff mock payment", () => {
    const mock = {
      id: "pay_01", agent_id: "agt_shop", payee_id: "payee_mama_ngozi", payee_name: "Mama Ngozi Stores",
      amount_kobo: 850000, category: "groceries", reason: "Restock rice for the shop",
      verdict: "allow", decided_by: "rules", status: "settled",
      kora_reference: "AL-pay_01", created_at: "2026-10-24T00:12:00Z",
    };
    expect(Payment.safeParse(mock).success).toBe(true);
  });
});

describe("SpendPolicy", () => {
  it("accepts a Stripe spending_controls-shaped policy in kobo", () => {
    const policy = {
      allowed_categories: ["groceries"],
      allowed_payees: ["payee_mama_ngozi"],
      spending_limits: [{ amount_kobo: 5_000_000, interval: "weekly" }],
      nod_above_kobo: 1_000_000,
      nod_rolling_payee_24h_kobo: 1_000_000,
      expires_at: "2026-10-31T00:00:00Z",
    };
    expect(SpendPolicy.safeParse(policy).success).toBe(true);
  });
});

describe("SecondLookResult", () => {
  it("has no way to approve: only ok, escalate or block", () => {
    expect(SecondLookResult.safeParse({ verdict: "approve", reason: "x" }).success).toBe(false);
    expect(SecondLookResult.safeParse({ verdict: "escalate", reason: "item mismatch" }).success).toBe(true);
  });
});

describe("PaymentRequest page_text (for Second Look)", () => {
  const ok = { payee_id: "payee_mama_ngozi", amount_kobo: 850000, category: "groceries", reason: "Restock rice" };

  it("is optional, and carries the page the agent acted on when given", () => {
    expect(PaymentRequest.safeParse(ok).success).toBe(true);
    expect(PaymentRequest.parse({ ...ok, page_text: "Mama Gold Rice 50kg" }).page_text).toBe("Mama Gold Rice 50kg");
  });

  it("caps its size so a huge page cannot be sent to the model", () => {
    expect(PaymentRequest.safeParse({ ...ok, page_text: "x".repeat(20_001) }).success).toBe(false);
  });
});
