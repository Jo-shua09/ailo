"use client";

import { Suspense, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { Footer, Header } from "@/src/components/sg/Header";
import { SpecGateProvider } from "@/src/lib/specgate-store";
import { DashboardLayout } from "@/src/components/dashboard/DashboardLayout";

const customerRoutes = ["/dashboard", "/agents", "/rules", "/nod", "/transactions", "/ledger", "/settings"];

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const customerApp = customerRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (customerApp) {
    return <DashboardLayout>{children}</DashboardLayout>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="min-w-0 flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SpecGateProvider>
      <Suspense fallback={<div className="min-h-screen bg-[#f4f6f9]" />}>
        <Shell>{children}</Shell>
      </Suspense>
    </SpecGateProvider>
  );
}
