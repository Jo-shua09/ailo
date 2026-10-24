import type { Metadata } from "next";
import { DashboardOverview } from "@/src/components/dashboard/DashboardOverview";

export const metadata: Metadata = {
  title: "Dashboard · Ailo",
  description: "Monitor your AI agent allowance, spending, and pending approvals.",
};

export default function DashboardPage() {
  return <DashboardOverview />;
}
