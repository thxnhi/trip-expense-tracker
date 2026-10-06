import { NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase/server";
import { appUrl, safeNext } from "@/lib/supabase/config";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  if (code) {
    const supabase = await serverSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${appUrl()}${next}`);
  }
  return NextResponse.redirect(`${appUrl()}/login?error=callback`);
}
