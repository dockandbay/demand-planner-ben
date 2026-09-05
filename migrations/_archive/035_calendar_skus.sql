-- 035_calendar_skus.sql — SKU-level targeting on calendar events (v20.93)
--
-- A campaign may target a specific list of SKUs rather than a whole category. sku_list = comma-separated
-- SKUs (blank = category-level). Used to surface a calendar marker in DEMAND ▸ Plan at SKU or category row.
ALTER TABLE planner.trading_calendar ADD COLUMN IF NOT EXISTS sku_list text;
