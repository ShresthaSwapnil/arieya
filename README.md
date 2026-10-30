# Arieya

Arieya is conversational product discovery for online stores. A shopper describes what they want in everyday language; Arieya searches that store’s catalogue, recommends matching products, and links to the merchant’s own product pages. Jewellery is the first case study, with sample collections for other product categories.

## Product areas

- `/` — product site and shopper demo entry point.
- `/demo` — choose a sample collection.
- `/stylist` — full-page jewellery preview; use `/stylist?store=<public-key>` for a merchant catalogue.
- `/catalogue` — browser-only CSV, JSON, and XML converter.
- `/merchant` — merchant registration, sign-in, catalogue management, installation details, settings, and discovery analytics.

Every merchant store has its own `tenants` row and public key. Merchant users access stores through memberships; account APIs derive the active tenant from a hashed server-side session and apply that tenant ID to catalogue, analytics, and settings queries. One account can manage multiple stores, each with a separate catalogue, approved website origin, and dashboard.

## Local setup

~~~sh
npm install
cp .env.example .env.local # only if .env.local does not already exist
npm run db:setup
ARIEYA_ENABLE_DEMO_SEED=1 npm run db:seed-demo
npm run dev
~~~

Set `DATABASE_URL` to the pooled Neon connection and `DATABASE_URL_UNPOOLED` to its direct connection. `db:setup` applies the idempotent schema from `db/schema.sql`; use the direct URL for production schema changes. Without Postgres, the anonymous demo uses bounded process memory, while merchant accounts are unavailable.

Merchant catalogues accept CSV, JSON, and XML files up to 2 MB, with 1–500 products per import. Product title, price, availability, and a public HTTPS product-page URL are required. A merchant can copy a tenant-specific iframe snippet from `/merchant` to place the full-page advisor on any website.

For local testing, seed an isolated Aurora Jewel Studio merchant after setting up a development database. Sign in at `/merchant` with `demo@aurorajewel.test` and `AuroraPreview2026!`. The seed creates 32 sample products and preview analytics; it refuses to run in production and requires the explicit `ARIEYA_ENABLE_DEMO_SEED=1` flag. Never point the seed command at production.

## Production operations

Use separate Neon production and preview branches. Set the production deployment variables before the first deploy:

- `DATABASE_URL` — pooled application connection.
- `DATABASE_URL_UNPOOLED` — direct connection for `npm run db:setup` and schema changes.
- `DATABASE_SSL=true`.
- `RATE_LIMIT_SALT` — random value with at least 32 characters; keep it stable across instances.
- `CRON_SECRET` — random secret used by the daily retention job.
- `NEXT_PUBLIC_APP_ORIGIN` — canonical HTTPS origin, without a path.
- `GEMINI_API_KEY` and `GEMINI_MODEL` — optional intent extraction; recommendations still use deterministic catalogue matching if the model is not configured.
- `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_WEBHOOK_SECRET` — payment integration via Lemon Squeezy (Merchant of Record).
- `LEMONSQUEEZY_VARIANT_STARTER`, `LEMONSQUEEZY_VARIANT_GROWTH`, `LEMONSQUEEZY_VARIANT_PRO` — product variant IDs for Starter ($19), Growth ($49), and Pro ($129) monthly plans.

Before deploying a schema change, apply `npm run db:setup` against the intended Neon branch, then run `npm run ops:check` from an environment with production variables loaded. The checker reports missing configuration and required tables without printing secret values. `/api/health` is the readiness endpoint; it checks required tenant, analytics, rate-limit, and merchant-account tables. Vercel runs `/api/cron/retention` daily at 03:00 UTC to expire sessions and limits, remove expired shared edits, and delete analytics older than 13 months.

Preview deployments must use a non-production Neon branch. Do not run disposable smoke fixtures against production. Keep `.env.local` and all production secrets out of source control; only the variables in `.env.example` are safe to commit.

## Product limits in this pilot

- Account sessions use secure, HTTP-only cookies and scrypt password hashes. Email verification, account recovery, MFA, and team invitations are not configured yet; add those before opening open self-service onboarding.
- Subscriptions are managed via Lemon Squeezy with automated webhook provisioning, customer billing portal links, and tiered discovery quotas (Starter 1,500, Growth 6,000, Pro 25,000 sessions/mo).
- Dashboard analytics show conversations, product impressions, and product clicks over the last 30 days. Checkout and order attribution are not connected, so the dashboard does not report sales or revenue.
- Imported catalogues are merchant-owned data. Arieya does not update inventory or checkout; shoppers follow the merchant’s product URL.
- The demo collection keeps its anonymous three-question limit. Merchant collections use tenant-scoped request limits and do not share demo trial state.

## Useful commands

~~~sh
npm run build
npm run test
npm run audit
npm run ops:check
npm audit --omit=dev
npm run report
npm run retention
~~~
