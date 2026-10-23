import { describe, expect, it } from "vitest";
import { assertTransition, canTransition, isTerminal } from "./payment-states";

describe("payment state machine", () => {
  it("allows the happy path", () => {
    const path = ["requested", "held", "submitting", "submitted", "settled"] as const;
    for (let i = 0; i < path.length - 1; i++) {
      expect(canTransition(path[i]!, path[i + 1]!)).toBe(true);
    }
  });

  it("allows the Nod path and the unknown-then-reconciled path", () => {
    expect(canTransition("held", "pending_approval")).toBe(true);
    expect(canTransition("pending_approval", "approved")).toBe(true);
    expect(canTransition("submitting", "unknown")).toBe(true);
    expect(canTransition("unknown", "settled")).toBe(true);
  });

  it("never lets a settled payment be submitted again", () => {
    expect(canTransition("settled", "submitting")).toBe(false);
    expect(() => assertTransition("settled", "submitting")).toThrow();
  });

  it("treats blocked, failed and refunded as terminal", () => {
    expect(isTerminal("blocked")).toBe(true);
    expect(isTerminal("failed")).toBe(true);
    expect(isTerminal("refunded")).toBe(true);
    expect(isTerminal("unknown")).toBe(false);
  });
});
