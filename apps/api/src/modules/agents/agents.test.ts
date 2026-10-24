import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../app";
import { resetMemoryDb } from "../../db/mongo";
import { newAgentKeys, signRequest } from "../../test/agent-signing";
import { AgentsService } from "./agents.service";

let server: Server;
let base: string;

beforeAll(() => {
  resetMemoryDb();
  server = createApp({ ownerPin: "246810", sessionSecret: "s".repeat(32) }).listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());

const json = (method: string, path: string, body?: unknown, token?: string) =>
  fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Owner ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

async function ownerToken(): Promise<string> {
  const res = await json("POST", "/v1/owner/session", { pin: "246810" });
  return ((await res.json()) as { token: string }).token;
}

describe("agents (Badge + Brake HTTP)", () => {
  it("only the owner can register an agent", async () => {
    const { publicJwk } = await newAgentKeys();
    expect((await json("POST", "/v1/agents", { name: "Shop agent", public_jwk: publicJwk })).status).toBe(401);
  });

  it("rejects a key that is not an Ed25519 public key", async () => {
    const token = await ownerToken();
    const res = await json("POST", "/v1/agents", { name: "Bad", public_jwk: { kty: "RSA", n: "x", e: "AQAB" } }, token);
    expect(res.status).toBe(400);
  });

  it("registers, publishes the key, accepts signed calls, and Brake stops it", async () => {
    const token = await ownerToken();
    const keys = await newAgentKeys();

    const created = await json("POST", "/v1/agents", { name: "Shop agent", public_jwk: keys.publicJwk }, token);
    expect(created.status).toBe(201);
    const agent = (await created.json()) as { id: string; status: string };
    expect(agent.status).toBe("active");

    const jwks = (await (await fetch(`${base}/.well-known/jwks.json`)).json()) as { keys: { kid: string }[] };
    expect(jwks.keys.map((k) => k.kid)).toContain(agent.id);

    const me = () =>
      signRequest(keys.privateKey, agent.id, { method: "GET", path: "/v1/agents/me" }).then((sig) =>
        fetch(`${base}/v1/agents/me`, { headers: { authorization: `Agent ${sig}` } }));
    expect((await me()).status).toBe(200);

    const braked = await json("POST", `/v1/agents/${agent.id}/brake`, undefined, token);
    expect(braked.status).toBe(200);
    expect(((await braked.json()) as { status: string }).status).toBe("revoked");

    expect((await me()).status).toBe(403);
    const after = (await (await fetch(`${base}/.well-known/jwks.json`)).json()) as { keys: { kid: string }[] };
    expect(after.keys.map((k) => k.kid)).not.toContain(agent.id);
  });

  it("an agent key cannot call owner routes", async () => {
    const keys = await newAgentKeys();
    const sig = await signRequest(keys.privateKey, "agt_x", { method: "POST", path: "/v1/agents/agt_x/brake" });
    const res = await fetch(`${base}/v1/agents/agt_x/brake`, { method: "POST", headers: { authorization: `Agent ${sig}` } });
    expect(res.status).toBe(401);
  });
});

describe("AgentsService unit", () => {
  let service: AgentsService;

  beforeEach(() => {
    resetMemoryDb();
    service = new AgentsService();
  });

  it("registers an agent, generates Ed25519 key, and computes fingerprint", async () => {
    const { agent, private_key_jwk } = await service.registerAgent({ name: "Shop agent" });

    expect(agent.id).toMatch(/^agt_/);
    expect(agent.name).toBe("Shop agent");
    expect(agent.status).toBe("active");
    expect(agent.public_key_jwk.kty).toBe("OKP");
    expect(agent.public_key_jwk.crv).toBe("Ed25519");
    expect(agent.key_fingerprint).toMatch(/^ed25519:[a-f0-9]{16}$/);
    expect(private_key_jwk).toBeDefined();

    const retrieved = await service.getAgent(agent.id);
    expect(retrieved.id).toBe(agent.id);
  });

  it("publishes active agent keys in JWKS format", async () => {
    const { agent } = await service.registerAgent({ name: "Buyer agent" });
    const jwks = await service.getJWKS();

    expect(jwks.keys).toHaveLength(1);
    expect(jwks.keys[0]?.kid).toBe(agent.id);
    expect(jwks.keys[0]?.crv).toBe("Ed25519");
  });

  it("executes Brake kill switch to revoke an agent and removes from JWKS", async () => {
    const { agent } = await service.registerAgent({ name: "Vulnerable agent" });
    expect(agent.status).toBe("active");

    const revoked = await service.revokeAgent(agent.id);
    expect(revoked.status).toBe("revoked");
    expect(revoked.revoked_at).toBeDefined();

    // Verify JWKS excludes revoked agents
    const jwks = await service.getJWKS();
    expect(jwks.keys).toHaveLength(0);
  });
});
