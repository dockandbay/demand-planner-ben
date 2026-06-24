-- Market COGS (3PL, final) per SKU — used for true B2B margin analysis (was using avg PO cost_price).
-- Sourced from SKU_CHILD (cogs_<market>_3pl_final). Loaded from the CSV in the sandbox; n8n feeds prod.
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS cogs_uk_3pl_final numeric;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS cogs_us_3pl_final numeric;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS cogs_eu_3pl_final numeric;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS cogs_au_3pl_final numeric;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS cogs_ca_3pl_final numeric;
