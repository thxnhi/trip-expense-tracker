import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { adminSupabase } from "@/lib/supabase/admin";
import { normalizeOfficeImage } from "@/lib/office-ocr";
import {
  apiFailure,
  ApiError,
  apiSession,
  assertSameOrigin,
  IMAGE_BUCKET,
  jsonBody,
} from "../../_shared";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { supabase, user } = await apiSession();
    const body = z
      .object({ uploadId: z.string().uuid() })
      .safeParse(await jsonBody(request));
    if (!body.success) throw new ApiError("Mã ảnh không hợp lệ.", 400);
    const { data: upload } = await supabase
      .from("uploads")
      .select("*")
      .eq("id", body.data.uploadId)
      .eq("user_id", user.id)
      .is("deleting_at", null)
      .single();
    if (!upload) throw new ApiError("Không tìm thấy ảnh của bạn.", 404);
    const admin = adminSupabase();
    const storage = admin.storage.from(IMAGE_BUCKET);
    if (upload.preview_path) {
      const { data: signed, error } = await storage.createSignedUrl(
        upload.preview_path,
        300,
      );
      if (error || !signed) throw new ApiError("Không đọc được ảnh.", 503);
      return NextResponse.json(
        { id: upload.id, previewUrl: signed.signedUrl },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const { data: original, error: downloadError } = await storage.download(
      upload.path,
    );
    if (downloadError || !original)
      throw new ApiError("Ảnh chưa tải xong. Vui lòng thử lại.", 409);
    if (original.size > (upload.kind === "qr" ? 5 : 15) * 1024 * 1024)
      throw new ApiError("Ảnh vượt quá dung lượng cho phép.", 400);
    const preview = await normalizeOfficeImage(
      Buffer.from(await original.arrayBuffer()),
      upload.kind,
    );
    const previewPath = `${user.id}/${upload.id}/preview-${randomUUID()}.jpg`;
    const { error: storeError } = await storage.upload(previewPath, preview, {
      contentType: "image/jpeg",
      upsert: false,
    });
    if (storeError) throw new ApiError("Không lưu được ảnh xem trước.", 503);
    const { data: updated, error: updateError } = await admin
      .from("uploads")
      .update({ preview_path: previewPath })
      .eq("id", upload.id)
      .eq("user_id", user.id)
      .is("deleting_at", null)
      .is("preview_path", null)
      .select("id")
      .maybeSingle();
    if (updateError || !updated) {
      await storage.remove([previewPath]);
      throw new ApiError(
        "Ảnh vừa được xử lý ở phiên khác hoặc đã hết hạn. Vui lòng thử lại.",
        409,
      );
    }
    const { data: signed, error: signError } = await storage.createSignedUrl(
      previewPath,
      300,
    );
    if (signError || !signed)
      throw new ApiError("Không đọc được ảnh xem trước.", 503);
    return NextResponse.json(
      { id: upload.id, previewUrl: signed.signedUrl },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
