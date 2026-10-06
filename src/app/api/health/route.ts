import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { error } = await adminSupabase()
      .from("profiles")
      .select("id")
      .limit(1)
      .abortSignal(AbortSignal.timeout(5_000));
    return NextResponse.json(
      { status: error ? "unavailable" : "ok" },
      { status: error ? 503 : 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }
}
