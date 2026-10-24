export type PaymentStatus = "pending_approval" | "settled" | "blocked" | "failed";
export type SecondLookAction = "ok" | "escalate" | "block";

export interface SecondLookDecision {
  action: SecondLookAction;
  reason: string;
}

export interface Payment {
  id: string;
  payee_id?: string;
  payee_name: string;
  amount_kobo: number;
  currency: string;
  status: PaymentStatus;
  narration: string;
  created_at: string;
  second_look?: SecondLookDecision;
  kora_reference?: string;
}

export interface Approval {
  id: string;
  payment_id: string;
  amount_kobo: number;
  payee_name: string;
  status: "pending" | "approved" | "denied";
  created_at: string;
}

export interface Agent {
  id: string;
  name: string;
  status: "active" | "revoked";
  rules: {
    max_amount_kobo: number;
    allowed_categories: string[];
  };
}

export interface LedgerBalances {
  posted_balance_kobo: number;
  pending_hold_kobo: number;
  available_balance_kobo: number;
}
