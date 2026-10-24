"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { CustomerSidebar, Footer, Header } from "@/src/components/sg/Header";
import { SpecGateProvider, useSpecGate } from "@/src/lib/specgate-store";
import { cn } from "@/src/lib/utils";

const customerRoutes = ["/dashboard", "/rules", "/agents", "/ledger", "/nod"];

function Shell({ children }: { children: ReactNode }) {
  const { revoked } = useSpecGate();
  const pathname = usePathname();

  const customerApp = customerRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      {revoked && customerApp && (
        <div className="border-b border-destructive bg-destructive/10 px-4 py-3 text-center text-sm font-medium text-destructive">
          Your agent is paused. No new payments can go through.
        </div>
      )}

      <div className={cn("flex flex-1", customerApp && "customer-layout")}>
        {customerApp && <CustomerSidebar />}
        <main className={cn("min-w-0 flex-1", customerApp && "customer-main")}>{children}</main>
      </div>

      {!customerApp && <Footer />}
    </div>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SpecGateProvider>
        <Shell>{children}</Shell>
      </SpecGateProvider>
    </QueryClientProvider>
  );
}
