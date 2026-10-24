export const instant = false;

import type { Metadata } from "next";
import { AgentsView } from "@/src/components/dashboard/AgentsView";

export const metadata: Metadata = {
  title: "AI Agents · Ailo",
  description: "Manage your AI agents and their spending permissions.",
};

export default function AgentsPage() {
  return <AgentsView />;
}
