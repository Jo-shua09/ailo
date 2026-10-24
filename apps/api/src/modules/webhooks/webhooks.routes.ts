import { Router } from "express";
import { AppError } from "../../shared/AppError";
import { validate } from "../../middlewares/validate";
import { KoraWebhookPayload } from "./webhooks.dto";
import { webhooksService } from "./webhooks.service";

const router = Router();

router.post("/webhooks/kora", validate({ body: KoraWebhookPayload }), async (req, res, next) => {
  try {
    const signature = req.headers["x-korapay-signature"] as string;
    const isValid = webhooksService.verifySignature((req.body as KoraWebhookPayload).data, signature);
    if (!isValid) {
      throw new AppError(401, "INVALID_WEBHOOK_SIGNATURE", "Webhook HMAC signature verification failed");
    }

    const result = await webhooksService.processWebhook(req.body as KoraWebhookPayload);
    res.json({ received: true, ...result });
  } catch (err) {
    next(err);
  }
});

export default router;
