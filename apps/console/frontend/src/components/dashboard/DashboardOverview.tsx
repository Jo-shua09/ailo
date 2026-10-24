"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  SlidersHorizontal,
  ArrowLeftRight,
  PauseCircle,
  Plus,
  Bot,
  ShieldCheck,
  Check,
  ChevronRight,
  AlertOctagon,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { useSpecGate, type Agent } from "@/src/lib/specgate-store";
import { naira } from "@/src/lib/format";
import { CreateAgentDialog } from "./CreateAgentDialog";
import { AgentDetailModal } from "./AgentDetailModal";

export function DashboardOverview() {
  const {
    spentKobo,
    payments,
    revoked,
    revoke,
    agents,
  } = useSpecGate();

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [confirmBrake, setConfirmBrake] = useState(false);

  const pendingApprovalsCount = payments.filter(
    (p) =>
      p.status === "pending_approval" ||
      p.status === "approved" ||
      p.status === "escrow_held" ||
      p.status === "submitted",
  ).length;

  const totalAllowanceKobo = 5_000_000; // ₦50,000
  const percentSpent = Math.min(
    100,
    Math.round((spentKobo / totalAllowanceKobo) * 100),
  );

  // Shop Agent and Research Agent for the home page cards
  const shopAgent = agents.find((a) => a.id === "shop-agent") || agents[0];
  const researchAgent = agents.find((a) => a.id === "research-agent") || agents[1];

  return (
    <div className="w-full max-w-6xl mx-auto space-y-7 animate-in fade-in duration-200">
      {/* Emergency brake banner if paused */}
      {revoked && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 flex items-center justify-between text-rose-800">
          <div className="flex items-center gap-3">
            <AlertOctagon className="h-5 w-5 text-rose-600 shrink-0" />
            <div>
              <p className="text-sm font-bold">Emergency Brake Active</p>
              <p className="text-xs text-rose-600 mt-0.5">
                All AI agents are currently paused. Outbound purchasing is locked.
              </p>
            </div>
          </div>
          <Link
            href="/settings"
            className="text-xs font-semibold text-rose-700 underline hover:text-rose-900"
          >
            Review in Settings →
          </Link>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Good morning, Chidi 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-normal">
            Here&apos;s what&apos;s happening with your AI agents today.
          </p>
        </div>

        <div className="relative">
          <Link
            href="/nod"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-600 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:bg-slate-50 transition-colors"
            aria-label="Pending notifications"
          >
            <Bell className="h-4 w-4" />
            {pendingApprovalsCount > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            )}
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid (3 cards in 1 row) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {/* Card 1: Total Allowance */}
        <div className="rounded-2xl bg-white p-5 sm:p-6 border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Allowance</p>
            <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              ₦50,000
            </p>
            <p className="mt-1 text-xs text-slate-400">per week</p>
          </div>
          <div className="mt-5">
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${percentSpent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Spent this week */}
        <div className="rounded-2xl bg-white p-5 sm:p-6 border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Spent this week</p>
            <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {naira(spentKobo, false)}
            </p>
          </div>
          <p className="mt-5 text-xs text-slate-400">
            {percentSpent}% of allowance
          </p>
        </div>

        {/* Card 3: Pending Approvals */}
        <Link
          href="/nod"
          className="rounded-2xl bg-white p-5 sm:p-6 border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:border-slate-200 transition-colors group"
        >
          <div>
            <p className="text-xs font-medium text-slate-500">Pending Approvals</p>
            <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight group-hover:text-emerald-700 transition-colors">
              {pendingApprovalsCount}
            </p>
          </div>
          <p className="mt-5 text-xs text-slate-400 flex items-center justify-between">
            <span>Requires your attention</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </Link>
      </div>

      {/* Bottom Section: Two Columns (Your Agents + Quick Actions) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Your Agents (Spans 2 cols) */}
        <div className="lg:col-span-2 space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Your Agents
            </h2>
            <Link
              href="/agents"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              View all agents →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Agent Card 1: Shop Agent */}
            {shopAgent && (
              <div className="rounded-2xl bg-white p-5 border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="relative h-14 w-14 shrink-0 rounded-full overflow-hidden bg-slate-100 ring-3 ring-emerald-50 shadow-inner">
                      <Image
                        src={shopAgent.avatar}
                        alt={shopAgent.name}
                        width={56}
                        height={56}
                        className="object-cover h-full w-full"
                      />
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        shopAgent.status === "active" && !revoked
                          ? "text-emerald-600 bg-emerald-50/80"
                          : "text-rose-600 bg-rose-50/80"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          shopAgent.status === "active" && !revoked
                            ? "bg-emerald-500"
                            : "bg-rose-500"
                        }`}
                      />
                      {shopAgent.status === "active" && !revoked ? "Active" : "Paused"}
                    </span>
                  </div>

                  <div className="mt-3.5">
                    <h3 className="text-base font-bold text-slate-900">
                      {shopAgent.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {shopAgent.role}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-xs font-medium text-slate-600">
                    {shopAgent.spentThisWeek}
                  </p>
                  <button
                    onClick={() => setSelectedAgent(shopAgent)}
                    className="mt-3.5 w-full rounded-xl bg-slate-50 hover:bg-slate-100 py-2.5 text-xs font-semibold text-slate-700 transition-colors text-center"
                  >
                    View details
                  </button>
                </div>
              </div>
            )}

            {/* Agent Card 2: Research Agent */}
            {researchAgent && (
              <div className="rounded-2xl bg-white p-5 border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="relative h-14 w-14 shrink-0 rounded-full overflow-hidden bg-slate-100 ring-3 ring-sky-50 shadow-inner">
                      <Image
                        src={researchAgent.avatar}
                        alt={researchAgent.name}
                        width={56}
                        height={56}
                        className="object-cover h-full w-full"
                      />
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        researchAgent.status === "active" && !revoked
                          ? "text-emerald-600 bg-emerald-50/80"
                          : "text-rose-600 bg-rose-50/80"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          researchAgent.status === "active" && !revoked
                            ? "bg-emerald-500"
                            : "bg-rose-500"
                        }`}
                      />
                      {researchAgent.status === "active" && !revoked ? "Active" : "Paused"}
                    </span>
                  </div>

                  <div className="mt-3.5">
                    <h3 className="text-base font-bold text-slate-900">
                      {researchAgent.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {researchAgent.role}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-xs font-medium text-slate-600">
                    {researchAgent.spentThisWeek}
                  </p>
                  <button
                    onClick={() => setSelectedAgent(researchAgent)}
                    className="mt-3.5 w-full rounded-xl bg-slate-50 hover:bg-slate-100 py-2.5 text-xs font-semibold text-slate-700 transition-colors text-center"
                  >
                    View details
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Actions (Spans 1 col) */}
        <div className="space-y-3.5">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Quick Actions
          </h2>

          <div className="rounded-2xl bg-white p-3.5 sm:p-4 border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-1">
            {/* Action 1: Create new agent */}
            <button
              onClick={() => setCreateOpen(true)}
              className="w-full flex items-center gap-3.5 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left group"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 group-hover:bg-emerald-50 group-hover:text-emerald-600 text-slate-700 transition-colors">
                <Plus className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold text-slate-800">
                Create new agent
              </span>
            </button>

            {/* Action 2: Set spending rules */}
            <Link
              href="/rules"
              className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 group-hover:bg-emerald-50 group-hover:text-emerald-600 text-slate-700 transition-colors">
                <SlidersHorizontal className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold text-slate-800">
                Set spending rules
              </span>
            </Link>

            {/* Action 3: View transactions */}
            <Link
              href="/transactions"
              className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 group-hover:bg-emerald-50 group-hover:text-emerald-600 text-slate-700 transition-colors">
                <ArrowLeftRight className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold text-slate-800">
                View transactions
              </span>
            </Link>

            {/* Action 4: Emergency brake */}
            <button
              onClick={() => setConfirmBrake(true)}
              className="w-full flex items-center gap-3.5 p-3 rounded-xl hover:bg-rose-50/70 transition-colors text-left group"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 group-hover:bg-rose-100 group-hover:text-rose-600 text-slate-700 transition-colors">
                <PauseCircle className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold text-slate-800 group-hover:text-rose-700 transition-colors">
                Emergency brake
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Create Agent Modal */}
      <CreateAgentDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      {/* Agent Detail Modal */}
      <AgentDetailModal
        agent={selectedAgent}
        onClose={() => setSelectedAgent(null)}
      />

      {/* Emergency brake confirm dialog */}
      {confirmBrake && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <AlertOctagon className="h-6 w-6" />
              <h2 className="text-lg font-bold text-slate-900">
                Activate Emergency Brake?
              </h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              This will immediately halt all autonomous purchases across every AI agent. No money can be spent until you resume agents in Settings.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setConfirmBrake(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <Button
                variant="destructive"
                className="rounded-xl px-5"
                onClick={() => {
                  revoke();
                  setConfirmBrake(false);
                }}
              >
                Pause all spending
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
