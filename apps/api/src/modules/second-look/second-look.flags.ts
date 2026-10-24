// Cheap deterministic triggers: Second Look only runs on payments that trip one of these.

// shortcut: a tiny hand-written keyword map; unknown categories are never flagged for mismatch.
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  groceries: ["rice", "beans", "garri", "yam", "oil", "food", "grocer", "flour", "sugar", "milk", "bread", "restock", "tomato", "pepper", "onion"],
  stock: ["stock", "restock", "inventory", "supplies", "goods", "carton", "bag"],
  inventory_stock: ["stock", "restock", "inventory", "supplies", "goods", "carton", "bag"],
  electronics: ["phone", "laptop", "charger", "cable", "battery", "electronic", "tv", "speaker"],
};

export type SecondLookFlag = "FIRST_PAYMENT_TO_PAYEE_TODAY" | "PAGE_CONTENT_PRESENT" | "REASON_CATEGORY_MISMATCH";

export function shouldSecondLook(
  payment: { category: string; reason: string; page_text?: string },
  ctx: { payee_payments_today: number },
): { flagged: boolean; flags: SecondLookFlag[] } {
  const flags: SecondLookFlag[] = [];
  if (ctx.payee_payments_today === 0) flags.push("FIRST_PAYMENT_TO_PAYEE_TODAY");
  if (payment.page_text?.trim()) flags.push("PAGE_CONTENT_PRESENT");

  const keywords = CATEGORY_KEYWORDS[payment.category.toLowerCase()];
  const reason = payment.reason.toLowerCase();
  if (keywords && !keywords.some((k) => reason.includes(k))) flags.push("REASON_CATEGORY_MISMATCH");

  return { flagged: flags.length > 0, flags };
}
