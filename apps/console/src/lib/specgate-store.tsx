"use client";

// cspell: disable
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

import { DEMO_PAYMENTS, DEMO_LEDGER } from "./ailo-demo";

export const WEEKLY_CAP_KOBO = 5_000_000;
export const THRESHOLD_KOBO = 1_000_000;
const STARTING_SPENT_KOBO = 1_245_000;

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

export const INITIAL_AGENTS: Agent[] = [
  {
    id: "shop-agent",
    name: "Shop Agent",
    role: "Shopping & inventory",
    avatar: "/images/shop-agent.jpg",
    status: "active",
    spentThisWeek: "₦12,450 spent this week",
    allowanceKobo: 5_000_000,
    thresholdKobo: 1_000_000,
    description: "Monitors shop inventory, sources items from vetted suppliers, and initiates purchases within rules.",
  },
  {
    id: "research-agent",
    name: "Research Agent",
    role: "Information & research",
    avatar: "/images/research-agent.jpg",
    status: "active",
    spentThisWeek: "₦0 spent this week",
    allowanceKobo: 1_000_000,
    thresholdKobo: 200_000,
    description: "Tracks wholesale market prices, identifies trends across Lagos hubs, and compiles market reports.",
  },
  {
    id: "content-agent",
    name: "Content Agent",
    role: "Content creation & marketing",
    avatar: "/images/content-agent.jpg",
    status: "paused",
    spentThisWeek: "₦0 spent this week",
    allowanceKobo: 1_500_000,
    thresholdKobo: 300_000,
    description: "Drafts product showcases, WhatsApp marketing messages, and promotional campaign copies.",
  },
];

type Store = {
  compiled: boolean;
  compiling: boolean;
  revoked: boolean;
  englishRule: string;
  setEnglishRule: (s: string) => void;
  spentKobo: number;
  payments: Payment[];
  ledger: LedgerEntry[];
  agents: Agent[];
  addAgent: (agent: Agent) => void;
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
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
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

  const addAgent = useCallback((agent: Agent) => {
    setAgents((prev) => [...prev, agent]);
  }, []);

  const toggleAgentStatus = useCallback((id: string) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: a.status === "active" ? "paused" : "active" } : a))
    );
  }, []);

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
      clearTimers();
      setFrames([]);
      setBanner(null);

      if (step === 1) {
        compile(englishRule);
        return;
      }

      const scen = SCENARIOS[step];
      if (!scen) return;

      const pid = uid("pay");
      const payment: Payment = {
        ...scen,
        id: pid,
        step,
        status: "requested",
        replays: 0,
        createdAt: Date.now(),
      };

      setPayments((p) => [payment, ...p]);
      select(pid);

      later(400, () => {
        pushFrame({ id: uid("f"), from: "agent", tone: "info", text: `Payment request: ${scen.label} (${scen.amountKobo / 100} NGN)` });
      });

      if (step === 2) {
        later(900, () => {
          pushFrame({ id: uid("f"), from: "gate", tone: "ok", text: `Allowance ok: ${scen.ruleCheck.detail}` });
          setPayments((list) => list.map((p) => (p.id === pid ? { ...p, status: "settled", koraRef: koraRef() } : p)));
          setSpent((s) => s + scen.amountKobo);
          done(2);
        });
      } else if (step === 3) {
        later(900, () => {
          pushFrame({ id: uid("f"), from: "gate", tone: "ok", text: `Rule check passed. Below threshold.` });
          setPayments((list) => list.map((p) => (p.id === pid ? { ...p, status: "settled", koraRef: koraRef() } : p)));
          setSpent((s) => s + scen.amountKobo);
          done(3);
        });
      } else if (step === 4) {
        setAttackSnippet(true);
        later(900, () => {
          pushFrame({ id: uid("f"), from: "gate", tone: "bad", text: `AI Gate BLOCKED: Prompt injection detected.` });
          setBanner("INTENT DRIFT: AI Gate intercepted unauthorized transfer.");
          setPayments((list) => list.map((p) => (p.id === pid ? { ...p, status: "blocked" } : p)));
          notify({
            id: uid("n"),
            tone: "bad",
            title: "Threat Blocked",
            body: "A rogue prompt injection attempting to spend was stopped.",
          });
          done(4);
        });
      } else if (step === 5) {
        later(900, () => {
          pushFrame({ id: uid("f"), from: "gate", tone: "warn", text: `Above approval threshold. Asking owner.` });
          setPayments((list) => list.map((p) => (p.id === pid ? { ...p, status: "pending_approval" } : p)));
          notify({
            id: uid("n"),
            tone: "warn",
            title: "Approval Needed",
            body: `${scen.label} is above threshold. Your nod is required.`,
          });
          done(5);
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [compile, englishRule],
  );

  const approve = (id: string) => {
    setPayments((list) => list.map((p) => (p.id === id ? { ...p, status: "approved" } : p)));
    later(600, () => {
      setPayments((list) => list.map((p) => (p.id === id ? { ...p, status: "settled", koraRef: koraRef() } : p)));
      const p = payments.find((item) => item.id === id);
      if (p) setSpent((s) => s + p.amountKobo);
    });
  };

  const deny = (id: string) => {
    setPayments((list) => list.map((p) => (p.id === id ? { ...p, status: "denied" } : p)));
  };

  const release = (id: string) => {
    setPayments((list) => list.map((p) => (p.id === id ? { ...p, status: "settled", koraRef: koraRef() } : p)));
  };

  const replay = (id: string) => {
    setPayments((list) => list.map((p) => (p.id === id ? { ...p, replays: (p.replays || 0) + 1 } : p)));
  };

  const revoke = () => {
    revokedRef.current = true;
    setRevoked(true);
    setAgents((prev) => prev.map((a) => ({ ...a, status: "paused" })));
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
    setSpent(STARTING_SPENT_KOBO);
    setPayments(DEMO_PAYMENTS);
    setAgents(INITIAL_AGENTS);
    setLedger(DEMO_LEDGER);
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
      ledger,
      agents,
      addAgent,
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
      ledger,
      agents,
      addAgent,
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
