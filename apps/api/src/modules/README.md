# API modules

One folder per feature. Each module owns its routes, logic and tests, and talks to other modules only
through their exported service functions. File pattern per module:

```
<module>/
├── <module>.routes.ts       Express router (mounted in routes/v1/index.ts)
├── <module>.service.ts      business logic, no req/res
├── <module>.repository.ts   database access (Drizzle), only if the module stores data
├── <module>.dto.ts          zod schemas for this module's inputs (shared shapes come from @ailo/core)
└── <module>.test.ts         tests next to the code
```

| Module | Feature name | What it does | Owner |
|--------|--------------|--------------|-------|
| `health` | -- | Liveness check | done |
| `agents` | Badge, Brake | Register an agent, store its Ed25519 public key, publish JWKS, revoke on Brake | Emmanuel |
| `payments` | -- | The check pipeline: signature, rules, reserve, Second Look, Nod, payout. Owns the payment state machine | Emmanuel |
| `ledger` | -- | Double-entry postings in kobo, holds/reserves with a balance condition, reversals only | Emmanuel |
| `rails` | -- | Payout connector interface + `kora` client + labelled `simulated` client. Fixed reference per payment, re-query on 5xx/timeout | Emmanuel |
| `approvals` | Nod | Paused payments waiting for the owner; approve/deny issues a one-time capped authorization | Emmanuel |
| `webhooks` | -- | Kora webhook: verify `x-korapay-signature` on the raw body, dedupe, re-query | Emmanuel |
| `reconcile` | Square Up | Re-query every non-final payment and compare with the ledger | Emmanuel |
| `events` | -- | Server-Sent Events stream of payment/approval changes for the console | Emmanuel |
| `mandates` | Spec Gate | English rule to `SpendPolicy` (LLM, structured output), test against past payments, save versions | Adrien |
| `second-look` | Second Look | LLM intent check on flagged payments; returns ok/escalate/block, never approve; hard timeout escalates | Adrien |
