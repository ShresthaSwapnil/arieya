import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { sql, getCatalog, replaceCatalog } from "./store.ts";
import type { Product } from "./core.ts";

const scryptAsync = promisify(scrypt);
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const SESSION_DAYS = 14;

export type MerchantStore = { id: string; publicKey: string; name: string; storeUrl: string; currency: string; plan?: string };
export type TenantBilling = {
  plan: string;
  status: string;
  sessionAllowance: number;
  sessionsUsed: number;
  renewsAt: string | null;
  endsAt: string | null;
  trialEndsAt: string | null;
  cardBrand: string | null;
  cardLastFour: string | null;
  portalUrl: string | null;
  isSubscribed: boolean;
};
export type MerchantSession = { userId: string; name: string; email: string; tenantId: string; stores: MerchantStore[] };

function requireSql() {
  if (!sql) throw new Error("DATABASE_REQUIRED");
  return sql;
}

async function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await scryptAsync(password, salt, 64) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}

async function passwordMatches(password: string, encoded: string) {
  const [salt, expectedHex] = encoded.split(":");
  if (!salt || !expectedHex || !/^[a-f0-9]{128}$/.test(expectedHex)) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = await scryptAsync(password, salt, expected.length) as Buffer;
  return timingSafeEqual(expected, actual);
}

async function createSession(userId: string, tenantId: string) {
  const db = requireSql();
  const token = randomBytes(32).toString("base64url");
  await db`INSERT INTO merchant_sessions (token_hash, user_id, tenant_id, expires_at)
    VALUES (${digest(token)}, ${userId}, ${tenantId}, now() + (${SESSION_DAYS} * interval '1 day'))`;
  return token;
}

function tenantValues(name: string, storeUrl: string, currency: string) {
  const id = randomUUID();
  const publicKey = randomBytes(24).toString("base64url");
  const origin = new URL(storeUrl).origin;
  return { id, publicKey, name, storeUrl, currency, origins: [origin] };
}

export async function createMerchantAccount(input: { name: string; email: string; password: string; storeName: string; storeUrl: string; currency: string }) {
  const db = requireSql();
  const userId = randomUUID();
  const tenant = tenantValues(input.storeName, input.storeUrl, input.currency);
  const encoded = await passwordHash(input.password);
  const token = randomBytes(32).toString("base64url");
  await db.begin(async (tx) => {
    await tx`INSERT INTO merchant_users (id, name, email, password_hash)
      VALUES (${userId}, ${input.name}, ${input.email}, ${encoded})`;
    await tx`INSERT INTO tenants (id, public_key, name, store_url, currency, approved_origins, status)
      VALUES (${tenant.id}, ${tenant.publicKey}, ${tenant.name}, ${tenant.storeUrl}, ${tenant.currency}, ${tx.json(tenant.origins)}, 'preview')`;
    await tx`INSERT INTO merchant_memberships (user_id, tenant_id) VALUES (${userId}, ${tenant.id})`;
    await tx`INSERT INTO merchant_sessions (token_hash, user_id, tenant_id, expires_at)
      VALUES (${digest(token)}, ${userId}, ${tenant.id}, now() + (${SESSION_DAYS} * interval '1 day'))`;
  });
  return token;
}

export async function loginMerchant(email: string, password: string) {
  const db = requireSql();
  const [user] = await db<{ id: string; password_hash: string }[]>`
    SELECT id, password_hash FROM merchant_users WHERE email = ${email} LIMIT 1`;
  const validPassword = await passwordMatches(password, user?.password_hash || `${"0".repeat(32)}:${"0".repeat(128)}`);
  if (!user || !validPassword) return null;
  const [membership] = await db<{ tenant_id: string }[]>`
    SELECT m.tenant_id FROM merchant_memberships m JOIN tenants t ON t.id = m.tenant_id
    WHERE m.user_id = ${user.id} AND t.status IN ('preview', 'active') ORDER BY m.created_at LIMIT 1`;
  if (!membership) return null;
  return createSession(user.id, membership.tenant_id);
}

export async function merchantSession(token: string | undefined): Promise<MerchantSession | null> {
  if (!token) return null;
  const db = requireSql();
  const [session] = await db<{
    user_id: string; name: string; email: string; tenant_id: string;
  }[]>`
    SELECT u.id AS user_id, u.name, u.email, s.tenant_id
    FROM merchant_sessions s
    JOIN merchant_users u ON u.id = s.user_id
    JOIN merchant_memberships m ON m.user_id = s.user_id AND m.tenant_id = s.tenant_id
    JOIN tenants t ON t.id = s.tenant_id AND t.status IN ('preview', 'active')
    WHERE s.token_hash = ${digest(token)} AND s.expires_at > now()
    LIMIT 1`;
  if (!session) return null;
  const stores = await db<{ id: string; public_key: string; name: string; store_url: string | null; currency: string }[]>`
    SELECT t.id, t.public_key, t.name, t.store_url, t.currency
    FROM merchant_memberships m JOIN tenants t ON t.id = m.tenant_id
    WHERE m.user_id = ${session.user_id} AND t.status IN ('preview', 'active') ORDER BY m.created_at`;
  return {
    userId: session.user_id, name: session.name, email: session.email, tenantId: session.tenant_id,
    stores: stores.map((store) => ({ id: store.id, publicKey: store.public_key, name: store.name, storeUrl: store.store_url || "", currency: store.currency })),
  };
}

