import type { AddressInfo } from "node:net";
import express from "express";
import { PaymentRequest } from "@ailo/core";
import { describe, expect, it } from "vitest";
import { errorHandler } from "./errorHandler";
import { validate } from "./validate";

describe("validate", () => {
  it("rejects an invalid body with 400 and passes a valid one through", async () => {
    const app = express();
    app.use(express.json());
    app.post("/t", validate({ body: PaymentRequest }), (req, res) => { res.json(req.body); });
    app.use(errorHandler);
    const server = app.listen(0);
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/t`;
    const post = (body: unknown) =>
      fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

    try {
      const bad = await post({ payee_id: "", amount_kobo: 1.5 });
      expect(bad.status).toBe(400);
      expect(await bad.json()).toMatchObject({ error: { code: "VALIDATION_FAILED" } });

      const good = await post({ payee_id: "p1", amount_kobo: 100, category: "groceries", reason: "rice" });
      expect(good.status).toBe(200);
    } finally {
      server.close();
    }
  });
});
