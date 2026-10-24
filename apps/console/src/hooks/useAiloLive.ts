"use client";

import { useState, useEffect, useCallback } from "react";
import { ailoApi } from "../lib/api/client";
import { Payment, LedgerBalances, Approval } from "../lib/api/types";

export function useAiloLive() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [balances, setBalances] = useState<LedgerBalances | null>(null);
  const [error, setError] = useState<string | null>(null);

  const login = async (pin: string) => {
    try {
      setError(null);
      await ailoApi.login(pin);
      setIsAuthenticated(true);
      await fetchInitialData();
    } catch (err: any) {
      setError(err.message || "Failed to login");
    }
  };

  const fetchInitialData = useCallback(async () => {
    try {
      const [fetchedPayments, fetchedApprovals, fetchedBalances] = await Promise.all([
        ailoApi.getPayments(),
        ailoApi.getApprovals(),
        ailoApi.getLedgerBalances(),
      ]);
      setPayments(fetchedPayments);
      setApprovals(fetchedApprovals);
      setBalances(fetchedBalances);
    } catch (err: any) {
      setError("Failed to load initial data");
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Connect to SSE stream
    const eventSource = new EventSource(ailoApi.getLiveEventUrl());

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle Payment Updates
        if (data.type === "payment_updated" || data.type === "payment_created") {
          const updatedPayment = data.payload as Payment;
          setPayments((prev) => {
            const exists = prev.find((p) => p.id === updatedPayment.id);
            if (exists) return prev.map((p) => (p.id === updatedPayment.id ? updatedPayment : p));
            return [updatedPayment, ...prev];
          });
        }

        // Handle Ledger Updates
        if (data.type === "ledger_updated") {
          setBalances(data.payload as LedgerBalances);
        }

        // Handle Approval Updates
        if (data.type === "approval_updated") {
          const updatedApproval = data.payload as Approval;
          setApprovals((prev) => {
            const exists = prev.find((a) => a.id === updatedApproval.id);
            if (exists) return prev.map((a) => (a.id === updatedApproval.id ? updatedApproval : a));
            return [updatedApproval, ...prev];
          });
        }
      } catch (err) {
        console.error("Failed to parse SSE message", err);
      }
    };

    eventSource.onerror = () => {
      console.error("SSE connection lost. Reconnecting...");
      // EventSource auto-reconnects, but you can handle UI state here
    };

    return () => {
      eventSource.close();
    };
  }, [isAuthenticated, fetchInitialData]);

  return {
    isAuthenticated,
    login,
    payments,
    approvals,
    balances,
    error,
    api: ailoApi, // Expose API for manual actions like ailoApi.decideApproval()
  };
}
