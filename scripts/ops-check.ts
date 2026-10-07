import { readFile } from "node:fs/promises";
import postgres from "postgres";

const issues: string[] = [];
const required = ["DATABASE_URL", "DATABASE_URL_UNPOOLED", "RATE_LIMIT_SALT", "CRON_SECRET", "NEXT_PUBLIC_APP_ORIGIN"];
for (const name of required) if (!process.env[name]) issues.push(`${name} is missing`);
if (process.env.RATE_LIMIT_SALT && process.env.RATE_LIMIT_SALT.length < 32) issues.push("RATE_LIMIT_SALT must have at least 32 characters");
if (process.env.CRON_SECRET && process.env.CRON_SECRET.length < 32) issues.push("CRON_SECRET must have at least 32 characters");
if (process.env.DATABASE_SSL === "false") issues.push("DATABASE_SSL must not be disabled in production");
if (process.env.DATABASE_URL) {
  try { if (!new URL(process.env.DATABASE_URL).hostname.includes("-pooler")) issues.push("DATABASE_URL should use Neon's pooled endpoint for the web runtime"); }
  catch { issues.push("DATABASE_URL must be a valid connection URL"); }
}
if (process.env.DATABASE_URL_UNPOOLED) {
  try { if (new URL(process.env.DATABASE_URL_UNPOOLED).hostname.includes("-pooler")) issues.push("DATABASE_URL_UNPOOLED must use Neon's direct endpoint for schema changes"); }
  catch { issues.push("DATABASE_URL_UNPOOLED must be a valid connection URL"); }
}
if (process.env.NEXT_PUBLIC_APP_ORIGIN) {
  try {
    const origin = new URL(process.env.NEXT_PUBLIC_APP_ORIGIN);
    if (origin.protocol !== "https:" || origin.origin !== process.env.NEXT_PUBLIC_APP_ORIGIN.replace(/\/$/, "")) issues.push("NEXT_PUBLIC_APP_ORIGIN must be the canonical HTTPS origin without a trailing path");
  } catch { issues.push("NEXT_PUBLIC_APP_ORIGIN must be an absolute URL"); }
}

try {
  const vercel = await readFile(new URL("../vercel.json", import.meta.url), "utf8");
  if (!vercel.includes("/api/cron/retention")) issues.push("Vercel retention cron is not configured");
} catch { issues.push("vercel.json is missing"); }

const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (databaseUrl) {
  let db: ReturnType<typeof postgres> | undefined;
  try {
    db = postgres(databaseUrl, { prepare: false, max: 1, connect_timeout: 10, ssl: process.env.DATABASE_SSL === "false" ? false : "require" });
    const [schema] = await db<{ tenants: string | null; merchant_users: string | null; merchant_memberships: string | null; merchant_sessions: string | null; catalog_products: string | null; analytics_events: string | null }[]>`
      SELECT to_regclass('public.tenants')::text AS tenants,
        to_regclass('public.merchant_users')::text AS merchant_users,
        to_regclass('public.merchant_memberships')::text AS merchant_memberships,
        to_regclass('public.merchant_sessions')::text AS merchant_sessions,
        to_regclass('public.catalog_products')::text AS catalog_products,
        to_regclass('public.analytics_events')::text AS analytics_events`;
    for (const [name, relation] of Object.entries(schema || {})) if (!relation) issues.push(`Database schema is missing ${name}`);
    console.log("Database reachable; required tenant tables checked.");
  } catch {
    issues.push("Database connection failed; check the pooled and direct connection strings");
  } finally { await db?.end(); }
}

if (issues.length) {
  for (const issue of issues) console.error(`NOT READY: ${issue}`);
  process.exitCode = 1;
} else console.log("Production operations configuration is ready. Secret values were not printed.");
