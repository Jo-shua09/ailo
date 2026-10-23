import { describe, expect, it } from "vitest";
import { formatNaira, nairaToKobo } from "./money";

describe("nairaToKobo", () => {
  it("converts whole and decimal naira strings without float error", () => {
    expect(nairaToKobo("8500")).toBe(850000);
    expect(nairaToKobo("8500.5")).toBe(850050);
    expect(nairaToKobo("0.07")).toBe(7);
    expect(nairaToKobo("1,250.10")).toBe(125010);
  });

  it("accepts Kora's numeric or string amounts", () => {
    expect(nairaToKobo(100)).toBe(10000);
    expect(nairaToKobo("100.00")).toBe(10000);
  });

  it("rejects negatives, more than 2 decimals and junk", () => {
    expect(() => nairaToKobo("-5")).toThrow();
    expect(() => nairaToKobo("1.005")).toThrow();
    expect(() => nairaToKobo("abc")).toThrow();
  });
});

describe("formatNaira", () => {
  it("formats kobo as naira with two decimals", () => {
    expect(formatNaira(850000)).toContain("8,500.00");
  });

  it("rejects non-integer kobo", () => {
    expect(() => formatNaira(1.5)).toThrow();
  });
});