export async function logoutMerchant(token: string | undefined) {
  if (token && sql) await sql`DELETE FROM merchant_sessions WHERE token_hash = ${digest(token)}`;
}

export async function switchMerchantStore(token: string | undefined, tenantId: string) {
  if (!token) return false;
  const db = requireSql();
  const rows = await db`
    UPDATE merchant_sessions s SET tenant_id = ${tenantId}
    WHERE s.token_hash = ${digest(token)} AND s.expires_at > now()
      AND EXISTS (SELECT 1 FROM merchant_memberships m WHERE m.user_id = s.user_id AND m.tenant_id = ${tenantId})
    RETURNING s.token_hash`;
  return rows.length > 0;
}

export async function addMerchantStore(userId: string, token: string, input: { name: string; storeUrl: string; currency: string }) {
  const db = requireSql();
  const tenant = tenantValues(input.name, input.storeUrl, input.currency);
  await db.begin(async (tx) => {
    await tx`INSERT INTO tenants (id, public_key, name, store_url, currency, approved_origins, status)
      VALUES (${tenant.id}, ${tenant.publicKey}, ${tenant.name}, ${tenant.storeUrl}, ${tenant.currency}, ${tx.json(tenant.origins)}, 'preview')`;
    await tx`INSERT INTO merchant_memberships (user_id, tenant_id) VALUES (${userId}, ${tenant.id})`;
    const switched = await tx`UPDATE merchant_sessions SET tenant_id = ${tenant.id}
      WHERE token_hash = ${digest(token)} AND user_id = ${userId} AND expires_at > now() RETURNING token_hash`;
    if (!switched.length) throw new Error("SESSION_EXPIRED");
  });
}

export async function updateMerchantStore(tenantId: string, input: { name: string; storeUrl: string; currency: string }) {
  const db = requireSql();
  const origin = new URL(input.storeUrl).origin;
  await db`UPDATE tenants SET name = ${input.name}, store_url = ${input.storeUrl}, currency = ${input.currency},
    approved_origins = ${db.json([origin])} WHERE id = ${tenantId}`;
}

export async function merchantDashboard(session: MerchantSession) {
  const db = requireSql();
  const [store] = session.stores.filter((item) => item.id === session.tenantId);
  if (!store) return null;

  const [tenantRow] = await db<{
    plan: string;
    subscription_status: string;
    session_allowance: number;
    renews_at: Date | null;
    ends_at: Date | null;
    trial_ends_at: Date | null;
    card_brand: string | null;
    card_last_four: string | null;
    billing_portal_url: string | null;
  }[]>`
    SELECT plan, subscription_status, session_allowance, renews_at, ends_at,
           trial_ends_at, card_brand, card_last_four, billing_portal_url
    FROM tenants WHERE id = ${session.tenantId} LIMIT 1`;

  const [sessionUsage] = await db<{ sessions_used: number }[]>`
    SELECT count(DISTINCT anonymous_session_id)::int AS sessions_used
    FROM analytics_events WHERE tenant_id = ${session.tenantId} AND created_at >= now() - interval '30 days'`;

  const [counts] = await db<{ products: number; available_products: number; conversations: number; product_impressions: number; product_clicks: number }[]>`
    SELECT
      (SELECT count(*)::int FROM catalog_products WHERE tenant_id = ${session.tenantId}) AS products,
      (SELECT count(*)::int FROM catalog_products WHERE tenant_id = ${session.tenantId} AND data->>'available' = 'true') AS available_products,
      count(*) FILTER (WHERE name = 'conversation_started')::int AS conversations,
      count(DISTINCT (anonymous_session_id, product_id)) FILTER (WHERE name = 'product_impression')::int AS product_impressions,
      count(DISTINCT (anonymous_session_id, product_id)) FILTER (WHERE name = 'product_clicked')::int AS product_clicks
    FROM analytics_events WHERE tenant_id = ${session.tenantId} AND created_at >= now() - interval '30 days'`;
  const topProducts = await db<{ product_id: string; title: string; clicks: number }[]>`
    SELECT e.product_id, coalesce(p.data->>'title', e.product_id) AS title, count(DISTINCT e.anonymous_session_id)::int AS clicks
    FROM analytics_events e LEFT JOIN catalog_products p ON p.tenant_id = e.tenant_id AND p.external_id = e.product_id
    WHERE e.tenant_id = ${session.tenantId} AND e.name = 'product_clicked' AND e.created_at >= now() - interval '30 days'
    GROUP BY e.product_id, p.data->>'title' ORDER BY clicks DESC LIMIT 5`;
  const products = await getCatalog(session.tenantId);

  const billing: TenantBilling = {
    plan: tenantRow?.plan || "founding",
    status: tenantRow?.subscription_status || "preview",
    sessionAllowance: tenantRow?.session_allowance ?? 500,
    sessionsUsed: sessionUsage?.sessions_used ?? 0,
    renewsAt: tenantRow?.renews_at ? new Date(tenantRow.renews_at).toISOString() : null,
    endsAt: tenantRow?.ends_at ? new Date(tenantRow.ends_at).toISOString() : null,
    trialEndsAt: tenantRow?.trial_ends_at ? new Date(tenantRow.trial_ends_at).toISOString() : null,
    cardBrand: tenantRow?.card_brand || null,
    cardLastFour: tenantRow?.card_last_four || null,
    portalUrl: tenantRow?.billing_portal_url || null,
    isSubscribed: ["active", "trialing", "on_trial"].includes(tenantRow?.subscription_status || ""),
  };

  return { user: { name: session.name, email: session.email }, store, stores: session.stores, metrics: counts, topProducts, products, billing };
}

