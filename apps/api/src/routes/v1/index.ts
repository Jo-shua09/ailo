import { Router, type RequestHandler } from "express";
import type { AgentRepository } from "../../modules/agents/agents.repository";
import { agentsRouter } from "../../modules/agents/agents.routes";
import health from "../../modules/health/health.routes";
import { ownerRouter } from "../../modules/owner/owner.routes";
import payments from "../../modules/payments/payments.routes";
import ledger from "../../modules/ledger/ledger.routes";
import approvals from "../../modules/approvals/approvals.routes";
import webhooks from "../../modules/webhooks/webhooks.routes";
import reconcile from "../../modules/reconcile/reconcile.routes";
import events from "../../modules/events/events.routes";

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
  v1.use(payments);
  v1.use(ledger);
  v1.use(approvals);
  v1.use(webhooks);
  v1.use(reconcile);
  v1.use(events);
  return v1;
}

export default buildV1;
