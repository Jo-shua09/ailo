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

type ApprovalRecord = { id: string; payment_id: string; amount_kobo: number; payee_name: string; status: string; created_at: string };

/** One row per actionable approval or pending payment awaiting its approval record. */
export function getPendingApprovalItems(approvals: ApprovalRecord[], payments: Payment[]) {
  const pending = approvals
    .filter((approval) => ["pending", "pending_approval"].includes(String(approval.status || "pending").toLowerCase()))
    .map((approval) => ({ approval, payment: payments.find((payment) => payment.id === approval.payment_id) }));
  const representedPaymentIds = new Set(pending.map(({ approval }) => approval.payment_id));
  const missingApprovalPayments = payments
    .filter((payment) => payment.status === "pending_approval" && !representedPaymentIds.has(payment.id))
    .map((payment) => ({ approval: null, payment }));
  return [...pending, ...missingApprovalPayments];
}

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
  approvals: ApprovalRecord[];
  balance: number;
  loading: boolean;
  loadError: string | null;
  approvalsLoadError: string | null;
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
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [balance, setBalance] = useState(0);
  const [rule, setRule] = useState<SavedRule | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [approvalsLoadError, setApprovalsLoadError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const reloadQueuedRef = useRef(false);

  const reload = useCallback(async () => {
    if (!getToken()) return;
    if (loadingRef.current) {
      reloadQueuedRef.current = true;
      return;
    }
    loadingRef.current = true;
    setLoading(true);
    setLoadError(null);
    try {
      const [paymentResult, approvalResult, agentResult, balanceResult, ruleResult] = await Promise.allSettled([
        ownerFetch<{ payments?: Record<string, unknown>[] } | Record<string, unknown>[]>("/v1/payments"),
        ownerFetch<{ approvals?: typeof approvals } | typeof approvals>("/v1/approvals"),
        ownerFetch<{ agents?: Record<string, unknown>[] } | Record<string, unknown>[]>("/v1/agents"),
        ownerFetch<Record<string, number>>("/v1/ledger/balances"),
        ownerFetch<SavedRule[] | { mandates?: SavedRule[] }>("/v1/mandates"),
      ]);
      const failures: string[] = [];
      const errorText = (reason: unknown) => reason instanceof Error ? reason.message : "Request failed.";

      if (paymentResult.status === "fulfilled") {
        const paymentData = paymentResult.value;
        const rawPayments = Array.isArray(paymentData) ? paymentData : (paymentData.payments || []);
        const receipts = new Map<string, Check[]>();
        await Promise.all(rawPayments.slice(0, 20).map(async (payment) => {
          const paymentId = String(payment.id);
          const detail = await ownerFetch<{ receipt?: { checks?: Check[] } }>("/v1/payments/" + paymentId).catch(() => null);
          if (detail?.receipt?.checks) receipts.set(paymentId, detail.receipt.checks);
        }));
        setPayments(rawPayments.map((payment) => {
          const paymentId = String(payment.id);
          const checks = receipts.get(paymentId);
          return {
            id: paymentId,
            step: 0,
            label: String(payment.narration || payment.reason || "Payment"),
            payee: String(payment.payee_name || payment.payee_id || "Payee"),
            amount_kobo: Number(payment.amount_kobo || 0),
            amountKobo: Number(payment.amount_kobo || 0),
            category: String(payment.category || ""),
            reason: String(payment.reason || payment.narration || ""),
            idem: String(payment.idempotency_key || ""),
            status: payment.status as PaymentStatus,
            ruleCheck: { pass: true, detail: String(payment.rule_check?.toString() || "Server rules applied") },
            aiVerdict: (payment.second_look as Payment["aiVerdict"]) || { action: "ok", reason: "No Second Look detail" },
            code: payment.reason_code as string | undefined,
            koraRef: payment.kora_reference as string | undefined,
            replays: 0,
            createdAt: Date.parse(String(payment.created_at || "")) || Date.now(),
            ...(checks ? { checks, ...verdictsFrom(checks, payment.decided_by) } : {}),
          };
        }));
      } else {
        failures.push("Payments: " + errorText(paymentResult.reason));
      }

      if (approvalResult.status === "fulfilled") {
        const approvalData = approvalResult.value;
        const rawApprovals = Array.isArray(approvalData) ? approvalData : (approvalData.approvals || []);
        setApprovals(rawApprovals);
        setApprovalsLoadError(null);
      } else {
        const message = errorText(approvalResult.reason);
        setApprovalsLoadError(message);
        failures.push("Approvals: " + message);
      }

      if (agentResult.status === "fulfilled") {
        const agentData = agentResult.value;
        const rawAgents = Array.isArray(agentData) ? agentData : (agentData.agents || []);
        setAgents(rawAgents.map((agent) => ({
          id: String(agent.id),
          name: String(agent.name || "Agent"),
          role: "AI agent",
          avatar: "/images/shop-agent.jpg",
          status: agent.status === "active" ? "active" : "paused",
          spentThisWeek: "",
          allowanceKobo: Number((agent.rules as Record<string, unknown> | undefined)?.max_amount_kobo || 0),
          thresholdKobo: 0,
          description: "Registered agent",
        })));
      } else {
        failures.push("Agents: " + errorText(agentResult.reason));
      }

      if (balanceResult.status === "fulfilled") {
        const balanceData = balanceResult.value;
        const available = balanceData.available_balance ?? balanceData.available_balance_kobo ?? balanceData.owner_wallet ?? 0;
        setBalance(Number(available));
        setLedger([]);
      } else {
        failures.push("Ledger: " + errorText(balanceResult.reason));
      }

      if (ruleResult.status === "fulfilled") {
        const ruleData = ruleResult.value;
        const rules = Array.isArray(ruleData) ? ruleData : (ruleData.mandates || []);
        setRule(rules[0] ?? null);
      } else {
        failures.push("Rules: " + errorText(ruleResult.reason));
      }

      setLoadError(failures.length ? failures.join(" ") : null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load account data.");
    } finally {
      loadingRef.current = false;
      setLoading(false);
      if (reloadQueuedRef.current) {
        reloadQueuedRef.current = false;
        queueMicrotask(() => void reload());
      }
    }
  }, []);

  useEffect(() => {
    let events: EventSource | undefined;
    let poll: ReturnType<typeof setInterval> | undefined;
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void reload();
    };
    const connect = () => {
      events?.close();
      if (poll) clearInterval(poll);
      const token = getToken();
      if (!token) return;
      void reload();
      events = new EventSource(`${API}/v1/events?access_token=${encodeURIComponent(token)}`);
      const refresh = () => void reload();
      events.onmessage = refresh;
      // The API sends named SSE events (apps/api events.service.ts), which never trigger onmessage.
      for (const eventName of ["payment.updated", "approval.created"]) {
        events.addEventListener(eventName, refresh);
      }
      // Keep the dashboard current if the stream is unavailable or an event is missed.
      poll = setInterval(refreshIfVisible, 30_000);
    };
    window.addEventListener("ailo:session", connect);
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);
    connect();
    return () => {
      window.removeEventListener("ailo:session", connect);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      if (poll) clearInterval(poll);
      events?.close();
    };
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
      approvalsLoadError,
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
      approvalsLoadError,
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
