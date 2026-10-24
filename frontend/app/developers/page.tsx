"use client";

import { useState } from "react";
import { Code, Panel, PageIntro, Tag } from "@/src/components/sg/ui";

const TOOLS = {
  get_mandate: `// MCP tool: get_mandate
const mandate = await specgate.get_mandate({ agent_id: "agt_shop_buyer_01" });
// → { mandate_id: "mnd_01J8X9", weekly_cap_kobo: 5000000,
//     remaining_kobo: 2750000, status: "ACTIVE" }`,
  pay: `// MCP tool: pay
const receipt = await specgate.pay({
  amount_kobo: 850000,
  payee: "ng_merchant_iya_ade",
  category: "inventory_stock",
  reason: "Restock 5 units Ankara fabric from Lagos Vendor",
}, { idempotencyKey: "idem_8841_ng_stock" });
// → { status: "settled", kora_ref: "KPY-NG-20261023-9941" }
// Blocked → { status: "blocked", code: "INTENT_DRIFT_INJECTION" }`,
  payment_status: `// MCP tool: payment_status
const s = await specgate.payment_status({ payment_id: "pi_7f2a" });
// → { status: "escrow_held", trace: { rule: "PASS", ai: 0.95, ... } }`,
};

const MIDDLEWARE = `import { specgate } from "@specgate/accept";

// One line: any Nigerian website or API becomes agent-payable.
app.get("/v1/fabric-index", specgate.accept({ price_kobo: 50000 }), handler);

// Unpaid agent  → 402 Payment Required { price_kobo: 50000 }
// Signed retry  → KYA verified → 200 OK + resource`;

const ENDPOINTS = [
  ["POST", "/v1/agents", "Register agent, issue KYA + scoped key"],
  ["POST", "/v1/mandates", "Create mandate from plain English"],
  ["POST", "/v1/mandates/:id/revoke", "Kill switch"],
  ["POST", "/v1/payments", "Agent payment (Idempotency-Key)"],
  ["GET", "/v1/payments/:id", "Status + trace"],
  ["POST", "/v1/approvals/:id", "Owner approves or denies"],
  ["POST", "/v1/escrows/:id/release", "Release on outcome"],
  ["POST", "/v1/webhooks/kora", "Signature verified, then re-queried"],
  ["GET", "/v1/verify-agent", "Payees verify a KYA credential"],
];

export default function DevPage() {
  const [tab, setTab] = useState<keyof typeof TOOLS>("pay");
  return (
    <div className="site-container marketing-section">
      <PageIntro kicker="Developer Drop-In" title="Three tools. One line." accent="Build with Ailo.">
        Illustrative integration examples. These endpoints are not live. Agents get a safe way to pay through MCP. Merchants accept agents with a
        single middleware.
      </PageIntro>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="MCP Server Tools" kicker="AGENT SIDE">
          <div className="mb-3 flex flex-wrap gap-1">
            {(Object.keys(TOOLS) as (keyof typeof TOOLS)[]).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`num rounded-sm border px-2.5 py-1 text-[11px] ${tab === k ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
              >
                {k}
              </button>
            ))}
          </div>
          <Code>{TOOLS[tab]}</Code>
        </Panel>
        <Panel title="Accept Middleware" kicker="PAYEE SIDE" right={<Tag tone="ok">HTTP 402</Tag>}>
          <Code>{MIDDLEWARE}</Code>
        </Panel>
      </div>
      <Panel title="REST Interface" kicker="v1" className="mt-4" bodyClass="p-0">
        <ul className="divide-y divide-border/60">
          {ENDPOINTS.map(([m, p, d]) => (
            <li key={p} className="grid grid-cols-[52px_1fr] gap-x-3 gap-y-0.5 px-4 py-2.5 sm:grid-cols-[60px_260px_1fr]">
              <span className={`num text-[11px] font-bold ${m === "GET" ? "text-primary" : "text-warning"}`}>{m}</span>
              <span className="num min-w-0 break-all text-xs">{p}</span>
              <span className="col-span-2 text-xs text-muted-foreground sm:col-span-1">{d}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
