export const instant = false;

import type { Metadata } from "next";
import { TransactionsView } from "@/src/components/dashboard/TransactionsView";

export const metadata: Metadata = {
  title: "Ledger (Receipt) · Ailo",
  description: "Detailed ledger records and Kora payment settlements.",
};

export default function LedgerPage() {
  return <TransactionsView />;
}
