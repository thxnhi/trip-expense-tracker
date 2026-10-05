import { createClient } from "@supabase/supabase-js";
import { publicSupabaseConfig } from "./config";

/** Never import this module from a client component. */
export function adminSupabase() {
  const { url } = publicSupabaseConfig();
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("SUPABASE_SECRET_KEY chưa được cấu hình.");
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
