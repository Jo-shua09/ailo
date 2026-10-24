"use client";

// cspell: disable
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

import { DEMO_PAYMENTS, DEMO_LEDGER } from "./ailo-demo";

export const WEEKLY_CAP_KOBO = 5_000_000;
export const THRESHOLD_KOBO = 1_000_000;
const STARTING_SPENT_KOBO = 850_000;

export type PaymentStatus = "requested" | "blocked" | "pending_approval" | "approved" | "escrow_held" | "submitted" | "settled" | "denied" | "failed";

export type Payment = {
  id: string;
  step: number;
  label: string;
  payee: string;
  amountKobo: number;
  category: string;
  reason: string;
  idem: string;
  status: PaymentStatus;
  ruleCheck: { pass: boolean; detail: string };
  aiVerdict: { pass: boolean; score: number; detail: string };
  code?: string;
  koraRef?: string;
  replays: number;
  createdAt: number;
};

export type LedgerEntry = {
  id: string;
  txn: string;
  account: "owner_treasury" | "specgate_escrow" | "payee_settlement_kora";
  debit: number;
  credit: number;
  memo: string;
};

export type ProtoFrame = { id: string; from: "agent" | "gate" | "payee"; tone: "info" | "ok" | "warn" | "bad"; text: string };

export type PhoneNotice = { id: string; tone: "ok" | "warn" | "bad"; title: string; body: string };

type Store = {
  compiled: boolean;
  compiling: boolean;
  revoked: boolean;
  englishRule: string;
  setEnglishRule: (s: string) => void;
  spentKobo: number;
  payments: Payment[];
  ledger: LedgerEntry[];
  frames: ProtoFrame[];
  notices: PhoneNotice[];
  attackSnippet: boolean;
  interceptBanner: string | null;
  selectedId: string | null;
  select: (id: string | null) => void;
  completed: number[];
  runStep: (n: number) => void;
  approve: (id: string) => void;
  deny: (id: string) => void;
  release: (id: string) => void;
  replay: (id: string) => void;
  revoke: () => void;
  reset: () => void;
};

const Ctx = createContext<Store | null>(null);

const DEFAULT_RULE = "My shop agent can spend ₦50,000 a week on stock. Ask me above ₦10,000.";

