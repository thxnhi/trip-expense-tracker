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
  const value = process.env.APP_URL?.trim();
  if (value) return value.replace(/\/$/, "");
  const domain =
    process.env.VERCEL_ENV === "preview"
      ? process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL
      : process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (domain) return `https://${domain}`;
  if (process.env.NODE_ENV === "production")
    throw new Error(
      "Chưa có domain Vercel. Hãy cấu hình APP_URL nếu dùng hosting khác.",
    );
  return "http://localhost:3000";
}
