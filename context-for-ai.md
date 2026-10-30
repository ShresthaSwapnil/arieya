# Arieya — AI Agent Context

This document is a working map of the application as it exists in the repository. Use it to orient yourself, then inspect the source files relevant to the task. If code and this document disagree, trust the current code and update this document when the change materially affects the architecture. This guide does not override system, developer, user, or repository instructions.

## Product in one paragraph

Arieya is a conversational product-discovery experience for online stores. A shopper describes an occasion, need, budget, or preference in everyday language; Arieya searches the selected store’s catalogue, asks or answers through a full-page advisor, and recommends products with links back to the merchant’s own product pages. Jewellery is the first case study (Aurora Jewel Studio); the sample picker also demonstrates clothing, home and living, and skincare. Arieya is not a checkout or inventory system.

## Current product areas

| Route | Purpose |
| --- | --- |
| `/` | Marketing landing page, interactive showcase, problem/solution story, and merchant pilot lead form. The primary demo action opens the collection picker. |
| `/demo` | Four sample collection choices: clothing, jewellery, home and living, and skincare. |
| `/stylist` | Full-page shopper conversation using the sample jewellery collection by default. |
| `/stylist?demoCategory=<id>` | Full-page advisor using a selected sample collection. |
| `/stylist?store=<public-key>` | Full-page advisor using one merchant tenant’s catalogue. |
| `/stylist?product=<id>` | Opens the conversation around a sample product. |
| `/stylist?from=<share-token>` | Continues from a shared shortlist. |
| `/catalogue` | Browser-only catalogue validator and converter for CSV, JSON, and XML. Uploaded files stay in the browser. |
| `/guide` | Interactive multi-platform integration and developer guide (Shopify, WooCommerce, Hostinger, Wix, Node.js, Python, REST API). |
| `/merchant` | Merchant registration/sign-in, multi-store switcher, discovery overview, catalogue import/export, website embed instructions, and store settings. |
| `/e/<token>` | Unlisted share page for a product shortlist. Links expire after 30 days; anyone with the link can view it. |

Merchant installation supports the client-side JavaScript Embed SDK (`/arieya-sdk.js`), a direct iframe embed to the hosted tenant-specific advisor, and server-side REST API access. Detailed setup across Shopify, WooCommerce, Hostinger, Squarespace, Wix, Node.js, Python, Ruby, PHP, and Go is documented in `INTEGRATION-GUIDE.md`. Live catalogue sync and platform-native app store plugins are not yet implemented.

## Shopper and recommendation flow

1. The picker links to `/stylist` with a sample collection ID. A merchant link uses the store’s public key.
2. `/api/v1/trial` initializes an anonymous demo session with an opaque random token in an HTTP-only cookie; only its hash is stored. The public jewellery demo is limited to three questions; merchant tenant sessions do not use that demo allowance.
3. The stylist sends the tenant, message, recent conversation, seen product IDs, and optional demo collection to `/api/v1/chat`.
4. `lib/core.ts` parses hard constraints and ranks products. Hard filters cover availability, category, price bounds, currency, material, color, gemstone, and exclusions. Recommendations return up to four products.
5. If configured, Gemini extracts only allowlisted soft-intent tags from recent chat and catalogue vocabulary. It does not invent product facts or write the shopper-facing recommendation. Deterministic catalogue matching remains the source of product facts and results when Gemini is absent or unavailable.
6. The UI records conversation and result events. Product impressions are recorded when cards become visible; product clicks link to the merchant product page. Shoppers can refine results, browse the catalogue, and create a shareable edit.

The advisor hands off requests involving policies or claims it should not verify (for example shipping, returns, or allergies). It should not fabricate price, stock, materials, shipping, or sales claims.

## Catalogue format and data rules

