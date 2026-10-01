-- Product specification files (SUG-0019). Source-of-truth packaging/labelling docs, scoped to All / Category /
-- Size (products.size) / SKU, with an effective-from rule and an optional supplier-confirmation workflow. bytea storage.
CREATE TABLE IF NOT EXISTS planner.product_specs (
  id serial PRIMARY KEY,
  spec_type text NOT NULL,
  filename text, mime text, data bytea,
  scope_type text NOT NULL DEFAULT 'all',        -- all | category | size | sku
  scope_category text, scope_size text, scope_skus text,   -- size = products.size (within scope_category); scope_skus = CSV
  effective_mode text NOT NULL DEFAULT 'production',       -- production | immediate_useup | immediate_dispose
  effective_prod_no text,
  confirm_with_supplier boolean NOT NULL DEFAULT false,
  uploaded_by text, uploaded_at timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS product_specs_active_idx ON planner.product_specs (active, spec_type);
