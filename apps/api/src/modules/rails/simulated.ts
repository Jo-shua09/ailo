import type { PayoutParams, PayoutRail, RailPayoutResult, RailQueryResult, RailStatus } from "./rails.interface";

export class SimulatedRail implements PayoutRail {
  private records = new Map<string, { status: RailStatus; amount_kobo: number; updatedAt: Date }>();
  private defaultStatus: RailStatus = "settled";

  setDefaultStatus(status: RailStatus): void {
    this.defaultStatus = status;
  }

  setReferenceStatus(reference: string, status: RailStatus): void {
    const existing = this.records.get(reference);
    if (existing) {
      existing.status = status;
      existing.updatedAt = new Date();
    }
  }

  async payout(params: PayoutParams): Promise<RailPayoutResult> {
    const status = this.defaultStatus;
    this.records.set(params.reference, {
      status,
      amount_kobo: params.amount_kobo,
      updatedAt: new Date(),
    });

    return {
      reference: params.reference,
      status,
      amount_kobo: params.amount_kobo,
      is_simulated: true,
      raw_response: {
        simulated: true,
        reference: params.reference,
        amount_kobo: params.amount_kobo,
        status,
      },
    };
  }

  async query(reference: string): Promise<RailQueryResult> {
    const rec = this.records.get(reference);
    if (!rec) {
      return {
        reference,
        status: "unknown",
        raw_response: { simulated: true, error: "Reference not found" },
      };
    }

    return {
      reference,
      status: rec.status,
      amount_kobo: rec.amount_kobo,
      raw_response: {
        simulated: true,
        reference,
        status: rec.status,
        amount_kobo: rec.amount_kobo,
      },
    };
  }
}

export const simulatedRail = new SimulatedRail();
