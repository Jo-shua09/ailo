import { Router, type RequestHandler } from "express";
import { PaymentRequest } from "@ailo/core";
import { validate } from "../../middlewares/validate";
import { idempotency } from "../../middlewares/idempotency";
import { paymentsService } from "./payments.service";

export function paymentsRouter(deps: { ownerAuth: RequestHandler; agentAuth: RequestHandler }) {
  const router = Router();

  router.get("/payments", deps.ownerAuth, async (_req, res, next) => {
    try {
      const payments = await paymentsService.listPayments();
      res.json({ payments });
    } catch (err) {
      next(err);
    }
  });

  router.get("/payments/:id", deps.ownerAuth, async (req, res, next) => {
    try {
      const result = await paymentsService.getPayment(String(req.params.id));
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // Agent signature runs first, so unauthenticated requests never touch idempotency storage.
  router.post(
    "/payments",
    deps.agentAuth,
    idempotency({ required: true }),
    validate({ body: PaymentRequest }),
    async (req, res, next) => {
      try {
        const result = await paymentsService.processPayment(req.agent!, req.body as PaymentRequest);
        res.status(result.payment.status === "blocked" ? 400 : 201).json(result);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
