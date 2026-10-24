import { describe, expect, it } from "vitest";
import express from "express";
import { errorHandler } from "./errorHandler";
import { idempotency } from "./idempotency";

describe("idempotency middleware", () => {
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
