import { randomUUID } from "node:crypto";
import type { JWK } from "jose";
import { getCollection, type BaseCollection } from "../../db/mongo";
import type { Agent, AgentBadge, AgentStatus } from "./agents.dto";

export type { AgentStatus, Agent };

export interface NonceRecord {
  agent_id: string;
  nonce: string;
  created_at: string;
}

export interface AgentRepository {
  create(input: { name: string; public_jwk: JWK }): Promise<Agent>;
  get(id: string): Promise<Agent | undefined>;
  list(): Promise<Agent[]>;
  setStatus(id: string, status: AgentStatus): Promise<Agent | undefined>;
}

// In-memory implementation for dependency injection / isolated tests
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

  async get(id: string): Promise<Agent | undefined> {
    return this.agents.get(id);
  }

  async list(): Promise<Agent[]> {
    return [...this.agents.values()];
  }

  async setStatus(id: string, status: AgentStatus): Promise<Agent | undefined> {
    const agent = this.agents.get(id);
    if (agent) agent.status = status;
    return agent;
  }
}

// MongoDB-backed repository with Nonce tracking and dual interface support
export class AgentsRepository implements AgentRepository {
  private async getAgentsCollection(): Promise<BaseCollection<AgentBadge>> {
    return getCollection<AgentBadge>("agents");
  }

  private async getNoncesCollection(): Promise<BaseCollection<NonceRecord>> {
    return getCollection<NonceRecord>("nonces");
  }

  async createAgent(agent: AgentBadge): Promise<void> {
    const coll = await this.getAgentsCollection();
    await coll.insertOne(agent);
  }

  async findAgentById(id: string): Promise<AgentBadge | null> {
    const coll = await this.getAgentsCollection();
    return coll.findOne({ id });
  }

  async listAgents(): Promise<AgentBadge[]> {
    const coll = await this.getAgentsCollection();
    return coll.find().toArray();
  }

  async updateAgentStatus(id: string, status: AgentStatus, revoked_at?: string): Promise<AgentBadge | null> {
    const coll = await this.getAgentsCollection();
    await coll.updateOne({ id }, { $set: { status, revoked_at: revoked_at ?? null } });
    return this.findAgentById(id);
  }

  async recordNonce(agent_id: string, nonce: string): Promise<boolean> {
    const coll = await this.getNoncesCollection();
    const existing = await coll.findOne({ agent_id, nonce });
    if (existing) {
      return false; // Nonce already seen: replay!
    }
    await coll.insertOne({
      agent_id,
      nonce,
      created_at: new Date().toISOString(),
    });
    return true;
  }

  // AgentRepository interface compatibility methods:
  async create(input: { name: string; public_jwk: JWK }): Promise<Agent> {
    const id = `agt_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const now = new Date().toISOString();
    const badge: AgentBadge = {
      id,
      name: input.name,
      status: "active",
      public_key_jwk: { ...input.public_jwk, kid: id } as any,
      key_fingerprint: `ed25519:${input.public_jwk.x?.slice(0, 16)}`,
      created_at: now,
      revoked_at: null,
    };
    await this.createAgent(badge);
    return {
      id,
      name: input.name,
      public_jwk: input.public_jwk,
      status: "active",
      created_at: now,
    };
  }

  async get(id: string): Promise<Agent | undefined> {
    const b = await this.findAgentById(id);
    if (!b) return undefined;
    return {
      id: b.id,
      name: b.name,
      public_jwk: b.public_key_jwk,
      status: b.status,
      created_at: b.created_at,
    };
  }

  async list(): Promise<Agent[]> {
    const all = await this.listAgents();
    return all.map((b) => ({
      id: b.id,
      name: b.name,
      public_jwk: b.public_key_jwk,
      status: b.status,
      created_at: b.created_at,
    }));
  }

  async setStatus(id: string, status: AgentStatus): Promise<Agent | undefined> {
    const b = await this.updateAgentStatus(id, status);
    if (!b) return undefined;
    return {
      id: b.id,
      name: b.name,
      public_jwk: b.public_key_jwk,
      status: b.status,
      created_at: b.created_at,
    };
  }
}

export const agentsRepository = new AgentsRepository();
