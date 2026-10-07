import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import postgres from "postgres";
import { CATALOG } from "../lib/core.ts";

if (process.env.NODE_ENV === "production" || process.env.ARIEYA_ENABLE_DEMO_SEED !== "1") {
  throw new Error("Set ARIEYA_ENABLE_DEMO_SEED=1 to seed a non-production database.");
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

const email = "demo@aurorajewel.test";
const password = "AuroraPreview2026!";
const tenantId = "tenant_aurora_preview";
const publicKey = "aurora-jewel-preview";
const db = postgres(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL, {
  prepare: false,
  max: 1,
  ssl: process.env.DATABASE_SSL === "false" ? false : "require",
});
const scryptAsync = promisify(scrypt);
const salt = randomBytes(16).toString("hex");
const key = await scryptAsync(password, salt, 64) as Buffer;
const passwordHash = `${salt}:${key.toString("hex")}`;
const editions = ["Classic", "Petite", "Everyday", "Evening"];
const products = CATALOG.flatMap((product) => editions.map((edition, index) => {
  const id = `${product.id}-${edition.toLowerCase()}`;
  return {
    ...product,
    id,
    variantId: `aurora-${id}`,
    title: `${product.title} · ${edition} edit`,
    description: `${product.description} A ${edition.toLowerCase()} variation in this sample catalogue.`,
    priceMinor: Math.max(3000, product.priceMinor + (index - 1) * 1200),
    priority: Math.max(1, product.priority - index),
    attributes: { ...product.attributes, edition },
    url: `https://example.com/products/${id}`,
  };
}));

try {
  await db.begin(async (tx) => {
    const [user] = await tx<{ id: string }[]>`
      INSERT INTO merchant_users (id, name, email, password_hash)
      VALUES ('merchant_aurora_preview', 'Aurora Studio Team', ${email}, ${passwordHash})
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash
      RETURNING id`;
    await tx`
      INSERT INTO tenants (id, public_key, name, store_url, currency, approved_origins, status)
      VALUES (${tenantId}, ${publicKey}, 'Aurora Jewel Studio', 'https://aurora-jewel.example', 'GBP',
        ${tx.json(["http://localhost:3000", "http://127.0.0.1:3000"])}, 'preview')
      ON CONFLICT (id) DO UPDATE SET public_key = EXCLUDED.public_key, name = EXCLUDED.name,
        store_url = EXCLUDED.store_url, currency = EXCLUDED.currency,
        approved_origins = EXCLUDED.approved_origins, status = 'preview'`;
    await tx`INSERT INTO merchant_memberships (user_id, tenant_id)
      VALUES (${user.id}, ${tenantId}) ON CONFLICT DO NOTHING`;

    for (const product of products) {
      await tx`INSERT INTO catalog_products (tenant_id, external_id, data, source_updated_at)
        VALUES (${tenantId}, ${product.id}, ${tx.json(product)}, now())
        ON CONFLICT (tenant_id, external_id) DO UPDATE
        SET data = EXCLUDED.data, source_updated_at = EXCLUDED.source_updated_at, synced_at = now()`;
    }

    const events = [
      ...[1, 2, 3].map((index) => ({ id: `aurora-demo-conversation-${index}`, session: `aurora-shopper-${index}`, name: "conversation_started", product: null, daysAgo: index * 3 })),
      ...[
        [1, 0], [1, 1], [2, 0], [2, 2], [3, 3],
      ].map(([shopper, product]) => ({ id: `aurora-demo-impression-${shopper}-${product}`, session: `aurora-shopper-${shopper}`, name: "product_impression", product: products[product].id, daysAgo: shopper * 3 })),
      ...[
        [1, 0], [2, 2], [3, 3],
      ].map(([shopper, product]) => ({ id: `aurora-demo-click-${shopper}-${product}`, session: `aurora-shopper-${shopper}`, name: "product_clicked", product: products[product].id, daysAgo: shopper * 3 })),
    ];
    for (const event of events) {
      await tx`INSERT INTO analytics_events (event_id, tenant_id, anonymous_session_id, name, product_id, numeric_properties, created_at)
        VALUES (${event.id}, ${tenantId}, ${event.session}, ${event.name}, ${event.product}, ${tx.json({})}, ${new Date(Date.now() - event.daysAgo * 86_400_000)})
        ON CONFLICT (tenant_id, event_id) DO NOTHING`;
    }
  });
  console.log(`Demo merchant seeded (${products.length} sample products).`);
  console.log(`Sign in at /merchant with ${email} / ${password}`);
} finally {
  await db.end();
}
