import { NextResponse } from "next/server";
import { z } from "zod";
import { adminSupabase } from "@/lib/supabase/admin";
import { scanOfficeReceipt } from "@/lib/office-ocr";
import {
  apiFailure,
  ApiError,
  apiSession,
  assertSameOrigin,
  IMAGE_BUCKET,
  jsonBody,
} from "../_shared";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const signal = AbortSignal.timeout(45_000);
  try {
    assertSameOrigin(request);
    const { supabase, user } = await apiSession();
    const body = z
      .object({ uploadId: z.string().uuid() })
      .safeParse(await jsonBody(request));
    if (!body.success) throw new ApiError("Mã hóa đơn không hợp lệ.", 400);
    const { data: upload } = await supabase
      .from("uploads")
      .select("id,kind,preview_path")
      .eq("id", body.data.uploadId)
      .eq("user_id", user.id)
      .is("deleting_at", null)
      .single();
    if (!upload?.preview_path || upload.kind !== "receipt")
      throw new ApiError(
        "Ảnh hóa đơn chưa sẵn sàng hoặc bạn không có quyền quét.",
        404,
      );
    const { data: runId, error: leaseError } = await supabase.rpc("begin_ocr", {
      p_upload_id: upload.id,
    });
    if (leaseError || !runId)
      throw new ApiError(
        "Bạn đang quét một ảnh khác hoặc đã đạt giới hạn 10 lần/phút. Vui lòng chờ rồi thử lại.",
        429,
      );
    try {
      const { data: image, error: downloadError } = await adminSupabase()
        .storage.from(IMAGE_BUCKET)
        .download(upload.preview_path, {}, { signal });
      if (downloadError || !image)
        throw new ApiError("Không đọc được ảnh hóa đơn.", 503);
      signal.throwIfAborted();
      const fields = await scanOfficeReceipt(
        Buffer.from(await image.arrayBuffer()),
        signal,
      );
      return NextResponse.json(
        { uploadId: upload.id, ...fields },
        { headers: { "Cache-Control": "no-store" } },
      );
    } finally {
      const { error } = await supabase.rpc("finish_ocr", { p_run_id: runId });
      if (error) console.error("OCR lease release failed");
    }
  } catch (error) {
    return apiFailure(error);
  }
}
