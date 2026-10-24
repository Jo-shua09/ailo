import type { Metadata } from "next";
import { AuthCard } from "@/src/components/auth/AuthCard";

export const metadata: Metadata = {
  title: "Sign In · Ailo",
  description: "Secure entry to manage your AI agents, allowances, and spending rules.",
};

export default function LoginPage() {
  return <AuthCard initialMode="login" />;
}
