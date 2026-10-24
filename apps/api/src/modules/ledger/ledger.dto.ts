import { z } from "zod";

export const LEDGER_ACCOUNTS = [
  "partner_cash",
  "owner_wallet",
  "holds",
  "escrow",
  "payee_payable",
  "fees",
] as const;

export type LedgerAccount = (typeof LEDGER_ACCOUNTS)[number];

export const LedgerAccountSchema = z.enum(LEDGER_ACCOUNTS);

export const TopUpInput = z.object({
  amount_kobo: z.number().int().positive(),
  description: z.string().optional(),
});
export type TopUpInput = z.infer<typeof TopUpInput>;

export const HoldStatus = z.enum(["active", "posted", "released", "expired"]);
export type HoldStatus = z.infer<typeof HoldStatus>;

export const LedgerEntrySchema = z.object({
  id: z.string(),
  payment_id: z.string().optional(),
  debit_account: LedgerAccountSchema,
  credit_account: LedgerAccountSchema,
  amount_kobo: z.number().int().positive(),
  description: z.string(),
  created_at: z.string(),
});
export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;

export const LedgerHoldSchema = z.object({
  id: z.string(),
  payment_id: z.string(),
  amount_kobo: z.number().int().positive(),
  status: HoldStatus,
  created_at: z.string(),
  expires_at: z.string(),
});
export type LedgerHold = z.infer<typeof LedgerHoldSchema>;

export const LedgerBalancesResponse = z.object({
  partner_cash: z.number().int(),
  owner_wallet: z.number().int(),
  holds: z.number().int(),
  escrow: z.number().int(),
  payee_payable: z.number().int(),
  fees: z.number().int(),
  available_balance: z.number().int(),
});
export type LedgerBalancesResponse = z.infer<typeof LedgerBalancesResponse>;
