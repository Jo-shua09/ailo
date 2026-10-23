import { createHash, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { SignJWT } from "jose";
import { z } from "zod";
import { OWNER_AUDIENCE } from "../../middlewares/ownerAuth";
import { validate } from "../../middlewares/validate";
import { AppError } from "../../shared/AppError";

const digest = (s: string) => createHash("sha256").update(s).digest();

const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60_000;

// shortcut: a single owner with a PIN for the demo; replace with real accounts after the hackathon.
export function ownerRouter(deps: { ownerPin?: string; secret: Uint8Array }) {
  const router = Router();
  // Per IP, so an attacker spamming wrong PINs cannot lock the real owner out mid-demo.
  // shortcut: per-process memory; move to the database when running more than one instance.
  const failures = new Map<string, { count: number; lockedUntil: number }>();

  router.post("/owner/session", validate({ body: z.object({ pin: z.string().min(1) }) }), async (req, res, next) => {
    if (!deps.ownerPin) return next(new AppError(503, "OWNER_NOT_CONFIGURED", "OWNER_PIN is not set"));
    const ip = req.ip ?? "unknown";
    const entry = failures.get(ip) ?? { count: 0, lockedUntil: 0 };
    if (entry.lockedUntil > Date.now()) {
      return next(new AppError(429, "TOO_MANY_ATTEMPTS", "Too many wrong PINs. Try again in 15 minutes"));
    }
    if (!timingSafeEqual(digest(req.body.pin), digest(deps.ownerPin))) {
      entry.count += 1;
      if (entry.count >= MAX_FAILURES) Object.assign(entry, { count: 0, lockedUntil: Date.now() + LOCKOUT_MS });
      failures.set(ip, entry);
      return next(new AppError(401, "WRONG_PIN", "Wrong PIN"));
    }
    failures.delete(ip);
    const token = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setAudience(OWNER_AUDIENCE)
      .setIssuedAt().setExpirationTime("12h").sign(deps.secret);
    res.json({ token });
  });

  return router;
}