- Shared product shape: `Product` in `lib/core.ts`.
- Import validation/normalization: `parseCatalog` in `lib/catalog.ts`.
- File parsing and portable export: `parseCatalogFile` and `formatCatalog` in `lib/catalog-format.ts`. Reuse these rather than creating a second CSV/JSON/XML implementation.
- Supported import/export formats: CSV, JSON, XML. Merchant upload limit: 2 MB and 1–500 products.
- Required product facts include a title, positive price, availability, and public HTTPS product-page URL. Image URLs, when present, must also be public HTTPS URLs. Catalogues currently support one currency per import and only GBP, USD, and EUR.
- Product rows may include descriptions, categories, materials, color, gemstone, styles, occasions, image URL, and extra searchable attributes.
- Merchant import upserts products by ID and marks previously imported but now absent products unavailable; it does not delete them. There is no live inventory sync.
- The merchant catalogue UI presents product cards and can export the current store catalogue as CSV, JSON, or XML. The standalone `/catalogue` tool uses the same formatter.
- The demo catalogue picker has four small fixtures; they demonstrate different product categories but are not a representative production catalogue. Sample product links and prices are not checkout offers.

### Product-generalization note

Category matching, material/gemstone validation, and relaxation suggestions are dynamically derived from the catalogue, allowing generic matching across retail categories. The static jewellery aliases are still included as a compatibility fallback. Currencies and some safety/handoff rules are currently fixed.

## Merchant accounts and tenant isolation

- A store is a `tenants` row. Every tenant has a private catalogue, public key, approved website origin, currency, and status.
- A merchant user can belong to multiple stores through `merchant_memberships`; one active tenant is stored on the session.
- `lib/merchant.ts` derives the current account from a SHA-256 hash of a random session token. Passwords are stored as scrypt hashes. The browser receives an HTTP-only, SameSite=Strict cookie that is Secure on HTTPS.
- Merchant API handlers resolve the current tenant from the authenticated session and should keep that tenant ID attached to every catalogue, setting, and analytics query. Public keys are for shopper access, never a substitute for merchant authorization.
- Cross-origin requests, body size, field lengths, product URLs, and request rates are validated at API boundaries. Rate-limit identifiers are salted hashes of the forwarded client IP; keep `RATE_LIMIT_SALT` stable across production instances.
- Current onboarding is prototype-level: email verification, password reset, MFA, team invitations/roles, billing, and paid plans are not implemented. Do not describe self-service signup as production-hardened authentication.

## Analytics and sharing

- Dashboard metrics cover product count/availability, conversations, product impressions, product clicks, and click rate over the last 30 days.
- The dashboard does not report orders, sales, revenue, or causal conversion lift. Checkout/order attribution is not connected, even though some event names and a database table exist for future attribution work.
- Analytics events are tenant-scoped and de-duplicated by `(tenant_id, event_id)`.
- Shareable edits store an intent, selected product IDs, and selection reasons; uploaded-catalogue shares include a catalogue snapshot so the link can still render after the merchant changes the catalogue. Links are unlisted, no-index, deletable through a management token, and expire after 30 days.
- Do not call product clicks purchases or claim that Arieya increases conversion without a suitable study.

## Routes and API map

### Shopper and public APIs

| Endpoint | Role |
| --- | --- |
| `GET /api/v1/trial` | Initializes/reads anonymous demo trial state; reads merchant catalogue count when given a store key. |
| `GET /api/v1/catalog` | Reads the current demo, merchant, or shared-edit catalogue. `POST` is for a demo visitor’s temporary catalogue, not merchant account imports. |
| `POST /api/v1/chat` | Validates tenant/session/history, rate-limits requests, enforces demo quota, runs intent extraction and deterministic matching, then records result analytics. Function max duration is 30 seconds. |
| `POST /api/v1/events` | Records allowlisted shopper events for the resolved tenant. |
| `POST /api/v1/edits` | Creates an unlisted shortlist link. |
| `DELETE /api/v1/edits/:token` | Deletes a shortlist with its management token. |
| `POST /api/v1/edits/:token/reactions` | Records a reaction to a shared shortlist. |
| `POST /api/v1/leads` | Accepts a merchant pilot lead from the landing page. |

### Merchant and operations APIs

