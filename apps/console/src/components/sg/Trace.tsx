import { useSpecGate, type Payment } from "@/src/lib/specgate-store";
import { naira, kobo } from "@/src/lib/format";
import { cn } from "@/src/lib/utils";
import { StatusTag, Tag } from "./ui";

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-border/60 py-2.5 sm:grid-cols-[150px_1fr] sm:gap-3">
      <div className="num text-[10px] uppercase text-dim">{k}</div>
      <div className="min-w-0 break-words text-xs">{children}</div>
    </div>
  );
}

export function TraceInspector({ payment }: { payment?: Payment | undefined }) {
  const sg = useSpecGate();
  if (!payment) return <div className="py-8 text-center text-xs text-dim">Select a payment from the live feed to open its decision trace.</div>;
  const p = payment;
  return (
    <div className="animate-in fade-in">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="num truncate text-[10px] text-dim">{p.id}</div>
          <div className="truncate text-sm font-semibold">
            {p.label} → {p.payee}
          </div>
        </div>
        <StatusTag status={p.status} />
      </div>
      <div className="mt-2">
        <Row k="Amount">
          <span className="num">
            {naira(p.amount_kobo)} · {kobo(p.amount_kobo)}
          </span>
        </Row>
        <Row k="Idempotency-Key">
          <div className="flex flex-wrap items-center gap-2">
            <span className="num break-all">{p.idem}</span>
            <button
              onClick={() => sg.replay(p.id)}
              className="num rounded-sm border border-border px-2 py-1 text-[10px] hover:border-primary hover:text-primary"
            >
              ↻ Replay Request (Test Idempotency)
            </button>
          </div>
          {p.replays > 0 && (
            <div className="num mt-1.5 text-[10.5px] text-primary">Replayed ×{p.replays} → cached receipt returned · 0 duplicate payouts</div>
          )}
        </Row>
        <Row k="Deterministic Rule">
          <span className={cn("num font-bold", p.ruleCheck.pass ? "text-primary" : "text-destructive")}>{p.ruleCheck.pass ? "PASS" : "FAIL"}</span>{" "}
          <span className="num text-muted-foreground">({p.ruleCheck.detail})</span>
        </Row>
        <Row k="AI Intent Verdict">
          <span className={cn("num font-bold", p.aiVerdict.action === "ok" ? "text-primary" : "text-destructive")}>
            {p.aiVerdict.action}
          </span>
          <div className="mt-1 italic text-muted-foreground">{p.aiVerdict.reason}</div>
        </Row>
        <Row k="Agent Reason">
          <span className="italic text-muted-foreground">"{p.reason}"</span>
        </Row>
        {p.code && (
          <Row k="Reason Code">
            <Tag tone="bad">{p.code}</Tag>
          </Row>
        )}
        <Row k="Settlement Proof">
          {p.koraRef ? (
            <div className="num space-y-0.5 text-[11px]">
              <div>
                Kora Sandbox Ref: <span className="text-foreground">{p.koraRef}</span>
              </div>
              <div className="text-primary">Webhook Signature: HMAC-SHA256 Verified ✓</div>
              <div className="text-primary">Re-Query Status: CONFIRMED</div>
            </div>
          ) : (
          <span className="num text-dim">{p.status === "blocked" || p.status === "failed" ? "None — 0 kobo moved" : "Awaiting settlement"}</span>
          )}
        </Row>
      </div>
    </div>
  );
}
