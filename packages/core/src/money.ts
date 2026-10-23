// All money in Ailo is integer kobo. Naira strings are parsed by text, never via floats.

const NAIRA = /^(\d+)(?:\.(\d{1,2}))?$/;

export function nairaToKobo(naira: string | number): number {
  const text = String(naira).replace(/,/g, "").trim();
  const match = NAIRA.exec(text);
  if (!match) throw new RangeError(`Invalid naira amount: ${naira}`);
  const kobo = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (!Number.isSafeInteger(kobo)) throw new RangeError(`Amount too large: ${naira}`);
  return kobo;
}

const formatter = new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatNaira(kobo: number): string {
  if (!Number.isSafeInteger(kobo)) throw new RangeError(`Kobo must be an integer: ${kobo}`);
  return `₦${formatter.format(kobo / 100)}`;
}
