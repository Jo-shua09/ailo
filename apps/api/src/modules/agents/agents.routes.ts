import { Router, type RequestHandler } from "express";
import { validate } from "../../middlewares/validate";
import { AppError } from "../../shared/AppError";
import { RegisterAgent } from "./agents.dto";
import type { Agent, AgentRepository } from "./agents.repository";

const view = ({ id, name, status, created_at }: Agent) => ({ id, name, status, created_at });

export function agentsRouter(deps: { agents: AgentRepository; ownerAuth: RequestHandler; agentAuth: RequestHandler }) {
  const router = Router();

  router.post("/agents", deps.ownerAuth, validate({ body: RegisterAgent }), async (req, res) => {
    res.status(201).json(view(await deps.agents.create(req.body)));
  });

  router.get("/agents", deps.ownerAuth, async (_req, res) => {
    res.json((await deps.agents.list()).map(view));
  });

  router.get("/agents/me", deps.agentAuth, async (req, res) => {
    res.json(view((await deps.agents.get(req.agent!.id))!));
  });

  // Brake. Pending approvals and holds must also be cancelled once those modules exist (PRD 5.9).
  router.post("/agents/:id/brake", deps.ownerAuth, async (req, res, next) => {
    const agent = await deps.agents.setStatus(String(req.params.id), "revoked");
    if (!agent) return next(new AppError(404, "NOT_FOUND", "No such agent"));
    res.json(view(agent));
  });

  return router;
}

/** Public JWKS of active agents, so payees (Till) can verify agent signatures themselves. */
export function jwksRouter(deps: { agents: AgentRepository }) {
  const router = Router();
  router.get("/.well-known/jwks.json", async (_req, res) => {
    const keys = (await deps.agents.list())
      .filter((a) => a.status === "active")
      .map((a) => ({ ...a.public_jwk, kid: a.id, alg: "EdDSA", use: "sig" }));
    res.json({ keys });
  });
  return router;
}