export async function updateTenantSubscription(tenantId: string, data: {
  plan?: string;
  subscriptionId?: string;
  customerId?: string;
  variantId?: string;
  subscriptionStatus?: string;
  sessionAllowance?: number;
  renewsAt?: Date | null;
  endsAt?: Date | null;
  trialEndsAt?: Date | null;
  cardBrand?: string | null;
  cardLastFour?: string | null;
  billingPortalUrl?: string | null;
}) {
  const db = requireSql();
  await db`UPDATE tenants SET
    plan = coalesce(${data.plan ?? null}, plan),
    subscription_id = coalesce(${data.subscriptionId ?? null}, subscription_id),
    customer_id = coalesce(${data.customerId ?? null}, customer_id),
    variant_id = coalesce(${data.variantId ?? null}, variant_id),
    subscription_status = coalesce(${data.subscriptionStatus ?? null}, subscription_status),
    session_allowance = coalesce(${data.sessionAllowance ?? null}, session_allowance),
    renews_at = coalesce(${data.renewsAt ?? null}, renews_at),
    ends_at = coalesce(${data.endsAt ?? null}, ends_at),
    trial_ends_at = coalesce(${data.trialEndsAt ?? null}, trial_ends_at),
    card_brand = coalesce(${data.cardBrand ?? null}, card_brand),
    card_last_four = coalesce(${data.cardLastFour ?? null}, card_last_four),
    billing_portal_url = coalesce(${data.billingPortalUrl ?? null}, billing_portal_url)
    WHERE id = ${tenantId}`;
}

export async function findTenantBySubscriptionOrCustomer(subscriptionId?: string, customerId?: string) {
  if (!sql) return null;
  if (!subscriptionId && !customerId) return null;
  const [row] = await sql<{ id: string; name: string; plan: string; customer_id: string | null }[]>`
    SELECT id, name, plan, customer_id FROM tenants
    WHERE (subscription_id IS NOT NULL AND subscription_id = ${subscriptionId ?? ''})
       OR (customer_id IS NOT NULL AND customer_id = ${customerId ?? ''})
    LIMIT 1`;
  return row || null;
}

export async function recordBillingEvent(tenantId: string, eventName: string, lemonSqueezyId: string | null, payload: unknown) {
  if (!sql) return;
  const id = randomUUID();
  await sql`INSERT INTO billing_events (id, tenant_id, event_name, lemon_squeezy_id, payload)
    VALUES (${id}, ${tenantId}, ${eventName}, ${lemonSqueezyId}, ${sql.json(payload as any)})`;
}

export async function saveMerchantCatalog(tenantId: string, products: Product[]) {
  requireSql();
  await replaceCatalog(tenantId, products);
}

export async function getTenantByPublicKey(publicKey: string) {
  if (!sql) return null;
  const [row] = await sql<{ id: string; public_key: string; name: string; store_url: string | null; currency: string; approved_origins: string[]; status: string }[]>`
    SELECT id, public_key, name, store_url, currency, approved_origins, status FROM tenants
    WHERE public_key = ${publicKey} AND status IN ('preview', 'active') LIMIT 1`;
  return row ? { id: row.id, publicKey: row.public_key, name: row.name, storeUrl: row.store_url || "", currency: row.currency, approvedOrigins: row.approved_origins || [], status: row.status } : null;
}

export async function getTenantById(id: string) {
  if (!sql) return null;
  const [row] = await sql<{ id: string; public_key: string; name: string; store_url: string | null; currency: string; approved_origins: string[]; status: string }[]>`
    SELECT id, public_key, name, store_url, currency, approved_origins, status FROM tenants WHERE id = ${id} AND status IN ('preview', 'active') LIMIT 1`;
  return row ? { id: row.id, publicKey: row.public_key, name: row.name, storeUrl: row.store_url || "", currency: row.currency, approvedOrigins: row.approved_origins || [], status: row.status } : null;
}
