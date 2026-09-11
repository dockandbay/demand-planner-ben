-- 033_calendar_category_uplift.sql — tie calendar events to categories + expected uplift (v20.90)
--
-- A trading event's value is which product categories it lifts and by how much, so it can align to the
-- forecast/phasing. category = 'ALL' or a specific category (free text / comma list); uplift_pct = the
-- expected % demand uplift the event drives.
ALTER TABLE planner.trading_calendar ADD COLUMN IF NOT EXISTS category   text;     -- 'ALL' | category | comma list
ALTER TABLE planner.trading_calendar ADD COLUMN IF NOT EXISTS uplift_pct numeric;  -- expected % uplift
