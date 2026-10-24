import { formatNaira, type Check, type Payment, type PaymentRequest, type Receipt } from "@ailo/core";
import { AppError } from "../../shared/AppError";
import { eventsService } from "../events/events.service";
import { ledgerService } from "../ledger/ledger.service";
import { approvalsService } from "../approvals/approvals.service";
import * as mandates from "../mandates/mandates.service";
import { getPayee } from "../payees/payees";
import { getPayoutRail } from "../rails";

// Bank details and email come only from the server-side payee directory, never from the agent (PRD 5.9).
function payoutAccount(payeeId: string) {
  const payee = getPayee(payeeId);
  return payee
    ? { destination_bank_code: payee.bank_code, destination_account_number: payee.account_number, payee_email: payee.email }
    : {};
}
import { paymentsRepository, PaymentsRepository } from "./payments.repository";

export class PaymentsService {
  constructor(private repo: PaymentsRepository = paymentsRepository) {
    // Connect approval decisions to payment transitions
    approvalsService.setDecisionHandler(async (paymentId, decision) => {
      if (decision === "approve") {
        await this.executeApprovedPayout(paymentId);
      } else {
        await this.executeDeniedPayment(paymentId);
      }
    });
  }

  async listPayments(): Promise<Payment[]> {
    return this.repo.listPayments();
  }

  async getPayment(id: string): Promise<{ payment: Payment; receipt?: Receipt }> {
    const record = await this.repo.findPaymentById(id);
    if (!record) {
      throw new AppError(404, "PAYMENT_NOT_FOUND", `Payment ${id} not found`);
    }
    const { receipt, ...payment } = record;
    return { payment, receipt };
  }

