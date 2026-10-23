import { beforeEach, describe, expect, it } from "vitest";
import { resetMemoryDb } from "../../db/mongo";
import { LedgerService } from "./ledger.service";

describe("LedgerService", () => {
  let service: LedgerService;

  beforeEach(() => {
    resetMemoryDb();
    service = new LedgerService();
  });

  it("starts with 0 balance and rejects reserve when funds are insufficient", async () => {
    const balances = await service.getBalances();
    expect(balances.owner_wallet).toBe(0);
    expect(balances.available_balance).toBe(0);

    await expect(service.reserve("pay_01", 10000)).rejects.toThrow(/Insufficient available balance/);
  });

  it("tops up owner wallet and successfully reserves funds", async () => {
    await service.topUpOwnerWallet(50000); // ₦500.00
    let balances = await service.getBalances();
    expect(balances.owner_wallet).toBe(50000);
    expect(balances.available_balance).toBe(50000);

    const hold = await service.reserve("pay_01", 20000);
    expect(hold.status).toBe("active");
    expect(hold.amount_kobo).toBe(20000);

    balances = await service.getBalances();
    expect(balances.owner_wallet).toBe(50000);
    expect(balances.holds).toBe(20000);
    expect(balances.available_balance).toBe(30000);

    // Cannot reserve more than available balance (30,000 left)
    await expect(service.reserve("pay_02", 35000)).rejects.toThrow(/Insufficient available balance/);
  });

  it("posts hold to settle funds to payee_payable", async () => {
    await service.topUpOwnerWallet(100000);
    await service.reserve("pay_01", 40000);

    await service.postHold("pay_01");

    const balances = await service.getBalances();
    expect(balances.holds).toBe(0);
    expect(balances.owner_wallet).toBe(60000);
    expect(balances.payee_payable).toBe(40000);
    expect(balances.available_balance).toBe(60000);
  });

  it("releases hold when payment fails or is blocked", async () => {
    await service.topUpOwnerWallet(100000);
    await service.reserve("pay_01", 40000);

    await service.releaseHold("pay_01");

    const balances = await service.getBalances();
    expect(balances.holds).toBe(0);
    expect(balances.owner_wallet).toBe(100000);
    expect(balances.available_balance).toBe(100000);
  });
});
