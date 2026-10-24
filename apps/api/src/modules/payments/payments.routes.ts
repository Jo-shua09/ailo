import { Router } from "express";
import { PaymentRequest } from "@ailo/core";
import { validate } from "../../middlewares/validate";
import { idempotency } from "../../middlewares/idempotency";
import { agentAuth } from "../../middlewares/agentAuth";
import { paymentsService } from "./payments.service";

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

router.post(
  "/payments",
  idempotency({ required: true }),
  validate({ body: PaymentRequest }),
  agentAuth(),
  async (req, res, next) => {
    try {
      const agent = (req as any).agent ?? { id: "agt_default", name: "Shop agent" };
      const result = await paymentsService.processPayment(agent, req.body as PaymentRequest);
      res.status(result.payment.status === "blocked" ? 400 : 201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