  /**
   * Main check ladder per PRD 5.2.
   */
  async processPayment(
    agent: { id: string; name: string },
    req: PaymentRequest
  ): Promise<{ payment: Payment; receipt: Receipt }> {
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const reference = `AL-${paymentId}`;
    const now = new Date().toISOString();

    const checks: Check[] = [];

    // Step 1: Signature & Badge check (passed by agentAuth middleware)
    checks.push({
      step: "signature",
      result: "pass",
      detail: `Badge verified for agent ${agent.name} (${agent.id})`,
    });

    // Step 2: Deterministic Rules (Spec Gate): the owner's latest saved mandate. No rule, no spending.
    const mandate = await mandates.current();
    const receipt: Receipt = {
      payment_id: paymentId,
      policy_version: mandate?.version ?? 1, // the contract needs a positive version even when no rule exists
      checks,
    };

    if (!mandate) {
      checks.push({ step: "rules", result: "fail", detail: "No spending rule saved yet: the owner sets one in Spec Gate" });
      const blockedPayment: Payment = {
        id: paymentId,
        agent_id: agent.id,
        payee_id: req.payee_id,
        payee_name: getPayee(req.payee_id)?.name ?? req.payee_id,
        amount_kobo: req.amount_kobo,
        category: req.category,
        reason: req.reason,
        verdict: "block",
        decided_by: "rules",
        status: "blocked",
        kora_reference: null,
        created_at: now,
      };
      await this.repo.savePayment(blockedPayment, receipt);
      eventsService.emitPaymentUpdated(blockedPayment);
      return { payment: blockedPayment, receipt };
    }
    const policy = mandate.policy;

    const isCategoryAllowed = policy.allowed_categories.includes(req.category.toLowerCase());
    const isPayeeAllowed = policy.allowed_payees.includes(req.payee_id);

    const weeklySpent = await this.repo.getWeeklySpend(agent.id);
    const weeklyLimit = policy.spending_limits.find((l) => l.interval === "weekly")?.amount_kobo ?? 5_000_000;
    const perPaymentLimit = policy.spending_limits.find((l) => l.interval === "per_payment")?.amount_kobo ?? 2_000_000;

    let rulesPassed = true;
    let ruleFailDetail = "";

    if (!isCategoryAllowed) {
      rulesPassed = false;
      ruleFailDetail = `Category "${req.category}" is not in allowed categories: ${policy.allowed_categories.join(", ")}`;
    } else if (req.amount_kobo > perPaymentLimit) {
      rulesPassed = false;
      ruleFailDetail = `Amount ${formatNaira(req.amount_kobo)} exceeds single payment limit of ${formatNaira(perPaymentLimit)}`;
    } else if (weeklySpent + req.amount_kobo > weeklyLimit) {
      rulesPassed = false;
      ruleFailDetail = `Weekly cap ${formatNaira(weeklyLimit)} exceeded: ${formatNaira(weeklySpent)} already spent`;
    }

    if (!rulesPassed) {
      checks.push({
        step: "rules",
        result: "fail",
        detail: ruleFailDetail,
      });

      const blockedPayment: Payment = {
        id: paymentId,
        agent_id: agent.id,
        payee_id: req.payee_id,
        payee_name: getPayee(req.payee_id)?.name ?? req.payee_id,
        amount_kobo: req.amount_kobo,
        category: req.category,
        reason: req.reason,
        verdict: "block",
        decided_by: "rules",
        status: "blocked",
        kora_reference: null,
        created_at: now,
      };

      await this.repo.savePayment(blockedPayment, receipt);
      eventsService.emitPaymentUpdated(blockedPayment);
      return { payment: blockedPayment, receipt };
    }

    checks.push({
      step: "rules",
      result: "pass",
      detail: `weekly cap ${formatNaira(weeklyLimit)}: ${formatNaira(weeklySpent + req.amount_kobo)} of ${formatNaira(weeklyLimit)} used`,
    });

    // Step 3: Reserve Funds with Balance Condition
    try {
      await ledgerService.reserve(paymentId, req.amount_kobo);
      checks.push({
        step: "reserve",
        result: "pass",
        detail: `Reserved ${formatNaira(req.amount_kobo)} in holds`,
      });
    } catch (err) {
      checks.push({
        step: "reserve",
        result: "fail",
        detail: (err as Error).message,
      });

      const blockedPayment: Payment = {
        id: paymentId,
        agent_id: agent.id,
        payee_id: req.payee_id,
        payee_name: getPayee(req.payee_id)?.name ?? req.payee_id,
        amount_kobo: req.amount_kobo,
        category: req.category,
        reason: req.reason,
        verdict: "block",
        decided_by: "rules",
        status: "blocked",
        kora_reference: null,
        created_at: now,
      };

      await this.repo.savePayment(blockedPayment, receipt);
      eventsService.emitPaymentUpdated(blockedPayment);
      return { payment: blockedPayment, receipt };
    }

    // Step 4: Second Look (Intent & Flag Check)
    let needsNod = false;
    let nodReason: "above_threshold" | "second_look_flag" | "new_payee" = "above_threshold";

    const isPoisonedOrFlagged = req.reason.toLowerCase().includes("compromised") ||
      req.reason.toLowerCase().includes("poisoned") ||
      req.reason.toLowerCase().includes("malicious");

    if (isPoisonedOrFlagged) {
      // Second Look blocks suspicious requests
      await ledgerService.releaseHold(paymentId);
      checks.push({
        step: "second_look",
        result: "fail",
        detail: "Second Look: blocked, suspicious or poisoned instruction detected in stated reason",
      });

      const blockedPayment: Payment = {
        id: paymentId,
        agent_id: agent.id,
        payee_id: req.payee_id,
        payee_name: getPayee(req.payee_id)?.name ?? req.payee_id,
        amount_kobo: req.amount_kobo,
        category: req.category,
        reason: req.reason,
        verdict: "block",
        decided_by: "second_look",
        status: "blocked",
        kora_reference: null,
        created_at: now,
      };

      await this.repo.savePayment(blockedPayment, receipt);
      eventsService.emitPaymentUpdated(blockedPayment);
      return { payment: blockedPayment, receipt };
    }

    // If clean: second look is skipped
    checks.push({
      step: "second_look",
      result: "skipped",
      detail: "not flagged",
    });

    // Step 5: Nod (Threshold & Payee Approval Check)
    const rollingPayeeSpent = await this.repo.getRollingPayeeSpend24h(req.payee_id);

    if (!isPayeeAllowed) {
      needsNod = true;
      nodReason = "new_payee";
    } else if (req.amount_kobo > policy.nod_above_kobo) {
      needsNod = true;
      nodReason = "above_threshold";
    } else if (rollingPayeeSpent + req.amount_kobo > policy.nod_rolling_payee_24h_kobo) {
      needsNod = true;
      nodReason = "above_threshold";
    }

    if (needsNod) {
      checks.push({
        step: "nod",
        result: "pass",
        detail: `Waiting for owner Nod (${nodReason === "above_threshold" ? `above ${formatNaira(policy.nod_above_kobo)}` : "new payee"})`,
      });

      const nodPayment: Payment = {
        id: paymentId,
        agent_id: agent.id,
        payee_id: req.payee_id,
        payee_name: getPayee(req.payee_id)?.name ?? req.payee_id,
        amount_kobo: req.amount_kobo,
        category: req.category,
        reason: req.reason,
        verdict: "nod",
        decided_by: "nod",
        status: "pending_approval",
        kora_reference: null,
        created_at: now,
      };

      await this.repo.savePayment(nodPayment, receipt);

      // Create owner approval request for /nod page
      await approvalsService.createApproval({
        payment_id: paymentId,
        amount_kobo: req.amount_kobo,
        payee_name: nodPayment.payee_name,
        reason: req.reason,
        why: nodReason,
      });

      eventsService.emitPaymentUpdated(nodPayment);
      return { payment: nodPayment, receipt };
    }

    checks.push({
      step: "nod",
      result: "skipped",
      detail: `under ${formatNaira(policy.nod_above_kobo)} threshold`,
    });

    // Step 6: Payout through Rails
    const rail = getPayoutRail();
    const payoutResult = await rail.payout({
      payment_id: paymentId,
      reference,
      amount_kobo: req.amount_kobo,
      payee_id: req.payee_id,
      payee_name: getPayee(req.payee_id)?.name ?? req.payee_id,
      narration: req.reason,
      ...payoutAccount(req.payee_id),
    });

    if (payoutResult.status === "settled") {
      await ledgerService.postHold(paymentId);
      checks.push({
        step: "payout",
        result: "pass",
        detail: `Kora confirmed ${reference}`,
      });
    } else if (payoutResult.status === "unknown" || payoutResult.status === "submitted") {
      checks.push({
        step: "payout",
        result: "pass",
        detail: `Payout submitted to rail (${reference}), awaiting confirmation`,
      });
    } else {
      await ledgerService.releaseHold(paymentId);
      checks.push({
        step: "payout",
        result: "fail",
        detail: payoutResult.error ?? "Payout rejected by rail",
      });
    }

    const settledPayment: Payment = {
      id: paymentId,
      agent_id: agent.id,
      payee_id: req.payee_id,
      payee_name: getPayee(req.payee_id)?.name ?? req.payee_id,
      amount_kobo: req.amount_kobo,
      category: req.category,
      reason: req.reason,
      verdict: "allow",
      decided_by: "rules",
      status: payoutResult.status,
      kora_reference: reference,
      created_at: now,
    };

    await this.repo.savePayment(settledPayment, receipt);
    eventsService.emitPaymentUpdated(settledPayment);
    return { payment: settledPayment, receipt };
  }

