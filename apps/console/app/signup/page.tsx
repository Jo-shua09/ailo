import type { Metadata } from "next";
import { AuthCard } from "@/src/components/auth/AuthCard";

export const metadata: Metadata = {
  title: "Create Account · Ailo",
  description: "Sign up to give your AI agents safe, audited allowances and clear limits.",
};

export default function SignupPage() {
  return <AuthCard initialMode="signup" />;
}
