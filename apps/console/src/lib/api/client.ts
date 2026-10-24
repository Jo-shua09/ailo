import { Payment, Approval, Agent, LedgerBalances } from "./types";

const API_URL =
  (process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")
    : "https://ailo-dx6f.onrender.com") + "/v1";

class AiloApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  getToken() {
    return this.token;
  }

  private getHeaders() {
    if (!this.token) throw new Error("Unauthorized: No session token");
    return {
      "Content-Type": "application/json",
      Authorization: `Owner ${this.token}`,
    };
  }

  // --- 2. OWNER AUTH ---
  async login(pin: string): Promise<string> {
    const res = await fetch(`${API_URL}/owner/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) throw new Error("Invalid PIN");
    const data = await res.json();
    this.setToken(data.token);
    return data.token;
  }

  // --- 3. AGENTS & MANDATES ---
  async getAgents(): Promise<Agent[]> {
    const res = await fetch(`${API_URL}/agents`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch agents");
    return res.json();
  }

  async pullBrake(agentId: string): Promise<void> {
    const res = await fetch(`${API_URL}/agents/${agentId}/brake`, {
      method: "POST",
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error("Failed to pull brake");
  }

  // --- 4. LEDGER ---
  async getLedgerBalances(): Promise<LedgerBalances> {
    const res = await fetch(`${API_URL}/ledger/balances`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch ledger balances");
    return res.json();
  }

  // --- 5. PAYMENTS & CHECKS ---
  async getPayments(): Promise<Payment[]> {
    const res = await fetch(`${API_URL}/payments`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch payments");
    const data = await res.json();
    return data.payments || data;
  }

  async submitPayment(payload: any): Promise<Payment> {
    const res = await fetch(`${API_URL}/payments`, {
      method: "POST",
      headers: {
        ...this.getHeaders(),
        // Auto-generate the Idempotency Key exactly like the Postman script
        "Idempotency-Key": `idemp_${Date.now()}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Payment submission failed");
    return res.json();
  }

  // --- 6. APPROVALS (NOD) ---
  async getApprovals(): Promise<Approval[]> {
    const res = await fetch(`${API_URL}/approvals`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error("Failed to fetch approvals");
    const data = await res.json();
    return data.approvals || data;
  }

  async decideApproval(id: string, decision: "approve" | "deny"): Promise<void> {
    const res = await fetch(`${API_URL}/approvals/${id}`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ decision }),
    });
    if (!res.ok) throw new Error(`Failed to ${decision} payment`);
  }

  // --- 8. OPS RECONCILIATION ---
  async squareUp(): Promise<any> {
    const res = await fetch(`${API_URL}/ops/reconcile`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ fix: false }),
    });
    if (!res.ok) throw new Error("Reconciliation failed");
    return res.json();
  }

  // --- REAL-TIME SSE EVENT URL ---
  getLiveEventUrl(): string {
    if (!this.token) throw new Error("Unauthorized");
    return `${API_URL}/events?access_token=${this.token}`;
  }
}

export const ailoApi = new AiloApiClient();