  /**
   * Called when owner taps "Approve" on /nod.
   */
  async executeApprovedPayout(paymentId: string): Promise<Payment> {
    const record = await this.repo.findPaymentById(paymentId);
    if (!record) {
      throw new AppError(404, "PAYMENT_NOT_FOUND", `Payment ${paymentId} not found`);
    }

    const reference = `AL-${paymentId}`;
    const rail = getPayoutRail();

    const payoutResult = await rail.payout({
      payment_id: paymentId,
      reference,
      amount_kobo: record.amount_kobo,
      payee_id: record.payee_id,
      payee_name: record.payee_name,
      narration: record.reason,
      ...payoutAccount(record.payee_id),
    });

    const newChecks: Check[] = [];
    if (payoutResult.status === "settled") {
      await ledgerService.postHold(paymentId);
      newChecks.push({
        step: "payout",
        result: "pass",
        detail: `Owner approved; Kora confirmed ${reference}`,
      });
    } else if (payoutResult.status === "unknown" || payoutResult.status === "submitted") {
      newChecks.push({
        step: "payout",
        result: "pass",
        detail: `Owner approved; rail submitted (${reference})`,
      });
    } else {
      await ledgerService.releaseHold(paymentId);
      newChecks.push({
        step: "payout",
        result: "fail",
        detail: payoutResult.error ?? "Payout rejected by rail",
      });
    }

    const updated = await this.repo.updatePayment(
      paymentId,
      {
        status: payoutResult.status,
        kora_reference: reference,
      },
      newChecks
    );

    eventsService.emitPaymentUpdated(updated!);
    return updated!;
  }

  /**
   * Called when owner taps "Deny" on /nod.
   */
  async executeDeniedPayment(paymentId: string): Promise<Payment> {
    const record = await this.repo.findPaymentById(paymentId);
    if (!record) {
      throw new AppError(404, "PAYMENT_NOT_FOUND", `Payment ${paymentId} not found`);
    }

    await ledgerService.releaseHold(paymentId);

    const newChecks: Check[] = [
      {
        step: "nod",
        result: "fail",
        detail: "Denied by owner",
      },
    ];

    const updated = await this.repo.updatePayment(
      paymentId,
      {
        status: "blocked",
        verdict: "block",
      },
      newChecks
    );

    eventsService.emitPaymentUpdated(updated!);
    return updated!;
  }
}

export const paymentsService = new PaymentsService();
