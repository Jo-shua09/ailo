import { Router, type RequestHandler } from "express";
import type { AgentRepository } from "../../modules/agents/agents.repository";
import { agentsRouter } from "../../modules/agents/agents.routes";
import health from "../../modules/health/health.routes";
import { ownerRouter } from "../../modules/owner/owner.routes";

export interface V1Deps {
  agents: AgentRepository;
  ownerPin?: string;
  secret: Uint8Array;
  ownerAuth: RequestHandler;
  agentAuth: RequestHandler;
}

// Each module exports a router; mount it here.
export function buildV1(deps: V1Deps) {
  const v1 = Router();
  v1.use(health);
  v1.use(ownerRouter(deps));
  v1.use(agentsRouter(deps));
  return v1;
}
