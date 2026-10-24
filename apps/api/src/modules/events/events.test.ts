import { describe, expect, it, vi } from "vitest";
import { EventsService } from "./events.service";
import type { Response } from "express";

describe("EventsService", () => {
  it("manages client lifecycle and broadcasts events in SSE format", () => {
    const service = new EventsService();
    const mockRes = {
      write: vi.fn(),
    } as unknown as Response;

    service.addClient(mockRes);
    expect(service.getClientCount()).toBe(1);

    const payment: any = {
      id: "pay_01",
      amount_kobo: 850000,
      status: "settled",
    };

    service.emitPaymentUpdated(payment);
    expect(mockRes.write).toHaveBeenCalledWith(
      `event: payment.updated\ndata: ${JSON.stringify(payment)}\n\n`
    );

    const approval: any = {
      id: "apr_01",
      payment_id: "pay_01",
      amount_kobo: 850000,
    };

    service.emitApprovalCreated(approval);
    expect(mockRes.write).toHaveBeenCalledWith(
      `event: approval.created\ndata: ${JSON.stringify(approval)}\n\n`
    );

    service.removeClient(mockRes);
    expect(service.getClientCount()).toBe(0);
    service.stopHeartbeat();
  });
});
