import { randomBytes } from "node:crypto";
import express from "express";
import { agentSignature } from "./middlewares/agentSignature";
import { errorHandler } from "./middlewares/errorHandler";
import { notFound } from "./middlewares/notFound";
import { ownerAuth } from "./middlewares/ownerAuth";
import { InMemoryAgentRepository, type AgentRepository } from "./modules/agents/agents.repository";
import { jwksRouter } from "./modules/agents/agents.routes";
import { buildV1 } from "./routes/v1";

export interface AppDeps {
  agents?: AgentRepository;
  ownerPin?: string;
  sessionSecret?: string;
}

export function createApp(deps: AppDeps = {}) {
  const agents = deps.agents ?? new InMemoryAgentRepository();
  const secret = deps.sessionSecret ? new TextEncoder().encode(deps.sessionSecret) : randomBytes(32);

  const app = express();
  // One proxy in front (ngrok or the host), so req.ip is the real client and lockouts stay per person.
  app.set("trust proxy", 1);
  // Keep the raw bytes: agent signatures hash the body, and the Kora webhook HMAC needs it too.
  app.use(express.json({ limit: "100kb", verify: (req, _res, buf) => { (req as express.Request).rawBody = buf; } }));
  app.use(jwksRouter({ agents }));
  app.use("/v1", buildV1({
    agents,
    ownerPin: deps.ownerPin,
    secret,
    ownerAuth: ownerAuth(secret),
    agentAuth: agentSignature({ agents }),
  }));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
