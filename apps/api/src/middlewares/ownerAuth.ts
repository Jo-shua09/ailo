import type { RequestHandler } from "express";
import { jwtVerify } from "jose";
import { AppError } from "../shared/AppError";

export const OWNER_AUDIENCE = "ailo-owner";

/**
 * Owner-only routes (Nod, Brake, ledger, reconcile, payment reads). An agent's key can never pass this.
 * Browsers cannot set headers on an EventSource (SSE), so GET requests may instead carry the token as
 * `?access_token=` (OAuth 2.0 Bearer, RFC 6750 section 2.3).
 */
export function ownerAuth(secret: Uint8Array): RequestHandler {
  return async (req, _res, next) => {
    const header = req.headers.authorization ?? "";
    const queryToken = req.method === "GET" && typeof req.query.access_token === "string" ? req.query.access_token : "";
    const token = header.startsWith("Owner ") ? header.slice("Owner ".length) : queryToken;
    if (!token) return next(new AppError(401, "OWNER_REQUIRED", "Owner sign-in required"));
    try {
      await jwtVerify(token, secret, { audience: OWNER_AUDIENCE, algorithms: ["HS256"] });
      req.owner = true;
      next();
    } catch {
      next(new AppError(401, "OWNER_REQUIRED", "Owner session invalid or expired"));
    }
  };
}