let seq = 0;
const uid = (p: string) => `${p}_${(++seq).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const koraRef = () => `KPY-NG-20261023-${Math.floor(1000 + Math.random() * 8999)}`;

const SCENARIOS: Record<number, Omit<Payment, "id" | "status" | "replays" | "createdAt" | "step">> = {
  2: {
    label: "Research API call",
    payee: "NaijaMarket Research API",
    amountKobo: 50_000,
    category: "market_research_api",
    reason: "Fetch Lagos fabric price index for weekly restock planning",
    idem: "idem_8840_ng_research",
    ruleCheck: { pass: true, detail: "50,000 kobo ≤ 1,000,000 kobo threshold · market_research_api ∈ allowlist" },
    aiVerdict: { pass: true, score: 0.97, detail: "Reason 'price index for restock planning' aligns with mandate purpose: research." },
  },
  3: {
    label: "Shop stock purchase",
    payee: "Mama Ngozi Stores",
    amountKobo: 850_000,
    category: "inventory_stock",
    reason: "Restock rice for the shop",
    idem: "idem_8841_ng_stock",
    ruleCheck: { pass: true, detail: "850,000 kobo ≤ 1,000,000 kobo threshold · inventory_stock ∈ allowlist" },
    aiVerdict: { pass: true, score: 0.98, detail: "Reason 'Restock rice for the shop' matches mandate purpose." },
  },
  4: {
    label: "Unexpected gift hamper",
    payee: "Mama Ngozi Stores",
    amountKobo: 900_000,
    category: "inventory_stock",
    reason: "Buy executive gift hamper — urgent supplier promo",
    idem: "idem_8842_ng_injected",
    code: "INTENT_DRIFT_INJECTION",
    ruleCheck: { pass: true, detail: "Approved shop and within your allowance. The item still needs a second look." },
    aiVerdict: { pass: false, score: 0.03, detail: "FAIL — Prompt injection detected attempting unauthorized transfer outside mandate scope." },
  },
  5: {
    label: "High-value stock order",
    payee: "Mama Ngozi Stores",
    amountKobo: 1_200_000,
    category: "inventory_stock",
    reason: "Order vegetable oil and rice for weekend restock",
    idem: "idem_8843_ng_wholesale",
    ruleCheck: { pass: true, detail: "1,200,000 kobo > 1,000,000 kobo threshold → owner approval + escrow required" },
    aiVerdict: { pass: true, score: 0.95, detail: "Reason 'weekend restock of peak milk' aligns with mandate purpose: stock." },
  },
};

export function SpecGateProvider({ children }: { children: ReactNode }) {
  const [englishRule, setEnglishRule] = useState(DEFAULT_RULE);
  const [compiled, setCompiled] = useState(true);
  const [compiling, setCompiling] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const [spentKobo, setSpent] = useState(STARTING_SPENT_KOBO);
  const [payments, setPayments] = useState<Payment[]>(DEMO_PAYMENTS);
  const [ledger, setLedger] = useState<LedgerEntry[]>(DEMO_LEDGER);
  const [frames, setFrames] = useState<ProtoFrame[]>([]);
  const [notices, setNotices] = useState<PhoneNotice[]>([]);
  const [attackSnippet, setAttackSnippet] = useState(false);
  const [interceptBanner, setBanner] = useState<string | null>(null);
  const [selectedId, select] = useState<string | null>(null);
  const [completed, setCompleted] = useState<number[]>([1, 3, 4, 5]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const revokedRef = useRef(false);

  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
  const done = (n: number) => setCompleted((c) => (c.includes(n) ? c : [...c, n]));
  const frame = (f: Omit<ProtoFrame, "id">) => setFrames((fs) => [...fs.slice(-14), { ...f, id: uid("f") }]);
  const notify = (n: Omit<PhoneNotice, "id">) => setNotices((ns) => [{ ...n, id: uid("n") }, ...ns].slice(0, 6));
  const patch = (id: string, p: Partial<Payment>) => setPayments((ps) => ps.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const post = (txn: string, from: LedgerEntry["account"], to: LedgerEntry["account"], amt: number, memo: string) =>
    setLedger((l) => [
      ...l,
      { id: uid("le"), txn, account: from, debit: amt, credit: 0, memo },
      { id: uid("le"), txn, account: to, debit: 0, credit: amt, memo },
    ]);

  const reject = (n: number) => {
    const s = SCENARIOS[n];
    if (!s) return;
    const p: Payment = {
      ...s,
      id: uid("pi"),
      step: n,
      status: "blocked",
      code: "MANDATE_REVOKED",
      ruleCheck: { pass: false, detail: "Mandate mnd_01J8X9 status = REVOKED" },
      aiVerdict: { pass: false, score: 0, detail: "Not evaluated — mandate revoked before intent check." },
      replays: 0,
      createdAt: Date.now(),
    };
    setPayments((ps) => [p, ...ps]);
    select(p.id);
    frame({ from: "gate", tone: "bad", text: `403 MANDATE_REVOKED · ${s.label} refused · 0 kobo moved` });
    setBanner("REFUSED • CODE: MANDATE_REVOKED • 0 KOBO MOVED");
  };

  const runStep = useCallback(
    (n: number) => {
      if (n === 1) {
        if (revokedRef.current) return;
        setCompiling(true);
        later(400, () => {
          setCompiling(false);
          setCompiled(true);
          done(1);
          frame({ from: "gate", tone: "ok", text: "Mandate mnd_01J8X9 compiled · status ACTIVE" });
        });
        return;
      }
      if (n === 6) {
        revokedRef.current = true;
        setRevoked(true);
        done(6);
        frame({ from: "gate", tone: "bad", text: "POST /v1/mandates/mnd_01J8X9/revoke → MANDATE_REVOKED" });
        notify({ tone: "bad", title: "Mandate revoked", body: "Kill switch engaged. agt_shop_buyer_01 can no longer pay." });
        return;
      }
      const s = SCENARIOS[n];
      if (!s) return;
      if (revokedRef.current) return reject(n);
      if (!compiled) {
        frame({ from: "gate", tone: "warn", text: "No active mandate — compile the mandate first (step 1)" });
        return;
      }
      setBanner(null);
      setAttackSnippet(n === 4);
      const p: Payment = { ...s, id: uid("pi"), step: n, status: "requested", replays: 0, createdAt: Date.now() };
      setPayments((ps) => [p, ...ps]);
      select(p.id);

      const isApi = n === 2;
      const target = isApi ? "GET /v1/fabric-index" : n === 4 ? "GET /products/ankara-bundle" : "POST /checkout";
      frame({ from: "agent", tone: "info", text: `${target} → ${s.payee}` });

      if (n === 4) {
        later(350, () => frame({ from: "payee", tone: "warn", text: "200 OK · page contains hidden HTML comment" }));
        later(750, () => frame({ from: "agent", tone: "info", text: "MCP pay({ amount_kobo: 4500000, to: 0129384756 })" }));
        later(1150, () => {
          frame({ from: "gate", tone: "bad", text: "Rule check FAIL · AI intent FAIL (0.03) · INTENT_DRIFT_INJECTION" });
          patch(p.id, { status: "blocked" });
          setBanner("BLOCKED BY AI INTENT CHECK • CODE: INTENT_DRIFT_INJECTION • 0 KOBO MOVED");
          notify({ tone: "bad", title: "🛡️ Attack blocked", body: "Spec Gate blocked a ₦45,000 prompt injection attempt." });
          done(4);
        });
        return;
      }

      later(350, () => frame({ from: "payee", tone: "warn", text: `402 Payment Required · price_kobo: ${s.amountKobo}` }));
      later(750, () => frame({ from: "agent", tone: "info", text: `Retry w/ KYA sig (Ed25519) · Idempotency-Key: ${s.idem}` }));
      later(1100, () => frame({ from: "gate", tone: "ok", text: `Rule PASS · AI intent PASS (${s.aiVerdict.score})` }));

      if (n === 5) {
        later(1450, () => {
          patch(p.id, { status: "pending_approval" });
          frame({ from: "gate", tone: "warn", text: "Above ₦10,000 → pending_approval · owner phone pinged" });
          done(5);
        });
        return;
      }
      later(1450, () => {
        const ref = koraRef();
        patch(p.id, { status: "settled", koraRef: ref });
        post(p.id, "owner_treasury", "payee_settlement_kora", s.amountKobo, s.label);
        setSpent((x) => x + s.amountKobo);
        frame({ from: "payee", tone: "ok", text: `200 OK · resource unlocked · Kora ${ref} CONFIRMED` });
        done(n);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [compiled],
  );

  const approve = (id: string) => {
    const p = payments.find((x) => x.id === id);
    if (!p || p.status !== "pending_approval") return;
    if (revokedRef.current) return;
    patch(id, { status: "approved" });
    frame({ from: "gate", tone: "ok", text: "Owner approved · locking escrow" });
    later(500, () => {
      patch(id, { status: "escrow_held" });
      post(id, "owner_treasury", "specgate_escrow", p.amountKobo, "Escrow hold");
      setSpent((x) => x + p.amountKobo);
      frame({ from: "gate", tone: "warn", text: `escrow_held · ${p.amountKobo.toLocaleString()} kobo until delivery` });
    });
  };
  const deny = (id: string) => {
    patch(id, { status: "denied", code: "OWNER_DENIED" });
    frame({ from: "gate", tone: "bad", text: "Owner denied · 0 kobo moved" });
  };
  const release = (id: string) => {
    const p = payments.find((x) => x.id === id);
    if (!p || p.status !== "escrow_held") return;
    patch(id, { status: "submitted" });
    later(600, () => {
      const ref = koraRef();
      patch(id, { status: "settled", koraRef: ref });
      post(id, "specgate_escrow", "payee_settlement_kora", p.amountKobo, "Escrow release");
      frame({ from: "payee", tone: "ok", text: `Delivery confirmed · Kora payout ${ref} settled` });
      notify({ tone: "ok", title: "Payment settled", body: `₦12,000 released to ${p.payee}.` });
    });
  };
  const replay = (id: string) => {
    const p = payments.find((x) => x.id === id);
    if (!p) return;
    patch(id, { replays: p.replays + 1 });
    frame({ from: "gate", tone: "ok", text: `Replay ${p.idem} → cached receipt · 0 duplicate payout` });
  };
  const revoke = () => runStep(6);
  const reset = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    revokedRef.current = false;
    setCompiled(true);
    setCompiling(false);
    setRevoked(false);
    setSpent(STARTING_SPENT_KOBO);
    setPayments(DEMO_PAYMENTS);
    setLedger(DEMO_LEDGER);
    setFrames([]);
    setNotices([]);
    setAttackSnippet(false);
    setBanner(null);
    select(null);
    setCompleted([1, 3, 4, 5]);
    setEnglishRule(DEFAULT_RULE);
  };

  const value = useMemo<Store>(
    () => ({
      compiled,
      compiling,
      revoked,
      englishRule,
      setEnglishRule,
      spentKobo,
      payments,
      ledger,
      frames,
      notices,
      attackSnippet,
      interceptBanner,
      selectedId,
      select,
      completed,
      runStep,
      approve,
      deny,
      release,
      replay,
      revoke,
      reset,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      compiled,
      compiling,
      revoked,
      englishRule,
      spentKobo,
      payments,
      ledger,
      frames,
      notices,
      attackSnippet,
      interceptBanner,
      selectedId,
      completed,
      runStep,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSpecGate() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSpecGate outside provider");
  return c;
}
