import { AppError } from "../../shared/AppError";
import { ledgerRepository, LedgerRepository } from "./ledger.repository";
import type { LedgerBalancesResponse, LedgerHold } from "./ledger.dto";

export class LedgerService {
  constructor(private repo: LedgerRepository = ledgerRepository) {}

  async topUpOwnerWallet(amount_kobo: number, description = "Owner wallet top-up"): Promise<LedgerBalancesResponse> {
    if (amount_kobo <= 0) {
      throw new AppError(400, "INVALID_AMOUNT", "Top-up amount must be positive");
    }

    await this.repo.addEntry({
      id: `ent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      debit_account: "partner_cash",
      credit_account: "owner_wallet",
      amount_kobo,
      description,
      created_at: new Date().toISOString(),
    });

    return this.repo.getBalances();
  }

  async reserve(payment_id: string, amount_kobo: number, expiresInSeconds = 3600): Promise<LedgerHold> {
    if (amount_kobo <= 0) {
      throw new AppError(400, "INVALID_AMOUNT", "Reserve amount must be positive");
    }

    const balances = await this.repo.getBalances();
    if (balances.available_balance < amount_kobo) {
      throw new AppError(
        400,
        "INSUFFICIENT_FUNDS",
        `Insufficient available balance: ${balances.available_balance} kobo available, ${amount_kobo} kobo requested`,
        { available_balance: balances.available_balance, requested_amount: amount_kobo },
      );
    }

    const hold: LedgerHold = {
      id: `hld_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      payment_id,
      amount_kobo,
      status: "active",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    };

    await this.repo.createHold(hold);
    return hold;
  }

  async postHold(payment_id: string, description = "Payment settlement"): Promise<void> {
    const hold = await this.repo.findHoldByPaymentId(payment_id);
    if (!hold || hold.status !== "active") {
      return;
    }

    await this.repo.updateHoldStatus(payment_id, "posted");

    // Double-entry posting: Debit owner_wallet, Credit payee_payable
    await this.repo.addEntry({
      id: `ent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      payment_id,
      debit_account: "owner_wallet",
      credit_account: "payee_payable",
      amount_kobo: hold.amount_kobo,
      description,
      created_at: new Date().toISOString(),
    });
  }

  async releaseHold(payment_id: string): Promise<void> {
    const hold = await this.repo.findHoldByPaymentId(payment_id);
    if (!hold || hold.status !== "active") {
      return;
    }

    await this.repo.updateHoldStatus(payment_id, "released");
  }

  async getBalances(): Promise<LedgerBalancesResponse> {
    return this.repo.getBalances();
  }

  async getAvailableBalance(): Promise<number> {
    const balances = await this.repo.getBalances();
    return balances.available_balance;
  }
}

export const ledgerService = new LedgerService();
