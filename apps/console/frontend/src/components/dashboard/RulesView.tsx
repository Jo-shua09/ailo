"use client";

import { useState } from "react";
import { ShieldCheck, Check, SlidersHorizontal, Sparkles, AlertCircle, ShoppingBag, Bell } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { useSpecGate } from "@/src/lib/specgate-store";
import { naira } from "@/src/lib/format";

export function RulesView() {
  const {
    englishRule,
    setEnglishRule,
    compiled,
    compiling,
    runStep,
    revoked,
  } = useSpecGate();

  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = () => {
    runStep(1);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-7 animate-in fade-in duration-200">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Rules (Spec Gate)
        </h1>
        <p className="mt-1 text-sm text-slate-500 font-normal">
          Set spending limits, approval triggers, and guardrails for your AI assistants in plain English.
        </p>
      </div>

      {savedNotice && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-emerald-800 flex items-center gap-3 animate-in fade-in">
          <Check className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="text-xs font-semibold">
            Spending rule successfully compiled and enforced by Spec Gate!
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Rule Editor */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl bg-white p-6 border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="rule-box" className="text-sm font-bold text-slate-900">
                Active English Mandate
              </label>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Spec Gate Active
              </span>
            </div>

            <textarea
              id="rule-box"
              value={englishRule}
              onChange={(e) => setEnglishRule(e.target.value)}
              rows={4}
              disabled={revoked}
              className="w-full rounded-xl border border-slate-200 p-4 text-base leading-relaxed text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 resize-none disabled:bg-slate-50"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <p className="text-xs text-slate-500">
                Weekly allowance cap: <strong>₦50,000</strong> · Requires nod above: <strong>₦10,000</strong>
              </p>

              <Button
                onClick={handleSave}
                disabled={compiling || revoked}
                className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 px-5 text-sm font-medium"
              >
                {compiling ? "Compiling rule..." : "Save Spending Rule"}
                <Check className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>

          {/* Test rule simulations */}
          <div className="rounded-2xl bg-white p-6 border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              Test Spending Guardrails
            </h2>
            <p className="text-xs text-slate-500">
              Trigger sample agent purchase requests to test how Spec Gate handles rules, limits, and prompt injection attempts.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!compiled || revoked}
                onClick={() => runStep(3)}
                className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs"
              >
                <ShoppingBag className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                Buy stock (₦8,500)
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={!compiled || revoked}
                onClick={() => runStep(5)}
                className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs"
              >
                <Bell className="h-3.5 w-3.5 mr-1.5 text-amber-600" />
                Request larger restock (₦12,000)
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={!compiled || revoked}
                onClick={() => runStep(4)}
                className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 text-xs"
              >
                <AlertCircle className="h-3.5 w-3.5 mr-1.5 text-rose-600" />
                Simulate prompt drift attack
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: Active Guardrails */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-5 border border-slate-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <span>Guardrails In Effect</span>
            </h2>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-xs font-semibold text-slate-700">Bank Login Shield</p>
                <p className="text-xs text-slate-500 mt-1">
                  AI agents never see your BVN, online banking password, or master wallet keys.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-xs font-semibold text-slate-700">Vetted Supplier Whitelist</p>
                <p className="text-xs text-slate-500 mt-1">
                  Allowed: Mama Ngozi Stores, NaijaMarket Wholesale, Alaba Direct.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-xs font-semibold text-slate-700">AI Intent Verification</p>
                <p className="text-xs text-slate-500 mt-1">
                  Every request reason is checked for goal alignment and prompt injection attempts before money moves.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
