import { createHash } from "node:crypto";
import * as jose from "jose";
import { AppError } from "../../shared/AppError";
import { agentsRepository, AgentsRepository } from "./agents.repository";
import type { AgentBadge, RegisterAgentInput, JWKSResponse } from "./agents.dto";

export class AgentsService {
  constructor(private repo: AgentsRepository = agentsRepository) {}

  /**
   * Calculates a human-readable Ed25519 public key fingerprint.
   */
  calculateFingerprint(publicKeyX: string): string {
    const hash = createHash("sha256").update(publicKeyX).digest("hex").slice(0, 16);
    return `ed25519:${hash}`;
  }

  /**
   * Registers a new agent. If public key is not provided, generates an Ed25519 keypair.
   */
  async registerAgent(
    input: RegisterAgentInput
  ): Promise<{ agent: AgentBadge; private_key_jwk?: jose.JWK }> {
    const agentId = `agt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let publicJwk: any;
    let privateJwk: jose.JWK | undefined;

    const keyInput = input.public_key_jwk ?? input.public_jwk ?? input.public_key;
    if (keyInput) {
      publicJwk = {
        ...keyInput,
        kid: keyInput.kid ?? agentId,
      };
    } else {
      // Generate Ed25519 keypair
      const keyPair = await jose.generateKeyPair("EdDSA", { crv: "Ed25519", extractable: true });
      publicJwk = await jose.exportJWK(keyPair.publicKey);
      privateJwk = await jose.exportJWK(keyPair.privateKey);
      publicJwk.kid = agentId;
      if (privateJwk) privateJwk.kid = agentId;
    }

    const fingerprint = this.calculateFingerprint(publicJwk.x);

    const agent: AgentBadge = {
      id: agentId,
      name: input.name,
      status: "active",
      public_key_jwk: publicJwk,
      key_fingerprint: fingerprint,
      created_at: new Date().toISOString(),
      revoked_at: null,
    };

    await this.repo.createAgent(agent);
    return { agent, private_key_jwk: privateJwk };
  }

  async getAgent(id: string): Promise<AgentBadge> {
    const agent = await this.repo.findAgentById(id);
    if (!agent) {
      throw new AppError(404, "AGENT_NOT_FOUND", `Agent with ID ${id} not found`);
    }
    return agent;
  }

  async listAgents(): Promise<AgentBadge[]> {
    return this.repo.listAgents();
  }

  /**
   * Brake killswitch: immediately revokes the agent and disables all future spending.
   */
  async revokeAgent(id: string): Promise<AgentBadge> {
    const agent = await this.getAgent(id);
    if (agent.status === "revoked") {
      return agent;
    }

    const updated = await this.repo.updateAgentStatus(id, "revoked", new Date().toISOString());
    if (!updated) {
      throw new AppError(404, "AGENT_NOT_FOUND", `Agent with ID ${id} not found`);
    }

    return updated;
  }

  /**
   * Returns published JWKS containing public keys of active agents.
   */
  async getJWKS(): Promise<JWKSResponse> {
    const agents = await this.repo.listAgents();
    const activeKeys = agents
      .filter((a) => a.status === "active")
      .map((a) => a.public_key_jwk);

    return { keys: activeKeys };
  }
}

export const agentsService = new AgentsService();
