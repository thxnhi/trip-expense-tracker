import { afterEach, describe, expect, it, vi } from "vitest";
import { appUrl, safeNext } from "../src/lib/supabase/config";

describe("Auth deployment URLs", () => {
  afterEach(() => vi.unstubAllEnvs());

  function configure(environment: string) {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("VERCEL_ENV", environment);
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "office-dev.vercel.app");
    vi.stubEnv("VERCEL_BRANCH_URL", "office-git-feature.vercel.app");
    vi.stubEnv("VERCEL_URL", "office-deployment.vercel.app");
  }

  it("uses the stable production domain without APP_URL", () => {
    configure("production");
    expect(appUrl()).toBe("https://office-dev.vercel.app");
  });

  it("keeps preview authentication on the preview branch", () => {
    configure("preview");
    expect(appUrl()).toBe("https://office-git-feature.vercel.app");
    vi.stubEnv("VERCEL_BRANCH_URL", "");
    expect(appUrl()).toBe("https://office-deployment.vercel.app");
  });

  it("supports an explicit hosting URL override", () => {
    configure("production");
    vi.stubEnv("APP_URL", "https://office.example.com/");
    expect(appUrl()).toBe("https://office.example.com");
  });

  it("requires a configured domain outside Vercel in production", () => {
    configure("production");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    expect(() => appUrl()).toThrow("APP_URL");
    vi.stubEnv("NODE_ENV", "development");
    expect(appUrl()).toBe("http://localhost:3000");
  });
});

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
