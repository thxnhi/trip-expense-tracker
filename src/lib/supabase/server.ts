import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { publicSupabaseConfig, supabaseConfigured, safeNext } from "./config";

export async function serverSupabase() {
  const store = await cookies();
  const { url, key } = publicSupabaseConfig();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) =>
            store.set(name, value, {
              ...options,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
            }),
          );
        } catch {
          // Server components cannot set cookies; proxy.ts refreshes them.
        }
      },
    },
  });
}

export async function requireUser(next = "/") {
  if (!supabaseConfigured()) redirect("/login?setup=1");
  const supabase = await serverSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user)
    redirect(`/login?next=${encodeURIComponent(safeNext(next))}`);
  return { supabase, user };
}
