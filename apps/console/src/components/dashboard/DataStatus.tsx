import { AlertCircle, LoaderCircle, RotateCw } from "lucide-react";

export function DataStatus({ loading, error, onRetry }: { loading: boolean; error: string | null; onRetry: () => void }) {
  if (loading) {
    return (
      <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <LoaderCircle className="h-4 w-4 animate-spin text-emerald-600" />
        <span>Loading your latest account data…</span>
        <span className="sr-only">Please wait</span>
      </div>
    );
  }

  if (!error) return null;

  return (
    <div role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</span>
      <button onClick={onRetry} className="inline-flex items-center gap-2 self-start font-semibold text-rose-800 hover:text-rose-950 sm:self-auto">
        <RotateCw className="h-3.5 w-3.5" /> Try again
      </button>
    </div>
  );
}
