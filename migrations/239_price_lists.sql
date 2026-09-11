-- 239_price_lists.sql — "Price Lists" feature (SUPPLY ▸ Purchase Orders ▸ Price Lists).
-- Manage the cost price for every product × supplier, grouped by a new products.price_type (all SKUs of a type
-- share a base cost; individual SKUs can override as exceptions). Prices are per-supplier (supplier currency),
-- support quantity TIERS, and can be versioned "from production N onwards". Supplier-portal-submitted changes
-- land as status='pending' for admin approval.
--   price_type SOURCE: a new planner.products.price_type column, synced from Airtable (like cost/launch/disc).
--   Live: Diviyaj adds the n8n field mapping. Sandbox: seeded from subcategory as placeholder test data.
BEGIN;

ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS price_type text;

-- One entry = a price for (supplier × scope) effective from a production number. scope 'type' = the price_type base
-- (applies to every SKU of that type from that supplier); scope 'sku' = a SKU-specific exception. Tiers live below.
CREATE TABLE IF NOT EXISTS planner.price_list_entries (
  id            bigserial   PRIMARY KEY,
  supplier      text        NOT NULL,                         -- suppliers.name
  scope         text        NOT NULL CHECK (scope IN ('type','sku')),
  price_type    text,                                         -- set for scope='type'; also stamped on 'sku' rows for grouping
  sku           text,                                         -- set for scope='sku'
  currency      text        NOT NULL DEFAULT 'USD',           -- supplier currency (suppliers.default_currency)
  effective_from_production integer,                          -- NULL = current/always; else applies from this production number onward until superseded
  status        text        NOT NULL DEFAULT 'active'  CHECK (status IN ('active','pending','rejected','superseded')),
  source        text        NOT NULL DEFAULT 'admin'  CHECK (source IN ('admin','supplier')),
  note          text,
  submitted_by  text,
  submitted_at  timestamptz,
  approved_by   text,
  approved_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ple_supplier_idx ON planner.price_list_entries (supplier);
CREATE INDEX IF NOT EXISTS ple_type_idx     ON planner.price_list_entries (price_type);
CREATE INDEX IF NOT EXISTS ple_sku_idx      ON planner.price_list_entries (sku);
CREATE INDEX IF NOT EXISTS ple_status_idx   ON planner.price_list_entries (status);

-- Quantity tiers for an entry: unit_cost applies to order quantities >= min_qty (min_qty=1 = the base tier).
CREATE TABLE IF NOT EXISTS planner.price_list_tiers (
  entry_id  bigint  NOT NULL REFERENCES planner.price_list_entries(id) ON DELETE CASCADE,
  min_qty   integer NOT NULL DEFAULT 1,
  unit_cost numeric NOT NULL,
  PRIMARY KEY (entry_id, min_qty)
);

COMMIT;
