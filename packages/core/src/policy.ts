import type { SpendPolicy } from "./contracts";

// Spec Gate's deterministic rules: shaped like Stripe Issuing spending_controls (PRD P1).
// Pure: the caller supplies what has already been spent, so this stays testable and shareable.

export interface SpendContext {
  now: Date;
  spent_today_kobo: number;
  spent_this_week_kobo: number;
  payee_spent_24h_kobo: number;
}

export interface PolicyReason {
  code:
    | "POLICY_EXPIRED" | "CATEGORY_NOT_ALLOWED" | "PER_PAYMENT_LIMIT" | "DAILY_LIMIT" | "WEEKLY_LIMIT"
    | "NEW_PAYEE" | "ABOVE_NOD_THRESHOLD" | "PAYEE_24H_THRESHOLD";
  message: string;
}

export interface PolicyDecision {
  verdict: "allow" | "nod" | "block";
  reasons: PolicyReason[];
}

const LIMIT_CODE = { per_payment: "PER_PAYMENT_LIMIT", daily: "DAILY_LIMIT", weekly: "WEEKLY_LIMIT" } as const;

export function evaluatePolicy(
  policy: SpendPolicy,
  payment: { payee_id: string; amount_kobo: number; category: string },
  ctx: SpendContext,
): PolicyDecision {
  const block: PolicyReason[] = [];
  const nod: PolicyReason[] = [];
  const category = payment.category.toLowerCase();

  if (ctx.now.getTime() >= new Date(policy.expires_at).getTime()) {
    block.push({ code: "POLICY_EXPIRED", message: `The rule expired at ${policy.expires_at}` });
  }
  if (!policy.allowed_categories.some((c) => c.toLowerCase() === category)) {
    block.push({ code: "CATEGORY_NOT_ALLOWED", message: `"${payment.category}" is not an allowed category` });
  }

  for (const limit of policy.spending_limits) {
    if (limit.categories && !limit.categories.some((c) => c.toLowerCase() === category)) continue;
    const already = limit.interval === "daily" ? ctx.spent_today_kobo : limit.interval === "weekly" ? ctx.spent_this_week_kobo : 0;
    if (already + payment.amount_kobo > limit.amount_kobo) {
      block.push({ code: LIMIT_CODE[limit.interval], message: `Exceeds the ${limit.interval.replace("_", " ")} limit` });
    }
  }

  // An unknown payee is decided by the owner, never by the AI (PRD 5.2).
  if (!policy.allowed_payees.includes(payment.payee_id)) {
    nod.push({ code: "NEW_PAYEE", message: `${payment.payee_id} is not on the allowed payee list` });
  }
  if (payment.amount_kobo > policy.nod_above_kobo) {
    nod.push({ code: "ABOVE_NOD_THRESHOLD", message: "Above the amount that needs the owner's Nod" });
  } else if (ctx.payee_spent_24h_kobo + payment.amount_kobo > policy.nod_rolling_payee_24h_kobo) {
    // Stops splitting one big payment into small ones under the threshold.
    nod.push({ code: "PAYEE_24H_THRESHOLD", message: "Payments to this payee in 24 hours exceed the Nod threshold" });
  }

  if (block.length) return { verdict: "block", reasons: [...block, ...nod] };
  if (nod.length) return { verdict: "nod", reasons: nod };
  return { verdict: "allow", reasons: [] };
}
