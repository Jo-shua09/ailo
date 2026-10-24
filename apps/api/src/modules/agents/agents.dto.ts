import { z } from "zod";

export const AgentStatus = z.enum(["active", "revoked"]);
export type AgentStatus = z.infer<typeof AgentStatus>;

// .strict() rejects a JWK carrying "d", so an agent can never hand us its private key by mistake.
export const Ed25519PublicJwk = z.object({
  kty: z.literal("OKP"),
  crv: z.literal("Ed25519"),
  x: z.string().min(40).max(50),
}).strict();

/** The agent generates its own keypair and registers only the public half (AP2: mandate carries agent_pk). */
export const RegisterAgent = z.object({
  name: z.string().min(1).max(60),
  public_jwk: Ed25519PublicJwk,
});

// A type (not an interface) so it satisfies the MongoDB Document constraint in getCollection<T>.
export type Agent = {
  id: string;
  name: string;
  public_jwk: z.infer<typeof Ed25519PublicJwk>;
  status: AgentStatus;
  created_at: string;
};
