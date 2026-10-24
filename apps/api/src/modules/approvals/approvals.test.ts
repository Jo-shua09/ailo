import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetMemoryDb } from "../../db/mongo";
import { ApprovalsService } from "./approvals.service";

describe("ApprovalsService", () => {
  let service: ApprovalsService;

  beforeEach(() => {
    resetMemoryDb();
    service = new ApprovalsService();
  });

  it("creates a pending approval, notifies console, and lists pending", async () => {
    const approval = await service.createApproval({
      payment_id: "pay_01",
      amount_kobo: 1200000,
      payee_name: "Mama Ngozi Stores",
      reason: "Bigger restock for the weekend",
      why: "above_threshold",
    });

    expect(approval.id).toMatch(/^apr_/);
    expect(approval.status).toBe("pending");
    expect(approval.amount_kobo).toBe(1200000);

    const pending = await service.listPending();
    expect(pending).toHaveLength(1);
    expect(pending[0]?.id).toBe(approval.id);
  });

  it("approves with one-time capped authorization and calls decision handler", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    service.setDecisionHandler(handler);

    const approval = await service.createApproval({
      payment_id: "pay_02",
      amount_kobo: 1500000,
      payee_name: "Mama Ngozi Stores",
      reason: "Bulk buy",
      why: "above_threshold",
    });

    const result = await service.decide(approval.id, "approve");
    expect(result.status).toBe("approved");
    expect(result.auth_cap_kobo).toBe(1500000);
    expect(handler).toHaveBeenCalledWith("pay_02", "approve", 1500000);

    // Cannot decide again
    await expect(service.decide(approval.id, "deny")).rejects.toThrow(/already been approved/);
  });

  it("denies an approval and passes decision to handler", async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    service.setDecisionHandler(handler);

    const approval = await service.createApproval({
      payment_id: "pay_03",
      amount_kobo: 2000000,
      payee_name: "Unknown Vendor",
      reason: "Suspicious item",
      why: "second_look_flag",
    });

    const result = await service.decide(approval.id, "deny");
    expect(result.status).toBe("denied");
    expect(handler).toHaveBeenCalledWith("pay_03", "deny", undefined);
  });
});
