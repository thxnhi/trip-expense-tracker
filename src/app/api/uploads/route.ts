import { NextResponse } from "next/server";
import { z } from "zod";
import { adminSupabase } from "@/lib/supabase/admin";
import {
  apiFailure,
  ApiError,
  apiSession,
  assertSameOrigin,
  IMAGE_BUCKET,
  jsonBody,
} from "../_shared";

export const runtime = "nodejs";

const requestSchema = z.object({
  groupId: z.string().uuid().optional(),
  kind: z.enum(["receipt", "qr"]),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z.number().int().positive(),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { supabase } = await apiSession();
    const parsed = requestSchema.safeParse(await jsonBody(request));
    if (!parsed.success) throw new ApiError("Thông tin ảnh không hợp lệ.", 400);
    const input = parsed.data;
    if (input.kind === "receipt" && !input.groupId)
      throw new ApiError("Bạn cần chọn nhóm cho hóa đơn.", 400);
    if (input.size > (input.kind === "qr" ? 5 : 15) * 1024 * 1024)
      throw new ApiError(
        `Ảnh vượt quá ${input.kind === "qr" ? 5 : 15} MB.`,
        400,
      );
    const extension = (
      { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const
    )[input.contentType];
    const { data, error } = await supabase.rpc("register_upload", {
      p_group_id: input.groupId ?? null,
      p_kind: input.kind,
      p_extension: extension,
    });
    if (error || !data)
      throw new ApiError("Không thể tải ảnh cho nhóm này.", 403);
    const upload = Array.isArray(data) ? data[0] : data;
    const { data: signed, error: signingError } = await adminSupabase()
      .storage.from(IMAGE_BUCKET)
      .createSignedUploadUrl(upload.path, { upsert: false });
    if (signingError || !signed)
      throw new ApiError(
        "Không cấp được quyền tải ảnh. Vui lòng thử lại.",
        503,
      );
    const storageUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
    if (storageUrl.hostname.endsWith(".supabase.co"))
      storageUrl.hostname = storageUrl.hostname.replace(
        ".supabase.co",
        ".storage.supabase.co",
      );
    // Signed TUS has its own route. The plain /resumable route requires a user JWT.
    storageUrl.pathname = "/storage/v1/upload/resumable/sign";
    return NextResponse.json(
      {
        id: upload.id,
        path: upload.path,
        token: signed.token,
        bucket: IMAGE_BUCKET,
        endpoint: storageUrl.toString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
