"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { DashboardSidebar } from "./DashboardSidebar";
import { AiloBrand } from "./AiloLogo";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col lg:flex-row antialiased text-slate-900 selection:bg-emerald-500/20 selection:text-emerald-900">
      {/* Mobile top navigation header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3.5 bg-[#0c1017] text-white sticky top-0 z-40 border-b border-slate-800">
        <Link href="/dashboard">
          <AiloBrand />
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile sliding drawer overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-72 max-w-[85vw] h-full shadow-2xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <DashboardSidebar
              onNavigate={() => setMobileMenuOpen(false)}
              className="h-full w-full"
            />
          </div>
        </div>
      )}

      {/* Desktop static sidebar */}
      <DashboardSidebar className="hidden lg:flex min-h-screen sticky top-0 h-screen" />

      {/* Main content canvas */}
      <main className="flex-1 min-w-0 px-4 py-6 sm:px-8 sm:py-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
