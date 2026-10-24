"use client";

// cspell: disable
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { API, getToken, ownerFetch } from "./api";

export const WEEKLY_CAP_KOBO = 5_000_000;
export const THRESHOLD_KOBO = 1_000_000;

export type PaymentStatus =
  | "requested"
  | "blocked"
  | "pending_approval"
  | "approved"
  | "escrow_held"
  | "submitted"
  | "settled"
  | "denied"
  | "failed";

export type Payment = {
  id: string;
  step: number;
  label: string;
  payee: string;
  amountKobo: number;
  amount_kobo: number;
  category: string;
  reason: string;
  idem: string;
  status: PaymentStatus;
  ruleCheck: { pass: boolean; detail: string };
  aiVerdict: {
    pass?: boolean;
    score?: number;
    detail?: string;
    action?: "ok" | "escalate" | "block";
    reason?: string;
  };
  code?: string;
  koraRef?: string;
  /** The receipt's check trail from GET /v1/payments/:id. */
  checks?: Check[];
  replays: number;
  createdAt: number;
};

export type Check = { step: string; result: "pass" | "fail" | "skipped"; detail?: string };

/** Spec Gate policy, as the API stores it (amounts in kobo). */
export type SpendPolicy = {
  allowed_categories: string[];
  allowed_payees: string[];
  spending_limits: { amount_kobo: number; interval: "per_payment" | "daily" | "weekly"; categories?: string[] }[];
  nod_above_kobo: number;
  nod_rolling_payee_24h_kobo: number;
  expires_at: string;
};

export type SavedRule = { version: number; english_rule: string; policy: SpendPolicy; created_at: string };

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

export type Agent = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  status: "active" | "paused";
  spentThisWeek: string;
  allowanceKobo: number;
  thresholdKobo: number;
  description: string;
};

export const INITIAL_AGENTS: Agent[] = [];

