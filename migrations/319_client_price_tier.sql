-- 319_client_price_tier.sql  (v28.101, Ben)
-- Per-client price tier, driving the line sheet off computed prices instead of a hand-maintained price list.
--   price_tier:   'rt'   = market retail price (from planner.products <mkt>_rt)
--                 'ws'   = wholesale = ex-tax retail / 2 (strip VAT/GST first)
--                 'dist' = distributor = wholesale × (1 - discount), discount from planner.distributor_offers
--   price_method: for 'dist' only — 'fob' | 'exw' | '3pl' (which discount column applies)
ALTER TABLE planner.clients ADD COLUMN IF NOT EXISTS price_tier   text;   -- null = fall back to the legacy price_list
ALTER TABLE planner.clients ADD COLUMN IF NOT EXISTS price_method text;   -- fob | exw | 3pl (dist only)
