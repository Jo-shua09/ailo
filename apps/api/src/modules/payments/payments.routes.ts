import { Router, type RequestHandler } from "express";
import { PaymentRequest } from "@ailo/core";
import { validate } from "../../middlewares/validate";
import { idempotency } from "../../middlewares/idempotency";
import { paymentsService } from "./payments.service";

export function paymentsRouter(agentAuth: RequestHandler) {
const router = Router();

router.get("/payments", async (_req, res, next) => {
  try {
    const payments = await paymentsService.listPayments();
    res.json({ payments });
  } catch (err) {
    next(err);
  }
});

router.get("/payments/:id", async (req, res, next) => {
  try {
    const result = await paymentsService.getPayment(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Same signed agent token as /agents/me (Authorization: Agent <jwt>). It runs first, so
// unsigned requests never touch idempotency storage.
router.post(
  "/payments",
  agentAuth,
  idempotency({ required: true }),
  validate({ body: PaymentRequest }),
  async (req, res, next) => {
    try {
      const result = await paymentsService.processPayment(req.agent!, req.body as PaymentRequest);
      res.status(result.payment.status === "blocked" ? 400 : 201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

return router;
}
