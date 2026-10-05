import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";
import { apiFailure, ApiError, IMAGE_BUCKET } from "../../_shared";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) throw new ApiError("Cleanup is not configured.", 503);
    const expected = Buffer.from(`Bearer ${secret}`);
    const received = Buffer.from(request.headers.get("authorization") ?? "");
    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    )
      throw new ApiError("Unauthorized", 401);
    const admin = adminSupabase();
    const before = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: uploads, error } = await admin.rpc("claim_cleanup_uploads", {
      p_before: before,
      p_limit: 100,
    });
    if (error) throw new ApiError("Cleanup unavailable.", 503);
    let removed = 0;
    let failed = 0;
    for (const upload of uploads ?? []) {
      const paths = [upload.path, upload.preview_path].filter(
        (path): path is string => typeof path === "string",
      );
      const { error: removeError } = await admin.storage
        .from(IMAGE_BUCKET)
        .remove(paths);
      if (removeError) {
        failed++;
        continue;
      }
      const { error: deleteError } = await admin
        .from("uploads")
        .delete()
        .eq("id", upload.id)
        .eq("attached", false)
        .not("deleting_at", "is", null);
      if (deleteError) failed++;
      else removed++;
    }
    return NextResponse.json(
      { removed, failed },
      { status: failed ? 503 : 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
