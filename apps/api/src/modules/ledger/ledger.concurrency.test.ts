import { beforeEach, describe, expect, it } from "vitest";
import { resetMemoryDb } from "../../db/mongo";
import { LedgerService } from "./ledger.service";

describe("ledger reserve under concurrency", () => {
  beforeEach(() => resetMemoryDb());

  it("never reserves more than the available balance when payments arrive at the same moment", async () => {
    const ledger = new LedgerService();
    await ledger.topUpOwnerWallet(5_000_000); // ₦50,000

    // Ten ₦8,000 payments at once: only six fit in ₦50,000.
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) => ledger.reserve(`pay_race_${i}`, 800_000)),
    );

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(6);
    expect((await ledger.getBalances()).available_balance).toBe(5_000_000 - 6 * 800_000);
  });
});
