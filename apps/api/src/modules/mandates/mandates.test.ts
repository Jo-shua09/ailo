import type { AddressInfo } from "node:net";
import express, { type RequestHandler } from "express";
import type { Payment, SpendPolicy } from "@ailo/core";
import { beforeEach, describe, expect, it } from "vitest";
import { resetMemoryDb } from "../../db/mongo";
import { errorHandler } from "../../middlewares/errorHandler";
import { AppError } from "../../shared/AppError";
import { paymentsRepository } from "../payments/payments.repository";
import { createPolicyGenerator } from "./mandates.ai";
import { mandatesRepository } from "./mandates.repository";
import { mandatesRouter } from "./mandates.routes";
import { compile, test as testPolicy } from "./mandates.service";

const policy: SpendPolicy = {
  allowed_categories: ["groceries"],
  allowed_payees: ["pay_shoprite"],
  spending_limits: [{ amount_kobo: 1_000_000, interval: "daily" }],
  nod_above_kobo: 800_000,
  nod_rolling_payee_24h_kobo: 900_000,
  expires_at: "2030-01-01T00:00:00.000Z",
};

const payment = (id: string, amount_kobo: number, created_at: string, over: Partial<Payment> = {}): Payment => ({
  id, agent_id: "agt_1", payee_id: "pay_shoprite", payee_name: "Shoprite", amount_kobo, category: "groceries",
  reason: "rice", verdict: "allow", decided_by: "rules", status: "settled", kora_reference: null,
  created_at, ...over,
});

beforeEach(() => resetMemoryDb());

describe("mandates repository", () => {
  it("parallel saves get distinct versions 1..5, listed newest first", async () => {
    await Promise.all([1, 2, 3, 4, 5].map((n) => mandatesRepository.save(`rule ${n}`, policy)));
    const list = await mandatesRepository.list();
    expect(list.map((m) => m.version)).toEqual([5, 4, 3, 2, 1]);
    expect((await mandatesRepository.latest())?.version).toBe(5);
  });
});

describe("compile", () => {
  it("returns the policy when the model output is valid", async () => {
    expect(await compile("groceries only", { generatePolicy: async () => policy })).toEqual(policy);
  });

  it("rejects model output that is not a SpendPolicy with 422 COMPILE_FAILED", async () => {
    const err = await compile("x", { generatePolicy: async () => ({ ...policy, nod_above_kobo: 12.5 }) }).catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({ status: 422, code: "COMPILE_FAILED" });
  });
});

describe("test against history", () => {
  it("replays oldest first, counting earlier spend toward the daily limit", async () => {
    await paymentsRepository.savePayment(payment("p1", 600_000, "2026-10-24T08:00:00.000Z"));
    await paymentsRepository.savePayment(payment("p2", 500_000, "2026-10-24T09:00:00.000Z"));
    await paymentsRepository.savePayment(payment("p3", 100_000, "2026-10-24T10:00:00.000Z", { category: "fuel" }));

    const out = await testPolicy(policy, { limit: 10 });
    expect(out.results.map((r) => [r.payment_id, r.verdict])).toEqual([
      ["p1", "allow"],
      ["p2", "block"], // 600k + 500k > 1M daily
      ["p3", "block"], // category
    ]);
    expect(out.totals).toEqual({ allow: 1, nod: 0, block: 2 });
  });
});

describe("model adapter", () => {
  it("constructs without calling the network", () => {
    expect(typeof createPolicyGenerator({ LLM_PROVIDER: "google", LLM_MODEL_SMART: "gemini-test" })).toBe("function");
  });
});

describe("mandates routes", () => {
  const ownerAuth: RequestHandler = (req, _res, next) =>
    next(req.headers["x-owner"] ? undefined : new AppError(401, "OWNER_REQUIRED", "owner"));
  const agentAuth: RequestHandler = (req, _res, next) =>
    next(req.headers["x-agent"] ? undefined : new AppError(401, "SIGNATURE_REQUIRED", "agent"));

  async function withServer(run: (call: (m: string, p: string, h: Record<string, string>, b?: unknown) => Promise<Response>) => Promise<void>) {
    const app = express();
    app.use(express.json());
    app.use(mandatesRouter({ ownerAuth, agentAuth, generatePolicy: async () => policy }));
    app.use(errorHandler);
    const server = app.listen(0);
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      await run((method, path, headers, body) => fetch(`${base}${path}`, {
        method,
        headers: { "content-type": "application/json", ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
      }));
    } finally {
      server.close();
    }
  }

  it("compile does not save; only an explicit save is served to the agent", async () => {
    await withServer(async (call) => {
      const owner = { "x-owner": "1" };
      const agent = { "x-agent": "1" };

      const compiled = await call("POST", "/mandates/compile", owner, { english: "groceries only" });
      expect(await compiled.json()).toEqual({ english: "groceries only", policy });
      expect((await call("GET", "/mandates/current", agent)).status).toBe(404);

      const saved = await call("POST", "/mandates", owner, { english: "groceries only", policy });
      expect(saved.status).toBe(201);
      expect(await saved.json()).toMatchObject({ version: 1 });

      const current = await call("GET", "/mandates/current", agent);
      expect(await current.json()).toEqual({ version: 1, english_rule: "groceries only", policy });
      expect((await call("GET", "/mandates", owner)).status).toBe(200);
    });
  });

  it("guards routes: agents cannot write rules, owners need agent auth for current", async () => {
    await withServer(async (call) => {
      expect((await call("POST", "/mandates", { "x-agent": "1" }, { english: "x", policy })).status).toBe(401);
      expect((await call("GET", "/mandates/current", { "x-owner": "1" })).status).toBe(401);
      expect((await call("POST", "/mandates", { "x-owner": "1" }, { english: "x", policy: {} })).status).toBe(400);
    });
  });
});

describe("compile: shops when the rule names none", () => {
  it("allows the shops in the payee directory, visibly, so the owner sees them before saving", async () => {
    const proposed = {
      allowed_categories: ["stock"], allowed_payees: [],
      spending_limits: [{ amount_kobo: 5_000_000, interval: "weekly" }],
      nod_above_kobo: 1_000_000, nod_rolling_payee_24h_kobo: 1_000_000, expires_at: "2026-11-24T00:00:00Z",
    };
    const policy = await compile("Spend N50,000 a week on stock. Ask me above N10,000.", { generatePolicy: async () => proposed });
    expect(policy.allowed_payees).toEqual(["payee_mama_ngozi", "payee_lagos_logistics"]);
  });

  it("keeps the owner's named shops untouched", async () => {
    const proposed = {
      allowed_categories: ["stock"], allowed_payees: ["payee_mama_ngozi"],
      spending_limits: [{ amount_kobo: 5_000_000, interval: "weekly" }],
      nod_above_kobo: 1_000_000, nod_rolling_payee_24h_kobo: 1_000_000, expires_at: "2026-11-24T00:00:00Z",
    };
    const policy = await compile("Only Mama Ngozi.", { generatePolicy: async () => proposed });
    expect(policy.allowed_payees).toEqual(["payee_mama_ngozi"]);
  });
});
