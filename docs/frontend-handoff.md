# Frontend Handoff -- Ailo screens

Owners: **Josh** (`apps/console`), **Chidi** (`apps/console` `/nod` route + `apps/shop`).
Backend: Emmanuel (`apps/api`). AI: Adrien (`packages/policy`, `apps/agent`).
Flow diagrams: `docs/diagrams/` (open the `.html` files in a browser).

Ailo gives an AI agent an **allowance, not your bank login**. The owner writes a spending rule in English,
the agent shops and pays, and Ailo checks every payment before money moves through Kora (sandbox).
The judges see your screens projected for 2 minutes. **Every screen must read from across a room.**

## Design rules

- Rounded-full buttons. No box shadows (borders only). Solar icons (Bold = active, Outline = inactive).
- No serif fonts in the console. Money is always `₦8,500.00` (from integer kobo, never floats).
- Verdict colours: **Allowed** = green, **Needs Nod** = amber, **Blocked** = red. Use the same three everywhere.
- Every mocked or sandbox thing shows a small grey `SANDBOX` / `SIMULATED` tag. Honesty is part of the pitch.
- Large type. The projector is the target device for the console. A phone is the target for `/nod`.

## The 5 demo beats (what the screens must make obvious)

| Beat | Feature | Screen | What the audience must see |
|------|---------|--------|----------------------------|
| 1 | **Spec Gate** | Console: Rules | English rule on the left, compiled rule on the right, then Test, then Save |
| 2 | **Till** | Console: Live feed + Shop | The agent buys from the shop, a row appears with **Allowed** and a Kora reference |
| 3 | **Second Look** | Console: Receipt | "Rules: pass, Second Look: **Blocked**" with the AI's reason |
| 4 | **Nod** | Phone `/nod` (mirrored on the projector) | The request arrives and the owner taps Approve. The feed row turns Settled |
| 5 | **Brake** | Console: Agent panel | One tap, and the agent shows **Revoked**. The next payment is refused |

## How people use Ailo (UX flow)

Two people touch the product. **The owner** (a business owner who lets an agent spend for them) uses the
console on a laptop and `/nod` on their phone. **The agent** never sees a screen: it talks to the API.
The shop is a third party that agents buy from. Screen flow diagram: `docs/diagrams/screen-flow.html`.

### Navigation

```
Console (laptop)                                 Phone
┌──────────────┬───────────────────────────┐    ┌───────────────┐
│ Live feed    │  SANDBOX            Owner │    │ /nod          │
│ Rules        │                           │    │  one request  │
│ Agents       │   (selected screen)       │    │  Approve/Deny │
│ Square Up    │                           │    └───────────────┘
│ Ecosystem    │                           │     reached from a push/
└──────────────┴───────────────────────────┘     link, not from the nav
```

- Left sidebar: **Live feed** (home), **Rules**, **Agents**, **Square Up**, **Ecosystem**. Demo controls sit in a corner menu.
- A persistent `SANDBOX` tag in the top bar. Owner menu top right (sign out).
- Clicking any payment row anywhere opens its **Receipt** as a right-side drawer (keeps the feed visible).
- `/nod` is a separate, phone-first page. It is opened from a notification or link, never from the console nav.

### User journeys

**J1. First setup (owner, about 1 minute)**
Sign in (PIN), then **Agents**: Add agent (name it "Shop agent"), which issues its **Badge** (key fingerprint shown),
then **Rules**: type the English rule, then **Compile**, then **Test**, then **Save**, then land on the **Live feed** with "Waiting for your agent's first payment".

**J2. Watching the agent work (owner, passive)**
Live feed rows slide in: Allowed, Needs Nod, Blocked. Click a row to open the Receipt drawer and see *why*.

