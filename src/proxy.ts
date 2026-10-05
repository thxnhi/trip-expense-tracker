import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  publicSupabaseConfig,
  supabaseConfigured,
} from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  if (!supabaseConfigured()) return NextResponse.next();
  let response = NextResponse.next({ request });
  const { url, key } = publicSupabaseConfig();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, {
            ...options,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
          }),
        );
      },
    },
  });
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: [
    "/((?!api/cron|api/health|_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)",
  ],
};
