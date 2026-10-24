import { randomUUID } from "node:crypto";
import { getCollection } from "../../db/mongo";
import type { Agent, AgentStatus } from "./agents.dto";

export type { Agent, AgentStatus };

export interface AgentRepository {
  create(input: { name: string; public_jwk: Agent["public_jwk"] }): Promise<Agent>;
  get(id: string): Promise<Agent | undefined>;
  list(): Promise<Agent[]>;
  setStatus(id: string, status: AgentStatus): Promise<Agent | undefined>;
}

const newAgent = (input: { name: string; public_jwk: Agent["public_jwk"] }): Agent => ({
  id: `agt_${randomUUID().replace(/-/g, "").slice(0, 12)}`,
  name: input.name,
  public_jwk: input.public_jwk,
  status: "active",
  created_at: new Date().toISOString(),
});

// Mongo documents carry _id; callers only ever see the Agent shape.
const strip = (doc: (Agent & { _id?: unknown }) | null): Agent | undefined => {
  if (!doc) return undefined;
  const { _id, ...agent } = doc;
  return agent;
};

/** The shared agent store: MongoDB when connected, the in-memory collection otherwise (db/mongo.ts). */
export class MongoAgentRepository implements AgentRepository {
  private coll = () => getCollection<Agent>("agents");

  async create(input: { name: string; public_jwk: Agent["public_jwk"] }) {
    const agent = newAgent(input);
    await (await this.coll()).insertOne({ ...agent });
    return agent;
  }

  async get(id: string) {
    return strip(await (await this.coll()).findOne({ id }));
  }

  async list() {
    return (await (await this.coll()).find().toArray()).map((d) => strip(d)!);
  }

  async setStatus(id: string, status: AgentStatus) {
    await (await this.coll()).updateOne({ id }, { $set: { status } });
    return this.get(id);
  }
}

/** For unit tests that need an isolated store. */
export class InMemoryAgentRepository implements AgentRepository {
  private readonly agents = new Map<string, Agent>();

  async create(input: { name: string; public_jwk: Agent["public_jwk"] }) {
    const agent = newAgent(input);
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

export const agentsRepository = new MongoAgentRepository();
