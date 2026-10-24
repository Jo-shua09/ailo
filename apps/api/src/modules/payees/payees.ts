/**
 * Where payout money goes. The bank account always comes from here (server side), never from an agent
 * or a 402 response (PRD 5.9), so a poisoned page cannot redirect a payout.
 */
export interface Payee {
  id: string;
  name: string;
  email: string;
  bank_code: string;
  account_number: string;
}

// shortcut: fixed sandbox directory using Kora's success banks (033/044/058), Kora's example account
// 0000000000 and Kora's example email (Kora rejects reserved domains like .example). Sandbox only;
// replace with owner-managed payees (Kora beneficiaries) before going live.
const SANDBOX_EMAIL = "johndoe@korapay.com";
const PAYEES: Record<string, Payee> = {
  payee_mama_ngozi: {
    id: "payee_mama_ngozi", name: "Mama Ngozi Stores", email: SANDBOX_EMAIL,
    bank_code: "033", account_number: "0000000000",
  },
  payee_lagos_logistics: {
    id: "payee_lagos_logistics", name: "Lagos Logistics Ltd", email: SANDBOX_EMAIL,
    bank_code: "044", account_number: "0000000000",
  },
};

export function listPayeeIds(): string[] {
  return Object.keys(PAYEES);
}

export function getPayee(id: string): Payee | undefined {
  return PAYEES[id];
}
