"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ShieldAlert, CheckCircle2, X } from "lucide-react";
import { useSpecGate } from "@/src/lib/specgate-store";
import { Button } from "@/src/components/ui/button";

export function SecondLookRiskView() {
  const { deny, payments } = useSpecGate();
  const [blocked, setBlocked] = useState(false);
  const [escalated, setEscalated] = useState(false);

  const payment = payments.find((p) => p.id === "pay_techworld") || payments[0];

  const handleBlock = () => {
    deny(payment.id);
    setBlocked(true);
  };

  const handleEscalate = () => {
    setEscalated(true);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top back navigation */}
      <div>
        <Link
          href="/nod"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Pending Approvals
        </Link>
      </div>

      {blocked && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 flex items-center justify-between">
          <p className="text-xs font-bold">
            Payment permanently blocked. Transaction dropped by AI Gate.
          </p>
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-600">Blocked</span>
        </div>
      )}

      {escalated && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 flex items-center justify-between">
          <p className="text-xs font-bold">
            Payment escalated directly to owner approval queue.
          </p>
          <Link href="/nod" className="text-xs font-semibold underline">
            View in Approvals →
          </Link>
        </div>
      )}

      {/* Main Risk Check Card */}
      <div className="rounded-2xl bg-white p-7 sm:p-8 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-8">
        {/* Header with Glowing Red Alert Badge */}
        <div className="flex items-start gap-4">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]">
            <span className="text-xl font-bold font-mono">!</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Payment Under Review
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 font-normal">
              This payment looks suspicious and requires further review.
            </p>
          </div>
        </div>

        {/* Two Columns: Reason & Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
          {/* Left Column: Reason */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Reason
            </h2>

            <div className="space-y-3.5">
              <div className="flex items-start gap-3">
                <span className="mt-1 flex h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                <p className="text-xs font-medium text-slate-700 leading-relaxed">
                  Purchase doesn&apos;t match your usual pattern
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="mt-1 flex h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                <p className="text-xs font-medium text-slate-700 leading-relaxed">
                  Item is not in your approved category
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="mt-1 flex h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                <p className="text-xs font-medium text-slate-700 leading-relaxed">
                  Source page contains unusual content
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Details */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Details
            </h2>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-400">Item</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  Wireless earbuds
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">Amount</p>
                <p className="text-lg font-extrabold text-slate-900 mt-0.5">
                  ₦18,500
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-400">Merchant</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">
                  TechWorld <span className="text-xs text-slate-400 font-normal">(unverified)</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action Buttons */}
        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-100">
          <button
            onClick={handleBlock}
            disabled={blocked}
            className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-7 py-3 text-xs sm:text-sm font-semibold transition-all duration-150 active:scale-98 shadow-sm flex items-center gap-2"
          >
            <span>Block</span>
          </button>

          <button
            onClick={handleEscalate}
            className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 px-6 py-3 text-xs sm:text-sm font-semibold transition-all duration-150 active:scale-98 flex items-center gap-2 shadow-xs"
          >
            <span>Escalate to Owner</span>
          </button>
        </div>
      </div>
    </div>
  );
}
