import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  server: vi.fn(),
  admin: vi.fn(),
  scan: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ serverSupabase: mocks.server }));
vi.mock("@/lib/supabase/admin", () => ({ adminSupabase: mocks.admin }));
vi.mock("@/lib/office-ocr", async (actual) => ({
  ...(await actual<typeof import("../src/lib/office-ocr")>()),
  scanOfficeReceipt: mocks.scan,
}));

import { POST as upload } from "../src/app/api/uploads/route";
import { POST as complete } from "../src/app/api/uploads/complete/route";
import { POST as ocr } from "../src/app/api/ocr/route";
import { GET as view } from "../src/app/api/uploads/[id]/view/route";
import { GET as cleanup } from "../src/app/api/cron/cleanup/route";

const id = "1c0b99e6-b3a8-45a9-9ab4-d17bcd8b0632";
const userId = "f57c2432-922e-47e2-8d63-c4edba15d808";
function request(path: string, body: unknown) {
  return new Request(`https://office.example${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://office.example",
    },
    body: JSON.stringify(body),
  });
}
function query(result: unknown) {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    single: vi.fn().mockResolvedValue(result),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.is.mockReturnValue(chain);
  return chain;
}
function session(result: unknown = { data: null, error: null }) {
  const client = {
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: { id: userId } }, error: null }),
    },
    from: vi.fn().mockReturnValue(query(result)),
    rpc: vi.fn(),
  };
  mocks.server.mockResolvedValue(client);
  return client;
}

beforeEach(() => {
  vi.resetAllMocks();
});
afterEach(() => vi.unstubAllEnvs());

describe("authenticated image API boundaries", () => {
  it("rejects anonymous requests before issuing any storage token", async () => {
    mocks.server.mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
      },
    });
    const response = await upload(request("/api/uploads", {}));
    expect(response.status).toBe(401);
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("rejects cross-origin requests before session lookup", async () => {
    const response = await upload(
      new Request("https://office.example/api/uploads", {
        method: "POST",
        headers: { Origin: "https://other.example" },
        body: "{}",
      }),
    );
    expect(response.status).toBe(403);
    expect(mocks.server).not.toHaveBeenCalled();
  });
  it("enforces body size when content-length is absent", async () => {
    session();
    const response = await upload(
      request("/api/uploads", { ignored: "x".repeat(5000) }),
    );
    expect(response.status).toBe(413);
  });
  it("checks group permission in the database before signing an upload", async () => {
    const client = session();
    client.rpc.mockResolvedValue({
      data: null,
      error: { message: "not member" },
    });
    const response = await upload(
      request("/api/uploads", {
        groupId: id,
        kind: "receipt",
        contentType: "image/jpeg",
        size: 400,
      }),
    );
    expect(response.status).toBe(403);
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("will not complete or sign a preview for someone else's image", async () => {
    session();
    expect(
      (await complete(request("/api/uploads/complete", { uploadId: id })))
        .status,
    ).toBe(404);
    expect(
      (
        await view(new Request("https://office.example/api/uploads/view"), {
          params: Promise.resolve({ id }),
        })
      ).status,
    ).toBe(404);
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("creates an upload token only for the database-provided path, with overwrites disabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://testproject.supabase.co");
    const client = session();
    client.rpc.mockResolvedValue({
      data: { id, path: `${userId}/${id}/original.jpg` },
      error: null,
    });
    const sign = vi
      .fn()
      .mockResolvedValue({ data: { token: "limited-signature" }, error: null });
    mocks.admin.mockReturnValue({
      storage: {
        from: vi.fn().mockReturnValue({ createSignedUploadUrl: sign }),
      },
    });
    const response = await upload(
      request("/api/uploads", {
        kind: "qr",
        contentType: "image/jpeg",
        size: 400,
      }),
    );
    expect(response.status).toBe(200);
    expect(sign).toHaveBeenCalledWith(`${userId}/${id}/original.jpg`, {
      upsert: false,
    });
    expect((await response.json()).endpoint).toBe(
      "https://testproject.storage.supabase.co/storage/v1/upload/resumable/sign",
    );
  });
  it("redirects authorized image viewing to a short-lived signed URL without caching", async () => {
    session({ data: { preview_path: "owned/preview.jpg" }, error: null });
    const sign = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://storage.example/signed" },
      error: null,
    });
    mocks.admin.mockReturnValue({
      storage: { from: vi.fn().mockReturnValue({ createSignedUrl: sign }) },
    });
    const response = await view(
      new Request("https://office.example/api/uploads/view"),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(307);
    expect(sign).toHaveBeenCalledWith("owned/preview.jpg", 300);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
});

describe("OCR rate lease", () => {
  it("does not send a foreign image to Groq", async () => {
    session();
    expect((await ocr(request("/api/ocr", { uploadId: id }))).status).toBe(404);
    expect(mocks.scan).not.toHaveBeenCalled();
  });
  it("returns rate limiting before reading an image or spending a provider call", async () => {
    const client = session({
      data: { id, kind: "receipt", preview_path: "owned/preview.jpg" },
      error: null,
    });
    client.rpc.mockResolvedValue({
      data: null,
      error: { message: "rate limit" },
    });
    expect((await ocr(request("/api/ocr", { uploadId: id }))).status).toBe(429);
    expect(mocks.admin).not.toHaveBeenCalled();
    expect(mocks.scan).not.toHaveBeenCalled();
  });
  it("releases the lease after successful OCR", async () => {
    const client = session({
      data: { id, kind: "receipt", preview_path: "owned/preview.jpg" },
      error: null,
    });
    client.rpc
      .mockResolvedValueOnce({ data: "run-id", error: null })
      .mockResolvedValueOnce({ error: null });
    const download = vi
      .fn()
      .mockResolvedValue({ data: new Blob(["normalized"]), error: null });
    mocks.admin.mockReturnValue({
      storage: { from: vi.fn().mockReturnValue({ download }) },
    });
    mocks.scan.mockResolvedValue({
      readable: true,
      amount: "50000",
      description: "Cafe",
      expenseDate: null,
    });
    const response = await ocr(request("/api/ocr", { uploadId: id }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      uploadId: id,
      amount: "50000",
    });
    expect(client.rpc).toHaveBeenLastCalledWith("finish_ocr", {
      p_run_id: "run-id",
    });
    expect(download.mock.calls[0][2].signal).toBeInstanceOf(AbortSignal);
  });
  it("also releases the lease when storage fails", async () => {
    const client = session({
      data: { id, kind: "receipt", preview_path: "owned/preview.jpg" },
      error: null,
    });
    client.rpc
      .mockResolvedValueOnce({ data: "run-id", error: null })
      .mockResolvedValueOnce({ error: null });
    mocks.admin.mockReturnValue({
      storage: {
        from: vi.fn().mockReturnValue({
          download: vi.fn().mockResolvedValue({ data: null, error: {} }),
        }),
      },
    });
    expect((await ocr(request("/api/ocr", { uploadId: id }))).status).toBe(503);
    expect(client.rpc).toHaveBeenLastCalledWith("finish_ocr", {
      p_run_id: "run-id",
    });
  });
});

describe("cloud cleanup authorization", () => {
  it("rejects cron requests without the secret before using the admin client", async () => {
    vi.stubEnv("CRON_SECRET", "long-test-secret");
    expect(
      (await cleanup(new Request("https://office.example/api/cron/cleanup")))
        .status,
    ).toBe(401);
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it("retains cleanup-claimed rows for retry when storage removal fails", async () => {
    vi.stubEnv("CRON_SECRET", "test-secret");
    const from = vi.fn();
    const remove = vi
      .fn()
      .mockResolvedValue({ error: { message: "unavailable" } });
    mocks.admin.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({
        data: [{ id, path: "original", preview_path: "preview" }],
        error: null,
      }),
      from,
      storage: { from: vi.fn().mockReturnValue({ remove }) },
    });
    const response = await cleanup(
      new Request("https://office.example/api/cron/cleanup", {
        headers: { Authorization: "Bearer test-secret" },
      }),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ removed: 0, failed: 1 });
    expect(from).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledWith(["original", "preview"]);
  });
});
