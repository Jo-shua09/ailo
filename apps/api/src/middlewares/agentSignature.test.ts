import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { InMemoryAgentRepository } from "../modules/agents/agents.repository";
import { newAgentKeys, signRequest } from "../test/agent-signing";
import { agentSignature } from "./agentSignature";
import { errorHandler } from "./errorHandler";

const agents = new InMemoryAgentRepository();
let keys: Awaited<ReturnType<typeof newAgentKeys>>;
let agentId: string;
let server: Server;
let base: string;

beforeAll(async () => {
  keys = await newAgentKeys();
  agentId = (await agents.create({ name: "Shop agent", public_jwk: keys.publicJwk })).id;
  const app = express();
  app.use(express.json({ verify: (req, _res, buf) => { (req as express.Request).rawBody = buf; } }));
  app.post("/v1/pay", agentSignature({ agents }), (req, res) => { res.json({ agent: req.agent }); });
  app.use(errorHandler);
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());

const body = JSON.stringify({ payee_id: "p1", amount_kobo: 850000, category: "groceries", reason: "rice" });

async function post(token: string | null, sentBody = body, path = "/v1/pay") {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers.authorization = `Agent ${token}`;
  return fetch(`${base}${path}`, { method: "POST", headers, body: sentBody });
}

describe("agentSignature", () => {
  it("accepts a correctly signed request and identifies the agent", async () => {
    const res = await post(await signRequest(keys.privateKey, agentId, { method: "POST", path: "/v1/pay", body }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ agent: { id: agentId, name: "Shop agent" } });
  });

  it("rejects a missing signature", async () => {
    expect((await post(null)).status).toBe(401);
  });

  it("rejects a tampered body", async () => {
    const token = await signRequest(keys.privateKey, agentId, { method: "POST", path: "/v1/pay", body });
    const res = await post(token, body.replace("850000", "4500000"));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: { code: "BODY_MISMATCH" } });
  });

  it("rejects a token signed for a different path", async () => {
    const token = await signRequest(keys.privateKey, agentId, { method: "POST", path: "/v1/other", body });
    expect((await post(token)).status).toBe(401);
  });

  it("rejects a replayed token", async () => {
    const token = await signRequest(keys.privateKey, agentId, { method: "POST", path: "/v1/pay", body });
    expect((await post(token)).status).toBe(200);
    const again = await post(token);
    expect(again.status).toBe(401);
    expect(await again.json()).toMatchObject({ error: { code: "REPLAYED" } });
  });

  it("rejects an expired token", async () => {
    const past = Math.floor(Date.now() / 1000) - 600;
    const token = await signRequest(keys.privateKey, agentId, { method: "POST", path: "/v1/pay", body }, { iat: past, exp: past + 60 });
    expect((await post(token)).status).toBe(401);
  });

  it("rejects a token signed by a different key", async () => {
    const other = await newAgentKeys();
    const token = await signRequest(other.privateKey, agentId, { method: "POST", path: "/v1/pay", body });
    expect((await post(token)).status).toBe(401);
  });

  it("rejects an unknown agent", async () => {
    const token = await signRequest(keys.privateKey, "agt_nope", { method: "POST", path: "/v1/pay", body });
    expect((await post(token)).status).toBe(401);
  });

  it("refuses a braked agent with 403", async () => {
    const braked = await newAgentKeys();
    const id = (await agents.create({ name: "Braked", public_jwk: braked.publicJwk })).id;
    await agents.setStatus(id, "revoked");
    const res = await post(await signRequest(braked.privateKey, id, { method: "POST", path: "/v1/pay", body }));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: { code: "AGENT_REVOKED" } });
  });
});
