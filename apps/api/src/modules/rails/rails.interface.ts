export interface PayoutParams {
  payment_id: string;
  reference: string; // Fixed: AL-{payment_id}
  amount_kobo: number;
  payee_id: string;
  payee_name: string;
  payee_email?: string;
  destination_bank_code?: string;
  destination_account_number?: string;
  narration?: string;
}

export type RailStatus = "settled" | "submitted" | "failed" | "unknown";

export interface RailPayoutResult {
  reference: string;
  status: RailStatus;
  amount_kobo?: number;
  is_simulated?: boolean;
  raw_response?: unknown;
  error?: string;
}

export interface RailQueryResult {
  reference: string;
  status: RailStatus;
  amount_kobo?: number;
  fee_kobo?: number;
  raw_response?: unknown;
}

export interface PayoutRail {
  payout(params: PayoutParams): Promise<RailPayoutResult>;
  query(reference: string): Promise<RailQueryResult>;
}
