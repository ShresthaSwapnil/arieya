import postgres from "postgres";

const tenantId = process.env.REPORT_TENANT_ID;
if (!process.env.DATABASE_URL || !tenantId) throw new Error("DATABASE_URL and REPORT_TENANT_ID are required");
const sql = postgres(process.env.DATABASE_URL, { ssl: process.env.DATABASE_SSL === "false" ? false : "require" });
const events = await sql<{ name: string; count: number }[]>`
  SELECT name, count(*)::int AS count FROM analytics_events
  WHERE tenant_id = ${tenantId} AND created_at >= date_trunc('month', now())
  GROUP BY name ORDER BY name
`;
const productClicks = await sql<{ product_id: string; count: number }[]>`
  SELECT product_id, count(*)::int AS count FROM analytics_events
  WHERE tenant_id = ${tenantId} AND name = 'product_clicked' AND product_id IS NOT NULL AND created_at >= date_trunc('month', now())
  GROUP BY product_id ORDER BY count DESC, product_id
`;
const [orders] = await sql<{ orders: number; revenue_minor: number }[]>`
  SELECT count(*)::int AS orders, coalesce(sum(amount_minor), 0)::int AS revenue_minor
  FROM attributed_orders WHERE tenant_id = ${tenantId} AND created_at >= date_trunc('month', now())
`;
console.log("metric,value");
for (const event of events) console.log(`${event.name},${event.count}`);
console.log("product_clicks," + productClicks.reduce((total, item) => total + item.count, 0));
console.log("product_clicks_by_id");
for (const item of productClicks) console.log(item.product_id + "," + item.count);
console.log(`assisted_orders,${orders.orders}`);
console.log(`assisted_revenue_minor,${orders.revenue_minor}`);
console.log("attribution_note,Last EDITA interaction carried in the cart; assisted rather than causal");
await sql.end();
