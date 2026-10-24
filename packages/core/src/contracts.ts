import { z } from "zod";
import { PAYMENT_STATES } from "./payment-states";

// Shared API contract. Field names match docs/frontend-handoff.md.

const kobo = z.number().int().positive();
const id = z.string().min(1);

/** Body an agent sends to POST /v1/payments (Idempotency-Key goes in the header). */
export const PaymentRequest = z.object({
  payee_id: id,
  amount_kobo: kobo,
  category: z.string().min(1),
  reason: z.string().min(1).max(500),
  /** Optional: the page the agent acted on, so Second Look can spot a poisoned page. Untrusted text. */
  page_text: z.string().max(20_000).optional(),
});
export type PaymentRequest = z.infer<typeof PaymentRequest>;

export const Verdict = z.enum(["allow", "nod", "block"]);
export const DecidedBy = z.enum(["signature", "rules", "second_look", "nod"]);

export const Payment = z.object({
  id,
  agent_id: id,
  payee_id: id,
  payee_name: z.string(),
  amount_kobo: kobo,
  category: z.string(),
  reason: z.string(),
  verdict: Verdict,
  decided_by: DecidedBy,
  status: z.enum(PAYMENT_STATES),
  kora_reference: z.string().nullable(),
  created_at: z.iso.datetime(),
});
export type Payment = z.infer<typeof Payment>;

export const Check = z.object({
  step: z.enum(["signature", "rules", "reserve", "second_look", "nod", "payout"]),
  result: z.enum(["pass", "fail", "skipped"]),
  detail: z.string().optional(),
});
export type Check = z.infer<typeof Check>;

export const Receipt = z.object({
  payment_id: id,
  policy_version: z.number().int().positive(),
  checks: z.array(Check),
});
export type Receipt = z.infer<typeof Receipt>;

/** Spec Gate output. Shaped like Stripe Issuing spending_controls (PRD P1), amounts in kobo. */
export const SpendPolicy = z.object({
  allowed_categories: z.array(z.string()).min(1),
  allowed_payees: z.array(id),
  spending_limits: z.array(z.object({
    amount_kobo: kobo,
    interval: z.enum(["per_payment", "daily", "weekly"]),
    categories: z.array(z.string()).optional(),
  })).min(1),
  nod_above_kobo: kobo,
  nod_rolling_payee_24h_kobo: kobo,
  expires_at: z.iso.datetime(),
});
export type SpendPolicy = z.infer<typeof SpendPolicy>;

/** Second Look can only add friction (PRD 5.2): there is no "approve" verdict. */
export const SecondLookResult = z.object({
  verdict: z.enum(["ok", "escalate", "block"]),
  reason: z.string().min(1),
});
export type SecondLookResult = z.infer<typeof SecondLookResult>;

export const ApprovalRequest = z.object({
  id,
  payment_id: id,
  amount_kobo: kobo,
  payee_name: z.string(),
  reason: z.string(),
  why: z.enum(["above_threshold", "second_look_flag", "new_payee"]),
  expires_at: z.iso.datetime(),
});
export type ApprovalRequest = z.infer<typeof ApprovalRequest>;
