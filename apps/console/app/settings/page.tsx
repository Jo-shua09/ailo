export const instant = false;

import type { Metadata } from "next";
import { SettingsView } from "@/src/components/dashboard/SettingsView";

export const metadata: Metadata = {
  title: "Settings · Ailo",
  description: "Manage credentials, emergency controls, and profile settings.",
};

export default function SettingsPage() {
  return <SettingsView />;
}
