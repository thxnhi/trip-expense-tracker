import { describe, expect, it } from "vitest";
import { safeNext } from "../src/lib/supabase/config";

describe("OAuth navigation", () => {
  it("keeps group invitations and recovery on the same origin", () => {
    expect(safeNext("/invite/abc")).toBe("/invite/abc");
    expect(safeNext("/reset-password")).toBe("/reset-password");
  });
  it.each([
    "https://attacker.test",
    "//attacker.test",
    "/\\attacker.test",
    "/\r\nlocation:bad",
    "",
    undefined,
    null,
  ])("rejects unsafe navigation %s", (value) => {
    expect(safeNext(value)).toBe("/");
  });
});
