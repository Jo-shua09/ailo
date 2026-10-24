import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app";
import { resetMemoryDb } from "./db/mongo";
import { newAgentKeys, signRequest } from "./test/agent-signing";

let server: Server;
let base: string;

beforeAll(() => {
  resetMemoryDb();
  server = createApp({ ownerPin: "246810", sessionSecret: "s".repeat(32) }).listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());

const call = (method: string, path: string, opts: { body?: unknown; owner?: string; headers?: Record<string, string> } = {}) =>
  fetch(`${base}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(opts.owner ? { authorization: `Owner ${opts.owner}` } : {}),
      ...opts.headers,
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });

async function ownerToken(): Promise<string> {
  return ((await (await call("POST", "/v1/owner/session", { body: { pin: "246810" } })).json()) as { token: string }).token;
}

async function signedPayment(keys: Awaited<ReturnType<typeof newAgentKeys>>, agentId: string, payment: object, idem: string) {
  const body = JSON.stringify(payment);
  const sig = await signRequest(keys.privateKey, agentId, { method: "POST", path: "/v1/payments", body });
  return fetch(`${base}/v1/payments`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Agent ${sig}`, "idempotency-key": idem },
    body,
  });
}

describe("Ailo API end to end", () => {
  it("answers health and serves JWKS publicly", async () => {
    expect((await call("GET", "/v1/health")).status).toBe(200);
    expect((await call("GET", "/.well-known/jwks.json")).status).toBe(200);
  });

  it("owner actions refuse anyone without an owner session", async () => {
    expect((await call("POST", "/v1/ledger/topup", { body: { amount_kobo: 100 } })).status).toBe(401);
    expect((await call("GET", "/v1/ledger/balances")).status).toBe(401);
    expect((await call("GET", "/v1/payments")).status).toBe(401);
    expect((await call("GET", "/v1/payments/pay_x")).status).toBe(401);
    expect((await call("GET", "/v1/approvals")).status).toBe(401);
    expect((await call("POST", "/v1/approvals/apr_x", { body: { decision: "approve" } })).status).toBe(401);
    expect((await call("POST", "/v1/ops/reconcile")).status).toBe(401);
    expect((await call("GET", "/v1/events")).status).toBe(401);
  });

  it("payments refuse unsigned requests", async () => {
    const res = await call("POST", "/v1/payments", {
      headers: { "idempotency-key": "k0" },
      body: { payee_id: "payee_mama_ngozi", amount_kobo: 100, category: "groceries", reason: "x" },
    });
    expect(res.status).toBe(401);
  });

  it("the live event stream accepts the owner token as a query parameter (browsers cannot set headers on SSE)", async () => {
    const owner = await ownerToken();
    const ctrl = new AbortController();
    const res = await fetch(`${base}/v1/events?access_token=${owner}`, { signal: ctrl.signal });
    expect(res.status).toBe(200);
    ctrl.abort();
  });

  it("runs the full payment lifecycle with a signed agent, then Brake stops it", async () => {
    const owner = await ownerToken();

    const topup = await call("POST", "/v1/ledger/topup", { owner, body: { amount_kobo: 5_000_000 } });
    expect(topup.status).toBe(200);

    const keys = await newAgentKeys();
    const created = await call("POST", "/v1/agents", { owner, body: { name: "Demo Shop Agent", public_jwk: keys.publicJwk } });
    expect(created.status).toBe(201);
    const agent = (await created.json()) as { id: string };

    const paid = await signedPayment(keys, agent.id, {
      payee_id: "payee_mama_ngozi", amount_kobo: 850000, category: "groceries", reason: "Restock rice for demo store",
    }, "e2e_idem_001");
    expect(paid.status).toBe(201);
    const paymentData = (await paid.json()) as { payment: { id: string; status: string; verdict: string; agent_id: string } };
    expect(paymentData.payment.status).toBe("settled");
    expect(paymentData.payment.verdict).toBe("allow");
    expect(paymentData.payment.agent_id).toBe(agent.id);

    const detail = await call("GET", `/v1/payments/${paymentData.payment.id}`, { owner });
    expect(detail.status).toBe(200);

    const reconcile = await call("POST", "/v1/ops/reconcile", { owner });
    expect(((await reconcile.json()) as { breaks_count: number }).breaks_count).toBe(0);

    expect((await call("POST", `/v1/agents/${agent.id}/brake`, { owner })).status).toBe(200);

    const after = await signedPayment(keys, agent.id, {
      payee_id: "payee_mama_ngozi", amount_kobo: 500000, category: "groceries", reason: "Attempt after Brake",
    }, "e2e_idem_002");
    expect(after.status).toBe(403);
    expect(((await after.json()) as { error: { code: string } }).error.code).toBe("AGENT_REVOKED");
  });
});
