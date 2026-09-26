-- 278: PRODUCT split P1 — development (sampling) REQUESTS per supplier (Ben, 16-Sep-2026; scope: Claude Analyses/SCOPE_PRODUCT_SPLIT_2026-09-16.md)
-- A product (product_dev_items) is master data only. A REQUEST assigns ONE supplier to a set of that product's components
-- (+ optional size subset) with its own stage / approval method / recipient country / dev start / stakeholders. Several
-- requests may cover the same component (two suppliers sampling the same body). Sample versions hang off the request.
-- Live PRODUCT tables are empty (verified 16-Sep) → greenfield: no backfill.
CREATE TABLE IF NOT EXISTS planner.product_dev_requests (
  id                    bigserial PRIMARY KEY,
  ref                   text NOT NULL UNIQUE,                       -- <product ref>-<supplier code>, editable
  item_id               bigint NOT NULL REFERENCES planner.product_dev_items(id) ON DELETE CASCADE,
  supplier_id           bigint,
  supplier_name         text NOT NULL,
  supplier_code         text,
  stage                 text NOT NULL DEFAULT 'sample_development',  -- same vocabulary as the old item stage (PROD_STAGES)
  approval_method       text NOT NULL DEFAULT 'samples',             -- samples | photo
  recipient_countries   text DEFAULT 'UK',
  dev_start             date,
  size_ids              bigint[] NOT NULL DEFAULT '{}',              -- empty = every size of the product
  internal_stakeholders jsonb NOT NULL DEFAULT '[]'::jsonb,          -- emails (same shape as sample_requests, mig 274)
  notify_emails         jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes                 text,
  created_by            text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS product_dev_requests_item ON planner.product_dev_requests (item_id);
CREATE INDEX IF NOT EXISTS product_dev_requests_supplier ON planner.product_dev_requests (supplier_name);

CREATE TABLE IF NOT EXISTS planner.product_dev_request_components (
  request_id   bigint NOT NULL REFERENCES planner.product_dev_requests(id) ON DELETE CASCADE,
  component_id bigint NOT NULL REFERENCES planner.product_dev_components(id) ON DELETE CASCADE,
  PRIMARY KEY (request_id, component_id)
);

-- sample versions belong to a request (nullable only for rows created before a request existed)
ALTER TABLE planner.product_dev_samples ADD COLUMN IF NOT EXISTS request_id bigint REFERENCES planner.product_dev_requests(id) ON DELETE SET NULL;
ALTER TABLE planner.product_dev_samples ADD COLUMN IF NOT EXISTS received_at timestamptz;   -- SAMPLING grid tick (P2)
CREATE INDEX IF NOT EXISTS product_dev_samples_request ON planner.product_dev_samples (request_id);

-- product stage is now DERIVED from its requests; the column becomes the optional manual OVERRIDE (NULL = derived)
ALTER TABLE planner.product_dev_items ALTER COLUMN stage DROP NOT NULL;
ALTER TABLE planner.product_dev_items ALTER COLUMN stage DROP DEFAULT;
