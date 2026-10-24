"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheck,
  Check,
  Copy,
  Eye,
  EyeOff,
  ArrowLeft,
  KeyRound,
  Lock,
  Calendar,
  Activity,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import { useSpecGate, type Agent } from "@/src/lib/specgate-store";
import { naira } from "@/src/lib/format";
import { Button } from "@/src/components/ui/button";

export function AgentIdentityView({ agentId }: { agentId?: string }) {
  const { agents, revoked } = useSpecGate();
  const [activeTab, setActiveTab] = useState<"identity" | "permissions" | "keys" | "activity">("identity");
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  // Find agent or default to shop-agent
  const agent: Agent =
    agents.find((a) => a.id === agentId) ||
    agents.find((a) => a.id === "shop-agent") ||
    agents[0];

  const isActive = agent.status === "active" && !revoked;
  const rawKey = "0x8f2c9e71b4a035d8e2c67b93f12a4d5e6c7b8a90123456789abcdef012345678";

  const handleCopy = () => {
    navigator.clipboard.writeText(rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Back button */}
      <div>
        <Link
          href="/agents"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Agents
        </Link>
      </div>

      {/* Main Agent Header Card */}
      <div className="rounded-2xl bg-white p-6 sm:p-7 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 rounded-full overflow-hidden bg-slate-100 ring-4 ring-emerald-50 shadow-md">
              <Image
                src={agent.avatar}
                alt={agent.name}
                width={64}
                height={64}
                className="object-cover h-full w-full"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {agent.name}
              </h1>
              <p className="text-sm text-slate-500 font-normal mt-0.5">
                Agent Identity
              </p>
            </div>
          </div>

          <div className="self-start sm:self-auto">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                isActive
                  ? "text-emerald-600 bg-emerald-50"
                  : "text-rose-600 bg-rose-50"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isActive ? "bg-emerald-500" : "bg-rose-500"
                }`}
              />
              {isActive ? "Active" : "Paused"}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-8 pt-4 border-b border-slate-100 text-sm">
          {(
            [
              ["identity", "Identity"],
              ["permissions", "Permissions"],
              ["keys", "Keys"],
              ["activity", "Activity"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`pb-3 font-semibold transition-all relative ${
                activeTab === key
                  ? "text-slate-900 border-b-2 border-slate-900"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab 1: Identity Content */}
        {activeTab === "identity" && (
          <div className="pt-6 grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in">
            {/* Left Column: Details List */}
            <div className="lg:col-span-2 space-y-5">
              <div>
                <p className="text-xs font-semibold text-slate-400">Agent Name</p>
                <p className="text-base font-bold text-slate-900 mt-1">
                  {agent.name}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400">Owner</p>
                <p className="text-base font-bold text-slate-900 mt-1">
                  Chidi Okeke
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400">Public Key</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="font-mono text-sm text-slate-700 tracking-wider">
                    {showKey ? rawKey : "••••••••••••••••••••••••••••••••"}
                  </p>
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    title={showKey ? "Hide key" : "Show key"}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={handleCopy}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    title="Copy key"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400">Issued At</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  Oct 23, 2026, 10:45 AM
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400">Valid Until</p>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  Oct 23, 2027, 10:45 AM
                </p>
              </div>
            </div>

            {/* Right Column: Identity Verified Card */}
            <div>
              <div className="rounded-2xl border border-slate-100 bg-white p-7 text-center flex flex-col items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.03)] h-full min-h-[260px]">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
                  <Check className="h-7 w-7 stroke-[3]" />
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-4">
                  Identity verified
                </h3>

                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-[220px]">
                  This agent has a valid signature and is trusted by Ailo
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Permissions */}
        {activeTab === "permissions" && (
          <div className="pt-6 space-y-4 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-xs font-semibold text-slate-500">Weekly Allowance</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {naira(agent.allowanceKobo, false)}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Automated purchase limit per week</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-xs font-semibold text-slate-500">Single Purchase Threshold</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {naira(agent.thresholdKobo, false)}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Purchases above this require owner nod</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-semibold text-slate-700 mb-1">Allowed Merchants & Categories</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700">
                  Mama Ngozi Stores
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700">
                  NaijaMarket Wholesale
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700">
                  Alaba Market Direct
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700">
                  Category: Groceries & Stock
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Keys */}
        {activeTab === "keys" && (
          <div className="pt-6 space-y-4 animate-in fade-in">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-500">Signature Algorithm:</span>
                <span className="font-mono text-slate-800">Ed25519 (RFC 8032)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-500">Certificate Status:</span>
                <span className="font-semibold text-emerald-600">Active · Non-Revoked</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-500">Spec Gate Enclave:</span>
                <span className="font-mono text-slate-800">sg-enclave-ng-01.ailo.internal</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Activity */}
        {activeTab === "activity" && (
          <div className="pt-6 space-y-3 animate-in fade-in">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-900">Restocked rice for store</p>
                <p className="text-slate-500">Mama Ngozi Stores · Completed via Kora</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900">₦8,500</p>
                <p className="text-emerald-600 font-semibold">Settled</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-900">Weekend restock approval requested</p>
                <p className="text-slate-500">Vegetable oil & supplies</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900">₦12,000</p>
                <p className="text-amber-600 font-semibold">Needs your nod</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
