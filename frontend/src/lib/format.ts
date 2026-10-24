/** Integer kobo -> Naira string. Never float-accumulates: math stays in kobo. */
export function naira(kobo: number, decimals = true): string {
  const whole = Math.trunc(kobo / 100);
  const frac = Math.abs(kobo % 100);
  const w = whole.toLocaleString("en-NG");
  return decimals ? `₦${w}.${String(frac).padStart(2, "0")}` : `₦${w}`;
}

export function kobo(n: number): string {
  return `${n.toLocaleString("en-NG")} kobo`;
}
