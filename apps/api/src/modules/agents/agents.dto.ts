import { z } from "zod";

// .strict() rejects a JWK carrying "d", so an agent can never hand us its private key by mistake.
export const Ed25519PublicJwk = z.object({
  kty: z.literal("OKP"),
  crv: z.literal("Ed25519"),
  x: z.string().min(1),
  kid: z.string().optional(),
});

export const RegisterAgent = z.object({
  name: z.string().min(1).max(100),
  public_jwk: Ed25519PublicJwk.optional(),
  public_key_jwk: Ed25519PublicJwk.optional(),
  public_key: Ed25519PublicJwk.optional(),
});

export const AgentStatus = z.enum(["active", "revoked"]);
export type AgentStatus = z.infer<typeof AgentStatus>;

export const RegisterAgentInput = RegisterAgent;
export type RegisterAgentInput = z.infer<typeof RegisterAgentInput>;

export const AgentBadgeSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: AgentStatus,
  public_key_jwk: z.object({
    kty: z.literal("OKP"),
    crv: z.literal("Ed25519"),
    x: z.string(),
    kid: z.string(),
  }),
  key_fingerprint: z.string(),
  created_at: z.string(),
  revoked_at: z.string().nullable().optional(),
});
export type AgentBadge = z.infer<typeof AgentBadgeSchema>;

export interface Agent {
  id: string;
  name: string;
  public_jwk?: any;
  public_key_jwk?: any;
  key_fingerprint?: string;
  status: AgentStatus;
  created_at: string;
}

export const JWKSResponse = z.object({
  keys: z.array(z.record(z.string(), z.any())),
});
export type JWKSResponse = z.infer<typeof JWKSResponse>;