type Store = {
  compiled: boolean;
  compiling: boolean;
  revoked: boolean;
  englishRule: string;
  setEnglishRule: (s: string) => void;
  spentKobo: number;
  payments: Payment[];
  approvals: { id: string; payment_id: string; amount_kobo: number; payee_name: string; status: string; created_at: string }[];
  balance: number;
  loading: boolean;
  loadError: string | null;
  reload: () => Promise<void>;
  rule: SavedRule | null;
  compileRule: (english: string) => Promise<SpendPolicy>;
  saveRule: (english: string, policy: SpendPolicy) => Promise<void>;
  squareUp: () => Promise<{ checked_count: number; breaks_count: number; status: string }>;
  ledger: LedgerEntry[];
  agents: Agent[];
  registerAgent: (name: string, publicKeyX: string) => Promise<void>;
  toggleAgentStatus: (id: string) => void;
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
// Receipts carry the real verdicts; the payments list does not, so read them from the check trail.
const limitOf = (policy: SpendPolicy | undefined, interval: "per_payment" | "daily" | "weekly") =>
  policy?.spending_limits.find((l) => l.interval === interval)?.amount_kobo ?? 0;

function verdictsFrom(checks: Check[], decidedBy: unknown): Pick<Payment, "ruleCheck" | "aiVerdict"> {
  const rules = checks.find((c) => c.step === "rules");
  const look = checks.find((c) => c.step === "second_look");
  const action = !look || look.result !== "fail" ? "ok" : decidedBy === "second_look" ? "block" : "escalate";
  return {
    ruleCheck: { pass: rules?.result !== "fail", detail: rules?.detail || "No rule check recorded" },
    aiVerdict: { action, reason: look ? `${look.result === "skipped" ? "Not run" : look.result}: ${look.detail || ""}` : "Not run" },
  };
}

const uid = (p: string) => `${p}_${(++seq).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function SpecGateProvider({ children }: { children: ReactNode }) {
  const [englishRule, setEnglishRule] = useState(DEFAULT_RULE);
  const [compiled, setCompiled] = useState(true);
  const [compiling, setCompiling] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const [spentKobo, setSpent] = useState(0);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [approvals, setApprovals] = useState<{ id: string; payment_id: string; amount_kobo: number; payee_name: string; status: string; created_at: string }[]>([]);
  const [balance, setBalance] = useState(0);
  const [rule, setRule] = useState<SavedRule | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const reload = useCallback(async () => {
    if (!getToken() || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setLoadError(null);
    try {
      const [paymentData, approvalData, agentData, balanceData, ruleData] = await Promise.all([
        ownerFetch<{ payments?: Record<string, unknown>[] } | Record<string, unknown>[]>("/v1/payments"),
        ownerFetch<{ approvals?: typeof approvals } | typeof approvals>("/v1/approvals"),
        ownerFetch<{ agents?: Record<string, unknown>[] } | Record<string, unknown>[]>("/v1/agents"),
        ownerFetch<Record<string, number>>("/v1/ledger/balances"),
        ownerFetch<SavedRule[]>("/v1/mandates"), // newest first
      ]);
      const latestRule = ruleData[0] ?? null;
      setRule(latestRule);

      const rawPayments = Array.isArray(paymentData) ? paymentData : (paymentData.payments || []);
      const receipts = new Map<string, Check[]>();
      await Promise.all(rawPayments.slice(0, 20).map(async (p) => {
        const detail = await ownerFetch<{ receipt?: { checks?: Check[] } }>(`/v1/payments/${String(p.id)}`).catch(() => null);
        if (detail?.receipt?.checks) receipts.set(String(p.id), detail.receipt.checks);
      }));
      setPayments(rawPayments.map((p) => ({
        id: String(p.id), step: 0, label: String(p.narration || p.reason || "Payment"),
        payee: String(p.payee_name || p.payee_id || "Payee"), amount_kobo: Number(p.amount_kobo || 0), amountKobo: Number(p.amount_kobo || 0),
        category: String(p.category || ""), reason: String(p.reason || p.narration || ""), idem: String(p.idempotency_key || ""),
        status: p.status as PaymentStatus, ruleCheck: { pass: true, detail: String(p.rule_check?.toString() || "Server rules applied") },
        aiVerdict: (p.second_look as Payment["aiVerdict"]) || { action: "ok", reason: "No Second Look detail" },
        code: p.reason_code as string | undefined, koraRef: p.kora_reference as string | undefined, replays: 0,
        createdAt: Date.parse(String(p.created_at || "")) || Date.now(),
        ...(receipts.has(String(p.id)) ? { checks: receipts.get(String(p.id)), ...verdictsFrom(receipts.get(String(p.id))!, p.decided_by) } : {}),
      })));

      const rawApprovals = Array.isArray(approvalData) ? approvalData : (approvalData.approvals || []);
      setApprovals(rawApprovals);

      const rawAgents = Array.isArray(agentData) ? agentData : (agentData.agents || []);
      setAgents(rawAgents.map((a) => ({
        id: String(a.id), name: String(a.name || "Agent"), role: "AI agent", avatar: "/images/shop-agent.jpg",
        status: a.status === "active" ? "active" : "paused", spentThisWeek: "", allowanceKobo: limitOf(latestRule?.policy, "weekly") || limitOf(latestRule?.policy, "per_payment"),
        thresholdKobo: latestRule?.policy.nod_above_kobo ?? 0, description: "Registered agent",
      })));

      const avail = balanceData.available_balance ?? balanceData.available_balance_kobo ?? balanceData.owner_wallet ?? 0;
      setBalance(Number(avail));
      setLedger([]);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load account data.");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let events: EventSource | undefined;
    const connect = () => {
      events?.close();
      const token = getToken();
      if (!token) return;
      void reload();
      events = new EventSource(`${API}/v1/events?access_token=${encodeURIComponent(token)}`);
      events.onmessage = () => void reload();
    };
    window.addEventListener("ailo:session", connect);
    connect();
    return () => { window.removeEventListener("ailo:session", connect); events?.close(); };
  }, [reload]);
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

  const registerAgent = useCallback(async (name: string, publicKeyX: string) => {
    await ownerFetch("/v1/agents", {
      method: "POST",
      body: JSON.stringify({
        name,
        public_jwk: { kty: "OKP", crv: "Ed25519", x: publicKeyX },
      }),
    });
    await reload();
  }, [reload]);

  // Spec Gate: the model only proposes a policy; nothing is enforced until saveRule stores it.
  const compileRule = useCallback(async (english: string) => {
    const { policy } = await ownerFetch<{ policy: SpendPolicy }>("/v1/mandates/compile", { method: "POST", body: JSON.stringify({ english }) });
    return policy;
  }, []);

  const saveRule = useCallback(async (english: string, policy: SpendPolicy) => {
    await ownerFetch("/v1/mandates", { method: "POST", body: JSON.stringify({ english, policy }) });
    await reload();
  }, [reload]);

  // Square Up: asks Kora for the final status of anything still in flight.
  const squareUp = useCallback(async () => {
    const result = await ownerFetch<{ checked_count: number; breaks_count: number; status: string }>("/v1/ops/reconcile", { method: "POST" });
    await reload();
    return result;
  }, [reload]);

  const toggleAgentStatus = useCallback((id: string) => {
    void ownerFetch(`/v1/agents/${id}/brake`, { method: "POST" }).then(reload);
  }, [reload]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const notify = (notice: PhoneNotice) => {
    setNotices((n) => [...n, notice]);
  };

  const pushFrame = (frame: ProtoFrame) => {
    setFrames((f) => [...f, frame]);
  };

  const compile = useCallback((_ruleText: string) => {
    setCompiling(true);
    setCompiled(false);
    clearTimers();
    setFrames([]);
    setBanner(null);

    later(300, () => {
      setCompiling(false);
      setCompiled(true);
      done(1);
    });
  }, []);

  const runStep = useCallback(
    (step: number) => {
      if (revokedRef.current) return;
      if (step === 1) compile(englishRule);
      else void reload();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [compile, englishRule, reload],
  );

  const approve = async (id: string) => { await ownerFetch(`/v1/approvals/${id}`, { method: "POST", body: JSON.stringify({ decision: "approve" }) }); await reload(); };

  const deny = async (id: string) => { await ownerFetch(`/v1/approvals/${id}`, { method: "POST", body: JSON.stringify({ decision: "deny" }) }); await reload(); };

  const release = async (id: string) => { await ownerFetch(`/v1/escrows/${id}/release`, { method: "POST" }); await reload(); };

  const replay = (id: string) => {
    setPayments((list) => list.map((p) => (p.id === id ? { ...p, replays: (p.replays || 0) + 1 } : p)));
  };

  const revoke = () => {
    revokedRef.current = true;
    setRevoked(true);
    void Promise.all(agents.map((agent) => ownerFetch(`/v1/agents/${agent.id}/brake`, { method: "POST" }))).then(reload);
    notify({
      id: uid("n"),
      tone: "bad",
      title: "Emergency Brake Engaged",
      body: "All agents paused. All outbound spending stopped.",
    });
  };

  const reset = () => {
    revokedRef.current = false;
    setRevoked(false);
    setSpent(0);
    setPayments([]);
    setAgents([]);
    setLedger([]);
    setFrames([]);
    setNotices([]);
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
      approvals,
      balance,
      loading,
      loadError,
      reload,
      rule,
      compileRule,
      saveRule,
      squareUp,
      ledger,
      agents,
      registerAgent,
      toggleAgentStatus,
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
      approvals,
      balance,
      loading,
      loadError,
      reload,
      rule,
      compileRule,
      saveRule,
      squareUp,
      ledger,
      agents,
      registerAgent,
      toggleAgentStatus,
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
