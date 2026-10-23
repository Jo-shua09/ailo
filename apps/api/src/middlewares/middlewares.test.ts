import { beforeEach, describe, expect, it } from "vitest";
import express from "express";
import * as jose from "jose";
import { resetMemoryDb } from "../db/mongo";
import { errorHandler } from "./errorHandler";
import { agentAuth } from "./agentAuth";
import { idempotency } from "./idempotency";
import { agentsService } from "../modules/agents/agents.service";

describe("agentAuth and idempotency middlewares", () => {
  beforeEach(() => {
    resetMemoryDb();
  });

  it("verifies Ed25519 JWT Bearer token and rejects replayed nonce", async () => {
    const { agent, private_key_jwk } = await agentsService.registerAgent({ name: "Auth Test Agent" });
    const privateKey = await jose.importJWK(private_key_jwk!, "EdDSA");

    const app = express();
    app.use(express.json());
    app.get("/test-auth", agentAuth(), (req, res) => {
      res.json({ ok: true, agent_id: (req as any).agent.id });
    });
    app.use(errorHandler);

    const nonce = "nonce_12345";
    const token = await new jose.SignJWT({ nonce, timestamp: Date.now() })
      .setProtectedHeader({ alg: "EdDSA", kid: agent.id })
      .setSubject(agent.id)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);

    const server = app.listen(0);
    const port = (server.address() as any).port;
    const url = `http://127.0.0.1:${port}/test-auth`;

    try {
      // First request: success
      const res1 = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res1.status).toBe(200);
      const data1 = await res1.json();
      expect(data1.agent_id).toBe(agent.id);

      // Replay request with same token & nonce: rejected
      const res2 = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res2.status).toBe(401);
      const data2 = await res2.json();
      expect(data2.error.code).toBe("NONCE_REPLAY");
    } finally {
      server.close();
    }
  });

  it("replays response when same Idempotency-Key is sent twice and detects payload mismatch", async () => {
    const app = express();
    app.use(express.json());
    let counter = 0;
    app.post("/test-idem", idempotency({ required: true }), (req, res) => {
      counter++;
      res.status(201).json({ count: counter, echo: req.body });
    });
    app.use(errorHandler);

    const server = app.listen(0);
    const port = (server.address() as any).port;
    const url = `http://127.0.0.1:${port}/test-idem`;

    try {
      const key = "idem_key_001";
      // 1. Initial request
      const res1 = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify({ item: "rice", amount: 5000 }),
      });
      expect(res1.status).toBe(201);
      const data1 = await res1.json();
      expect(data1.count).toBe(1);

      // 2. Replay with identical payload: returns cached response without incrementing counter
      const res2 = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify({ item: "rice", amount: 5000 }),
      });
      expect(res2.status).toBe(201);
      expect(res2.headers.get("Idempotent-Replay")).toBe("true");
      const data2 = await res2.json();
      expect(data2.count).toBe(1);

      // 3. Replay with different payload: 422 IDEMPOTENCY_MISMATCH
      const res3 = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify({ item: "oil", amount: 9000 }),
      });
      expect(res3.status).toBe(422);
      const data3 = await res3.json();
      expect(data3.error.code).toBe("IDEMPOTENCY_MISMATCH");
    } finally {
      server.close();
    }
  });
});
