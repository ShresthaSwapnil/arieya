import { createHash, randomBytes, randomUUID } from "node:crypto";
import postgres from "postgres";
import { CATALOG, type EventName, type Product } from "./core.ts";

export type ShareableEdit = {
  token: string;
  tenantId: string;
  creatorSessionId: string;
  intentSummary: string;
  productIds: string[];
  selectionReasons: Record<string, string>;
  createdAt: string;
  expiresAt: string;
  deletedAt: string | null;
  managementTokenHash: string;
  catalogSnapshot?: Product[];
};

type AnalyticsEvent = {
  eventId: string;
  tenantId: string;
  anonymousSessionId: string;
  name: EventName;
  productId?: string;
  editId?: string;
  matchStatus?: string;
  latencyMs?: number;
  modelPath?: string;
  numericProperties: Record<string, number>;
};

type Memory = {
  edits: Map<string, ShareableEdit>;
  reactions: { id: string; tenantId: string; editToken: string; reaction: string }[];
  events: AnalyticsEvent[];
  leads: { id: string; name: string; email: string; storeUrl: string }[];
  catalogs: Map<string, Product[]>;
  orders: { tenantId: string; orderId: string; amountMinor: number; currency: string; productIds: string[]; attributionToken: string; attributionSource: "session" | "share" }[];
};

const globalMemory = globalThis as typeof globalThis & { __editaMemory?: Memory };
// ponytail: process-local fallback is for demos; configure DATABASE_URL before multi-instance pilots.
const memory: Memory = (globalMemory.__editaMemory ??= {
  edits: new Map(),
  reactions: [] as Memory["reactions"],
  events: [] as Memory["events"],
  leads: [] as Memory["leads"],
  catalogs: new Map<string, Product[]>(),
  orders: [] as Memory["orders"],
});

export const sql = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL, {
      ssl: process.env.DATABASE_SSL === "false" ? false : "require",
      max: 2,
      prepare: false,
      connect_timeout: 10,
      idle_timeout: 20,
    })
  : null;

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export async function getCatalog(tenantId: string): Promise<Product[]> {
  const fallback = tenantId === "tenant_demo" ? CATALOG : [];
  if (!sql) return memory.catalogs.get(tenantId) || fallback;
  const rows = await sql<{ data: Product }[]>`
    SELECT data FROM catalog_products WHERE tenant_id = ${tenantId} ORDER BY external_id
  `;
  return rows.length ? rows.map((row) => row.data) : fallback;
}

export async function replaceCatalog(tenantId: string, products: Product[]) {
  if (!sql) {
    const previous = memory.catalogs.get(tenantId) || [];
    const currentIds = new Set(products.map((product) => product.id));
    memory.catalogs.set(tenantId, [...products, ...previous.filter((product) => !currentIds.has(product.id)).map((product) => ({ ...product, available: false }))]);
    return;
  }
  await sql.begin(async (transaction) => {
    await transaction`SELECT id FROM tenants WHERE id = ${tenantId} FOR UPDATE`;
    const existing = await transaction<{ external_id: string; data: Product }[]>`SELECT external_id, data FROM catalog_products WHERE tenant_id = ${tenantId}`;
    const currentIds = new Set(products.map((product) => product.id));
    for (const row of existing.filter((item) => !currentIds.has(item.external_id))) {
      await transaction`UPDATE catalog_products SET data = ${transaction.json({ ...row.data, available: false })}, synced_at = now() WHERE tenant_id = ${tenantId} AND external_id = ${row.external_id}`;
    }
    for (const product of products) {
      await transaction`
        INSERT INTO catalog_products (tenant_id, external_id, data, source_updated_at)
        VALUES (${tenantId}, ${product.id}, ${transaction.json(product)}, now())
        ON CONFLICT (tenant_id, external_id) DO UPDATE SET data = EXCLUDED.data, source_updated_at = EXCLUDED.source_updated_at, synced_at = now()
      `;
    }
  });
}

export async function overwriteCatalog(tenantId: string, products: Product[]) {
  if (!sql) {
    memory.catalogs.set(tenantId, products);
    return;
  }
  await sql.begin(async (transaction) => {
    await transaction`SELECT id FROM tenants WHERE id = ${tenantId} FOR UPDATE`;
    await transaction`DELETE FROM catalog_products WHERE tenant_id = ${tenantId}`;
    for (const product of products) {
      await transaction`
        INSERT INTO catalog_products (tenant_id, external_id, data, source_updated_at)
        VALUES (${tenantId}, ${product.id}, ${transaction.json(product)}, now())
      `;
    }
  });
}

