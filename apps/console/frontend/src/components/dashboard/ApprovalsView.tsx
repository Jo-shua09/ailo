"use client";

import Link from "next/link";
import { Check, X, ShieldCheck, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { useSpecGate } from "@/src/lib/specgate-store";
import { naira } from "@/src/lib/format";

export function ApprovalsView() {
  const { payments, approve, deny, release, revoked } = useSpecGate();

  const pending = payments.filter(
    (p) =>
      p.status === "pending_approval" ||
      p.status === "approved" ||
      p.status === "escrow_held" ||
      p.status === "submitted",
  );

  return (
    <div className="w-full max-w-4xl mx-auto space-y-7 animate-in fade-in duration-200">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Approvals (Nod)
        </h1>
        <p className="mt-1 text-sm text-slate-500 font-normal">
          Purchases that exceed your ₦10,000 threshold require your nod before money leaves your account.
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            All quiet. You&apos;re completely up to date.
          </h2>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            No agent purchases are currently waiting for your nod.
          </p>
          <div className="pt-2">
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/dashboard">
                Back to overview <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {pending.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl bg-white p-6 border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Shop Agent Request
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Needs your nod
                </span>
              </div>

              <div>
                <p className="text-xs text-slate-500">Paying supplier: {p.payee}</p>
                <p className="text-3xl font-extrabold text-slate-900 mt-1">
                  {naira(p.amountKobo)}
                </p>
                <p className="text-sm font-semibold text-slate-700 mt-1">
                  {p.label}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Agent&apos;s Stated Purpose
                </p>
                <p className="text-xs leading-relaxed text-slate-700 mt-1 italic">
                  &ldquo;{p.reason}&rdquo;
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50/80 p-3 rounded-xl border border-emerald-100">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>AI Gate Intent Score: {(p.aiVerdict.score * 100).toFixed(0)}% · Goal verified</span>
              </div>

              {p.status === "pending_approval" ? (
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <Button
                    size="lg"
                    disabled={revoked}
                    onClick={() => approve(p.id)}
                    className="w-full sm:w-auto flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm"
                  >
                    <Check className="h-4 w-4 mr-1.5" />
                    Give Nod & Approve {naira(p.amountKobo)}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => deny(p.id)}
                    className="w-full sm:w-auto rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-sm"
                  >
                    <X className="h-4 w-4 mr-1.5 text-rose-600" />
                    Deny Request
                  </Button>
                </div>
              ) : p.status === "escrow_held" ? (
                <div className="pt-2 space-y-3">
                  <p className="text-xs text-emerald-700 font-medium">
                    Funds reserved in Kora Escrow. Confirm physical delivery to release payment.
                  </p>
                  <Button
                    size="lg"
                    onClick={() => release(p.id)}
                    className="w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-sm"
                  >
                    Confirm Delivery & Release Funds
                  </Button>
                </div>
              ) : (
                <p className="text-center text-xs font-semibold text-emerald-600 py-2">
                  Payment approved. Settling with Kora...
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
