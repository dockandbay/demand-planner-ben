-- 036_nongrs_stock.sql — Non-GRS on-hand stock per market (v20.102)
--
-- NonGRS = stock that is not GRS-certified but is still sellable through 3PL. Held per market on the product
-- record, loaded from SKU_CHILD (n8n in prod; CSV in sandbox). UK & US only today (no AU/EU feed).
-- Displayed on the buy plan as a sub-line under SOH 3PL (informational for now; not yet pooled into the buy calc).
--
-- AWD (Amazon Warehousing & Distribution, US upstream feeding FBA) already lives on products as `awd_us`
-- (source field inventory_us_awd) — no new column needed; the buy plan now pools it into FBA cover.
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS inventory_uk_nongrs numeric;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS inventory_us_nongrs numeric;
