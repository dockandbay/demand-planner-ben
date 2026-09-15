-- 023_retail_prices.sql — per-market retail prices on the product record (v20.33)
--
-- Retail (RRP) per market from the SKU_CHILD export. Used by the B2B Allocation scenario to derive
-- the wholesale price: wholesale = 50% of the EX-VAT retail. UK & EU retail include 20% VAT (so
-- divide by 1.2 first); US has no VAT.
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS uk_rt numeric;  -- UK RRP (inc 20% VAT)
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS us_rt numeric;  -- US RRP (no VAT)
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS eu_rt numeric;  -- EU RRP (inc 20% VAT)
