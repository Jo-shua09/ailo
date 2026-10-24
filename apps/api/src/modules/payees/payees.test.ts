import { describe, expect, it } from "vitest";
import { getPayee } from "./payees";

describe("payee directory", () => {
  it("returns the demo shop's payout account (Kora sandbox success bank)", () => {
    const payee = getPayee("payee_mama_ngozi");
    expect(payee).toMatchObject({ bank_code: "033", account_number: "0000000000" });
    expect(payee?.email).toBe("johndoe@korapay.com"); // Kora rejects reserved test domains like .example
  });

  it("returns nothing for an unknown payee, so no payout can go to a made-up account", () => {
    expect(getPayee("payee_unknown")).toBeUndefined();
  });
});
