export const instant = false;

import type { Metadata } from "next";
import { RulesView } from "@/src/components/dashboard/RulesView";

export const metadata: Metadata = {
  title: "Rules (Spec Gate) · Ailo",
  description: "Set spending rules and approval boundaries for your AI assistants.",
};

export default function RulesPage() {
  return <RulesView />;
}
