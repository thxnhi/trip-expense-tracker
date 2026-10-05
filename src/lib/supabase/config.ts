export function supabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function publicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new Error("Chưa cấu hình Supabase. Xem .env.example.");
  return { url, key };
}

/** Only same-origin paths may be used for OAuth/email navigation. */
export function safeNext(value: string | null | undefined, fallback = "/") {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\r\n]/.test(value)
  )
    return fallback;
  return value;
}

export function appUrl() {
  const value = process.env.APP_URL;
  if (value) return value.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL)
    return `https://${process.env.VERCEL_URL}`;
  if (process.env.NODE_ENV === "production")
    throw new Error("APP_URL chưa được cấu hình.");
  return "http://localhost:3000";
}
