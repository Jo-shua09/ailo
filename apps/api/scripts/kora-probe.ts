// Kora sandbox probe: proves our payout + verify + duplicate handling against the real sandbox.
// Run from apps/api:  npx tsx --env-file=.env scripts/kora-probe.ts
// Endpoints are from Kora's official API collection (pau/ailo-planning/research/kora-verified.md).
// Test keys only; prints statuses, never the key.

const base = process.env.KORA_BASE_URL;
const key = process.env.KORA_SECRET_KEY ?? "";
if (!base || !key.startsWith("sk_test_")) {
  console.error("Refusing to run: needs KORA_BASE_URL and a sk_test_ key in apps/api/.env");
  process.exit(1);
}

const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(`${base}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const json = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: any } | null;
  return { http: res.status, ok: json?.status, message: json?.message, data: json?.data };
}

const reference = `AL-probe-${Date.now()}`;
const payout = {
  reference,
  destination: {
    type: "bank_account",
    amount: 1000,
    currency: "NGN",
    narration: "Ailo sandbox probe",
    bank_account: { bank: "033", account: "0000000000" },
    customer: { name: "Ailo Probe", email: "johndoe@korapay.com" },
  },
};

const balances = await call("GET", "/balances");
console.log("1. balances      ", balances.http, balances.message, JSON.stringify(balances.data?.NGN ?? balances.data));

const sent = await call("POST", "/transactions/disburse", payout);
console.log("2. disburse      ", sent.http, sent.message, "| status:", sent.data?.status, "| amount:", sent.data?.amount, typeof sent.data?.amount);
if (sent.http >= 400) console.log("   field errors:", JSON.stringify(sent.data));

await new Promise((r) => setTimeout(r, 3000));
const verified = await call("GET", `/transactions/${encodeURIComponent(reference)}`);
console.log("3. verify by ref ", verified.http, verified.message, "| status:", verified.data?.status, "| amount:", verified.data?.amount, typeof verified.data?.amount);

const dupe = await call("POST", "/transactions/disburse", payout);
console.log("4. same ref again", dupe.http, dupe.message, "| status:", dupe.data?.status);

const missing = await call("GET", "/transactions/AL-probe-does-not-exist");
console.log("5. unknown ref   ", missing.http, missing.message);
