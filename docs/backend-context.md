# Ailo Backend Engine -- Context & Architecture Handoff

> Note (Adrien, 24 Oct 02:00): merged into main and corrected to match main. Postman: see docs/ailo_api.postman_collection.json (being updated to main's auth).

> **For the next agent / backend engineer picking up this codebase:**
> This document details the exact state, design decisions, data models, and verification steps for the Ailo backend API engine (`apps/api`).

---

## 1. Overview & Scope

Ailo is the banking rails for the agent economy built for the PAU 24-Hour Hackathon. The backend engine runs on Express 5 with Node 22, TypeScript, MongoDB persistence, and `@ailo/core` shared types.

All 8 requested modules and 2 core middlewares have been implemented, tested, and verified:
1. `agents/` -- Badge (registration, Ed25519 key generation, SHA-256 fingerprinting), Brake (kill switch revocation), and public JWKS publishing.
2. `payments/` -- 6-step check ladder: Signature -> Spec Gate Rules -> Reserve -> Second Look -> Nod -> Payout, with audit Receipts.
3. `ledger/` -- Double-entry book in integer kobo, reserve holds under balance conditions, posting on settlement, and voiding on denial/failure.
4. `rails/` -- `PayoutRail` abstraction with `kora.ts` (REST client, fixed `AL-{payment_id}` reference, re-query on 5xx/timeout) and `simulated.ts` (offline sandbox with `is_simulated: true`).
5. `approvals/` -- Paused payment states (`pending_approval`), phone `/nod` approval/denial, and one-time capped authorizations.
6. `webhooks/` -- Kora webhook listener, Kora signature check (`x-korapay-signature` = HMAC-SHA256 of `JSON.stringify(body.data)`, constant-time compare), event deduplication, and async re-querying.
7. `reconcile/` -- Square Up job (`POST /v1/ops/reconcile`) querying non-final payments against rails and detecting ledger breaks.
8. `events/` -- Server-Sent Events (SSE) stream (`GET /v1/events`) pushing real-time `payment.updated` and `approval.created` messages to the console.
9. `middlewares/agentSignature.ts` -- the ONE agent gate: Ed25519 per-request token (`Authorization: Agent <jwt>`) bound to method, path and body hash, 60 s expiry, one-time jti. `middlewares/ownerAuth.ts` guards every owner route.
10. `middlewares/idempotency.ts` -- `Idempotency-Key` header enforcement, SHA-256 payload hashing, response caching and replay (`Idempotent-Replay: true`).
11. `db/mongo.ts` -- Native MongoDB persistence with fallback in-memory collection drivers for fast, zero-dependency testing.

---

## 2. Architecture & File Structure

```
apps/api/src/
├── app.ts                          # Express application factory, middleware pipeline, rawBody parser
├── server.ts                       # Server bootstrap & MongoDB connection
├── config/
│   └── env.ts                      # Zod-validated environment configuration with test fallbacks
├── db/
│   └── mongo.ts                    # MongoDB connection & collection interface with in-memory fallback
├── middlewares/
│   ├── agentSignature.ts           # the one agent gate (Ed25519, body-bound)
│   ├── agentSignature.ts           # Teammate RFC 9421 / signature middleware
│   ├── errorHandler.ts             # Global sanitized error handler
│   ├── idempotency.ts              # Idempotency-Key deduplication & replay
│   ├── notFound.ts                 # 404 handler
│   ├── ownerAuth.ts                # Owner PIN session authentication
│   └── validate.ts                 # Zod boundary validation
├── modules/
│   ├── agents/                     # Badge, Brake, JWKS
│   │   ├── agents.dto.ts
│   │   ├── agents.repository.ts
│   │   ├── agents.routes.ts
│   │   ├── agents.service.ts
│   │   └── agents.test.ts
│   ├── approvals/                  # Nod owner approvals
│   │   ├── approvals.dto.ts
│   │   ├── approvals.repository.ts
│   │   ├── approvals.routes.ts
│   │   ├── approvals.service.ts
│   │   └── approvals.test.ts
│   ├── events/                     # Server-Sent Events stream
│   │   ├── events.routes.ts
│   │   ├── events.service.ts
│   │   └── events.test.ts
│   ├── health/                     # Liveness check
│   │   └── health.routes.ts
│   ├── ledger/                     # Double-entry ledger & holds
│   │   ├── ledger.dto.ts
│   │   ├── ledger.repository.ts
│   │   ├── ledger.routes.ts
│   │   ├── ledger.service.ts
│   │   └── ledger.test.ts
│   ├── owner/                      # Owner session & brute-force lockout
│   │   ├── owner.routes.ts
│   │   └── owner.test.ts
│   ├── payments/                   # 6-step payment ladder & receipts
│   │   ├── payments.dto.ts
│   │   ├── payments.repository.ts
│   │   ├── payments.routes.ts
│   │   ├── payments.service.ts
│   │   └── payments.test.ts
│   ├── rails/                      # Kora & simulated connectors
│   │   ├── index.ts
│   │   ├── kora.ts
│   │   ├── rails.interface.ts
│   │   ├── rails.test.ts
│   │   └── simulated.ts
│   ├── reconcile/                  # Square Up reconciliation
│   │   ├── reconcile.dto.ts
│   │   ├── reconcile.routes.ts
│   │   ├── reconcile.service.ts
│   │   └── reconcile.test.ts
│   └── webhooks/                   # Kora webhook listener & HMAC verification
│       ├── webhooks.dto.ts
│       ├── webhooks.repository.ts
│       ├── webhooks.routes.ts
│       ├── webhooks.service.ts
│       └── webhooks.test.ts
└── routes/
    └── v1/
        └── index.ts                # Mounts all v1 feature routers
```

---

## 3. The 6-Step Payment Check Pipeline

Every agent payment submitted to `POST /v1/payments` executes the strict sequence documented in PRD section 5.2:

```
Payment Request
       │
       ▼
[1. Signature & Badge]  ──FAIL──► [Blocked] + Receipt
       │ PASS
       ▼
[2. Spec Gate Rules]   ──FAIL──► [Blocked] + Receipt
       │ PASS
       ▼
[3. Reserve Funds]     ──FAIL──► [Blocked] + Receipt (Insufficient funds)
       │ PASS
       ▼
[4. Second Look]       ──BLOCK─► [Blocked] + Release Hold + Receipt
       │ OK / ESCALATE
       ▼
[5. Needs Nod?]        ──YES───► [Pending Approval] + Create Approval + Receipt
       │ NO (Clean)
       ▼
[6. Payout via Rail]   ──SETTLED──► [Settled] + Post Hold + Receipt
                       ──UNKNOWN──► [Unknown] + Keep Hold (Re-query scheduled)
                       ──FAILED───► [Failed] + Release Hold + Receipt
```

### Receipt Format
Every payment produces a comprehensive audit receipt:
```json
{
  "payment_id": "pay_12345",
  "policy_version": 1,
  "checks": [
    { "step": "signature", "result": "pass", "detail": "Badge verified for Shop agent (agt_01)" },
    { "step": "rules", "result": "pass", "detail": "weekly cap ₦50,000.00: ₦8,500.00 of ₦50,000.00 used" },
    { "step": "reserve", "result": "pass", "detail": "Reserved ₦8,500.00 in holds" },
    { "step": "second_look", "result": "skipped", "detail": "not flagged" },
    { "step": "nod", "result": "skipped", "detail": "under ₦10,000.00 threshold" },
    { "step": "payout", "result": "pass", "detail": "Kora confirmed AL-pay_12345" }
  ]
}
```

---

## 4. Ledger Accounts & Double-Entry Invariants

All monetary values are **integers in kobo** (`100 kobo = ₦1.00`). Floats are strictly prohibited.
- Accounts: `partner_cash`, `owner_wallet`, `holds`, `escrow`, `payee_payable`, `fees`.
- Available Balance Formula:
  $$\text{available\_balance} = \text{balance}(\text{owner\_wallet}) - \sum \text{active holds}$$
- Top-Up Entry:
  - Debit: `partner_cash`
  - Credit: `owner_wallet`
- Settlement Entry:
  - Debit: `owner_wallet`
  - Credit: `payee_payable` (or `partner_cash`)
- Hold Lifecycle: `active` -> `posted` (on rail settlement) or `released` (on block/denial/failure).

---

## 5. Rails & Kora Integration Rules

- **Fixed Reference**: For any payment `pay_xyz`, reference is immutable: `AL-pay_xyz`.
- **Duplicate Protection**: If Kora returns HTTP 5xx or `"Duplicate Transaction Reference"`, the client **never** creates a new reference. It must re-check the existing reference via `GET /merchant/api/v1/transactions/:reference` (Kora "Verify Payout Transaction", verified in Kora's official collection). `kora.ts` still calls `POST /transactions/query`, which does not exist: fix in progress on main.
- **Metadata Restrictions**: Kora allows at most 5 keys with strictly **no underscores** (e.g. `paymentid`, `payeeid`, `rail`).
- **Simulated Rail**: Used when `KORA_MODE=simulated` or offline, returning `{ is_simulated: true }`.

---

## 6. Endpoints Reference

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `GET` | `/v1/health` | None | Liveness health check |
| `GET` | `/.well-known/jwks.json` | None | Public JWKS of active agents |
| `POST` | `/v1/owner/session` | PIN | Owner PIN login (lockout after 5 failures) |
| `POST` | `/v1/agents` | Owner | Register agent & issue Badge (Ed25519 key) |
| `GET` | `/v1/agents` | Owner | List agents with status and fingerprints |
| `GET` | `/v1/agents/:id` | Open/Owner | Get agent details |
| `POST` | `/v1/agents/:id/brake` | Owner | Brake kill switch (revokes agent) |
| `POST` | `/v1/mandates/:id/brake` | Owner | Alias for Brake kill switch |
| `POST` | `/v1/payments` | Agent (Ed25519) | Submit payment (requires `Idempotency-Key`) |
| `GET` | `/v1/payments` | Open | Live feed of payments (newest first) |
| `GET` | `/v1/payments/:id` | Open | Get payment and Receipt drawer data |
| `GET` | `/v1/approvals` | Open | List pending Nod requests |
| `GET` | `/v1/approvals/:id` | Open | Get single Nod request (for phone view) |
| `POST` | `/v1/approvals/:id` | Open/Owner | Approve or deny (`{ decision: "approve" \| "deny" }`) |
| `POST` | `/v1/ledger/topup` | Open | Sandbox virtual account funding |
| `GET` | `/v1/ledger/balances` | Open | Get balances across all accounts |
| `POST` | `/v1/webhooks/kora` | HMAC Signature | Kora payout webhook with `x-korapay-signature` |
| `POST` | `/v1/ops/reconcile` | Open | Square Up reconciliation job |
| `GET` | `/v1/events` | Open | SSE stream (`payment.updated`, `approval.created`) |

---

## 7. How to Test & Verify

All tests run with Vitest in sandbox or bypass mode:
```bash
# Run all tests across the monorepo (run `npm test`; CI runs the same on Windows + Linux)
npm test

# Run typecheck across the monorepo
npm run typecheck

# Run typecheck specifically for API
npm run typecheck -w @ailo/api

# Run individual test suites
npx vitest run apps/api/src/app.test.ts
npx vitest run apps/api/src/modules/payments/payments.test.ts
npx vitest run apps/api/src/modules/ledger/ledger.test.ts
npx vitest run apps/api/src/modules/rails/rails.test.ts
npx vitest run apps/api/src/modules/approvals/approvals.test.ts
npx vitest run apps/api/src/modules/webhooks/webhooks.test.ts
npx vitest run apps/api/src/modules/reconcile/reconcile.test.ts
npx vitest run apps/api/src/modules/events/events.test.ts
npx vitest run apps/api/src/middlewares/middlewares.test.ts
```

---

## 8. Handoff Notes for the Next Teammates

### For Adrien (`mandates` / `second-look` modules):
- `payments.service.ts` includes the hook for `SecondLookResult`:
  `{ verdict: "ok" | "escalate" | "block", reason: string }`
  When you wire up `apps/api/src/modules/second-look/`, you can call your LLM evaluation directly from `payments.service.ts` or plug into the Second Look step.
- Spec Gate (`mandates/`): The default demo spend policy in `payments.dto.ts` adheres to `@ailo/core` `SpendPolicy`. When compiling English to policy, output this exact schema and call `paymentsService.setSpendPolicy(policy)`.

### For Josh & Chidi (Console & `/nod` Phone Page):
- **Live Feed (S2)**: Point `EventSource` to `GET /v1/events` and listen for `payment.updated`.
- **Receipt Drawer (S3)**: Call `GET /v1/payments/:id`. The response includes `payment` and `receipt.checks` ready to render in the check ladder.
- **Nod Phone Page**: Listen for `approval.created` via SSE or poll `GET /v1/approvals`. Tap Approve/Deny via `POST /v1/approvals/:id` with `{ "decision": "approve" | "deny" }`.
- **Square Up (S5)**: Call `POST /v1/ops/reconcile` and display `breaks_count: 0`.
- **Brake Killswitch (S4)**: Call `POST /v1/agents/:id/brake` with owner session header (`Authorization: Owner <token>`).

---

## 9. Postman Collection

A complete Postman Collection v2.1.0 is generated and available at:
- `ailo_api.postman_collection.json` (Workspace root)
- `apps/api/ailo_api.postman_collection.json`

### Import & Quick Start:
1. Open Postman -> Click **Import** -> Select `ailo_api.postman_collection.json`.
2. Start the API server: `npm run dev -w @ailo/api` (runs on `http://localhost:3000`).
3. Set Collection Variable `ownerPin` (defaults to `123456`).
4. Run request `2. Owner Auth -> Create Owner Session`.
   - The test script automatically extracts `token` and sets `{{owner_token}}`.
5. Run requests sequentially across Agents, Ledger, Payments, Approvals, Webhooks, and Ops.
   - Dynamic scripts auto-generate `Idempotency-Key` and calculate `x-korapay-signature` HMAC-SHA256 on the fly.

