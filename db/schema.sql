CREATE TABLE IF NOT EXISTS tenants (
  id text PRIMARY KEY,
  public_key text UNIQUE NOT NULL,
  name text NOT NULL DEFAULT 'Online store',
  store_url text,
  currency text NOT NULL DEFAULT 'GBP',
  approved_origins jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'preview',
  plan text NOT NULL DEFAULT 'founding',
  session_allowance integer NOT NULL DEFAULT 500,
  deletion_scheduled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deletion_scheduled_at timestamptz;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'Online store';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS store_url text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'GBP';

CREATE TABLE IF NOT EXISTS merchant_users (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS merchant_memberships (
  user_id text NOT NULL REFERENCES merchant_users(id) ON DELETE CASCADE,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tenant_id)
);

CREATE TABLE IF NOT EXISTS merchant_sessions (
  token_hash text PRIMARY KEY,
  user_id text NOT NULL REFERENCES merchant_users(id) ON DELETE CASCADE,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS catalog_products (
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  data jsonb NOT NULL,
  source_updated_at timestamptz,
  synced_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, external_id)
);

CREATE TABLE IF NOT EXISTS merchant_knowledge (
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  topic text NOT NULL,
  content text NOT NULL,
  canonical_source_url text NOT NULL,
  approval_owner text NOT NULL,
  approved_at timestamptz NOT NULL,
  checksum text NOT NULL,
  status text NOT NULL CHECK (status IN ('approved', 'stale', 'conflict', 'disabled')),
  review_at timestamptz,
  PRIMARY KEY (tenant_id, topic)
);

CREATE TABLE IF NOT EXISTS shareable_edits (
  token text PRIMARY KEY,
  management_token_hash text NOT NULL,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  creator_session_id text NOT NULL,
  intent_summary text NOT NULL,
  product_ids jsonb NOT NULL,
  selection_reasons jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS edit_reactions (
  id text PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  edit_token text NOT NULL REFERENCES shareable_edits(token) ON DELETE CASCADE,
  reaction text NOT NULL CHECK (reaction IN ('love', 'not_for_me', 'compare')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics_events (
  event_id text NOT NULL,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  anonymous_session_id text NOT NULL,
  name text NOT NULL,
  product_id text,
  edit_id text,
  match_status text,
  latency_ms integer,
  model_path text,
  numeric_properties jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, event_id)
);

CREATE TABLE IF NOT EXISTS attributed_orders (
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id text NOT NULL,
  amount_minor integer NOT NULL,
  currency text NOT NULL,
  product_ids jsonb NOT NULL,
  attribution_token text NOT NULL,
  attribution_source text NOT NULL CHECK (attribution_source IN ('session', 'share')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, order_id)
);

CREATE TABLE IF NOT EXISTS pilot_leads (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  store_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catalog_products_tenant ON catalog_products (tenant_id);
CREATE INDEX IF NOT EXISTS idx_shareable_edits_tenant_expiry ON shareable_edits (tenant_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_tenant_created ON analytics_events (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_attributed_orders_tenant_created ON attributed_orders (tenant_id, created_at);

CREATE TABLE IF NOT EXISTS trial_sessions (
  id_hash text PRIMARY KEY,
  catalog jsonb,
  questions_used integer NOT NULL DEFAULT 0 CHECK (questions_used BETWEEN 0 AND 3),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days'
);
CREATE TABLE IF NOT EXISTS request_limits (
  key text PRIMARY KEY,
  count integer NOT NULL,
  reset_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_request_limits_expiry ON request_limits (reset_at);
ALTER TABLE shareable_edits ADD COLUMN IF NOT EXISTS catalog_snapshot jsonb;
CREATE INDEX IF NOT EXISTS idx_merchant_sessions_expiry ON merchant_sessions (expires_at);
