import { beforeEach, describe, expect, it } from "vitest";
import { resetMemoryDb } from "../../db/mongo";
import { paymentsRepository } from "../payments/payments.repository";
import { ledgerService } from "../ledger/ledger.service";
import { simulatedRail } from "../rails/simulated";
import { ReconcileService } from "./reconcile.service";

describe("ReconcileService (Square Up)", () => {
  let service: ReconcileService;

  beforeEach(() => {
    resetMemoryDb();
    service = new ReconcileService();
  });

  it("checks non-final payments against rail and reports clean reconciliation", async () => {
    await ledgerService.topUpOwnerWallet(1000000);
    await ledgerService.reserve("pay_recon_1", 200000);

    const ref = "AL-pay_recon_1";
    // Set simulated rail to settled for this reference
    await simulatedRail.payout({
      payment_id: "pay_recon_1",
      reference: ref,
      amount_kobo: 200000,
      payee_id: "payee_mama",
      payee_name: "Mama Ngozi",
    });

    // Save payment in non-final state "submitted"
    await paymentsRepository.savePayment({
      id: "pay_recon_1",
      agent_id: "agt_1",
      payee_id: "payee_mama",
      payee_name: "Mama Ngozi",
      amount_kobo: 200000,
      category: "groceries",
      reason: "Rice restock",
      verdict: "allow",
      decided_by: "rules",
      status: "submitted",
      kora_reference: ref,
      created_at: new Date().toISOString(),
    });

    const result = await service.squareUp();
    expect(result.checked_count).toBe(1);
    expect(result.breaks_count).toBe(0);
    expect(result.status).toBe("clean");

    const record = await paymentsRepository.findPaymentById("pay_recon_1");
    expect(record?.status).toBe("settled");
  });
});
