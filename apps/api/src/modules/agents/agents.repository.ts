import { randomUUID } from "node:crypto";
import type { JWK } from "jose";

export type AgentStatus = "active" | "revoked";

export interface Agent {
  id: string;
  name: string;
  public_jwk: JWK;
  status: AgentStatus;
  created_at: string;
}

export interface AgentRepository {
  create(input: { name: string; public_jwk: JWK }): Promise<Agent>;
  get(id: string): Promise<Agent | undefined>;
  list(): Promise<Agent[]>;
  setStatus(id: string, status: AgentStatus): Promise<Agent | undefined>;
}

// shortcut: in-memory, lost on restart; swap for a Drizzle repository once the agents table lands.
export class InMemoryAgentRepository implements AgentRepository {
  private readonly agents = new Map<string, Agent>();

  async create(input: { name: string; public_jwk: JWK }): Promise<Agent> {
    const agent: Agent = {
      id: `agt_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
      name: input.name,
      public_jwk: input.public_jwk,
      status: "active",
      created_at: new Date().toISOString(),
    };
    this.agents.set(agent.id, agent);
    return agent;
  }

  async get(id: string) {
    return this.agents.get(id);
  }

  async list() {
    return [...this.agents.values()];
  }

  async setStatus(id: string, status: AgentStatus) {
    const agent = this.agents.get(id);
    if (agent) agent.status = status;
    return agent;
  }
}
