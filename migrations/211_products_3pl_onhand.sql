-- 211: 3PL on-hand (physical) stock per market on planner.products — distinct from inventory_<mkt>_3pl (available).
-- Source: SKU_CHILD inventory fields (Airtable → n8n later). Additive, nullable.
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS inventory_us_3pl_onhand integer;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS inventory_uk_3pl_onhand integer;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS inventory_au_3pl_onhand integer;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS inventory_eu_3pl_onhand integer;
