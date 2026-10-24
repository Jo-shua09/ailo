import { Router, type RequestHandler } from "express";
import { validate } from "../../middlewares/validate";
import { AppError } from "../../shared/AppError";
import { RegisterAgent, RegisterAgentInput } from "./agents.dto";
import type { Agent, AgentRepository } from "./agents.repository";
import { agentsService } from "./agents.service";

const view = (agent: any) => ({
  id: agent.id,
  name: agent.name,
  status: agent.status,
  created_at: agent.created_at,
  public_jwk: agent.public_jwk ?? agent.public_key_jwk,
  key_fingerprint: agent.key_fingerprint,
});

export function agentsRouter(deps?: { agents?: AgentRepository; ownerAuth?: RequestHandler; agentAuth?: RequestHandler }) {
  const router = Router();
  const auth = deps?.ownerAuth ?? ((_req, _res, next) => next());

  router.post("/agents", auth, validate({ body: RegisterAgent }), async (req, res, next) => {
    try {
      const input = req.body as any;
      const jwk = input.public_jwk ?? input.public_key_jwk ?? input.public_key;
      if (deps?.agents && jwk) {
        const created = await deps.agents.create({ name: input.name, public_jwk: jwk });
        return res.status(201).json(view(created));
      }
      const result = await agentsService.registerAgent(req.body as RegisterAgentInput);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get("/agents", auth, async (_req, res, next) => {
    try {
      if (deps?.agents) {
        const list = await deps.agents.list();
        return res.json(list.map(view));
      }
      const agents = await agentsService.listAgents();
      res.json({ agents });
    } catch (err) {
      next(err);
    }
  });

  if (deps?.agentAuth) {
    router.get("/agents/me", deps.agentAuth, async (req, res) => {
      const agentId = (req as any).agent?.id;
      const agent = deps?.agents ? await deps.agents.get(agentId) : await agentsService.getAgent(agentId);
      res.json(view(agent));
    });
  }

  router.get("/agents/:id", async (req, res, next) => {
    try {
      const id = req.params.id as string;
      let agent = deps?.agents ? await deps.agents.get(id) : undefined;
      if (!agent) {
        agent = await agentsService.getAgent(id).catch(() => undefined);
      }
      if (!agent) throw new AppError(404, "NOT_FOUND", "No such agent");
      res.json(agent);
    } catch (err) {
      next(err);
    }
  });

  // Brake kill switch endpoint
  router.post("/agents/:id/brake", auth, async (req, res, next) => {
    try {
      const id = req.params.id as string;
      if (deps?.agents) {
        const agent = await deps.agents.setStatus(id, "revoked");
        if (agent) {
          await agentsService.revokeAgent(id).catch(() => {});
          return res.json({ status: "revoked", agent: view(agent) });
        }
      }
      const revoked = await agentsService.revokeAgent(id);
      res.json({ status: "revoked", agent: revoked });
    } catch (err) {
      next(err);
    }
  });

  // Alias for PRD section 9 mandate kill switch
  router.post("/mandates/:id/brake", auth, async (req, res, next) => {
    try {
      const revoked = await agentsService.revokeAgent(req.params.id as string);
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

  return router;
}

/** Public JWKS router mounted at root */
export function jwksRouter(deps?: { agents?: AgentRepository }) {
  const router = Router();
  router.get("/.well-known/jwks.json", async (_req, res, next) => {
    try {
      if (deps?.agents) {
        const keys = (await deps.agents.list())
          .filter((a) => a.status === "active")
          .map((a) => ({ ...(a.public_jwk ?? (a as any).public_key_jwk), kid: a.id, alg: "EdDSA", use: "sig" }));
        return res.json({ keys });
      }
      const jwks = await agentsService.getJWKS();
      res.json(jwks);
    } catch (err) {
      next(err);
    }
  });
  return router;
}

const defaultRouter = agentsRouter();
export default defaultRouter;
