"use client";

import { useState, Suspense, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Footer, Header } from "@/src/components/sg/Header";
import { SpecGateProvider } from "@/src/lib/specgate-store";
import { DashboardLayout } from "@/src/components/dashboard/DashboardLayout";

const customerRoutes = [
  "/dashboard",
  "/agents",
  "/rules",
  "/nod",
  "/transactions",
  "/ledger",
  "/settings",
];

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const customerApp = customerRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

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
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SpecGateProvider>
        <Suspense fallback={<div className="min-h-screen bg-[#f4f6f9]" />}>
          <Shell>{children}</Shell>
        </Suspense>
      </SpecGateProvider>
    </QueryClientProvider>
  );
}