export async function clearCatalog(tenantId: string): Promise<void> {
  if (!sql) {
    memory.catalogs.set(tenantId, []);
    return;
  }
  await sql`DELETE FROM catalog_products WHERE tenant_id = ${tenantId}`;
}

export async function deleteProduct(tenantId: string, productId: string): Promise<boolean> {
  if (!sql) {
    const catalog = memory.catalogs.get(tenantId) || [];
    const filtered = catalog.filter((p) => p.id !== productId);
    if (filtered.length === catalog.length) return false;
    memory.catalogs.set(tenantId, filtered);
    return true;
  }
  const result = await sql`DELETE FROM catalog_products WHERE tenant_id = ${tenantId} AND external_id = ${productId} RETURNING external_id`;
  return result.length > 0;
}

export async function updateProduct(tenantId: string, productId: string, updates: Partial<Product>): Promise<Product | null> {
  if (!sql) {
    const catalog = memory.catalogs.get(tenantId) || [];
    const index = catalog.findIndex((p) => p.id === productId);
    if (index === -1) return null;
    catalog[index] = { ...catalog[index], ...updates, id: productId };
    memory.catalogs.set(tenantId, catalog);
    return catalog[index];
  }
  const [row] = await sql<{ data: Product }[]>`SELECT data FROM catalog_products WHERE tenant_id = ${tenantId} AND external_id = ${productId}`;
  if (!row) return null;
  const updated = { ...row.data, ...updates, id: productId };
  await sql`UPDATE catalog_products SET data = ${sql.json(updated)}, synced_at = now() WHERE tenant_id = ${tenantId} AND external_id = ${productId}`;
  return updated;
}

export async function createEdit(input: {
  tenantId: string;
  creatorSessionId: string;
  intentSummary: string;
  productIds: string[];
  selectionReasons: Record<string, string>;
  catalogSnapshot?: Product[];
}) {
  const token = randomBytes(16).toString("base64url");
  const managementToken = randomBytes(24).toString("base64url");
  const edit: ShareableEdit = {
    token,
    tenantId: input.tenantId,
    creatorSessionId: input.creatorSessionId,
    intentSummary: input.intentSummary,
    productIds: input.productIds,
    selectionReasons: input.selectionReasons,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 864e5).toISOString(),
    deletedAt: null,
    managementTokenHash: hash(managementToken),
    catalogSnapshot: input.catalogSnapshot,
  };
  if (sql) {
    await sql`
      INSERT INTO shareable_edits (
        token, management_token_hash, tenant_id, creator_session_id, intent_summary,
        product_ids, selection_reasons, created_at, expires_at, catalog_snapshot
      ) VALUES (
        ${edit.token}, ${edit.managementTokenHash}, ${edit.tenantId}, ${edit.creatorSessionId},
        ${edit.intentSummary}, ${sql.json(edit.productIds)}, ${sql.json(edit.selectionReasons)},
        ${edit.createdAt}, ${edit.expiresAt}, ${edit.catalogSnapshot ? sql.json(edit.catalogSnapshot) : null}
      )
    `;
  } else {
    memory.edits.set(token, edit);
  }
  return { edit, managementToken };
}

export async function getEdit(token: string): Promise<ShareableEdit | null> {
  if (token === "sample-edit") {
    return {
      token,
      tenantId: "tenant_demo",
      creatorSessionId: "sample-session",
      intentSummary: "An anniversary gift under £120—warm, elegant and not flashy.",
      productIds: ["solace-amber-pendant", "halo-champagne-ring", "pearl-line-bracelet"],
      selectionReasons: {
        "solace-amber-pendant": "Warm and refined, with a quiet anniversary feel.",
        "halo-champagne-ring": "Sculptural without reading as flashy.",
        "pearl-line-bracelet": "The most understated choice in the edit.",
      },
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 864e5).toISOString(),
      deletedAt: null,
      managementTokenHash: "",
    };
  }
  if (!sql) return memory.edits.get(token) || null;
  try {
    const [row] = await sql<{
      token: string;
      management_token_hash: string;
      tenant_id: string;
      creator_session_id: string;
      intent_summary: string;
      product_ids: string[];
      selection_reasons: Record<string, string>;
      created_at: Date;
      expires_at: Date;
      deleted_at: Date | null;
      catalog_snapshot: Product[] | null;
    }[]>`SELECT * FROM shareable_edits WHERE token = ${token} LIMIT 1`;
    return row
      ? {
          token: row.token,
          catalogSnapshot: row.catalog_snapshot || undefined,
          managementTokenHash: row.management_token_hash,
          tenantId: row.tenant_id,
          creatorSessionId: row.creator_session_id,
          intentSummary: row.intent_summary,
          productIds: row.product_ids,
          selectionReasons: row.selection_reasons,
          createdAt: row.created_at.toISOString(),
          expiresAt: row.expires_at.toISOString(),
          deletedAt: row.deleted_at?.toISOString() || null,
        }
      : (memory.edits.get(token) || null);
  } catch {
    return memory.edits.get(token) || null;
  }
}

