import { describe, expect, it } from "vitest";
import type { SpendPolicy } from "./contracts";
import { evaluatePolicy, type SpendContext } from "./policy";

const NOW = new Date("2026-10-24T09:00:00Z");

const policy: SpendPolicy = {
  allowed_categories: ["groceries", "stock"],
  allowed_payees: ["payee_mama_ngozi"],
  spending_limits: [
    { amount_kobo: 2_000_000, interval: "per_payment" },
    { amount_kobo: 5_000_000, interval: "weekly" },
  ],
  nod_above_kobo: 1_000_000,
  nod_rolling_payee_24h_kobo: 1_000_000,
  expires_at: "2026-10-31T00:00:00Z",
};

const quiet: SpendContext = { now: NOW, spent_today_kobo: 0, spent_this_week_kobo: 0, payee_spent_24h_kobo: 0 };
const pay = (over: Partial<{ payee_id: string; amount_kobo: number; category: string }> = {}) => ({
  payee_id: "payee_mama_ngozi", amount_kobo: 850_000, category: "groceries", ...over,
});
const codes = (r: ReturnType<typeof evaluatePolicy>) => r.reasons.map((x) => x.code);

describe("evaluatePolicy (Spec Gate rules)", () => {
  it("allows a normal payment inside every rule", () => {
    expect(evaluatePolicy(policy, pay(), quiet)).toEqual({ verdict: "allow", reasons: [] });
  });

  it("blocks a category the owner did not allow", () => {
    const r = evaluatePolicy(policy, pay({ category: "electronics" }), quiet);
    expect(r.verdict).toBe("block");
    expect(codes(r)).toContain("CATEGORY_NOT_ALLOWED");
  });

  it("matches categories case-insensitively", () => {
    expect(evaluatePolicy(policy, pay({ category: "Groceries" }), quiet).verdict).toBe("allow");
  });

  it("sends an unknown payee to the owner's Nod, never straight through", () => {
    const r = evaluatePolicy(policy, pay({ payee_id: "payee_stranger" }), quiet);
    expect(r.verdict).toBe("nod");
    expect(codes(r)).toEqual(["NEW_PAYEE"]);
  });

  it("blocks a single payment above the per-payment limit", () => {
    expect(codes(evaluatePolicy(policy, pay({ amount_kobo: 2_000_001 }), quiet))).toContain("PER_PAYMENT_LIMIT");
  });

  it("blocks when the weekly cap would be crossed, counting what was already spent", () => {
    const r = evaluatePolicy(policy, pay({ amount_kobo: 500_000 }), { ...quiet, spent_this_week_kobo: 4_600_000 });
    expect(r.verdict).toBe("block");
    expect(codes(r)).toContain("WEEKLY_LIMIT");
  });

  it("allows spending exactly up to the weekly cap", () => {
    expect(evaluatePolicy(policy, pay({ amount_kobo: 400_000 }), { ...quiet, spent_this_week_kobo: 4_600_000 }).verdict).toBe("allow");
  });

  it("asks for a Nod above the approval threshold", () => {
    const r = evaluatePolicy(policy, pay({ amount_kobo: 1_200_000 }), quiet);
    expect(r.verdict).toBe("nod");
    expect(codes(r)).toEqual(["ABOVE_NOD_THRESHOLD"]);
  });

  it("catches payment splitting: small payments to one payee add up within 24 hours", () => {
    const r = evaluatePolicy(policy, pay({ amount_kobo: 600_000 }), { ...quiet, payee_spent_24h_kobo: 600_000 });
    expect(r.verdict).toBe("nod");
    expect(codes(r)).toEqual(["PAYEE_24H_THRESHOLD"]);
  });

  it("blocks everything after the policy expires", () => {
    const r = evaluatePolicy(policy, pay(), { ...quiet, now: new Date("2026-11-01T00:00:00Z") });
    expect(r.verdict).toBe("block");
    expect(codes(r)).toContain("POLICY_EXPIRED");
  });

  it("a block always beats a Nod, and every reason is reported", () => {
    const r = evaluatePolicy(policy, pay({ payee_id: "payee_stranger", category: "electronics" }), quiet);
    expect(r.verdict).toBe("block");
    expect(codes(r)).toEqual(expect.arrayContaining(["CATEGORY_NOT_ALLOWED", "NEW_PAYEE"]));
  });

  it("applies a limit only to its own categories when the limit names some", () => {
    const scoped: SpendPolicy = {
      ...policy,
      spending_limits: [...policy.spending_limits, { amount_kobo: 100_000, interval: "daily", categories: ["stock"] }],
    };
    expect(evaluatePolicy(scoped, pay({ category: "groceries" }), quiet).verdict).toBe("allow");
    expect(codes(evaluatePolicy(scoped, pay({ category: "stock", amount_kobo: 200_000 }), quiet))).toContain("DAILY_LIMIT");
  });
});
