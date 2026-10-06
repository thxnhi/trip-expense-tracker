import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const refresh = vi.hoisted(() => ({ enabled: false }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: {
      cookies: {
        setAll: (values: unknown[], headers: Record<string, string>) => void;
      };
    },
  ) => ({
    auth: {
      getClaims: async () => {
        if (refresh.enabled)
          options.cookies.setAll(
            [
              {
                name: "test-session",
                value: "refreshed-session",
                options: { httpOnly: true },
              },
            ],
            {
              "Cache-Control": "private, no-store",
              Expires: "0",
              Pragma: "no-cache",
            },
          );
        return { data: { claims: { sub: "test-user" } } };
      },
    },
  }),
}));

import { proxy } from "../src/proxy";

describe("session response cache protection", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-public-key");
    refresh.enabled = false;
  });
  afterEach(() => vi.unstubAllEnvs());

  it("does not allow shared caching of authenticated route responses", async () => {
    const response = await proxy(
      new NextRequest("https://office.example.com/groups/test"),
    );
    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0",
    );
    expect(response.cookies.get("test-session")).toBeUndefined();
  });

  it("preserves Supabase refresh cache protection when replacing the response", async () => {
    refresh.enabled = true;
    const response = await proxy(
      new NextRequest("https://office.example.com/profile"),
    );
    expect(response.cookies.get("test-session")?.value).toBe(
      "refreshed-session",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("pragma")).toBe("no-cache");
  });
});
