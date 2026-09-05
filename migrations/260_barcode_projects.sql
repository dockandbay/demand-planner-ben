-- 260: SUPPLY ▸ Barcodes — saved "customise" projects.
--
-- A barcode project overrides the standard barcode number for specific SKUs on a download (e.g. a retailer wants
-- their own EANs on the product labels for one order). `target` is which of the three barcodes the overrides
-- replace (product by default; carton / inner optional). `overrides` maps SKU → custom number (any number: the
-- app renders EAN-13 if valid, else Code128). Saved + reusable per project.

CREATE TABLE IF NOT EXISTS planner.barcode_projects (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text    NOT NULL,
  target     text    NOT NULL DEFAULT 'product',   -- legacy; per-SKU barcode types now live in overrides
  batch      text,                                  -- the batch whose BATCH + production date print on the labels
  overrides  jsonb   NOT NULL DEFAULT '{}'::jsonb,  -- { "<sku>": { "num": "<custom barcode>", "types": {product,carton,inner} } }
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE planner.barcode_projects ADD COLUMN IF NOT EXISTS batch text;   -- for tables created before this column existed
