"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  Home,
  Bot,
  ShieldCheck,
  CheckCircle2,
  ArrowLeftRight,
  Receipt,
  Settings,
  SlidersHorizontal,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { AiloBrand } from "./AiloLogo";
import { useSpecGate } from "@/src/lib/specgate-store";
import { cn } from "@/src/lib/utils";

export const DASHBOARD_NAV = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/rules", label: "Rules (Spec Gate)", icon: ShieldCheck },
  { href: "/nod", label: "Approvals (Nod)", icon: CheckCircle2 },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/ledger", label: "Ledger (Receipt)", icon: Receipt },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function DashboardSidebar({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const { payments } = useSpecGate();

  const pendingApprovalsCount = payments.filter(
    (p) =>
      p.status === "pending_approval" ||
      p.status === "approved" ||
      p.status === "escrow_held" ||
      p.status === "submitted",
  ).length;

  return (
    <aside
      className={cn(
        "flex flex-col justify-between w-64 shrink-0 bg-[#0c1017] text-white p-5 select-none",
        className,
      )}
    >
      <div>
        {/* Brand header */}
        <div className="px-2 pt-2 pb-7">
          <Link href="/dashboard" className="inline-block" onClick={onNavigate}>
            <AiloBrand />
          </Link>
        </div>

        {/* Navigation list */}
        <nav aria-label="Dashboard navigation" className="space-y-1.5">
          {DASHBOARD_NAV.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            const isApprovals = item.href === "/nod";

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-[#11231f] text-white border border-emerald-500/25 shadow-[0_0_14px_rgba(16,185,129,0.12)]"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent",
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive
                        ? "text-emerald-400"
                        : "text-slate-400 group-hover:text-white",
                    )}
                  />
                  <span>{item.label}</span>
                </div>

                {isApprovals && pendingApprovalsCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500/20 px-1.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/30">
                    {pendingApprovalsCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User profile footer */}
      <div className="pt-6 border-t border-slate-800/60 mt-auto">
        <Link
          href="/settings"
          onClick={onNavigate}
          className="flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-white/[0.04] transition-colors group"
        >
          <div className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden ring-2 ring-emerald-500/20 bg-slate-800">
            <Image
              src="/images/chidi-avatar.jpg"
              alt="Chidi Charles"
              width={40}
              height={40}
              className="object-cover h-full w-full"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate group-hover:text-emerald-300 transition-colors">
              Chidi Okeke
            </p>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              Business Owner
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
