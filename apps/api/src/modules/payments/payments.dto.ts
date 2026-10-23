import { z } from "zod";
import { PaymentRequest, Payment, Receipt, SpendPolicy, Check } from "@ailo/core";

export { PaymentRequest, Payment, Receipt, SpendPolicy, Check };
export type { Check as CheckType };

export const SetSpendPolicyInput = SpendPolicy;
export type SetSpendPolicyInput = z.infer<typeof SetSpendPolicyInput>;

export const DEFAULT_DEMO_POLICY: SpendPolicy = {
  allowed_categories: ["groceries", "stock", "supplies", "office"],
  allowed_payees: ["payee_mama_ngozi", "payee_shop", "payee_kora_test"],
  spending_limits: [
    { amount_kobo: 2_000_000, interval: "per_payment" }, // ₦20,000 max single spend
    { amount_kobo: 5_000_000, interval: "weekly" },      // ₦50,000 weekly cap
  ],
  nod_above_kobo: 1_000_000,             // ₦10,000 threshold for owner Nod
  nod_rolling_payee_24h_kobo: 1_000_000, // ₦10,000 rolling 24h per payee
  expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
};
