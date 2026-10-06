import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { serverSupabase } from "@/lib/supabase/server";
import { appUrl, safeNext } from "@/lib/supabase/config";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const code = url.searchParams.get("code");
  // Retain compatibility with Supabase's default same-browser PKCE email templates.
  if (code) {
    const supabase = await serverSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        `${appUrl()}${safeNext(url.searchParams.get("next"))}`,
      );
  }
  if (
    hash &&
    type &&
    ["signup", "email", "recovery", "invite", "email_change"].includes(type)
  ) {
    const supabase = await serverSupabase();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: hash,
      type: type as EmailOtpType,
    });
    if (!error)
      return NextResponse.redirect(
        `${appUrl()}${type === "recovery" ? "/reset-password" : safeNext(url.searchParams.get("next"))}`,
      );
  }
  return NextResponse.redirect(`${appUrl()}/login?error=confirmation`);
}
