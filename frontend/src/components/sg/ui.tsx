import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils";
import type { PaymentStatus } from "@/src/lib/specgate-store";

export function Panel({
  title,
  kicker,
  right,
  children,
  className,
  bodyClass,
}: {
  title: string;
  kicker?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <section className={cn("panel flex flex-col overflow-hidden", className)}>
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {kicker && <span className="num text-[10px] text-dim">{kicker}</span>}
          <h3 className="truncate text-sm font-semibold">{title}</h3>
        </div>
        {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
      </header>
      <div className={cn("min-w-0 flex-1 p-4", bodyClass)}>{children}</div>
    </section>
  );
}

type Tone = "ok" | "warn" | "bad" | "dim";
const toneCls: Record<Tone, string> = {
  ok: "text-primary border-primary/30 bg-primary/10",
  warn: "text-warning border-warning/30 bg-warning/10",
  bad: "text-destructive border-destructive/30 bg-destructive/10",
  dim: "text-muted-foreground border-border bg-well",
};
export function Tag({ tone = "dim", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("tag", toneCls[tone], className)}>{children}</span>;
}

export function Led({ tone = "ok" }: { tone?: Tone }) {
  const c = tone === "ok" ? "text-primary" : tone === "warn" ? "text-warning" : tone === "bad" ? "text-destructive" : "text-dim";
  return <span className={cn("led inline-block", c)} />;
}

export function statusTone(s: PaymentStatus): Tone {
  if (s === "settled") return "ok";
  if (s === "blocked" || s === "denied" || s === "failed") return "bad";
  if (s === "requested") return "dim";
  return "warn";
}

export function StatusTag({ status }: { status: PaymentStatus }) {
  return <Tag tone={statusTone(status)}>{status}</Tag>;
}

export function Code({ children, className }: { children: string; className?: string }) {
  return (
    <pre className={cn("dots num overflow-x-auto rounded-sm border border-border p-3 text-[11.5px] leading-relaxed text-foreground/90", className)}>
      <code>{children}</code>
    </pre>
  );
}

export function PageIntro({ kicker, title, accent, children }: { kicker: string; title: string; accent: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 border-b border-border pb-6">
      <span className="num text-[11px] uppercase tracking-[0.18em] text-primary">{kicker}</span>
      <h1 className="text-3xl font-bold leading-[1.05] sm:text-4xl md:text-5xl">
        {title} <span className="font-serif font-normal italic tracking-normal text-primary">{accent}</span>
      </h1>
      {children && <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{children}</p>}
    </div>
  );
}