**J3. Giving a Nod (owner, on the phone)**
The phone buzzes with a request card (amount, payee, the agent's reason, why it needs a Nod), then tap **Approve** or **Deny**, then the result.
Back on the console, the same row flips from "Waiting for your Nod" to Settled (or Blocked).

**J4. Something looks wrong (owner)**
A Blocked row in the feed, then open the Receipt: "Second Look: blocked, the item doesn't match your rule",
then if worried, **Agents** and **Brake**, confirm, and the agent shows **Revoked**. Its next payment is refused and appears as Blocked.

**J5. End of day (owner or ops)**
**Square Up**, then "Checked N payments with Kora, breaks: 0". Any mismatch shows as Needs review with a link to its Receipt.

**J6. Changing the rule (owner)**
**Rules**: edit the English, then Compile, then Test (see which past payments would change), then Save as v2. Receipts always show the version that applied.

## Screens

### Console (`apps/console`), Josh

**S1. Rules (Spec Gate)**
- Text area: "My shop agent can spend ₦50,000 a week on stock. Ask me above ₦10,000."
- **Compile** button, then a side-by-side card showing the compiled policy as readable rows (not raw JSON):
  allowed categories, allowed payees, limits per interval, approval threshold, expiry.
- **Test** button: a list of recent payments, each marked "would allow / would need Nod / would block".
- **Save** button. Saved rules show a version number (v1, v2).
- States: empty, compiling (spinner), compile error (the AI couldn't understand, so show what to rephrase), compiled-unsaved, saved.

**S2. Live feed (home)**
- Realtime table, newest on top: time, agent, payee, amount, **verdict chip**, which check decided
  (Rules / Second Look / Nod), status (see "Payment states" below), Kora reference.
- New rows slide in. This is the screen on the projector most of the demo.

**S3. Receipt (payment detail)**: open a row
- The check ladder, top to bottom, each with a pass/fail/skipped icon:
  1. Signature (agent Badge verified)
  2. Rules (each rule that ran, pass/fail)
  3. Reserve (funds held)
  4. Second Look (verdict + one-sentence reason, or "not needed")
  5. Nod (approved/denied by owner, time)
  6. Kora payout (reference, `settled` only after Kora confirms)
- The agent's stated reason, shown **quoted and labelled "agent's words (untrusted)"**.
- The rule version that applied.

**S4. Agent panel (Badge + Brake)**
- Agent name, key fingerprint (short), mandate status (Active / Revoked), spent this week vs cap (a progress bar).
- **Brake** button (red, confirm dialog, "Stop all spending for this agent?"), then the Revoked state everywhere.

**S5. Square Up (reconcile)**
- **Square Up** button. Result: "Checked 14 payments with Kora -- **breaks: 0**". Any mismatch listed as `needs_review`.

**S6. Ecosystem map** (the last screen of the demo)
- The Ailo layers: Badge, Spec Gate, Second Look, Nod, Brake, Till, Receipt, Square Up = **lit (live)**.
  Hold (escrow), Exchange (insurance, credit) = **dim (next)**. Static. A designed image is fine.

**S7. Demo controls** (small, corner, for the team only)
- **Reset demo** (one click back to the starting state; judges will see the table demo about 15 times).
- **Compromised agent** toggle, clearly labelled. Forces the poisoned-page attempt on stage.

### Nod phone page (`apps/console` route `/nod`), Chidi

- Mobile-first, one request at a time, full-screen card:
  agent name, payee, **amount (huge)**, the agent's reason (quoted, untrusted),
  **why it needs your nod** ("above ₦10,000" / "Second Look flagged this" / "new payee"),
  a countdown to expiry.
- Two big buttons: **Approve** (green), **Deny** (outline red). Then the result state.
- States: no pending requests (calm empty state), request arrived (with sound/vibration if possible), approved, denied, expired.
- Owner must be signed in (a simple PIN is fine for the demo). The agent can never reach this page.

### Demo shop (`apps/shop`), Chidi

A normal-looking Nigerian online grocery ("Mama Ngozi Stores", or any name). It exists so the audience sees what the agent shops from.
- Home: product grid (rice 50kg, vegetable oil 5L, garri, ...) with ₦ prices.
- Product page: details, price, "Agents can pay here via **Till**" badge.
- **Poisoned product page**: looks normal to people. It contains hidden text aimed at the agent
  (e.g. an instruction to buy a different, pricier item). Add a small toggle to **reveal the hidden text** on stage.
- The agent-facing payment endpoints (HTTP 402) are backend work. The shop UI only shows the human view.

## Payment states (for chips and the Receipt)

`requested`, `blocked`, `held`, `pending_approval`, `approved`, `submitting`, `submitted`, `settled`,
`failed`, `unknown`, `needs_review`, `reversed`, `expired`, `cancelled`, `disputed`, `refunded`.
Show friendly labels: e.g. `pending_approval` = "Waiting for your Nod", `unknown` = "Checking with Kora".

## Data you can build against now (mock until the API is up)

Amounts are integer kobo (`850000` = ₦8,500.00). Field names are final unless Emmanuel says otherwise.

```json
{
  "payment": {
    "id": "pay_01", "agent_id": "agt_shop", "payee_id": "payee_mama_ngozi", "payee_name": "Mama Ngozi Stores",
    "amount_kobo": 850000, "category": "groceries", "reason": "Restock rice for the shop",
    "verdict": "allow", "decided_by": "rules", "status": "settled",
    "kora_reference": "AL-pay_01", "created_at": "2026-10-24T00:12:00Z"
  },
  "receipt": {
    "payment_id": "pay_01", "policy_version": 1,
    "checks": [
      { "step": "signature", "result": "pass" },
      { "step": "rules", "result": "pass", "detail": "weekly cap ₦50,000: ₦8,500 of ₦50,000 used" },
      { "step": "reserve", "result": "pass" },
      { "step": "second_look", "result": "skipped", "detail": "not flagged" },
      { "step": "nod", "result": "skipped", "detail": "under ₦10,000" },
      { "step": "payout", "result": "pass", "detail": "Kora confirmed AL-pay_01" }
    ]
  },
  "approval": {
    "id": "apr_01", "payment_id": "pay_02", "amount_kobo": 1200000, "payee_name": "Mama Ngozi Stores",
    "reason": "Bigger restock for the weekend", "why": "above_threshold", "expires_at": "2026-10-24T00:20:00Z"
  }
}
```

`verdict`: `allow` | `nod` | `block`. `decided_by`: `rules` | `second_look` | `nod`.
`why`: `above_threshold` | `second_look_flag` | `new_payee`.

Endpoints (from the PRD): `GET /v1/payments`, `GET /v1/payments/:id` (with the receipt),
`POST /v1/approvals/:id` (`{ "decision": "approve" | "deny" }`), `POST /v1/mandates` (compile/test/save),
`POST /v1/mandates/:id/brake`, `POST /v1/ops/reconcile`. Realtime updates come via Supabase Realtime on
the `payments` and `approvals` tables.

## Priority if time runs short

S2 Live feed, then `/nod`, then S3 Receipt, then S1 Rules, then S4 Brake, then the shop, then S5 Square Up, then S6 map, then S7 controls.
Freeze is **12:00 PM Saturday**. Backup demo video by 11 AM.
