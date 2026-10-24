import { Router, type RequestHandler } from "express";
import { validate } from "../../middlewares/validate";
import { AppError } from "../../shared/AppError";
import { CompileMandate, SaveMandate, TestMandate } from "./mandates.dto";
import * as mandates from "./mandates.service";

// Radar Assistant flow: compile (proposal only) -> test -> explicit save. Only saved versions are served.
export function mandatesRouter(deps: { ownerAuth: RequestHandler; agentAuth: RequestHandler; generatePolicy: mandates.GeneratePolicy }) {
  const router = Router();

  router.post("/mandates/compile", deps.ownerAuth, validate({ body: CompileMandate }), async (req, res) => {
    res.json({ english: req.body.english, policy: await mandates.compile(req.body.english, deps) });
  });

  router.post("/mandates/test", deps.ownerAuth, validate({ body: TestMandate }), async (req, res) => {
    res.json(await mandates.test(req.body.policy, { limit: req.body.limit }));
  });

  router.post("/mandates", deps.ownerAuth, validate({ body: SaveMandate }), async (req, res) => {
    res.status(201).json(await mandates.save(req.body.english, req.body.policy));
  });

  router.get("/mandates", deps.ownerAuth, async (_req, res) => {
    res.json(await mandates.list());
  });

  // The buyer agent reads its budget here.
  router.get("/mandates/current", deps.agentAuth, async (_req, res, next) => {
    const mandate = await mandates.current();
    if (!mandate) return next(new AppError(404, "NO_MANDATE", "No spending rule has been saved yet"));
    res.json({ version: mandate.version, english_rule: mandate.english_rule, policy: mandate.policy });
  });

  return router;
}
