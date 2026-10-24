import type { Metadata } from "next";
import { AgentIdentityView } from "@/src/components/dashboard/AgentIdentityView";

export const metadata: Metadata = {
  title: "Agent Identity (Badge) · Ailo",
  description: "View and verify your AI agent's digital identity and cryptographic credentials.",
};

export function generateStaticParams() {
  return [
    { id: "shop-agent" },
    { id: "research-agent" },
    { id: "content-agent" },
  ];
}

export default async function AgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AgentIdentityView agentId={id} />;
}
