import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../app";
import { newAgentKeys, signRequest } from "../../test/agent-signing";

let server: Server;
let base: string;

beforeAll(() => {
  server = createApp({ ownerPin: "2468", sessionSecret: "s".repeat(32) }).listen(0);
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
  const res = await json("POST", "/v1/owner/session", { pin: "2468" });
  return ((await res.json()) as { token: string }).token;
}

describe("owner session", () => {
  it("rejects a wrong PIN", async () => {
    expect((await json("POST", "/v1/owner/session", { pin: "0000" })).status).toBe(401);
  });
});

describe("agents (Badge + Brake)", () => {
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
