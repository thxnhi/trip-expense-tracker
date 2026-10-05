import { NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase/server";
import { OfficeOcrError } from "@/lib/office-ocr";

export const IMAGE_BUCKET = "office-images";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function apiSession() {
  const supabase = await serverSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new ApiError("Bạn cần đăng nhập.", 401);
  return { supabase, user };
}

export async function jsonBody(request: Request): Promise<unknown> {
  if (Number(request.headers.get("content-length") || 0) > 4096)
    throw new ApiError("Yêu cầu quá lớn.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError("Dữ liệu gửi lên không hợp lệ.", 400);
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4096) {
      await reader.cancel();
      throw new ApiError("Yêu cầu quá lớn.", 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiError("Dữ liệu gửi lên không hợp lệ.", 400);
  }
}

export function apiFailure(error: unknown) {
  if (error instanceof ApiError || error instanceof OfficeOcrError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  console.error(
    "Office API request failed",
    error instanceof Error ? error.name : "UnknownError",
  );
  return NextResponse.json(
    { error: "Không xử lý được yêu cầu. Vui lòng thử lại." },
    { status: 500 },
  );
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    throw new ApiError("Nguồn yêu cầu không hợp lệ.", 403);
}
