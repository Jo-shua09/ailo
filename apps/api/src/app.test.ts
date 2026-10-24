import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import * as jose from "jose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app";
import { resetMemoryDb } from "./db/mongo";

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

    // 2. Register agent (Badge) with owner token
    const agentRes = await fetch(`${base}/v1/agents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Owner ${ownerToken}`,
      },
      body: JSON.stringify({ name: "Demo Shop Agent" }),
    });
    expect(agentRes.status).toBe(201);
    const agentData = await agentRes.json();
    const agent = agentData.agent ?? agentData;
    const privateKeyJwk = agentData.private_key_jwk;
    expect(agent.id).toMatch(/^agt_/);
    expect(agent.status).toBe("active");

    // 3. Create signed payment request with Ed25519 Bearer token
    // If agent was registered without key, generate a test keypair
    let privateKey: any;
    if (privateKeyJwk) {
      privateKey = await jose.importJWK(privateKeyJwk, "EdDSA");
    } else {
      const kp = await jose.generateKeyPair("EdDSA", { crv: "Ed25519" });
      privateKey = kp.privateKey;
    }

    const nonce = "test_nonce_e2e_001";
    const token = await new jose.SignJWT({ nonce, timestamp: Date.now() })
      .setProtectedHeader({ alg: "EdDSA", kid: agent.id })
      .setSubject(agent.id)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);

    const paymentRes = await fetch(`${base}/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "e2e_idem_key_001",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        payee_id: "payee_mama_ngozi",
        amount_kobo: 850000, // ₦8,500.00
        category: "groceries",
        reason: "Restock rice for demo store",
      }),
    });
    expect(paymentRes.status).toBe(201);
    const paymentData = await paymentRes.json();
    expect(paymentData.payment.status).toBe("settled");
    expect(paymentData.payment.verdict).toBe("allow");
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

    // 7. Verify subsequent payment is refused with MANDATE_REVOKED
    const nonce2 = "test_nonce_e2e_002";
    const token2 = await new jose.SignJWT({ nonce: nonce2, timestamp: Date.now() })
      .setProtectedHeader({ alg: "EdDSA", kid: agent.id })
      .setSubject(agent.id)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);

    const postBrakeRes = await fetch(`${base}/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "e2e_idem_key_002",
        Authorization: `Bearer ${token2}`,
      },
      body: JSON.stringify({
        payee_id: "payee_mama_ngozi",
        amount_kobo: 500000,
        category: "groceries",
        reason: "Attempt after revoke",
      }),
    });
    expect(postBrakeRes.status).toBe(403);
    const postBrakeData = await postBrakeRes.json();
    expect(postBrakeData.error.code).toBe("MANDATE_REVOKED");
  });
});
