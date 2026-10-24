"use client";

import { useState } from "react";
import { Plus, X, Sparkles } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { useSpecGate } from "@/src/lib/specgate-store";

export function CreateAgentDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { registerAgent } = useSpecGate();
  const [name, setName] = useState("");
  const [publicKeyX, setPublicKeyX] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = publicKeyX.trim();
    if (!/^[A-Za-z0-9_-]{43}$/.test(key)) {
      setError("Enter the 43-character Ed25519 public key value (JWK x).");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await registerAgent(name.trim(), key);
      setName("");
      setPublicKeyX("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register the agent.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-agent-title"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 id="create-agent-title" className="text-lg font-bold text-slate-900">Register AI Agent</h2>
              <p className="text-xs text-slate-500">Connect an agent public key to your workspace</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="agent-name" className="block text-xs font-semibold text-slate-700 mb-1">
              Agent Name
            </label>
            <input
              id="agent-name"
              type="text"
              required
              maxLength={100}
              placeholder="e.g. Shop Agent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label htmlFor="agent-public-key" className="block text-xs font-semibold text-slate-700 mb-1">
              Ed25519 Public Key (JWK x)
            </label>
            <input
              id="agent-public-key"
              type="text"
              required
              autoComplete="off"
              spellCheck={false}
              placeholder="Paste the public key value from your agent kit"
              value={publicKeyX}
              onChange={(e) => setPublicKeyX(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Generate the agent keypair with the agent kit, then paste only its public JWK x value. Keep the private key with the agent.
            </p>
          </div>

          {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <Button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 px-5 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              {busy ? "Registering..." : "Register Agent"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
