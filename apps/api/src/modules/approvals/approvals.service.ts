import { AppError } from "../../shared/AppError";
import { eventsService } from "../events/events.service";
import { approvalsRepository, ApprovalsRepository } from "./approvals.repository";
import type { ApprovalRecord } from "./approvals.dto";

export type ApprovalDecisionHandler = (
  paymentId: string,
  decision: "approve" | "deny",
  authCapKobo?: number
) => Promise<void>;

export class ApprovalsService {
  private decisionHandler: ApprovalDecisionHandler | null = null;

  constructor(private repo: ApprovalsRepository = approvalsRepository) {}

  setDecisionHandler(handler: ApprovalDecisionHandler): void {
    this.decisionHandler = handler;
  }

  async createApproval(params: {
    payment_id: string;
    amount_kobo: number;
    payee_name: string;
    reason: string;
    why: "above_threshold" | "second_look_flag" | "new_payee";
    expiresInSeconds?: number;
  }): Promise<ApprovalRecord> {
    const id = `apr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const ttlSeconds = params.expiresInSeconds ?? 600; // 10 minutes default
    const expires_at = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    const record: ApprovalRecord = {
      id,
      payment_id: params.payment_id,
      amount_kobo: params.amount_kobo,
      payee_name: params.payee_name,
      reason: params.reason,
      why: params.why,
      expires_at,
      status: "pending",
      created_at: new Date().toISOString(),
      decided_at: null,
    };

    await this.repo.createApproval(record);

    // Emit SSE event for owner console and /nod page
    eventsService.emitApprovalCreated({
      id: record.id,
      payment_id: record.payment_id,
      amount_kobo: record.amount_kobo,
      payee_name: record.payee_name,
      reason: record.reason,
      why: record.why,
      expires_at: record.expires_at,
    });

    return record;
  }

  async getApproval(id: string): Promise<ApprovalRecord> {
    const approval = await this.repo.findApprovalById(id);
    if (!approval) {
      throw new AppError(404, "APPROVAL_NOT_FOUND", `Approval ${id} not found`);
    }
    return approval;
  }

  async listPending(): Promise<ApprovalRecord[]> {
    return this.repo.listPending();
  }

  async decide(id: string, decision: "approve" | "deny"): Promise<ApprovalRecord> {
    const approval = await this.getApproval(id);

    if (approval.status !== "pending") {
      throw new AppError(400, "ALREADY_DECIDED", `Approval has already been ${approval.status}`);
    }

    if (new Date(approval.expires_at).getTime() < Date.now()) {
      await this.repo.updateDecision(id, "denied", new Date().toISOString());
      throw new AppError(400, "APPROVAL_EXPIRED", "Approval request has expired");
    }

    const authCapKobo = decision === "approve" ? approval.amount_kobo : undefined;
    const updated = await this.repo.updateDecision(
      id,
      decision === "approve" ? "approved" : "denied",
      new Date().toISOString(),
      authCapKobo
    );

    if (this.decisionHandler) {
      await this.decisionHandler(approval.payment_id, decision, authCapKobo);
    }

    return updated!;
  }
}

export const approvalsService = new ApprovalsService();
