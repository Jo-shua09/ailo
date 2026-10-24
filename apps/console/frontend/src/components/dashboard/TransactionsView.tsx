"use client";

import { useState } from "react";
import { Check, X, ShieldCheck, Filter, FileText, ChevronRight } from "lucide-react";
import { useSpecGate, type Payment } from "@/src/lib/specgate-store";
import { naira } from "@/src/lib/format";
import { Button } from "@/src/components/ui/button";

export function TransactionsView() {
  const { payments } = useSpecGate();
  const [filter, setFilter] = useState<"all" | "settled" | "pending" | "blocked">("all");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const filtered = payments.filter((p) => {
    if (filter === "settled") return p.status === "settled";
    if (filter === "pending")
      return (
        p.status === "pending_approval" ||
        p.status === "approved" ||
        p.status === "escrow_held" ||
        p.status === "submitted"
      );
    if (filter === "blocked") return p.status === "blocked" || p.status === "denied";
    return true;
  });

  return (
    <div className="w-full max-w-6xl mx-auto space-y-7 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Transactions & Ledger
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-normal">
            Real-time ledger of AI agent purchase requests, Kora settlement confirmations, and security checks.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/60 self-start sm:self-auto">
          {(
            [
              ["all", "All"],
              ["settled", "Settled"],
              ["pending", "Pending"],
              ["blocked", "Blocked"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === key
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] text-slate-500 text-sm">
            No transactions matching this filter.
          </div>
        ) : (
          filtered.map((p) => {
            const isSettled = p.status === "settled";
            const isBlocked = p.status === "blocked" || p.status === "denied";

            return (
              <div
                key={p.id}
                onClick={() => setSelectedPayment(p)}
                className="group cursor-pointer rounded-2xl bg-white p-5 border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-slate-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center ${
                      isSettled
                        ? "bg-emerald-50 text-emerald-600"
                        : isBlocked
                          ? "bg-rose-50 text-rose-600"
                          : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    <FileText className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {p.label}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Payee: {p.payee} · {new Date(p.createdAt).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-5">
                  <p className="text-base font-extrabold text-slate-900">
                    {naira(p.amountKobo)}
                  </p>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      isSettled
                        ? "text-emerald-700 bg-emerald-50"
                        : isBlocked
                          ? "text-rose-700 bg-rose-50"
                          : "text-amber-700 bg-amber-50"
                    }`}
                  >
                    {isSettled ? (
                      <Check className="h-3 w-3" />
                    ) : isBlocked ? (
                      <X className="h-3 w-3" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    )}
                    {isSettled ? "Settled" : isBlocked ? "Blocked" : "Needs Nod"}
                  </span>

                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Payment Receipt Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Payment Receipt & Audit</h2>
              <button
                onClick={() => setSelectedPayment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="text-center py-3 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-500">{selectedPayment.payee}</p>
                <p className="text-3xl font-extrabold text-slate-900 mt-1">
                  {naira(selectedPayment.amountKobo)}
                </p>
                <p className="text-xs font-semibold text-emerald-600 mt-1 uppercase tracking-wider">
                  {selectedPayment.status}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Item:</span>
                  <span className="font-semibold text-slate-800">{selectedPayment.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Settlement Ref:</span>
                  <span className="font-mono text-slate-800">{selectedPayment.koraRef || "SIMULATED_REF_PENDING"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Idempotency Key:</span>
                  <span className="font-mono text-slate-800">{selectedPayment.idem}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <p className="text-xs font-bold text-slate-700">Audit Verification</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {selectedPayment.ruleCheck.detail}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed pt-1">
                  AI Verdict: {selectedPayment.aiVerdict.detail}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-5 mt-5 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setSelectedPayment(null)}
                className="rounded-xl px-5 text-sm"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
