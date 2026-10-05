import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import {
  normalizeOfficeImage,
  normalizeOfficeReceipt,
  scanOfficeReceipt,
} from "../src/lib/office-ocr";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("office OCR result validation", () => {
  it("keeps precise decimal totals and real leap-day dates", () => {
    expect(
      normalizeOfficeReceipt({
        readable: true,
        amount: "123456789012.34",
        merchant: "  Quán ăn  ",
        date: "2024-02-29",
      }),
    ).toEqual({
      readable: true,
      amount: "123456789012.34",
      description: "Quán ăn",
      expenseDate: "2024-02-29",
    });
    expect(
      normalizeOfficeReceipt({
        readable: true,
        amount: "45000.00",
        merchant: null,
        date: "2025-02-29",
      }).expenseDate,
    ).toBeNull();
  });
  it("rejects negative, ambiguous formatted and missing totals", () => {
    for (const amount of [
      "-45000",
      "45.000đ",
      "45,000",
      null,
      "0",
      "1e3",
      "a900",
    ]) {
      expect(
        normalizeOfficeReceipt({
          readable: true,
          amount,
          merchant: null,
          date: null,
        }).readable,
      ).toBe(false);
    }
    expect(() => normalizeOfficeReceipt({ amount: "100" })).toThrow(
      "Không đọc được kết quả",
    );
  });
  it("does not trust a total when model marks the receipt unreadable", () => {
    expect(
      normalizeOfficeReceipt({
        readable: false,
        amount: "1",
        merchant: "unknown",
        date: "2026-01-01",
      }),
    ).toEqual({
      readable: false,
      amount: null,
      description: null,
      expenseDate: null,
    });
  });
});

describe("office image normalization", () => {
  it("decodes actual image bytes, orients and removes metadata", async () => {
    const png = await sharp({
      create: { width: 3000, height: 200, channels: 3, background: "white" },
    })
      .withMetadata({ orientation: 6 })
      .png()
      .toBuffer();
    const jpg = await normalizeOfficeImage(png, "receipt");
    const result = await sharp(jpg).metadata();
    expect(result.format).toBe("jpeg");
    expect(result.width).toBeLessThanOrEqual(2400);
    expect(result.height).toBeLessThanOrEqual(2400);
    expect(result.exif).toBeUndefined();
    expect(jpg.length).toBeLessThan(3 * 1024 * 1024);
  });
  it("rejects fake images and QR uploads above the lower limit", async () => {
    await expect(
      normalizeOfficeImage(Buffer.from("<svg>fake</svg>"), "receipt"),
    ).rejects.toThrow("Ảnh không hợp lệ");
    await expect(
      normalizeOfficeImage(Buffer.alloc(5 * 1024 * 1024 + 1), "qr"),
    ).rejects.toThrow("5 MB");
    await expect(
      normalizeOfficeImage(Buffer.alloc(0), "receipt"),
    ).rejects.toThrow("15 MB");
  });
});

describe("Groq adapter", () => {
  it("calls vision once with server credential and schema-validates its JSON", async () => {
    vi.stubEnv("GROQ_API_KEY", "unit-test-private-key");
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    readable: true,
                    amount: "75000",
                    merchant: "Quán Việt",
                    date: "2026-10-05",
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetch);
    expect(
      (await scanOfficeReceipt(Buffer.from("normalized-image"))).amount,
    ).toBe("75000");
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(options.headers.Authorization).toBe("Bearer unit-test-private-key");
    const body = JSON.parse(options.body);
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages[0].content[1].image_url.url).toMatch(
      /^data:image\/jpeg;base64,/,
    );
  });
  it("returns sanitized provider errors, never a key or raw payload, without retry", async () => {
    vi.stubEnv("GROQ_API_KEY", "private-key");
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response("provider stack private-key", { status: 429 }),
      );
    vi.stubGlobal("fetch", fetch);
    await expect(scanOfficeReceipt(Buffer.from("image"))).rejects.toMatchObject(
      { status: 429 },
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("allows manual entry when OCR credentials are absent", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(scanOfficeReceipt(Buffer.from("image"))).rejects.toMatchObject(
      { status: 503 },
    );
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects invalid JSON and reports timeout", async () => {
    vi.stubEnv("GROQ_API_KEY", "test");
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ choices: [{ message: { content: "not json" } }] }),
        ),
      )
      .mockRejectedValueOnce(new DOMException("timeout", "TimeoutError"));
    vi.stubGlobal("fetch", fetch);
    await expect(scanOfficeReceipt(Buffer.from("image"))).rejects.toMatchObject(
      { status: 502 },
    );
    await expect(scanOfficeReceipt(Buffer.from("image"))).rejects.toMatchObject(
      { status: 504 },
    );
  });
});
