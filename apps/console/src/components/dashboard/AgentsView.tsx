"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
import { useSpecGate, type Agent } from "@/src/lib/specgate-store";
import { CreateAgentDialog } from "./CreateAgentDialog";
import { DataStatus } from "./DataStatus";

export function AgentsView() {
  const { agents, revoked, loading, loadError, reload } = useSpecGate();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-7 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Agents
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-normal">
            Manage your AI agents and their permissions.
          </p>
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-black hover:bg-slate-800 text-white px-4 py-2.5 text-sm font-semibold shadow-sm transition-all duration-150 active:scale-98"
        >
          <Plus className="h-4 w-4" />
          <span>Create Agent</span>
        </button>
      </div>

      <DataStatus loading={loading} error={loadError} onRetry={() => void reload()} />

      {/* Agents List (Full width stacked cards linking to Agent Identity) */}
      <div className="space-y-4">
        {!loading && !loadError && agents.map((agent) => {
          const isActive = agent.status === "active" && !revoked;

          return (
            <Link
              key={agent.id}
              href={`/agents/${agent.id}`}
              className="group block rounded-2xl bg-white p-5 border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-slate-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Left side: Avatar + Title & Subtitle */}
                <div className="flex items-center gap-4">
                  <div className="relative h-14 w-14 shrink-0 rounded-full overflow-hidden bg-slate-100 ring-4 ring-slate-50 shadow-inner group-hover:scale-102 transition-transform">
                    <Image
                      src={agent.avatar}
                      alt={agent.name}
                      width={56}
                      height={56}
                      className="object-cover h-full w-full"
                    />
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {agent.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {agent.role}
                    </p>
                  </div>
                </div>

                {/* Right side: Status badge + Spent this week + Chevron */}
                <div className="flex items-center justify-between sm:justify-end gap-5 pl-18 sm:pl-0">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      isActive
                        ? "text-emerald-600 bg-emerald-50/80"
                        : "text-rose-600 bg-rose-50/80"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isActive ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                    />
                    {isActive ? "Active" : "Paused"}
                  </span>

                  <span className="text-xs font-medium text-slate-600">
                    {agent.spentThisWeek}
                  </span>

                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Create Agent Dialog */}
      <CreateAgentDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
