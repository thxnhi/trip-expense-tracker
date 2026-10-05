import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const status = JSON.parse(
  execFileSync("node_modules/.bin/supabase", ["status", "--output", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }),
);
const env = {
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    status.PUBLISHABLE_KEY || status.ANON_KEY,
  SUPABASE_SECRET_KEY: status.SECRET_KEY || status.SERVICE_ROLE_KEY,
};
if (Object.values(env).some((value) => !value))
  throw new Error("Supabase status did not return local API credentials.");
if (
  !new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.match(
    /^(127\.0\.0\.1|localhost)$/,
  )
)
  throw new Error("E2E setup must point at local Supabase.");
writeFileSync(
  ".env.test.local",
  Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n") + "\n",
  { mode: 0o600 },
);
console.log(
  "Prepared .env.test.local for isolated local Supabase (credentials hidden).",
);
