import { useSpecGate } from "@/src/lib/specgate-store";
import { naira } from "@/src/lib/format";
import { cn } from "@/src/lib/utils";

export function BalanceBadge() {
  const { ledger } = useSpecGate();
  const d = ledger.reduce((s, e) => s + e.debit, 0);
  const c = ledger.reduce((s, e) => s + e.credit, 0);
  const ok = d === c;
  return (
    <div
      className={cn(
        "num rounded-sm border px-3 py-2 text-[10.5px] leading-snug",
        ok ? "border-primary/40 bg-primary/10 text-primary" : "border-destructive bg-destructive/10 text-destructive",
      )}
    >
      ∑ DEBITS ({d.toLocaleString()} kobo) == ∑ CREDITS ({c.toLocaleString()} kobo) • {ok ? "BALANCED ✓" : "UNBALANCED ✕"}
    </div>
  );
}

export function LedgerTable({ limit }: { limit?: number }) {
  const { ledger } = useSpecGate();
  const rows = limit ? ledger.slice(-limit) : ledger;
  return (
    <div className="overflow-x-auto">
      <table className="num w-full min-w-[320px] text-[11px]">
        <thead>
          <tr className="border-b border-border text-left text-[10px] text-dim">
            <th className="py-1.5 pr-2 font-normal">ACCOUNT</th>
            <th className="py-1.5 pr-2 text-right font-normal">DEBIT</th>
            <th className="py-1.5 text-right font-normal">CREDIT</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} className="py-6 text-center text-dim">
                No money movements yet — run step 2.
              </td>
            </tr>
          )}
          {rows.map((e) => (
            <tr key={e.id} className="border-b border-border/50 animate-in fade-in slide-in-from-top-1">
              <td className="py-1.5 pr-2">
                <div className="truncate text-foreground/90">{e.account}</div>
                <div className="truncate text-[9.5px] text-dim">{e.memo}</div>
              </td>
              <td className="py-1.5 pr-2 text-right text-foreground">{e.debit ? e.debit.toLocaleString() : "—"}</td>
              <td className="py-1.5 text-right text-primary">{e.credit ? e.credit.toLocaleString() : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AccountBalances() {
  const { ledger } = useSpecGate();
  const accts = ["owner_treasury", "specgate_escrow", "payee_settlement_kora"] as const;
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-3">
      {accts.map((a) => {
        const net = ledger.filter((e) => e.account === a).reduce((s, e) => s + e.credit - e.debit, 0);
        return (
          <div key={a} className="bg-card p-4">
            <div className="num text-[10px] text-dim">{a}</div>
            <div className={cn("num mt-2 text-xl font-semibold", net < 0 ? "text-foreground" : net > 0 ? "text-primary" : "text-muted-foreground")}>
              {net < 0 ? "−" : ""}
              {naira(Math.abs(net))}
            </div>
            <div className="num text-[10px] text-dim">{net.toLocaleString()} kobo net</div>
          </div>
        );
      })}
    </div>
  );
}
