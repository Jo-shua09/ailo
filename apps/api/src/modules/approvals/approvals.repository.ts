import { getCollection, type BaseCollection } from "../../db/mongo";
import type { ApprovalRecord } from "./approvals.dto";

export class ApprovalsRepository {
  private async getApprovalsCollection(): Promise<BaseCollection<ApprovalRecord>> {
    return getCollection<ApprovalRecord>("approvals");
  }

  async createApproval(record: ApprovalRecord): Promise<void> {
    const coll = await this.getApprovalsCollection();
    await coll.insertOne(record);
  }

  async findApprovalById(id: string): Promise<ApprovalRecord | null> {
    const coll = await this.getApprovalsCollection();
    return coll.findOne({ id });
  }

  async findApprovalByPaymentId(paymentId: string): Promise<ApprovalRecord | null> {
    const coll = await this.getApprovalsCollection();
    return coll.findOne({ payment_id: paymentId });
  }

  async listPending(): Promise<ApprovalRecord[]> {
    const coll = await this.getApprovalsCollection();
    return coll.find({ status: "pending" }).toArray();
  }

  async updateDecision(
    id: string,
    status: "approved" | "denied",
    decided_at: string,
    auth_cap_kobo?: number,
  ): Promise<ApprovalRecord | null> {
    const coll = await this.getApprovalsCollection();
    await coll.updateOne(
      { id },
      { $set: { status, decided_at, auth_cap_kobo } },
    );
    return this.findApprovalById(id);
  }
}

export const approvalsRepository = new ApprovalsRepository();
