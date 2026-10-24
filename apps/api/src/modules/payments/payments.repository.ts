import { getCollection, type BaseCollection } from "../../db/mongo";
import type { Payment, Receipt, Check } from "@ailo/core";

export interface PaymentRecord extends Payment {
  receipt?: Receipt;
}

export class PaymentsRepository {
  private async getPaymentsCollection(): Promise<BaseCollection<PaymentRecord>> {
    return getCollection<PaymentRecord>("payments");
  }

  async savePayment(payment: Payment, receipt?: Receipt): Promise<void> {
    const coll = await this.getPaymentsCollection();
    await coll.insertOne({
      ...payment,
      receipt,
    });
  }

  async updatePayment(
    id: string,
    updates: Partial<Payment>,
    newChecks?: Check[]
  ): Promise<PaymentRecord | null> {
    const coll = await this.getPaymentsCollection();
    const existing = await coll.findOne({ id });
    if (!existing) return null;

    let receipt = existing.receipt;
    if (newChecks && receipt) {
      receipt = {
        ...receipt,
        checks: [...receipt.checks, ...newChecks],
      };
    }

    await coll.updateOne(
      { id },
      {
        $set: {
          ...updates,
          ...(receipt ? { receipt } : {}),
        },
      }
    );

    return coll.findOne({ id });
  }

  async findPaymentById(id: string): Promise<PaymentRecord | null> {
    const coll = await this.getPaymentsCollection();
    return coll.findOne({ id });
  }

  async findPaymentByReference(reference: string): Promise<PaymentRecord | null> {
    const coll = await this.getPaymentsCollection();
    return coll.findOne({ kora_reference: reference });
  }

  async listPayments(): Promise<Payment[]> {
    const coll = await this.getPaymentsCollection();
    const records = await coll.find().sort({ created_at: -1 }).toArray();
    return records.map(({ receipt: _, ...payment }) => payment);
  }

  async getNonFinalPayments(): Promise<PaymentRecord[]> {
    const coll = await this.getPaymentsCollection();
    const records = await coll.find().toArray();
    const nonFinalStates = ["submitting", "submitted", "unknown", "needs_review", "held"];
    return records.filter((r) => nonFinalStates.includes(r.status));
  }

  async getRollingPayeeSpend24h(payeeId: string): Promise<number> {
    const coll = await this.getPaymentsCollection();
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const records = await coll.find({ payee_id: payeeId }).toArray();
    return records
      .filter((r) => r.created_at >= since && !["blocked", "failed", "cancelled"].includes(r.status))
      .reduce((sum, r) => sum + r.amount_kobo, 0);
  }

  async getWeeklySpend(agentId: string): Promise<number> {
    const coll = await this.getPaymentsCollection();
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const records = await coll.find({ agent_id: agentId }).toArray();
    return records
      .filter((r) => r.created_at >= since && !["blocked", "failed", "cancelled"].includes(r.status))
      .reduce((sum, r) => sum + r.amount_kobo, 0);
  }
}

export const paymentsRepository = new PaymentsRepository();
