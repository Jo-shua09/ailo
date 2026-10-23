import { createHash, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { SignJWT } from "jose";
import { z } from "zod";
import { OWNER_AUDIENCE } from "../../middlewares/ownerAuth";
import { validate } from "../../middlewares/validate";
import { AppError } from "../../shared/AppError";

const digest = (s: string) => createHash("sha256").update(s).digest();

// shortcut: a single owner with a PIN for the demo; replace with real accounts after the hackathon.
export function ownerRouter(deps: { ownerPin?: string; secret: Uint8Array }) {
  const router = Router();

  router.post("/owner/session", validate({ body: z.object({ pin: z.string().min(1) }) }), async (req, res, next) => {
    if (!deps.ownerPin) return next(new AppError(503, "OWNER_NOT_CONFIGURED", "OWNER_PIN is not set"));
    if (!timingSafeEqual(digest(req.body.pin), digest(deps.ownerPin))) {
      return next(new AppError(401, "WRONG_PIN", "Wrong PIN"));
    }
    const token = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setAudience(OWNER_AUDIENCE)
      .setIssuedAt().setExpirationTime("12h").sign(deps.secret);
    res.json({ token });
  });

  return router;
}
