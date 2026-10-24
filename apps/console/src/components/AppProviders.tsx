"use client";

import { Suspense, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getToken } from "@/src/lib/api";

import { Footer, Header } from "@/src/components/sg/Header";
import { SpecGateProvider } from "@/src/lib/specgate-store";
import { DashboardLayout } from "@/src/components/dashboard/DashboardLayout";

const customerRoutes = ["/dashboard", "/agents", "/rules", "/nod", "/transactions", "/ledger", "/settings"];

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const customerApp = customerRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  useEffect(() => {
    const token = getToken();
    setAuthenticated(Boolean(token));
    if (customerApp && !token) router.replace("/login");
  }, [customerApp, pathname, router]);

  if (customerApp) {
    if (!authenticated) return null;
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
