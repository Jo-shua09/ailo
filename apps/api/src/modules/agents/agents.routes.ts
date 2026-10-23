import { Router, type RequestHandler } from "express";
import { validate } from "../../middlewares/validate";
import { AppError } from "../../shared/AppError";
import { RegisterAgent, type Agent } from "./agents.dto";
import type { AgentRepository } from "./agents.repository";

const view = ({ id, name, status, created_at }: Agent) => ({ id, name, status, created_at });

export function agentsRouter(deps: { agents: AgentRepository; ownerAuth: RequestHandler; agentAuth: RequestHandler }) {
  const router = Router();

router.post("/agents", validate({ body: RegisterAgentInput }), async (req, res, next) => {
  try {
    const result = await agentsService.registerAgent(req.body as RegisterAgentInput);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/agents", async (_req, res, next) => {
  try {
    const agents = await agentsService.listAgents();
    res.json({ agents });
  } catch (err) {
    next(err);
  }
});

router.get("/agents/:id", async (req, res, next) => {
  try {
    const agent = await agentsService.getAgent(req.params.id);
    res.json(agent);
  } catch (err) {
    next(err);
  }
});

// Brake kill switch endpoint
router.post("/agents/:id/brake", async (req, res, next) => {
  try {
    const revoked = await agentsService.revokeAgent(req.params.id);
    res.json({ status: "revoked", agent: revoked });
  } catch (err) {
    next(err);
  }
});

// Alias for PRD section 9 mandate kill switch
router.post("/mandates/:id/brake", async (req, res, next) => {
  try {
    const revoked = await agentsService.revokeAgent(req.params.id);
    res.json({ status: "revoked", agent: revoked });
  } catch (err) {
    next(err);
  }
});

// Published JWKS route
router.get("/agents/jwks.json", async (_req, res, next) => {
  try {
    const jwks = await agentsService.getJWKS();
    res.json(jwks);
  } catch (err) {
    next(err);
  }
});

export default router;
