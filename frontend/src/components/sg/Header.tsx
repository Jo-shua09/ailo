"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Menu, X, LayoutDashboard, SlidersHorizontal, Bot, ReceiptText, Bell, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { useSpecGate } from "@/src/lib/specgate-store";
import { cn } from "@/src/lib/utils";

export const LAYERS = [
  { n: 1, key: "identity", label: "Badge", sub: "Identity", desc: "Your assistant gets its own identity. Your bank login stays private." },
  { n: 2, key: "spend", label: "Spec Gate", sub: "Spending rules", desc: "Set an allowance and choose what your assistant can buy." },
  { n: 3, key: "accept", label: "Till", sub: "Checkout", desc: "Your assistant can shop with participating businesses." },
  { n: 4, key: "settle", label: "Square Up", sub: "Payment checks", desc: "Match every purchase to its payment confirmation." },
  { n: 5, key: "trace", label: "Receipt", sub: "Clear records", desc: "See what was bought, why, and which checks it passed." },
] as const;

export function Emblem({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8 text-primary", className)} fill="none" aria-hidden="true">
      <path d="M5 24 15 5h3l9 19h-6l-4.5-10L11 24H5Z" fill="currentColor" />
      <circle cx="16" cy="25" r="3" fill="currentColor" />
    </svg>
  );
}
export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Ailo home">
      <Emblem />
      <span className="text-3xl font-bold">
        ailo<span className="text-primary">.</span>
      </span>
    </Link>
  );
}
const appNav = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/rules", label: "Spending rules", icon: SlidersHorizontal },
  { to: "/agents", label: "My assistants", icon: Bot },
  { to: "/nod", label: "Approvals", icon: Bell },
  { to: "/ledger", label: "Payments", icon: ReceiptText },
] as const;
export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const inApp = appNav.some((n) => n.to === pathname);
  return (
    <header className="site-header border-b border-border bg-card">
      <div className="site-container flex h-20 items-center justify-between gap-5">
        <Brand />
        <nav aria-label="Main navigation" className="hidden items-center gap-8 md:flex">
          <Link href="/" className={`text-sm font-medium ${pathname === "/" ? "text-primary" : ""}`}>
            Home
          </Link>
          <Link href="/ecosystem" className={`text-sm font-medium ${pathname === "/ecosystem" ? "text-primary" : ""}`}>
            How it works
          </Link>
          <Link href="/security" className={`text-sm font-medium ${pathname === "/security" ? "text-primary" : ""}`}>
            Your money, protected
          </Link>
          <Link href="/shop" className={`text-sm font-medium ${pathname === "/shop" ? "text-primary" : ""}`}>
            Demo shop
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          {inApp ? (
            <span className="hidden items-center gap-2 text-sm sm:flex">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent font-semibold text-primary">A</span> Amaka{" "}
              <span className="text-muted-foreground">· Owner</span>
            </span>
          ) : (
            <Button asChild className="hidden sm:inline-flex" size="lg">
              <Link href="/dashboard">
                Try Ailo <ArrowUpRight />
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="icon" className="md:hidden" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-border p-5 md:hidden" aria-label="Mobile navigation">
          {[
            { to: "/", label: "Home" },
            { to: "/ecosystem", label: "How it works" },
            { to: "/security", label: "Your money, protected" },
            { to: "/shop", label: "Demo shop" },
            { to: "/dashboard", label: "Open my dashboard" },
          ].map((n) => (
            <Link key={n.to} href={n.to} className="block py-3 text-base font-medium" onClick={() => setOpen(false)}>
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
export function CustomerSidebar() {
  const pathname = usePathname();
  const sg = useSpecGate();
  return (
    <aside className="customer-sidebar border-border bg-card">
      <div className="hidden px-5 pb-5 pt-8 lg:block">
        <p className="text-xs font-medium uppercase text-muted-foreground">YOUR WORKSPACE</p>
        <p className="mt-2 text-lg font-semibold">Amaka’s business</p>
        <span className="mt-2 inline-block rounded-full bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground">SANDBOX</span>
      </div>
      <nav aria-label="Workspace navigation" className="flex gap-1 overflow-x-auto p-3 lg:flex-col lg:p-4">
        {appNav.map((n) => (
          <Link
            key={n.to}
            href={n.to}
            className={`flex shrink-0 items-center gap-3 rounded-md px-4 py-3 text-sm font-medium text-muted-foreground ${pathname === n.to ? "bg-accent text-primary" : ""}`}
          >
            <n.icon className="h-5 w-5" />
            {n.label}
            {n.to === "/nod" && sg.payments.some((p) => p.status === "pending_approval") && <span className="h-2 w-2 rounded-full bg-warning" />}
          </Link>
        ))}
      </nav>
      <div className="mt-auto hidden space-y-3 border-t border-border p-5 lg:block">
        <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Ailo
        </Link>
        <Button variant="ghost" className="px-0 text-xs text-muted-foreground" onClick={sg.reset}>
          <RotateCcw /> Reset demo
        </Button>
        <p className="text-xs leading-relaxed text-muted-foreground">Sample workspace. No real money moves.</p>
      </div>
    </aside>
  );
}
export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="site-container grid gap-8 py-12 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Brand />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            A little independence for your AI.
            <br />A lot more peace of mind for you.
          </p>
          <p className="mt-5 font-mono text-[10px] text-muted-foreground">SANDBOX · NO REAL MONEY MOVES</p>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-semibold">Explore Ailo</h3>
          <div className="flex flex-col gap-3 text-sm text-muted-foreground">
            <Link href="/ecosystem">How it works</Link>
            <Link href="/security">Safety & control</Link>
            <Link href="/shop">Try the demo shop</Link>
          </div>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-semibold">Your workspace</h3>
          <div className="flex flex-col gap-3 text-sm text-muted-foreground">
            <Link href="/dashboard">Overview</Link>
            <Link href="/rules">Spending rules</Link>
            <Link href="/nod">Payment approvals</Link>
            <Link href="/developers">For developers</Link>
          </div>
        </div>
      </div>
      <div className="site-container flex flex-wrap justify-between gap-3 border-t border-border py-6 text-xs text-muted-foreground">
        <span>© 2026 Ailo. Built for the way you do business.</span>
        <span>Made for everyday business in Nigeria.</span>
      </div>
    </footer>
  );
}
