import { Router, type RequestHandler } from "express";
import type { AgentRepository } from "../../modules/agents/agents.repository";
import { agentsRouter } from "../../modules/agents/agents.routes";
import approvals from "../../modules/approvals/approvals.routes";
import events from "../../modules/events/events.routes";
import health from "../../modules/health/health.routes";
import ledger from "../../modules/ledger/ledger.routes";
import { ownerRouter } from "../../modules/owner/owner.routes";
import { paymentsRouter } from "../../modules/payments/payments.routes";
import reconcile from "../../modules/reconcile/reconcile.routes";
import webhooks from "../../modules/webhooks/webhooks.routes";

export interface V1Deps {
  agents: AgentRepository;
  ownerPin?: string;
  secret: Uint8Array;
  ownerAuth: RequestHandler;
  agentAuth: RequestHandler;
}

// One gate per caller: agents sign (agentAuth), the owner holds a session (ownerAuth),
// Kora is checked by its HMAC inside the webhooks module. Each module exports a router; mount it here.
export function buildV1(deps: V1Deps) {
  const v1 = Router();
  v1.use(health);
  v1.use(ownerRouter(deps));
  v1.use(agentsRouter(deps));
  v1.use(paymentsRouter(deps));
  v1.use(webhooks);
  // Owner-only modules: guarded here so the modules stay unaware of auth.
  v1.use(["/ledger", "/approvals", "/ops", "/events"], deps.ownerAuth);
  v1.use(ledger);
  v1.use(approvals);
  v1.use(reconcile);
  v1.use(events);
  return v1;
}
