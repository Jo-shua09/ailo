export const PAYMENT_STATES = [
  "requested", "blocked", "held", "pending_approval", "approved", "submitting", "submitted",
  "settled", "failed", "unknown", "needs_review", "reversed", "expired", "cancelled", "disputed", "refunded",
] as const;

export type PaymentState = (typeof PAYMENT_STATES)[number];

// PRD 5.5. A timeout or 5xx from Kora moves to `unknown`, never to `failed`, until a re-query decides.
const NEXT: Record<PaymentState, readonly PaymentState[]> = {
  requested: ["blocked", "held"],
  held: ["pending_approval", "submitting", "blocked", "cancelled", "expired"],
  pending_approval: ["approved", "blocked", "cancelled", "expired"],
  approved: ["submitting", "cancelled", "expired"],
  submitting: ["submitted", "unknown", "failed"],
  submitted: ["settled", "failed", "unknown", "needs_review"],
  unknown: ["settled", "failed", "needs_review"],
  needs_review: ["settled", "failed"],
  settled: ["disputed", "reversed"],
  disputed: ["refunded", "settled"],
  blocked: [], failed: [], reversed: [], expired: [], cancelled: [], refunded: [],
};

export function canTransition(from: PaymentState, to: PaymentState): boolean {
  return NEXT[from].includes(to);
}

export function assertTransition(from: PaymentState, to: PaymentState): void {
  if (!canTransition(from, to)) throw new Error(`Illegal payment transition: ${from} -> ${to}`);
}

export function isTerminal(state: PaymentState): boolean {
  return NEXT[state].length === 0;
}
