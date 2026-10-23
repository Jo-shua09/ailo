# Ailo

**Give your AI an allowance, not your bank login.**

Ailo is banking rails for the agent economy. An owner writes a spending rule in plain English. Ailo
compiles it into an enforced policy, checks every payment an AI agent makes against it before money moves,
asks the owner for a Nod on big or suspicious spends, pays out in Naira through Kora (sandbox), and records
a Receipt of why every naira moved.

Built in 24 hours at the PAU 24-Hour Hackathon (23-24 Oct 2026).

## Repository map

```
ailo/
├── packages/            code shared by more than one app
│   ├── core/            money in kobo, payment state machine, API contracts (zod)
│   └── till/            HTTP 402 "pay per request" helper for shops and APIs agents buy from
├── apps/
│   ├── api/             Express backend: every rule, check and naira movement lives here
│   ├── console/         Next.js owner dashboard + the /nod phone approval page
│   ├── shop/            Next.js demo Nigerian shop that agents buy from (incl. the poisoned page)
│   └── agent/           Python buyer agent (Pydantic AI + MCP tools) and the eval harness
├── docs/                frontend handoff, flow diagrams
└── stages/              product docs (PRD)
```

| Folder | What it is for | Owner |
|--------|----------------|-------|
| `packages/core` | The single source of truth every app imports: kobo money helpers (no floats), the 16 payment states and which moves are legal, and the request/response shapes. Change a contract here and every app sees it | shared |
| `packages/till` | What a merchant installs to accept agent payments: answers 402 with a price, verifies the signed paid retry | Emmanuel |
| `apps/api` | The rails. Receives signed payment requests from agents, runs the checks, reserves funds, calls Kora, handles webhooks, streams live updates to the console. See `apps/api/src/modules/README.md` | Emmanuel (money). Adrien (everything agent + AI: `agents`, `mandates`, `second-look`, agent-signature middleware) |
| `apps/console` | The owner's screens: Live feed, Rules (Spec Gate), Receipt, Agents (Badge + Brake), Square Up, Ecosystem, and `/nod` on the phone. See `docs/frontend-handoff.md` | Josh, Chidi (`/nod`) |
| `apps/shop` | A normal-looking third-party store. Proves any site can accept agents through Till | Chidi |
| `apps/agent` | The AI customer: given a goal and a budget, it shops and pays through Ailo. Also runs the eval (attacks + legitimate tasks) | Adrien |

## Stack

- TypeScript: Express 5, Drizzle ORM on hosted Postgres, zod 4, Vercel AI SDK (Gemini by default; OpenAI or Anthropic via `LLM_PROVIDER`), jose (Ed25519)
- Frontend: Next.js 16, React Query, MSW, Zustand, Tailwind 4, shadcn/ui
- Python agent: Pydantic AI, MCP
- Payments: Kora sandbox (REST, no SDK)

## Run it

```bash
npm install                 # Node 22+; npm workspaces, no pnpm needed
cp apps/api/.env.example apps/api/.env   # fill in keys; never commit .env
npm test                    # all tests
npm run dev -w @ailo/api    # API on :4000
```

Secrets live only in `.env` files, which git ignores.
