-- 021_awd_us.sql — AWD (Amazon Warehousing & Distribution, US) inventory on the product record (v20.31)
--
-- AWD stock is US-only and comes from the SKU_CHILD export → stored on the product master as awd_us.
-- The Prime Day / B2B Allocation scenarios read it as the "AWD" inventory bucket (US market only).
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS awd_us numeric;
