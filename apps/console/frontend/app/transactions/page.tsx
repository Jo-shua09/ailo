import type { Metadata } from "next";
import { TransactionsView } from "@/src/components/dashboard/TransactionsView";

export const metadata: Metadata = {
  title: "Transactions · Ailo",
  description: "View all AI assistant transactions and settlements.",
};

export default function TransactionsPage() {
  return <TransactionsView />;
}
