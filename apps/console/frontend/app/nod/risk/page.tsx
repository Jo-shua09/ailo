import type { Metadata } from "next";
import { SecondLookRiskView } from "@/src/components/dashboard/SecondLookRiskView";

export const metadata: Metadata = {
  title: "Second Look — Risk Check · Ailo",
  description: "AI-powered risk verification check for suspicious or unusual payments.",
};

export default function RiskCheckPage() {
  return <SecondLookRiskView />;
}
