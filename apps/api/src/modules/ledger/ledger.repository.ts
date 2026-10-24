import { getCollection, type BaseCollection } from "../../db/mongo";
import type { LedgerEntry, LedgerHold, LedgerBalancesResponse } from "./ledger.dto";

export class LedgerRepository {
  private async getEntriesCollection(): Promise<BaseCollection<LedgerEntry>> {
    return getCollection<LedgerEntry>("ledger_entries");
  }

  private async getHoldsCollection(): Promise<BaseCollection<LedgerHold>> {
    return getCollection<LedgerHold>("ledger_holds");
  }

  async addEntry(entry: LedgerEntry): Promise<void> {
    const coll = await this.getEntriesCollection();
    await coll.insertOne(entry);
  }

  async createHold(hold: LedgerHold): Promise<void> {
    const coll = await this.getHoldsCollection();
    await coll.insertOne(hold);
  }

  async findHoldByPaymentId(paymentId: string): Promise<LedgerHold | null> {
    const coll = await this.getHoldsCollection();
    return coll.findOne({ payment_id: paymentId });
  }

  async updateHoldStatus(paymentId: string, status: LedgerHold["status"]): Promise<void> {
    const coll = await this.getHoldsCollection();
    await coll.updateOne({ payment_id: paymentId }, { $set: { status } });
  }

  async getBalances(): Promise<LedgerBalancesResponse> {
    const coll = await this.getEntriesCollection();
    const entries = await coll.find().toArray();

    const balances = {
      partner_cash: 0,
      owner_wallet: 0,
      holds: 0,
      escrow: 0,
      payee_payable: 0,
      fees: 0,
      available_balance: 0,
    };

    for (const e of entries) {
      // In double-entry: debit increases assets / decreases liabilities; credit increases liabilities / decreases assets
      // For owner_wallet: credits increase balance (funds added), debits decrease balance (funds spent)
      if (e.credit_account === "owner_wallet") balances.owner_wallet += e.amount_kobo;
      if (e.debit_account === "owner_wallet") balances.owner_wallet -= e.amount_kobo;

      if (e.credit_account === "partner_cash") balances.partner_cash += e.amount_kobo;
      if (e.debit_account === "partner_cash") balances.partner_cash -= e.amount_kobo;

      if (e.credit_account === "payee_payable") balances.payee_payable += e.amount_kobo;
      if (e.debit_account === "payee_payable") balances.payee_payable -= e.amount_kobo;

      if (e.credit_account === "escrow") balances.escrow += e.amount_kobo;
      if (e.debit_account === "escrow") balances.escrow -= e.amount_kobo;

      if (e.credit_account === "fees") balances.fees += e.amount_kobo;
      if (e.debit_account === "fees") balances.fees -= e.amount_kobo;
    }

    // Active holds
    const holdsColl = await this.getHoldsCollection();
    const activeHolds = await holdsColl.find({ status: "active" }).toArray();
    const totalHolds = activeHolds.reduce((sum, h) => sum + h.amount_kobo, 0);
    balances.holds = totalHolds;

    // Available balance = owner_wallet - active holds
    balances.available_balance = balances.owner_wallet - totalHolds;

    return balances;
  }
}

export const ledgerRepository = new LedgerRepository();
