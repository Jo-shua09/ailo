"use client";

import { useState } from "react";
import Image from "next/image";
import { User, Shield, AlertTriangle, RotateCcw, Check, Sparkles, Building2 } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { useSpecGate } from "@/src/lib/specgate-store";

export function SettingsView() {
  const { revoked, revoke, reset } = useSpecGate();
  const [resetDone, setResetDone] = useState(false);

  const handleReset = () => {
    reset();
    setResetDone(true);
    setTimeout(() => setResetDone(false), 3000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-7 animate-in fade-in duration-200">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Settings & Profile
        </h1>
        <p className="mt-1 text-sm text-slate-500 font-normal">
          Manage your business credentials, payment routing, and emergency guardrails.
        </p>
      </div>

      {resetDone && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 flex items-center gap-3">
          <Check className="h-5 w-5 text-emerald-600" />
          <p className="text-xs font-semibold">Demo workspace reset to initial state.</p>
        </div>
      )}

      {/* User Profile Card */}
      <div className="rounded-2xl bg-white p-6 border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-6">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <User className="h-5 w-5 text-slate-600" />
          <span>Account Profile</span>
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="relative h-16 w-16 shrink-0 rounded-full overflow-hidden ring-4 ring-emerald-500/20 bg-slate-100">
            <Image
              src="/images/chidi-avatar.jpg"
              alt="Chidi Charles"
              width={64}
              height={64}
              className="object-cover h-full w-full"
            />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Chidi Okeke</h3>
            <p className="text-xs text-slate-500">Business Owner & Admin · Lagos, Nigeria</p>
            <p className="text-xs text-emerald-600 font-medium">Verified Ailo Account · Kora Settlement Active</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          <div>
            <label className="text-xs font-medium text-slate-500">Business Name</label>
            <p className="text-sm font-semibold text-slate-900 mt-1">Chidi Enterprise Retail & Wholesale</p>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Default Currency</label>
            <p className="text-sm font-semibold text-slate-900 mt-1">Nigerian Naira (₦ / NGN)</p>
          </div>
        </div>
      </div>

      {/* Emergency Controls & Reset */}
      <div className="rounded-2xl bg-white p-6 border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-6">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Shield className="h-5 w-5 text-slate-600" />
          <span>Security & Emergency Controls</span>
        </h2>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-slate-900">Autonomous Emergency Brake</p>
            <p className="text-xs text-slate-500 mt-0.5 max-w-md">
              Immediately pause all active agents. Prevents any outbound simulated or live settlements.
            </p>
          </div>

          <Button
            variant={revoked ? "outline" : "destructive"}
            onClick={revoked ? reset : revoke}
            className="rounded-xl text-xs font-semibold shrink-0"
          >
            {revoked ? "Resume Agents" : "Activate Emergency Brake"}
          </Button>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-slate-900">Reset Demo Workspace</p>
            <p className="text-xs text-slate-500 mt-0.5 max-w-md">
              Restores standard sample data (₦50,000 allowance, ₦12,450 spent, 2 pending approvals).
            </p>
          </div>

          <Button
            variant="outline"
            onClick={handleReset}
            className="rounded-xl text-xs font-semibold border-slate-200 shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reset Sample Data
          </Button>
        </div>
      </div>
    </div>
  );
}
