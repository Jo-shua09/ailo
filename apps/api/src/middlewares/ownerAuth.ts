import type { RequestHandler } from "express";
import { jwtVerify } from "jose";
import { AppError } from "../shared/AppError";

export const OWNER_AUDIENCE = "ailo-owner";

/** Owner-only routes (Nod, Brake, rules). An agent's key can never pass this. */
export function ownerAuth(secret: Uint8Array): RequestHandler {
  return async (req, _res, next) => {
    const header = req.headers.authorization ?? "";
    if (!header.startsWith("Owner ")) return next(new AppError(401, "OWNER_REQUIRED", "Owner sign-in required"));
    try {
      await jwtVerify(header.slice("Owner ".length), secret, { audience: OWNER_AUDIENCE, algorithms: ["HS256"] });
      req.owner = true;
      next();
    } catch {
      next(new AppError(401, "OWNER_REQUIRED", "Owner session invalid or expired"));
    }
  };
}