export async function deleteEdit(token: string, managementToken: string) {
  const edit = await getEdit(token);
  if (!edit || edit.managementTokenHash !== hash(managementToken)) return false;
  const deletedAt = new Date().toISOString();
  if (sql) await sql`UPDATE shareable_edits SET deleted_at = ${deletedAt} WHERE token = ${token}`;
  else memory.edits.set(token, { ...edit, deletedAt });
  return true;
}

export async function addReaction(tenantId: string, editToken: string, reaction: string) {
  if (editToken === "sample-edit") return;
  const id = randomUUID();
  if (sql) {
    await sql`INSERT INTO edit_reactions (id, tenant_id, edit_token, reaction) VALUES (${id}, ${tenantId}, ${editToken}, ${reaction})`;
  } else {
    memory.reactions.push({ id, tenantId, editToken, reaction });
  }
}

export async function recordEvent(event: AnalyticsEvent) {
  if (sql) {
    await sql`
      INSERT INTO analytics_events (
        event_id, tenant_id, anonymous_session_id, name, product_id, edit_id,
        match_status, latency_ms, model_path, numeric_properties
      ) VALUES (
        ${event.eventId}, ${event.tenantId}, ${event.anonymousSessionId}, ${event.name},
        ${event.productId || null}, ${event.editId || null}, ${event.matchStatus || null},
        ${event.latencyMs ?? null}, ${event.modelPath || null}, ${sql.json(event.numericProperties)}
      ) ON CONFLICT DO NOTHING
    `;
  } else if (!memory.events.some((item) => item.eventId === event.eventId && item.tenantId === event.tenantId)) {
    memory.events.push(event);
  }
}

export async function createLead(name: string, email: string, storeUrl: string) {
  const id = randomUUID();
  if (sql) await sql`INSERT INTO pilot_leads (id, name, email, store_url) VALUES (${id}, ${name}, ${email}, ${storeUrl})`;
  else memory.leads.push({ id, name, email, storeUrl });
  return id;
}

export async function recordAttributedOrder(order: {
  tenantId: string;
  orderId: string;
  amountMinor: number;
  currency: string;
  productIds: string[];
  attributionToken: string;
  attributionSource: "session" | "share";
}) {
  if (sql) {
    await sql`
      INSERT INTO attributed_orders (
        tenant_id, order_id, amount_minor, currency, product_ids, attribution_token, attribution_source
      ) VALUES (
        ${order.tenantId}, ${order.orderId}, ${order.amountMinor}, ${order.currency},
        ${sql.json(order.productIds)}, ${order.attributionToken}, ${order.attributionSource}
      ) ON CONFLICT DO NOTHING
    `;
  } else if (!memory.orders.some((item) => item.tenantId === order.tenantId && item.orderId === order.orderId)) {
    memory.orders.push(order);
  }
}

export async function scheduleTenantDeletion(tenantId: string) {
  if (sql) await sql`UPDATE tenants SET status = 'uninstalled', deletion_scheduled_at = now() + interval '30 days' WHERE id = ${tenantId}`;
}

export async function deleteTenant(tenantId: string) {
  if (sql) await sql`DELETE FROM tenants WHERE id = ${tenantId}`;
  memory.catalogs.delete(tenantId);
  for (const [token, edit] of memory.edits) if (edit.tenantId === tenantId) memory.edits.delete(token);
  memory.events = memory.events.filter((event) => event.tenantId !== tenantId);
  memory.reactions = memory.reactions.filter((reaction) => reaction.tenantId !== tenantId);
  memory.orders = memory.orders.filter((order) => order.tenantId !== tenantId);
}