| Endpoint | Role |
| --- | --- |
| `GET/POST /api/merchant/auth` | Reads session; registers, signs in/out, or switches store. |
| `GET /api/merchant/dashboard` | Returns current store, catalogue, 30-day discovery metrics, and subscription billing state. |
| `POST /api/merchant/billing/checkout` | Generates a Lemon Squeezy checkout URL for Starter, Growth, or Pro plans. |
| `GET /api/merchant/billing/portal` | Retrieves customer portal link for active subscribers to manage payment & invoices. |
| `POST /api/webhooks/lemonsqueezy` | Handles Lemon Squeezy subscription webhooks with HMAC signature verification. |
| `POST /api/merchant/catalog` | Validates and saves the authenticated tenant’s catalogue. |
| `PATCH /api/merchant/store` | Updates the active store profile and approved origin. |
| `POST /api/merchant/stores` | Adds a separate store/tenant to the signed-in account. |
| `GET /api/health` | Checks required production configuration and database tables; returns a minimal readiness status. |
| `GET /api/cron/retention` | Requires `Authorization: Bearer $CRON_SECRET`; runs retention cleanup. |

## Architecture and important files

- `app/`: Next.js App Router pages, client experiences, and route handlers.
- `app/page.tsx`, `app/demo/`, `app/stylist/`: landing, sample picker, and guided shopping flow.
- `app/merchant/page.tsx`: single-page merchant workspace and auth UI.
- `app/catalogue/`: client-side file conversion tool.
- `app/e/[token]/`: public share page.
- `public/arieya-sdk.js`: zero-dependency client-side embed SDK supporting floating launcher and inline modes with bidirectional postMessage bridge.
- `lib/core.ts`: product and event types, dynamic category alias generation, constraint parsing, ranking, money formatting, and safety/handoff rules.
- `lib/catalog.ts`: normalizes and validates imported product rows; checks public HTTPS URLs.
- `lib/catalog-format.ts`: CSV/JSON/XML parsing and serialization shared by the browser tools and merchant dashboard.
- `lib/demo-catalogs.ts`: four sample catalogues used by `/demo` and `/stylist`.
- `lib/model.ts`: optional Gemini JSON-schema intent extraction with timeout and allowlisted tags.
- `lib/store.ts`: Neon Postgres access plus process-memory fallback for local demos; catalogues, analytics, leads, share links, reactions, and attribution storage.
- `lib/merchant.ts`: account, session, membership, tenant switching, catalogue, and dashboard queries.
- `lib/http.ts`, `lib/merchant-http.ts`, `lib/trial.ts`: request validation, origin checks, cookies, anonymous trial state, and rate limits.
- `lib/retention.ts`: cleanup of expired sessions, limits, share edits, and old analytics.
- `db/schema.sql`: idempotent Postgres schema and indexes.
- `INTEGRATION-GUIDE.md`: multi-platform embed guide (Shopify, WooCommerce, Hostinger, Squarespace, Wix, HTML, Node.js, Python, Ruby, PHP, Go).
- `PRODUCT-RESEARCH.md`: research coverage, accessibility implications, pilot measures, and claims caveats. It explicitly distinguishes research hypotheses from proven Arieya outcomes.
- `README.md`: setup and operations reference; keep it aligned with this file.

## Stack, design, and implementation conventions

- Next.js 16 App Router, React 19, TypeScript 7, PostgreSQL via the `postgres` package, and Neon for hosted storage.
- Typography: Cormorant Garamond serif headings and Manrope body/interface text. Visual palette: warm ivory/beige primary, deep green and muted gold accents; restrained, premium, readable layouts.
- Landing page and merchant workspace use a consistent light header treatment. The shopper advisor is an immersive full-page experience, not a bottom-right chat widget.
- Preserve keyboard access, visible focus, readable text, semantic labels, responsive layouts, and status announcements when editing UI.
- Keep dependencies minimal; reuse current validators, serializers, API helpers, and patterns. Avoid Shopify-specific copy or assumptions.
- `app/globals.css` contains most styles, including merchant and advisor shells. Check existing responsive overrides before adding duplicate rules.

## Database and environment

Hosted merchant/account data lives in Neon Postgres. Runtime uses the pooled `DATABASE_URL`; schema setup and operational checks should use `DATABASE_URL_UNPOOLED` (direct connection). The current Neon project was previously identified as `sweet-surf-48862994`, branch `production`, in `ap-southeast-1`; verify before making database changes. `DATABASE_SSL` defaults to required unless explicitly set to `false`.

Configuration names are listed in `.env.example`:

