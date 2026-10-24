"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  X,
  Bot,
  ShoppingBag,
  ShieldCheck,
  Bell,
  PauseCircle,
  SlidersHorizontal,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { useSpecGate, WEEKLY_CAP_KOBO, type Payment } from "@/src/lib/specgate-store";
import { naira } from "@/src/lib/format";
import { cn } from "@/src/lib/utils";
export function Status({ payment }: { payment: Payment }) {
  const bad = ["blocked", "denied", "failed"].includes(payment.status);
  const ok = payment.status === "settled";
  const text = {
    requested: "Checking",
    blocked: "Blocked",
    pending_approval: "Needs your nod",
    approved: "Approved",
    escrow_held: "Funds reserved",
    submitted: "Sending payment",
    settled: "Settled",
    denied: "Denied",
    failed: "Failed",
  }[payment.status];
  return (
    <span
      className={cn(
        "status-pill",
        bad ? "bg-destructive-soft text-destructive" : ok ? "bg-success-soft text-success" : "bg-warning-soft text-warning",
      )}
    >
      {ok ? <Check className="h-3 w-3" /> : bad ? <X className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-warning" />}
      {text}
    </span>
  );
}
export function AppIntro({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="mb-2 text-xs text-muted-foreground">YOUR AILO WORKSPACE</p>
        <h1 className="app-title">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <span className="rounded-full border border-border bg-card px-3 py-1.5 font-mono text-[10px] text-muted-foreground">SANDBOX · SAMPLE DATA</span>
    </div>
  );
}
export function Receipt({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const sg = useSpecGate();
  return (
    <>
      <div className="fixed inset-0 z-50 bg-foreground/20" onClick={onClose} />
      <aside className="receipt-drawer" role="dialog" aria-modal="true" aria-label="Payment receipt">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Your payment receipt</span>
          <Button variant="ghost" size="icon" aria-label="Close receipt" onClick={onClose}>
            <X />
          </Button>
        </div>
        <p className="mt-7 text-sm text-muted-foreground">{payment.payee}</p>
        <h2 className="my-3 font-mono text-4xl font-semibold">{naira(payment.amount_kobo)}</h2>
        <Status payment={payment} />
        <div className="mt-6 border-y border-border py-4">
          <p className="text-xs text-muted-foreground">What your assistant asked for</p>
          <p className="mt-2 text-lg font-medium">{payment.label}</p>
        </div>
        <div className="mt-5 rounded-md border border-dashed border-border bg-background p-4">
          <p className="font-mono text-[10px] text-muted-foreground">ASSISTANT’S WORDS · NOT VERIFIED</p>
          <p className="mt-3 text-sm leading-relaxed">“{payment.reason}”</p>
        </div>
        <h3 className="mb-4 mt-7 font-semibold">Why this decision was made</h3>
        <ol className="space-y-5">
          {[
            [true, "Assistant identity", "Your shop assistant is recognised."],
            [payment.ruleCheck.pass, "Your spending rules", payment.ruleCheck.detail],
            [payment.aiVerdict.pass, "A second look", payment.aiVerdict.detail],
            [
              payment.status === "settled",
              "Payment confirmation",
              payment.koraRef ? `Confirmed by Kora · ${payment.koraRef}` : "No completed payout for this request.",
            ],
          ].map(([pass, title, detail]) => (
            <li key={title as string} className="flex gap-3">
              <span className={cn("mt-0.5", pass ? "text-success" : "text-muted-foreground")}>
                {pass ? <Check className="h-4 w-4" /> : <span>—</span>}
              </span>
              <div>
                <p className="text-sm font-medium">{title as string}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail as string}</p>
              </div>
            </li>
          ))}
        </ol>
        {payment.status === "pending_approval" && (
          <Button asChild className="mt-7 w-full">
            <Link href="/nod" onClick={onClose}>
              Review this request <ArrowRight />
            </Link>
          </Button>
        )}
        {payment.status === "escrow_held" && (
          <Button className="mt-7 w-full" onClick={() => sg.release(payment.id)}>
            Confirm delivery & release payment
          </Button>
        )}
        <div className="mt-7 border-t border-border pt-5">
          <p className="break-all font-mono text-xs text-muted-foreground">{payment.id} · SIMULATED</p>
          <Link href="/agents" className="mt-4 block text-sm text-primary" onClick={onClose}>
            Something wrong? Pause your assistant →
          </Link>
        </div>
      </aside>
    </>
  );
}
export function Activity({ limit }: { limit?: number }) {
  const sg = useSpecGate();
  const [selected, setSelected] = useState<string | null>(null);
  const payment = sg.payments.find((p) => p.id === selected);
  return (
    <>
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <div className="customer-row header-row bg-background text-xs text-muted-foreground">
          <span>Purchase / supplier</span>
          <span className="payment-agent">Assistant</span>
          <span>Amount</span>
          <span>Status</span>
          <span />
        </div>
        {sg.payments.slice(0, limit).map((p) => (
          <div
            key={p.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelected(p.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSelected(p.id);
            }}
            className="customer-row cursor-pointer transition-colors hover:bg-accent/40"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{p.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{p.payee}</p>
            </div>
            <span className="payment-agent text-xs text-muted-foreground">Shop assistant</span>
            <span className="font-mono text-sm font-medium">{naira(p.amount_kobo)}</span>
            <span className="payment-status">
              <Status payment={p} />
            </span>
            <ChevronRight className="payment-arrow h-4 w-4 text-muted-foreground" />
          </div>
        ))}
      </div>
      {payment && <Receipt payment={payment} onClose={() => setSelected(null)} />}
    </>
  );
}
export function Dashboard() {
  const sg = useSpecGate();
  const pending = sg.payments.filter((p) => p.status === "pending_approval");
  return (
    <div className="customer-app">
      <AppIntro title="A little help. A lot of control." description="Good morning, Amaka. Here’s what your shop assistant has been up to." />
      <div className="mb-8 grid grid-cols-3 border-y border-border">
        <div className="customer-stat">
          <p className="text-xs text-muted-foreground">Spent this week</p>
          <p className="my-3 font-mono text-2xl font-semibold sm:text-3xl">{naira(sg.spentKobo, false)}</p>
          <span className="text-xs text-muted-foreground">of ₦50,000 allowance</span>
        </div>
        <div className="customer-stat">
          <p className="text-xs text-muted-foreground">Still available</p>
          <p className="my-3 font-mono text-2xl font-semibold text-success sm:text-3xl">{naira(WEEKLY_CAP_KOBO - sg.spentKobo, false)}</p>
          <span className="text-xs text-muted-foreground">Ready for your next restock</span>
        </div>
        <div className="customer-stat">
          <p className="text-xs text-muted-foreground">Waiting for you</p>
          <p className="my-3 font-mono text-2xl font-semibold text-warning sm:text-3xl">{pending.length.toString().padStart(2, "0")}</p>
          <Link href="/nod" className="text-xs text-primary">
            Review requests →
          </Link>
        </div>
      </div>
      {pending.length > 0 && (
        <div className="mb-8 flex flex-col justify-between gap-4 border-l-2 border-warning bg-warning-soft/50 p-5 sm:flex-row sm:items-center">
          <div className="flex gap-3">
            <Bell className="mt-1 h-5 w-5 shrink-0 text-warning" />
            <div>
              <p className="font-medium">Your assistant needs a nod.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {naira(pending[0]?.amount_kobo ?? 0)} for {pending[0]?.label.toLowerCase()} is above your approval limit.
              </p>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href="/nod">
              Review purchase <ArrowRight />
            </Link>
          </Button>
        </div>
      )}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Recent activity</h2>
        <Link href="/ledger" className="text-sm text-primary">
          All payments →
        </Link>
      </div>
      <Activity limit={5} />
      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <section className="border-t border-border pt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your shop assistant</h2>
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div className="my-5 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-accent">
              <ShoppingBag className="h-6 w-6 text-primary" />
            </span>
            <div>
              <p className="font-medium">Shop assistant</p>
              <p className={cn("mt-1 text-xs", sg.revoked ? "text-destructive" : "text-success")}>
                {sg.revoked ? "Paused · Spending stopped" : "Active · Shopping within your rules"}
              </p>
            </div>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (sg.spentKobo / WEEKLY_CAP_KOBO) * 100)}%` }} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{naira(sg.spentKobo, false)} of ₦50,000 spent this week</p>
          <Button asChild variant="link" className="mt-3 px-0">
            <Link href="/agents">
              Manage assistant <ArrowRight />
            </Link>
          </Button>
        </section>
        <section className="border-t border-border pt-5">
          <h2 className="text-lg font-semibold">You’re setting the boundaries.</h2>
          <p className="my-5 text-sm leading-relaxed text-muted-foreground">“{sg.englishRule}”</p>
          <p className="flex items-center gap-2 text-sm text-success">
            <ShieldCheck className="h-4 w-4" />{" "}
            {sg.revoked ? "Spending paused" : sg.compiled ? "Your spending rule is active" : "Your rule needs saving"}
          </p>
          <Button asChild variant="link" className="mt-4 px-0">
            <Link href="/rules">
              Review spending rules <SlidersHorizontal />
            </Link>
          </Button>
        </section>
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <span className="font-mono text-[10px] text-muted-foreground">TRY A SAMPLE PURCHASE</span>
        <Button variant="outline" size="sm" disabled={!sg.compiled || sg.revoked} onClick={() => sg.runStep(3)}>
          <ShoppingBag /> Buy shop stock · ₦8,500
        </Button>
        <Button variant="outline" size="sm" disabled={!sg.compiled || sg.revoked} onClick={() => sg.runStep(5)}>
          <Bell /> Request a bigger restock
        </Button>
      </div>
    </div>
  );
}
export function Rules() {
  const sg = useSpecGate();
  const [tested, setTested] = useState(false);
  return (
    <div className="customer-app">
      <AppIntro title="Your business. Your spending rules." description="Set clear boundaries for your assistant, in plain English." />
      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-xl font-semibold">What can your assistant spend on?</h2>
          <p className="mb-5 text-sm text-muted-foreground">Tell us the budget, what it can buy, and when it should ask you.</p>
          <label htmlFor="customer-rule" className="text-sm font-medium">
            Your spending rule
          </label>
          <textarea
            id="customer-rule"
            value={sg.englishRule}
            onChange={(e) => sg.setEnglishRule(e.target.value)}
            rows={5}
            className="mt-3 w-full resize-none rounded-md border border-border bg-card p-5 text-lg leading-relaxed outline-none focus:border-primary"
          />
          <Button className="mt-5" size="lg" disabled={sg.compiling || sg.revoked} onClick={() => sg.runStep(1)}>
            {sg.compiling ? "Saving your rule…" : "Save spending rule"}
            <Check />
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">This demo uses the sample ₦50,000 weekly allowance and ₦10,000 approval limit.</p>
        </section>
        <section className="rounded-md border border-border bg-card p-6">
          <div className="mb-6 flex justify-between gap-3">
            <h2 className="text-lg font-semibold">Your allowance at a glance</h2>
            <span className="status-pill bg-success-soft text-success">{sg.compiled ? "Saved" : "Draft"}</span>
          </div>
          <dl className="divide-y divide-border">
            {[
              ["Weekly allowance", "₦50,000.00"],
              ["Ask for your nod", "Above ₦10,000.00"],
              ["What it can buy", "Groceries & shop stock"],
              ["Where it can shop", "Approved suppliers"],
              ["Assistant", "Shop assistant"],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-wrap justify-between gap-3 py-4 text-sm">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
      <section className="mt-10 border-t border-border pt-7">
        <div className="mb-5 flex flex-wrap justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">See your rule in action</h2>
            <p className="mt-2 text-sm text-muted-foreground">Check a few sample purchases before your assistant shops.</p>
          </div>
          <Button variant="outline" onClick={() => setTested(true)}>
            Test sample purchases <ArrowRight />
          </Button>
        </div>
        {tested && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Rice at Mama Ngozi Stores", "₦8,500", "Would allow", "bg-success-soft text-success"],
              ["Weekend oil bundle", "₦12,000", "Would need your nod", "bg-warning-soft text-warning"],
              ["Electronics at an unknown shop", "₦6,000", "Would block", "bg-destructive-soft text-destructive"],
              ["Bulk flour above weekly allowance", "₦55,000", "Would block", "bg-destructive-soft text-destructive"],
            ].map(([t, a, v, c]) => (
              <div key={t} className="rounded-md border border-border bg-card p-5">
                <p className="font-medium">{t}</p>
                <div className="mt-4 flex flex-wrap justify-between gap-2">
                  <span className="font-mono">{a}</span>
                  <span className={cn("status-pill", c)}>{v}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
export function Agents() {
  const sg = useSpecGate();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="customer-app">
      <AppIntro title="Meet your extra pair of hands." description="Manage your assistant’s allowance, permissions and spending status." />
      <section className="max-w-3xl rounded-md border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-md bg-accent">
              <Bot className="h-8 w-8 text-primary" />
            </span>
            <div>
              <h2 className="text-2xl font-semibold">Shop assistant</h2>
              <p className="mt-2 text-sm text-muted-foreground">A little help with your everyday restock.</p>
            </div>
          </div>
          <span className={cn("status-pill", sg.revoked ? "bg-destructive-soft text-destructive" : "bg-success-soft text-success")}>
            {sg.revoked ? "Paused" : "Active"}
          </span>
        </div>
        <div className="my-8 border-y border-border py-6">
          <p className="text-sm text-muted-foreground">Weekly allowance</p>
          <div className="my-3 flex flex-wrap items-end justify-between gap-2">
            <p className="font-mono text-3xl font-semibold">
              {naira(sg.spentKobo, false)} <span className="text-sm font-normal text-muted-foreground">of ₦50,000</span>
            </p>
            <Link href="/rules" className="text-sm text-primary">
              View spending rule →
            </Link>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(sg.spentKobo / WEEKLY_CAP_KOBO) * 100}%` }} />
          </div>
        </div>
        <dl className="space-y-4 text-sm">
          <div className="flex flex-wrap justify-between gap-3">
            <dt className="text-muted-foreground">Can buy</dt>
            <dd>Groceries & shop stock</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-3">
            <dt className="text-muted-foreground">Approval needed</dt>
            <dd>Above ₦10,000</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-3">
            <dt className="text-muted-foreground">Connected to</dt>
            <dd>Amaka’s business</dd>
          </div>
        </dl>
        <div className="mt-8 border-t border-border pt-6">
          <h3 className="font-semibold">You can always put the brakes on.</h3>
          <p className="mb-5 mt-2 text-sm leading-relaxed text-muted-foreground">
            Stop new purchases immediately. Your assistant won’t be able to spend again during this demo.
          </p>
          <Button variant="destructive" size="lg" disabled={sg.revoked} onClick={() => setConfirm(true)}>
            <PauseCircle />
            {sg.revoked ? "Spending is paused" : "Pause all spending"}
          </Button>
        </div>
      </section>
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-5">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Pause assistant"
            className="w-full max-w-md rounded-md border border-foreground bg-card p-7"
          >
            <h2 className="text-2xl font-semibold">Pause your shop assistant?</h2>
            <p className="my-5 text-sm leading-relaxed text-muted-foreground">
              All new payment requests will be blocked. You can reset the sample workspace to start again.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="destructive"
                onClick={() => {
                  sg.revoke();
                  setConfirm(false);
                }}
              >
                Yes, pause spending
              </Button>
              <Button variant="outline" onClick={() => setConfirm(false)}>
                Keep it active
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export function Approvals() {
  const sg = useSpecGate();
  const pending = sg.payments.filter(
    (p) => p.status === "pending_approval" || p.status === "approved" || p.status === "escrow_held" || p.status === "submitted",
  );
  return (
    <div className="customer-app">
      <AppIntro title="A nod from you goes a long way." description="Your assistant asks. You have the final say." />
      <div className="mx-auto max-w-xl">
        {!pending.length ? (
          <div className="py-16 text-center">
            <ShieldCheck className="mx-auto mb-5 h-12 w-12 text-success" />
            <h2 className="text-2xl font-semibold">All quiet. You’re up to date.</h2>
            <p className="mt-3 text-muted-foreground">No payments waiting for your nod.</p>
            <Button asChild variant="outline" className="mt-6">
              <Link href="/dashboard">
                Back to overview <ArrowRight />
              </Link>
            </Button>
          </div>
        ) : (
          pending.map((p) => (
            <section key={p.id} className="mb-6 rounded-md border border-border bg-card p-6 sm:p-8">
              <div className="flex justify-between gap-3">
                <span className="text-xs text-muted-foreground">SHOP ASSISTANT’S REQUEST</span>
                <Status payment={p} />
              </div>
              <p className="mt-7 text-sm text-muted-foreground">Paying {p.payee}</p>
              <h2 className="my-4 font-mono text-4xl font-semibold">{naira(p.amount_kobo)}</h2>
              <p className="text-lg font-medium">{p.label}</p>
              <div className="my-6 border-l-2 border-warning bg-warning-soft p-4 text-sm text-warning">
                Above your ₦10,000 approval limit. Your nod is needed.
              </div>
              <div className="mb-7 rounded-md border border-dashed border-border p-4">
                <p className="font-mono text-[10px] text-muted-foreground">YOUR ASSISTANT’S WORDS · NOT VERIFIED</p>
                <p className="mt-3 text-sm leading-relaxed">“{p.reason}”</p>
              </div>
              {p.status === "pending_approval" ? (
                <div className="flex flex-col gap-3">
                  <Button
                    size="lg"
                    className="bg-success text-primary-foreground hover:bg-success/90"
                    disabled={sg.revoked}
                    onClick={() => sg.approve(p.id)}
                  >
                    <Check /> Approve {naira(p.amount_kobo)}
                  </Button>
                  <Button size="lg" variant="outline" className="border-destructive text-destructive" onClick={() => sg.deny(p.id)}>
                    <X /> Deny purchase
                  </Button>
                </div>
              ) : p.status === "escrow_held" ? (
                <>
                  <p className="mb-4 text-sm text-success">Approved. Your payment is reserved until delivery is confirmed.</p>
                  <Button size="lg" className="w-full" onClick={() => sg.release(p.id)}>
                    Confirm delivery & pay <Check />
                  </Button>
                </>
              ) : (
                <p className="text-center text-sm text-success">
                  {p.status === "approved" ? "Approved. Reserving your payment…" : "Sending payment to Kora…"}
                </p>
              )}
              <p className="mt-5 text-center font-mono text-[10px] text-muted-foreground">SIMULATED · NO REAL MONEY MOVES</p>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
export function Payments() {
  const sg = useSpecGate();
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const [filter, setFilter] = useState("All payments");
  const total = sg.payments.filter((p) => p.status === "settled").reduce((sum, p) => sum + p.amount_kobo, 0);
  return (
    <div className="customer-app">
      <AppIntro title="Every naira, accounted for." description="A clear record of your assistant’s purchases and payment confirmations." />
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-border pb-7">
        <div>
          <p className="text-sm text-muted-foreground">Completed payments</p>
          <p className="mt-3 font-mono text-3xl font-semibold">{naira(total)}</p>
        </div>
        <Button
          variant="outline"
          disabled={checking}
          onClick={() => {
            setChecking(true);
            setTimeout(() => {
              setChecking(false);
              setChecked(true);
            }, 700);
          }}
        >
          <RotateCcw />
          {checking ? "Checking payments…" : "Check with Kora"}
        </Button>
      </div>
      {checked && (
        <div className="mb-6 border-l-2 border-success bg-success-soft p-5 text-success">
          <p className="font-semibold">All completed payments match.</p>
          <p className="mt-2 text-sm">
            Checked {sg.payments.filter((p) => p.status === "settled").length} completed payments. No differences found. SIMULATED
          </p>
        </div>
      )}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Payment history</h2>
        <select
          aria-label="Filter payments"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-full border border-border bg-card px-4 py-2 text-sm"
        >
          <option>All payments</option>
          <option>Settled</option>
          <option>Needs your nod</option>
          <option>Blocked</option>
        </select>
      </div>
      {filter === "All payments" ? (
        <Activity />
      ) : (
        <div className="space-y-3">
          {sg.payments
            .filter((p) =>
              filter === "Settled" ? p.status === "settled" : filter === "Blocked" ? p.status === "blocked" : p.status === "pending_approval",
            )
            .map((p) => (
              <FilteredPayment key={p.id} payment={p} />
            ))}
        </div>
      )}
      <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4" /> Ailo mirrors payment records. Funds stay with the licensed payment partner.
      </p>
    </div>
  );
}
function FilteredPayment({ payment }: { payment: Payment }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" className="h-auto w-full flex-wrap justify-between rounded-md p-5" onClick={() => setOpen(true)}>
        <span>{payment.label}</span>
        <span className="font-mono">{naira(payment.amount_kobo)}</span>
        <Status payment={payment} />
      </Button>
      {open && <Receipt payment={payment} onClose={() => setOpen(false)} />}
    </>
  );
}
