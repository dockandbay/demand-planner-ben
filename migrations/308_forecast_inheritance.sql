-- v28.012 (Ben): master management table for NEW-SKU → OLD-SKU forecast inheritance.
-- Overlays products.replacement_sku ("receives from replacement"): a row here either overrides the
-- source SKU a new SKU inherits its forecast from, or ignores (suppresses) the product-master value.
-- No row  → the product-master replacement_sku applies unchanged (existing behaviour).
-- Additive only.

CREATE TABLE IF NOT EXISTS planner.forecast_inheritance (
  new_sku     text PRIMARY KEY,           -- the NEW sku whose forecast is being derived
  source_sku  text,                       -- the OLD sku to inherit from (override); NULL = no source set
  ignore      boolean NOT NULL DEFAULT false,  -- true = ignore the product-master replacement, no inheritance
  note        text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  text
);