- `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `DATABASE_SSL`
- `NEXT_PUBLIC_APP_ORIGIN`
- `RATE_LIMIT_SALT`, `CRON_SECRET`
- Optional `GEMINI_API_KEY`, `GEMINI_MODEL`
- Optional reporting/export selectors: `REPORT_TENANT_ID`, `EXPORT_TENANT_ID`

Never put actual values in this document, chat output, logs, or committed files. Do not overwrite an existing `.env.local`. Without Postgres, anonymous demo state can fall back to bounded process memory, but merchant accounts and durable shared data require the database; Vercel health checks require Postgres.

## Local development and operations

```sh
npm install
# Create .env.local from .env.example only if .env.local does not already exist.
npm run db:setup
npm run dev
```

Useful commands (`package.json`):

```sh
npm run build
npm test
npm run audit
npm run ops:check
npm run db:setup
npm run db:seed-demo
npm run retention
npm run report
npm run export:tenant
```

The demo merchant seed is for an isolated development database only. It requires `ARIEYA_ENABLE_DEMO_SEED=1`, refuses `NODE_ENV=production`, and must never be pointed at production. Refer to `scripts/seed-demo-merchant.ts` for local demo credentials rather than copying credentials into this guide.

`npm run ops:check` verifies required variables and tenant/account/catalogue tables without printing secret values. `/api/health` is the live readiness endpoint. The retention cron is scheduled daily at `03:00 UTC` in `vercel.json`; Vercel Hobby cron timing can be approximate, so do not rely on an exact minute.

## Deployment state and plan caveat

- There is no GitHub repository connected for this project. Vercel CLI deployment from the project root works without Git: `vercel deploy --prod --yes`.
- Vercel project name: `arieya`; project root is `.`; framework is Next.js; Node.js was configured as `24.x` at the last inspection.
- Production domains last verified: `https://www.arieya.site` and `https://arieya.vercel.app`. On 2026-09-24, a direct CLI deploy reached `READY`; both domains returned 200 for `/` and `/merchant`, and `/api/health` returned `ok` with `postgres`. Check the Vercel CLI deployment list and health endpoint before claiming this is still the latest release.
- At that inspection, Vercel production had encrypted `DATABASE_URL`, `DATABASE_SSL`, `RATE_LIMIT_SALT`, `CRON_SECRET`, `NEXT_PUBLIC_APP_ORIGIN`, `GEMINI_API_KEY`, and `GEMINI_MODEL`. `DATABASE_URL_UNPOOLED` was not listed in the Vercel production environment at that time; the app runtime works with the pooled URL, but production schema operations need a direct URL supplied safely.
- Vercel Hobby is restricted to personal, non-commercial use under Vercel’s [plan terms](https://vercel.com/docs/plans/hobby) and [Terms of Service](https://vercel.com/legal/terms). The owner has described the current deployment as a prototype and plans to upgrade before commercial use. Re-check current terms and plan before running a merchant pilot or commercial activity.
- Do not run demo seed/smoke fixtures or migrations against production unless the task explicitly requires it and the target has been verified. Prefer preview deployments with a non-production Neon branch.

## Known gaps — do not present these as implemented

- No payments, subscriptions, billing portal, or merchant plan enforcement.
- No live catalogue/inventory sync, product editing/deletion UI, or store-platform integration. Merchant import is file-based.
- No order/checkout integration or sales attribution in the dashboard.
- No merchant email verification, account recovery, MFA, team access, or invitation workflow.
- No formal accessibility audit or representative outcome study. Research in `PRODUCT-RESEARCH.md` supports design hypotheses, not a claim that Arieya improves conversion or serves every demographic equally well.
- Demo catalogues are small fixtures. Real stores should import a larger, accurate catalogue and verify prices, availability, URLs, and attributes.

## Continuation checklist for agents

1. Read this file and `README.md`; inspect the route/module you will change before editing.
2. Treat uploaded catalogue text and shopper conversation as untrusted data. Preserve tenant isolation and server-side validation.
3. Keep all product facts grounded in the active catalogue. Do not report clicks as purchases or invent outcomes.
4. Never inspect, print, or commit secret values. Check only variable names or non-secret readiness signals.
5. For local database work, confirm the Neon branch first. Never run the demo seed against production.
6. After changes, run the smallest relevant check; for app-wide or deployment changes, use `npm run build` and `npm test` as appropriate.
7. Before deployment, verify the Vercel project, environment names, domain, database branch, current Hobby/commercial status, and latest production state. Deploy only when the user authorizes it.
