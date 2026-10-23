import { createHash, randomUUID } from "node:crypto";
import { exportJWK, generateKeyPair, SignJWT, type CryptoKey } from "jose";

// Test helper mirroring what apps/agent does in Python: sign one request with the agent's private key.

export async function newAgentKeys() {
  const { publicKey, privateKey } = await generateKeyPair("EdDSA", { crv: "Ed25519", extractable: true });
  return { privateKey, publicJwk: await exportJWK(publicKey) };
}

export function bodyHash(body: string): string {
  return createHash("sha256").update(body).digest("base64url");
}

export async function signRequest(
  privateKey: CryptoKey,
  agentId: string,
  req: { method: string; path: string; body?: string },
  opts: { jti?: string; iat?: number; exp?: number } = {},
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ htm: req.method, htu: req.path, bh: bodyHash(req.body ?? "") })
    .setProtectedHeader({ alg: "EdDSA", typ: "agent+jwt", kid: agentId })
    .setAudience("ailo")
    .setIssuedAt(opts.iat ?? now)
    .setExpirationTime(opts.exp ?? now + 60)
    .setJti(opts.jti ?? randomUUID())
    .sign(privateKey);
}
