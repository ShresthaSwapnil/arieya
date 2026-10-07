import postgres from "postgres";

const tenantId = process.env.EXPORT_TENANT_ID;
if (!process.env.DATABASE_URL || !tenantId) throw new Error("DATABASE_URL and EXPORT_TENANT_ID are required");
const sql = postgres(process.env.DATABASE_URL, { ssl: process.env.DATABASE_SSL === "false" ? false : "require" });
const [tenant] = await sql`SELECT id, public_key, approved_origins, status, plan, session_allowance, created_at FROM tenants WHERE id = ${tenantId}`;
if (!tenant) throw new Error("Tenant not found");
const [catalog, knowledge, edits, eventCounts, orders] = await Promise.all([
  sql`SELECT external_id, data, source_updated_at, synced_at FROM catalog_products WHERE tenant_id = ${tenantId}`,
  sql`SELECT topic, content, canonical_source_url, approval_owner, approved_at, checksum, status, review_at FROM merchant_knowledge WHERE tenant_id = ${tenantId}`,
  sql`SELECT token, creator_session_id, intent_summary, product_ids, selection_reasons, created_at, expires_at, deleted_at FROM shareable_edits WHERE tenant_id = ${tenantId}`,
  sql`SELECT name, count(*)::int AS count FROM analytics_events WHERE tenant_id = ${tenantId} GROUP BY name ORDER BY name`,
  sql`SELECT order_id, amount_minor, currency, product_ids, attribution_source, created_at FROM attributed_orders WHERE tenant_id = ${tenantId}`,
]);
console.log(JSON.stringify({ exportedAt: new Date().toISOString(), tenant, catalog, knowledge, edits, eventCounts, orders }, null, 2));
await sql.end();
