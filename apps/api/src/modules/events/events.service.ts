import type { Response } from "express";
import type { Payment, ApprovalRequest } from "@ailo/core";

export class EventsService {
  private clients: Set<Response> = new Set();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  addClient(res: Response): void {
    this.clients.add(res);
  }

  removeClient(res: Response): void {
    this.clients.delete(res);
  }

  getClientCount(): number {
    return this.clients.size;
  }

  emit(event: string, data: unknown): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(payload);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  emitPaymentUpdated(payment: Payment): void {
    this.emit("payment.updated", payment);
  }

  emitApprovalCreated(approval: ApprovalRequest): void {
    this.emit("approval.created", approval);
  }

  private startHeartbeat(): void {
    // Send a comment heartbeat every 15s to keep connections alive through proxies
    this.heartbeatTimer = setInterval(() => {
      for (const client of this.clients) {
        try {
          client.write(": heartbeat\n\n");
        } catch {
          this.clients.delete(client);
        }
      }
    }, 15000);
    if (this.heartbeatTimer.unref) {
      this.heartbeatTimer.unref();
    }
  }

  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

export const eventsService = new EventsService();
