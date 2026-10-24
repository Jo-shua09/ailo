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

    const expireSession = () => {
      setAuthenticated(false);
      if (customerApp) router.replace("/login");
    };
    window.addEventListener("ailo:session-expired", expireSession);
    return () => window.removeEventListener("ailo:session-expired", expireSession);
  }, [customerApp, pathname, router]);

  if (customerApp) {
    if (!authenticated) {
      return (
        <main
          className="min-h-screen bg-[#f4f6f9] px-4 py-8 sm:px-8"
          role="status"
          aria-label="Checking your session"
          aria-busy="true"
        >
          <div className="mx-auto max-w-6xl animate-pulse space-y-6">
            <div className="h-10 w-48 rounded-xl bg-white" />
            <div className="h-28 rounded-2xl bg-white" />
            <div className="h-52 rounded-2xl bg-white" />
          </div>
        </main>
      );
    }
    return <DashboardLayout>{children}</DashboardLayout>;
  }

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  if (isAuthPage) {
    return <main className="w-full min-h-screen">{children}</main>;
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
