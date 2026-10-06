import { NextResponse } from "next/server";
import { z } from "zod";
import { apiFailure, ApiError, apiSession, IMAGE_BUCKET } from "../../_shared";
import { adminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { supabase } = await apiSession();
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success)
      throw new ApiError("Mã ảnh không hợp lệ.", 400);
    const { data: upload } = await supabase
      .from("uploads")
      .select("preview_path")
      .eq("id", id)
      .is("deleting_at", null)
      .single();
    if (!upload?.preview_path)
      throw new ApiError(
        "Không tìm thấy ảnh hoặc bạn không có quyền xem.",
        404,
      );
    const { data, error } = await adminSupabase()
      .storage.from(IMAGE_BUCKET)
      .createSignedUrl(upload.preview_path, 300);
    if (error || !data) throw new ApiError("Không đọc được ảnh.", 503);
    return NextResponse.json(
      { url: data.signedUrl },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
