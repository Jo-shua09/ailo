import type { Payment } from "@ailo/core";
import { eventsService } from "../events/events.service";
import { ledgerService } from "../ledger/ledger.service";
import { paymentsRepository } from "../payments/payments.repository";
import { getPayoutRail } from "../rails";
import type { SquareUpResponse } from "./reconcile.dto";

export class ReconcileService {
  async squareUp(): Promise<SquareUpResponse> {
    const nonFinalPayments = await paymentsRepository.getNonFinalPayments();
    const rail = getPayoutRail();

    let checkedCount = 0;
    const breaks: Payment[] = [];

    for (const record of nonFinalPayments) {
      if (!record.kora_reference) continue;
      checkedCount++;

      const queryResult = await rail.query(record.kora_reference);

      if (queryResult.status === "settled") {
        // Verify amount
        if (queryResult.amount_kobo !== undefined && queryResult.amount_kobo !== record.amount_kobo) {
          // Break detected!
          const updated = await paymentsRepository.updatePayment(
            record.id,
            { status: "needs_review" },
            [{ step: "payout", result: "fail", detail: `Reconciliation break: rail amount ${queryResult.amount_kobo} != payment amount ${record.amount_kobo}` }]
          );
          if (updated) {
            breaks.push(updated);
            eventsService.emitPaymentUpdated(updated);
          }
          continue;
        }

        // Settled and matches
        const updated = await paymentsRepository.updatePayment(
          record.id,
          { status: "settled" },
          [{ step: "payout", result: "pass", detail: `Square Up verified settlement with rail: ${record.kora_reference}` }]
        );
        await ledgerService.postHold(record.id);
        if (updated) eventsService.emitPaymentUpdated(updated);
      } else if (queryResult.status === "failed") {
        const updated = await paymentsRepository.updatePayment(
          record.id,
          { status: "failed" },
          [{ step: "payout", result: "fail", detail: `Square Up confirmed payout failure: ${record.kora_reference}` }]
        );
        await ledgerService.releaseHold(record.id);
        if (updated) eventsService.emitPaymentUpdated(updated);
      }
    }

    return {
      checked_count: checkedCount,
      breaks_count: breaks.length,
      needs_review: breaks,
      status: breaks.length === 0 ? "clean" : "breaks_found",
    };
  }
}

export const reconcileService = new ReconcileService();
