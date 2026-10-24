import { createHash, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { decodeProtectedHeader, importJWK, jwtVerify } from "jose";
import type { AgentRepository } from "../modules/agents/agents.repository";
import { AppError } from "../shared/AppError";

/**
 * Verifies `Authorization: Agent <jwt>`: a per-request token the agent signs with its Ed25519 key.
 * Binding to method + URL + one-time jti follows DPoP (RFC 9449); aud/exp/jti checks follow Skyfire KYAPay.
 * `bh` (SHA-256 of the raw body) is our addition so a signed payment amount cannot be altered in transit.
 */

// shortcut: per-process replay memory; move jti into a UNIQUE DB column when running more than one instance.
class ReplayGuard {
  private readonly seen = new Map<string, number>();

  firstUse(jti: string, expiresAtMs: number): boolean {
    const now = Date.now();
    for (const [key, exp] of this.seen) if (exp < now) this.seen.delete(key);
    if (this.seen.has(jti)) return false;
    this.seen.set(jti, expiresAtMs);
    return true;
  }
}

const unauthorized = (code: string, message: string) => new AppError(401, code, message);

function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function agentSignature(deps: { agents: AgentRepository }): RequestHandler {
  const replay = new ReplayGuard();

  return async (req, _res, next) => {
    try {
      const header = req.headers.authorization ?? "";
      if (!header.startsWith("Agent ")) throw unauthorized("SIGNATURE_REQUIRED", "Agent signature required");
      const token = header.slice("Agent ".length);

      let kid: string | undefined;
      try {
        kid = decodeProtectedHeader(token).kid;
      } catch {
        throw unauthorized("BAD_SIGNATURE", "Malformed agent token");
      }
      const agent = kid ? await deps.agents.get(kid) : undefined;
      if (!agent) throw unauthorized("UNKNOWN_AGENT", "Unknown agent");
      if (agent.status !== "active") throw new AppError(403, "AGENT_REVOKED", "This agent has been stopped by its owner");

      let payload;
      try {
        ({ payload } = await jwtVerify(token, await importJWK(agent.public_jwk, "EdDSA"), {
          audience: "ailo",
          typ: "agent+jwt",
          algorithms: ["EdDSA"],
          maxTokenAge: "60s",
          clockTolerance: 5,
          requiredClaims: ["iat", "exp", "jti"],
        }));
      } catch {
        throw unauthorized("BAD_SIGNATURE", "Signature invalid or expired");
      }

      if (payload.htm !== req.method || payload.htu !== req.originalUrl) {
        throw unauthorized("WRONG_TARGET", "Token was signed for a different request");
      }
      const bh = createHash("sha256").update(req.rawBody ?? "").digest("base64url");
      if (typeof payload.bh !== "string" || !sameHash(payload.bh, bh)) {
        throw unauthorized("BODY_MISMATCH", "Request body does not match the signature");
      }
      if (!replay.firstUse(payload.jti!, payload.exp! * 1000)) throw unauthorized("REPLAYED", "Token already used");

      req.agent = { id: agent.id, name: agent.name };
      next();
    } catch (err) {
      next(err);
    }
  };
}
