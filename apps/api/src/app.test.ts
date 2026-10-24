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
  server = createApp({ ownerPin: "123456", sessionSecret: "s".repeat(32) }).listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => server.close());

async function getOwnerToken(): Promise<string> {
  const res = await fetch(`${base}/v1/owner/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin: "123456" }),
  });
  const data = (await res.json()) as { token: string };
  return data.token;
}

async function signedPayment(privateKey: Awaited<ReturnType<typeof newAgentKeys>>["privateKey"], agentId: string, payment: object, idem: string) {
  const body = JSON.stringify(payment);
  const sig = await signRequest(privateKey, agentId, { method: "POST", path: "/v1/payments", body });
  return fetch(`${base}/v1/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": idem, Authorization: `Agent ${sig}` },
    body,
  });
}

describe("Ailo API Engine End-to-End", () => {
  it("answers health check", async () => {
    const res = await fetch(`${base}/v1/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("serves published JWKS from /.well-known/jwks.json", async () => {
    const res = await fetch(`${base}/.well-known/jwks.json`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("keys");
    expect(Array.isArray(body.keys)).toBe(true);
  });

  it("executes the full payment lifecycle end to end", async () => {
    const ownerToken = await getOwnerToken();

    // 1. Top up owner wallet
    const topupRes = await fetch(`${base}/v1/ledger/topup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount_kobo: 5_000_000 }), // ₦50,000.00
    });
    expect(topupRes.status).toBe(200);
    const topupData = await topupRes.json();
    expect(topupData.balances.owner_wallet).toBe(5_000_000);

    // 2. Register agent (Badge): the agent made its own keypair, only the public key is sent.
    const keys = await newAgentKeys();
    const agentRes = await fetch(`${base}/v1/agents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Owner ${ownerToken}`,
      },
      body: JSON.stringify({ name: "Demo Shop Agent", public_jwk: keys.publicJwk }),
    });
    expect(agentRes.status).toBe(201);
    const agent = await agentRes.json();
    expect(agent.id).toMatch(/^agt_/);
    expect(agent.status).toBe("active");

    // 3. Owner saves a spending rule (Spec Gate); the agent reads the same rule.
    const ruleRes = await fetch(`${base}/v1/mandates`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Owner ${ownerToken}` },
      body: JSON.stringify({
        english: "Groceries from Mama Ngozi, up to N20,000 a payment",
        policy: {
          allowed_categories: ["groceries"],
          allowed_payees: ["payee_mama_ngozi"],
          spending_limits: [{ amount_kobo: 2_000_000, interval: "per_payment" }],
          nod_above_kobo: 1_000_000,
          nod_rolling_payee_24h_kobo: 1_000_000,
          expires_at: "2030-01-01T00:00:00.000Z",
        },
      }),
    });
    expect(ruleRes.status).toBe(201);

    const currentSig = await signRequest(keys.privateKey, agent.id, { method: "GET", path: "/v1/mandates/current" });
    const currentRes = await fetch(`${base}/v1/mandates/current`, { headers: { Authorization: `Agent ${currentSig}` } });
    expect(currentRes.status).toBe(200);
    expect((await currentRes.json()).version).toBe(1);

    // Payments refuse the old schemes: only a signed agent token passes.
    const unsigned = await fetch(`${base}/v1/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": "e2e_unsigned", Authorization: `Owner ${ownerToken}` },
      body: JSON.stringify({ payee_id: "payee_mama_ngozi", amount_kobo: 100000, category: "groceries", reason: "x" }),
    });
    expect(unsigned.status).toBe(401);

    // 4. Signed payment (Authorization: Agent <jwt>)
    const paymentRes = await signedPayment(keys.privateKey, agent.id, {
      payee_id: "payee_mama_ngozi",
      amount_kobo: 850000, // ₦8,500.00
      category: "groceries",
      reason: "Restock rice for demo store",
    }, "e2e_idem_key_001");
    expect(paymentRes.status).toBe(201);
    const paymentData = await paymentRes.json();
    expect(paymentData.payment.status).toBe("settled");
    expect(paymentData.payment.verdict).toBe("allow");
    expect(paymentData.receipt.policy_version).toBe(1);
    expect(paymentData.receipt.checks).toHaveLength(6);

    // 4. Query payment by ID (Receipt drawer)
    const detailRes = await fetch(`${base}/v1/payments/${paymentData.payment.id}`);
    expect(detailRes.status).toBe(200);
    const detailData = await detailRes.json();
    expect(detailData.payment.id).toBe(paymentData.payment.id);
    expect(detailData.receipt.checks[0].step).toBe("signature");

    // 5. Run Square Up reconcile
    const reconcileRes = await fetch(`${base}/v1/ops/reconcile`, {
      method: "POST",
    });
    expect(reconcileRes.status).toBe(200);
    const reconcileData = await reconcileRes.json();
    expect(reconcileData.status).toBe("clean");
    expect(reconcileData.breaks_count).toBe(0);

    // 6. Test Brake killswitch with owner token
    const brakeRes = await fetch(`${base}/v1/agents/${agent.id}/brake`, {
      method: "POST",
      headers: {
        Authorization: `Owner ${ownerToken}`,
      },
    });
    expect(brakeRes.status).toBe(200);
    const brakeData = await brakeRes.json();
    const brakedAgent = brakeData.agent ?? brakeData;
    expect(brakedAgent.status).toBe("revoked");

    // 7. Verify subsequent payment is refused once the agent is braked
    const postBrakeRes = await signedPayment(keys.privateKey, agent.id, {
      payee_id: "payee_mama_ngozi",
      amount_kobo: 500000,
      category: "groceries",
      reason: "Attempt after revoke",
    }, "e2e_idem_key_002");
    expect(postBrakeRes.status).toBe(403);
    const postBrakeData = await postBrakeRes.json();
    expect(postBrakeData.error.code).toBe("AGENT_REVOKED");
  });
});
