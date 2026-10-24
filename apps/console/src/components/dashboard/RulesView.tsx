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
import { useSpecGate, type SpendPolicy } from "@/src/lib/specgate-store";
import { Button } from "@/src/components/ui/button";

// What the saved policy would do with an example purchase (same order as the API: block wins, then Nod).
function verdict(policy: SpendPolicy | null, category: string, amountKobo: number) {
  if (!policy) return null;
  const perPayment = policy.spending_limits.find((l) => l.interval === "per_payment")?.amount_kobo;
  if (!policy.allowed_categories.some((c) => c.toLowerCase() === category)) return "Blocked";
  if (perPayment && amountKobo > perPayment) return "Blocked";
  if (amountKobo > policy.nod_above_kobo) return "Needs approval";
  return "Allowed";
}

const EXAMPLES = [
  { label: "Rice & cooking oil - ₦8,500", category: "groceries", amountKobo: 850_000, Icon: ShoppingBag },
  { label: "Electronics - ₦75,000", category: "electronics", amountKobo: 7_500_000, Icon: Tv },
  { label: "Groceries - ₦15,000", category: "groceries", amountKobo: 1_500_000, Icon: Package },
];

const TONE = {
  Allowed: "text-emerald-600 bg-emerald-50",
  "Needs approval": "text-amber-600 bg-amber-50",
  Blocked: "text-rose-600 bg-rose-50",
} as const;
const DOT = { Allowed: "bg-emerald-500", "Needs approval": "bg-amber-500", Blocked: "bg-rose-500" } as const;

export function RulesView() {
  const {
    setEnglishRule,
    revoked,
    rule,
    compileRule,
    saveRule,
  } = useSpecGate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [ruleText, setRuleText] = useState(
    "My shop agent can spend ₦50,000 a week on stock.\nAsk me before payments above ₦10,000."
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<SpendPolicy | null>(null);
  const [loadedVersion, setLoadedVersion] = useState<number | null>(null);

  // Show the rule that is enforced now, once it arrives from the API (state adjusted during render, not in an effect).
  if (rule && rule.version !== loadedVersion) {
    setLoadedVersion(rule.version);
    setRuleText(rule.english_rule);
  }

  const policy = draft ?? rule?.policy ?? null;
  const specGateCode = policy
    ? JSON.stringify(policy, null, 2)
    : "No rule saved yet. Write one and press Generate Rule.";

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      setDraft(await compileRule(ruleText));
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate the rule.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setIsSaving(true);
    setError(null);
    try {
      await saveRule(ruleText, draft);
      setDraft(null);
      setStep(3);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the rule.");
    } finally {
      setIsSaving(false);
    }
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

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">{error}</div>
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
              onClick={() => void handleGenerate()}
              disabled={isGenerating}
              className="w-full rounded-xl bg-black hover:bg-slate-800 text-white py-3 text-xs sm:text-sm font-semibold transition-all duration-150 active:scale-99 shadow-sm"
            >
              {isGenerating ? "Generating Rule..." : "Generate Rule"}
            </button>
          </div>

          {/* Right Column: Suggested Rule Code */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700">
              {draft ? "Suggested Rule (not saved yet)" : rule ? `Active Rule · version ${rule.version}` : "Suggested Rule (SpecGate)"}
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
            {EXAMPLES.map(({ label, category, amountKobo, Icon }) => {
              const result = verdict(policy, category, amountKobo);
              return (
                <div key={label} className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-100 hover:border-slate-200 shadow-xs transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-medium text-slate-800">{label}</span>
                  </div>
                  {result ? (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${TONE[result]}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${DOT[result]}`} />
                      {result}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">No rule yet</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom right: Save Rule button */}
          <div className="flex justify-end pt-4">
            <button
              onClick={() => void handleSave()}
              disabled={!draft || isSaving || revoked}
              className="rounded-xl bg-black hover:bg-slate-800 text-white px-7 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-150 active:scale-98 shadow-sm"
            >
              {isSaving ? "Saving..." : "Save Rule"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
