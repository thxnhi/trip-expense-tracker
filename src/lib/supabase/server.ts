import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { connection } from "next/server";
import { publicSupabaseConfig, supabaseConfigured, safeNext } from "./config";

// React cache lasts for one server render: never share clients/cookies across users.
export const serverSupabase = cache(async () => {
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
});

export const authenticatedContext = cache(async () => {
  const supabase = await serverSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { supabase, user: error ? null : user };
});

export async function requireUser(next = "/") {
  await connection();
  if (!supabaseConfigured()) redirect("/login?setup=1");
  const { supabase, user } = await authenticatedContext();
  if (!user) redirect(`/login?next=${encodeURIComponent(safeNext(next))}`);
  return { supabase, user };
}
