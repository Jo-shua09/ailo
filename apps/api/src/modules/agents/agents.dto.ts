import { z } from "zod";

// .strict() rejects a JWK carrying "d", so an agent can never hand us its private key by mistake.
export const Ed25519PublicJwk = z.object({
  kty: z.literal("OKP"),
  crv: z.literal("Ed25519"),
  x: z.string().min(40).max(50),
}).strict();

export const RegisterAgent = z.object({
  name: z.string().min(1).max(60),
  public_jwk: Ed25519PublicJwk,
});
