import { useSpecGate } from "@/src/lib/specgate-store";
import { naira, kobo } from "@/src/lib/format";
import { cn } from "@/src/lib/utils";

export function Phone() {
  const sg = useSpecGate();
  const pending = sg.payments.find((p) => p.step === 5 && ["pending_approval", "approved", "escrow_held", "submitted"].includes(p.status));
  const isPending = pending?.status === "pending_approval";

  return (
    <div className="mx-auto w-full max-w-[290px]">
      <div
        className={cn(
          "rounded-[2.2rem] border border-border bg-well p-2.5 transition",
          isPending && "glow-warning",
          sg.revoked && "glow-destructive",
        )}
      >
        <div className="relative flex h-[500px] flex-col overflow-hidden rounded-[1.7rem] border border-border bg-background">
          <div className="num flex items-center justify-between px-5 pt-3 text-[10px] text-muted-foreground">
            <span>20:22</span>
            <span className="h-4 w-16 rounded-full bg-well" />
            <span>MTN 5G</span>
          </div>
          <div className="px-4 pt-3">
            <div className="text-[11px] text-dim">Spec Gate · Owner</div>
            <div className="font-display text-base font-semibold">Chidi&apos;s Shop Agent</div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {pending && (
              <div className={cn("rounded-xl border p-3", isPending ? "border-warning/60 bg-warning/10" : "border-primary/40 bg-primary/5")}>
                <div className={cn("num text-[9.5px] font-bold tracking-wider", isPending ? "text-warning" : "text-primary")}>
                  {isPending ? "● APPROVAL NEEDED" : `● ${pending.status.toUpperCase()}`}
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">Payee</div>
                <div className="text-xs font-semibold">
                  {pending.payee} <span className="text-primary">(KYA Verified)</span>
                </div>
                <div className="num mt-2 text-xl font-semibold">{naira(pending.amount_kobo)}</div>
                <div className="num text-[10px] text-dim">{kobo(pending.amount_kobo)}</div>
                <div className="mt-2 text-[11px] italic text-muted-foreground">"{pending.reason}"</div>
                <div className="num mt-2 text-[10px] text-warning">Escrow hold until delivery confirmed</div>
                {isPending && (
                  <div className="mt-3 grid gap-1.5">
                    <button
                      onClick={() => sg.approve(pending.id)}
                      className="rounded-lg bg-primary py-2 text-[11px] font-bold text-primary-foreground active:scale-[.98]"
                    >
                      ✓ APPROVE &amp; LOCK ESCROW
                    </button>
                    <button
                      onClick={() => sg.deny(pending.id)}
                      className="rounded-lg border border-destructive/60 py-2 text-[11px] font-bold text-destructive active:scale-[.98]"
                    >
                      ✕ DENY
                    </button>
                  </div>
                )}
                {pending.status === "escrow_held" && (
                  <button
                    onClick={() => sg.release(pending.id)}
                    className="mt-3 w-full rounded-lg bg-primary py-2 text-[11px] font-bold text-primary-foreground"
                  >
                    Confirm Delivery &amp; Release Escrow
                  </button>
                )}
                {(pending.status === "approved" || pending.status === "submitted") && (
                  <div className="num mt-3 text-center text-[10px] text-muted-foreground">processing…</div>
                )}
              </div>
            )}
            {sg.notices.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "rounded-xl border p-3 animate-in fade-in slide-in-from-top-2",
                  n.tone === "bad"
                    ? "border-destructive/50 bg-destructive/10"
                    : n.tone === "warn"
                      ? "border-warning/50 bg-warning/10"
                      : "border-primary/40 bg-primary/10",
                )}
              >
                <div className="text-xs font-semibold">{n.title}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{n.body}</div>
              </div>
            ))}
            {!pending && sg.notices.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="font-serif text-2xl italic text-muted-foreground">All quiet.</div>
                <div className="mt-1 text-[11px] text-dim">Approvals and alerts land here in under 2 seconds.</div>
              </div>
            )}
          </div>
          <div className="mx-auto mb-2 h-1 w-24 rounded-full bg-muted" />
        </div>
      </div>
    </div>
  );
}
