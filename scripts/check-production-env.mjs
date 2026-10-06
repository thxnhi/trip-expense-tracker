// Run: node --env-file=.env.production scripts/check-production-env.mjs
// Pure validation: never prints secrets or contacts external services.
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "GROQ_API_KEY",
  "CRON_SECRET",
];
const problems = required
  .filter((name) => !process.env[name]?.trim())
  .map((name) => `${name}: missing`);
for (const name of ["APP_URL", "NEXT_PUBLIC_SUPABASE_URL"]) {
  if (!process.env[name]) continue;
  try {
    const url = new URL(process.env[name]);
    if (
      url.protocol !== "https:" ||
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error();
  } catch {
    problems.push(
      `${name}: must be a public HTTPS URL without credentials/query/fragment`,
    );
  }
}
if (process.env.CRON_SECRET && process.env.CRON_SECRET.length < 32)
  problems.push("CRON_SECRET: must be at least 32 characters");
if (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ===
    process.env.SUPABASE_SECRET_KEY
)
  problems.push(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: must differ from the server secret key",
  );
if (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.startsWith("sb_secret_"))
  problems.push(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: must never be a secret key",
  );
try {
  const payload =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.split(".")[1];
  if (
    payload &&
    JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).role ===
      "service_role"
  )
    problems.push(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: legacy service_role key must never be public",
    );
} catch {
  /* Publishable keys do not use JWT; live credential validation is separate. */
}
if (problems.length) {
  console.error(
    "Production configuration needs attention:\n" +
      problems.map((problem) => `- ${problem}`).join("\n"),
  );
  process.exitCode = 1;
} else {
  console.log(
    "Production application variables are present and structurally valid. Verify Auth/SMTP/provider settings and live credentials before release.",
  );
  if (!process.env.APP_URL?.trim())
    console.log(
      "APP_URL is optional on Vercel: the app uses Vercel system domains. Other hosting requires APP_URL.",
    );
}
