import { describe, expect, it } from "vitest";
import { moneyInputError } from "../src/lib/money-input";

describe("monetary text input validation", () => {
  it("accepts VND totals at whole-dong precision", () => {
    expect(moneyInputError("120000", 0)).toBe("");
  });
  it("accepts two-decimal custom amounts including zero shares", () => {
    expect(moneyInputError("1234.56", 2)).toBe("");
    expect(moneyInputError("123.45", 2, true)).toBe("");
    expect(moneyInputError("1111.11", 2, true)).toBe("");
    expect(moneyInputError("0", 2, true)).toBe("");
    expect(moneyInputError("0.00", 2)).not.toBe("");
  });
  it("rejects ambiguous separators, negative totals and excessive precision", () => {
    for (const amount of [
      "-1",
      "1e3",
      "120.000",
      "120,000",
      "120 000",
      "120000.01",
    ]) {
      expect(moneyInputError(amount, 0)).not.toBe("");
    }
    for (const amount of ["1,25", "1.234", " 1.25", "-0.01"]) {
      expect(moneyInputError(amount, 2)).not.toBe("");
    }
  });
  it("uses the database maximum without rounding to float", () => {
    expect(moneyInputError("1000000000000", 2)).toBe("");
    expect(moneyInputError("1000000000000.01", 2)).not.toBe("");
  });
});
