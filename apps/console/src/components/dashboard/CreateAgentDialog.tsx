"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, X, Bot, Shield, Check, Sparkles } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { useSpecGate, type Agent } from "@/src/lib/specgate-store";

const AVATAR_OPTIONS = [
  { id: "shop", src: "/images/shop-agent.jpg", label: "Turquoise Visor" },
  { id: "research", src: "/images/research-agent.jpg", label: "Indigo Sensor" },
  { id: "content", src: "/images/content-agent.jpg", label: "Lavender Core" },
];

export function CreateAgentDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { addAgent } = useSpecGate();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [allowance, setAllowance] = useState("25000");
  const [threshold, setThreshold] = useState("5000");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0].src);
  const [description, setDescription] = useState("");

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newAgent: Agent = {
      id: `agent_${Date.now()}`,
      name: name.trim(),
      role: role.trim() || "Operations & automation",
      avatar: selectedAvatar,
      status: "active",
      spentThisWeek: "₦0 spent this week",
      allowanceKobo: (parseInt(allowance, 10) || 25000) * 100,
      thresholdKobo: (parseInt(threshold, 10) || 5000) * 100,
      description: description.trim() || `Automated assistant for ${name.trim()}.`,
    };

    addAgent(newAgent);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Create AI Agent</h2>
              <p className="text-xs text-slate-500">Configure identity and spending allowance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select 3D Avatar
            </label>
            <div className="flex items-center gap-4">
              {AVATAR_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setSelectedAvatar(opt.src)}
                  className={`relative rounded-2xl p-1 transition-all ${
                    selectedAvatar === opt.src
                      ? "ring-3 ring-emerald-500 scale-105"
                      : "opacity-70 hover:opacity-100"
                  }`}
                >
                  <div className="h-12 w-12 rounded-xl overflow-hidden bg-slate-100">
                    <Image
                      src={opt.src}
                      alt={opt.label}
                      width={48}
                      height={48}
                      className="object-cover h-full w-full"
                    />
                  </div>
                  {selectedAvatar === opt.src && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px]">
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Agent Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Logistics Agent, Procurement Scout"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Function & Role
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Courier payments & restocking"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Weekly Allowance (₦)
              </label>
              <input
                type="number"
                min="1000"
                step="1000"
                value={allowance}
                onChange={(e) => setAllowance(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Approval Threshold (₦)
              </label>
              <input
                type="number"
                min="500"
                step="500"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Agent Mandate (English prompt / boundaries)
            </label>
            <textarea
              rows={2}
              placeholder="Allowed to purchase fuel from Conoil, dispatch with GIG Logistics, up to limit..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none resize-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <Button
              type="submit"
              className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 px-5 py-2.5 text-sm font-medium"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create Agent
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
