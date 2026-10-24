export const instant = false;

import type { Metadata } from "next";
import { ApprovalsView } from "@/src/components/dashboard/ApprovalsView";

export const metadata: Metadata = {
  title: "Approvals (Nod) · Ailo",
  description: "Review and approve purchases above your spending threshold.",
};

export default function ApprovalsPage() {
  return <ApprovalsView />;
}
