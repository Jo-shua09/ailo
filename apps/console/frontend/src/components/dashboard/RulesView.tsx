"use client";

import { useState } from "react";
import {
  ShoppingBag,
  Tv,
  Package,
  Check,
  CheckCircle2,
  Sliders,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { useSpecGate } from "@/src/lib/specgate-store";
import { Button } from "@/src/components/ui/button";

export function RulesView() {
  const {
    englishRule,
    setEnglishRule,
    compiled,
    compiling,
    runStep,
    revoked,
  } = useSpecGate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [ruleText, setRuleText] = useState(
    "My shop agent can spend ₦50,000 a week on stock.\nAsk me before payments above ₦10,000."
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Suggested rule code based on the english text
  const specGateCode = `allow {
  merchant: "approved_stores",
  category: ["groceries", "supplies"],
  max_amount: 10000,
  weekly_limit: 50000
}`;

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setStep(2);
    }, 400);
  };

  const handleSave = () => {
    runStep(1);
    setStep(3);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      {savedSuccess && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/95 p-4 text-emerald-800 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-xs font-semibold">
              Spending rule successfully saved and enforced by Spec Gate!
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-700">Active</span>
        </div>
      )}

      {/* Header card */}
      <div className="rounded-2xl bg-white p-6 sm:p-7 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-6">
        {/* Top title and icon */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Spending Rules
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 font-normal">
              Control what your agent can spend, where and how much.
            </p>
          </div>
          <button
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Help"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>

        {/* 3-Step Progress Indicator */}
        <div className="flex items-center gap-3 py-2 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                step >= 1
                  ? "bg-slate-900 text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              1
            </span>
            <span className={step >= 1 ? "text-slate-900" : "text-slate-400"}>
              Write
            </span>
          </div>

          <div
            className={`h-0.5 flex-1 max-w-[80px] ${
              step >= 2 ? "bg-slate-900" : "bg-slate-200"
            }`}
          />

          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                step >= 2
                  ? "bg-slate-900 text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              2
            </span>
            <span className={step >= 2 ? "text-slate-900" : "text-slate-400"}>
              Test
            </span>
          </div>

          <div
            className={`h-0.5 flex-1 max-w-[80px] ${
              step >= 3 ? "bg-slate-900" : "bg-slate-200"
            }`}
          />

          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                step >= 3
                  ? "bg-slate-900 text-white"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              3
            </span>
            <span className={step >= 3 ? "text-slate-900" : "text-slate-400"}>
              Save
            </span>
          </div>
        </div>

        {/* Main 2-column rule creation area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Left Column: English Input */}
          <div className="space-y-3">
            <label
              htmlFor="english-prompt"
              className="block text-xs font-semibold text-slate-700"
            >
              Describe your rule in plain English
            </label>

            <div className="rounded-xl border border-slate-200 bg-white p-4 focus-within:border-slate-400 transition-colors">
              <textarea
                id="english-prompt"
                rows={5}
                value={ruleText}
                onChange={(e) => {
                  setRuleText(e.target.value);
                  setEnglishRule(e.target.value);
                }}
                className="w-full text-sm leading-relaxed text-slate-800 outline-none resize-none bg-transparent"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full rounded-xl bg-black hover:bg-slate-800 text-white py-3 text-xs sm:text-sm font-semibold transition-all duration-150 active:scale-99 shadow-sm"
            >
              {isGenerating ? "Generating Rule..." : "Generate Rule"}
            </button>
          </div>

          {/* Right Column: Suggested Rule Code */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700">
              Suggested Rule (SpecGate)
            </label>

            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 font-mono text-xs text-slate-800 h-[178px] overflow-y-auto leading-relaxed select-text">
              <pre className="whitespace-pre font-mono">{specGateCode}</pre>
            </div>
          </div>
        </div>

        {/* Lower Section: Test rule with example transactions */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <h2 className="text-xs font-semibold text-slate-700">
            Test rule with example transactions
          </h2>

          <div className="space-y-2.5">
            {/* Example 1: Rice & cooking oil - ₦8,500 */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-100 hover:border-slate-200 shadow-xs transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium text-slate-800">
                  Rice & cooking oil - ₦8,500
                </span>
              </div>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold text-emerald-600 bg-emerald-50">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Allowed
              </span>
            </div>

            {/* Example 2: Electronics - ₦75,000 */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-100 hover:border-slate-200 shadow-xs transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Tv className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium text-slate-800">
                  Electronics - ₦75,000
                </span>
              </div>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold text-amber-600 bg-amber-50">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Needs approval
              </span>
            </div>

            {/* Example 3: Groceries - ₦15,000 */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-100 hover:border-slate-200 shadow-xs transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Package className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium text-slate-800">
                  Groceries - ₦15,000
                </span>
              </div>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold text-amber-600 bg-amber-50">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Needs approval
              </span>
            </div>
          </div>

          {/* Bottom right: Save Rule button */}
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              disabled={compiling || revoked}
              className="rounded-xl bg-black hover:bg-slate-800 text-white px-7 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-150 active:scale-98 shadow-sm"
            >
              {compiling ? "Saving..." : "Save Rule"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
