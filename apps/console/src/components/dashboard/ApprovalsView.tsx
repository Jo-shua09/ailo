"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ShoppingBag, CheckCircle2, ArrowRight } from "lucide-react";
import { getPendingApprovalItems, useSpecGate } from "@/src/lib/specgate-store";
import { Button } from "@/src/components/ui/button";
import { DataStatus } from "./DataStatus";

export function ApprovalsView() {
  const { approvals, payments, approve, deny, revoked, loading, loadError, approvalsLoadError, reload } = useSpecGate();

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleApprove = (id: string) => {
    void approve(id);
  };

  const handleDeny = (id: string) => {
    void deny(id);
  };

  const pendingRequests = getPendingApprovalItems(approvals, payments).map(({ approval, payment }) => ({
    id: approval?.id ?? payment!.id,
    canDecide: Boolean(approval),
    merchant: approval?.payee_name || payment!.payee,
    item: payment?.label || "Payment request",
    amount: `₦${((approval?.amount_kobo ?? payment!.amountKobo) / 100).toLocaleString()}`,
    time: new Date(approval?.created_at ?? payment!.createdAt).toLocaleString(),
    isSuspicious: payment?.aiVerdict.action === "block",
  }));

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Pending Approval
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 font-normal">
          {pendingRequests.length} {pendingRequests.length === 1 ? "request needs" : "requests need"} your attention
        </p>
      </div>

      <DataStatus loading={loading} error={loadError} onRetry={() => void reload()} />

      {loading ? null : pendingRequests.length === 0 && approvalsLoadError ? (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          Could not confirm the approvals list. Retry loading your account data.
        </div>
      ) : pendingRequests.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            All caught up! No pending approvals.
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            All AI agent purchase requests have been reviewed and decided.
          </p>
          <div className="pt-2">
            <Button asChild variant="outline" className="rounded-xl text-xs">
              <Link href="/dashboard">
                Back to Overview <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingRequests.map((req) => (
            <div
              key={req.id}
              className="rounded-2xl bg-white p-6 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 transition-all hover:border-slate-200"
            >
              {/* Left Side: Avatar + Merchant & Item */}
              <div className="flex items-center gap-4">
                <div
                  className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"
                >
                  <ShoppingBag className="h-6 w-6 stroke-[1.75]" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      {req.merchant}
                    </h3>
                    {req.isSuspicious && (
                      <Link
                        href="/nod/risk"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                      >
                        Second Look Flagged
                      </Link>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {req.item}
                  </p>
                </div>
              </div>

              {/* Middle: Amount & Time */}
              <div className="sm:text-right pl-17 sm:pl-0">
                <p className="text-base font-extrabold text-slate-900">
                  {req.amount}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                  {req.time}
                </p>
              </div>

              {/* Right Side: Deny & Approve pill buttons */}
              <div className="flex items-center gap-2.5 pl-17 sm:pl-0 self-start sm:self-auto">
                {req.canDecide ? <><button
                  onClick={() => handleDeny(req.id)}
                  className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2 text-xs font-semibold transition-all duration-150 active:scale-98"
                >
                  Deny
                </button>

                <button
                  onClick={() => handleApprove(req.id)}
                  disabled={revoked}
                  className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-7 py-2 text-xs font-semibold transition-all duration-150 active:scale-98 shadow-xs"
                >
                  Approve
                </button></> : <p className="max-w-48 text-right text-xs text-amber-700">Approval details are still syncing. Refresh shortly to review this request.</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
