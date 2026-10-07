import { sql } from "@/lib/store";
import { requireDatabase } from "@/lib/trial";
export async function GET() {
  try {
    requireDatabase();
    if (process.env.VERCEL && (!process.env.RATE_LIMIT_SALT || process.env.RATE_LIMIT_SALT === "replace-in-production" || !process.env.CRON_SECRET || !process.env.NEXT_PUBLIC_APP_ORIGIN)) throw new Error("PRODUCTION_CONFIG_REQUIRED");
    if (sql) {
      const [schema] = await sql<{ tenants: string | null; catalog: string | null; events: string | null; limits: string | null; accounts: string | null; memberships: string | null; sessions: string | null }[]>`
        SELECT to_regclass('public.tenants')::text AS tenants,
          to_regclass('public.catalog_products')::text AS catalog,
          to_regclass('public.analytics_events')::text AS events,
          to_regclass('public.request_limits')::text AS limits,
          to_regclass('public.merchant_users')::text AS accounts,
          to_regclass('public.merchant_memberships')::text AS memberships,
          to_regclass('public.merchant_sessions')::text AS sessions`;
      if (!schema || Object.values(schema).some((relation) => !relation)) throw new Error("SCHEMA_NOT_READY");
    }
    return Response.json({ status: "ok", service: "arieya", storage: sql ? "postgres" : "local" }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ status: "unavailable", service: "arieya" }, { status: 503 }); }
}
