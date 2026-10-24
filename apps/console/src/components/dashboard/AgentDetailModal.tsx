"use client";

import Image from "next/image";
import { X, ShieldCheck, CheckCircle2, PauseCircle, PlayCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { useSpecGate, type Agent } from "@/src/lib/specgate-store";
import { naira } from "@/src/lib/format";

export function AgentDetailModal({
  agent,
  onClose,
}: {
  agent: Agent | null;
  onClose: () => void;
}) {
  const { toggleAgentStatus, revoked } = useSpecGate();

  if (!agent) return null;

  const isActive = agent.status === "active" && !revoked;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full overflow-hidden bg-slate-100 ring-2 ring-emerald-500/20">
              <Image
                src={agent.avatar}
                alt={agent.name}
                width={48}
                height={48}
                className="object-cover h-full w-full"
              />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{agent.name}</h2>
              <p className="text-xs text-slate-500">{agent.role}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <p className="text-xs font-semibold text-slate-500">CURRENT STATUS</p>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isActive ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
                <span
                  className={`text-sm font-semibold ${
                    isActive ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {isActive ? "Active · Spending within rules" : "Paused · Spending disabled"}
                </span>
              </div>
            </div>

            <Button
              size="sm"
              variant={isActive ? "outline" : "default"}
              onClick={() => toggleAgentStatus(agent.id)}
              className={
                isActive
                  ? "border-rose-200 text-rose-700 hover:bg-rose-50"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }
            >
              {isActive ? (
                <>
                  <PauseCircle className="h-4 w-4 mr-1.5" /> Pause Agent
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-1.5" /> Resume Agent
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-medium text-slate-500">Weekly Allowance</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {naira(agent.allowanceKobo, false)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Automated cap</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-medium text-slate-500">Approval Limit</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {naira(agent.thresholdKobo, false)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Requires your nod</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Assigned Mandate</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              {agent.description}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-dashed border-slate-200">
            <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2">
              Kora Smart Escrow Protection
            </p>
            <p className="text-xs text-slate-600">
              Transactions exceeding {naira(agent.thresholdKobo, false)} hold funds in escrow until you give your nod and delivery is verified.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-5 mt-5 border-t border-slate-100">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-xl px-5 text-sm"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
