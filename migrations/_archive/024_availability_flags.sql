-- 024_availability_flags.sql — explicit per-market-channel availability + corrected view (v20.35)
--
-- Authoritative availability comes from the SKU_CHILD `available_<country>_<channel>` flags (a SKU is
-- only in a channel/country if its flag is TRUE) AND the launch/discontinue dates. The old
-- v_product_availability derived availability from dates only AND joined the country list (UK/US/…)
-- to product_countries.country which is stored lowercase (uk/us/…) — so the join never matched and
-- is_available was false for every SKU. This migration: (1) adds the 12 explicit flags + AU/CA
-- retail, (2) recreates the view to gate on the explicit flag AND the dates, with a case-insensitive
-- country join. Flag data is loaded from SKU_CHILD (n8n in prod; CSV in sandbox).

ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS available_uk_dtc boolean;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS available_uk_fba boolean;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS available_uk_b2b boolean;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS available_us_dtc boolean;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS available_us_fba boolean;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS available_us_b2b boolean;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS available_eu_dtc boolean;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS available_eu_fba boolean;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS available_eu_b2b boolean;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS available_au_dtc boolean;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS available_au_fba boolean;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS available_ca_fba boolean;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS au_rt numeric;
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS ca_rt numeric;

CREATE OR REPLACE VIEW planner.v_product_availability AS
  WITH combos(country, channel) AS (
    VALUES ('UK','DTC'),('UK','FBA'),('UK','B2B'),('US','DTC'),('US','FBA'),('US','B2B'),
           ('EU','DTC'),('EU','FBA'),('EU','B2B'),('AU','DTC'),('AU','FBA'),('CA','FBA')
  )
  SELECT p.sku, c.country, c.channel,
    ( CASE c.country||'|'||c.channel
        WHEN 'UK|DTC' THEN p.available_uk_dtc WHEN 'UK|FBA' THEN p.available_uk_fba WHEN 'UK|B2B' THEN p.available_uk_b2b
        WHEN 'US|DTC' THEN p.available_us_dtc WHEN 'US|FBA' THEN p.available_us_fba WHEN 'US|B2B' THEN p.available_us_b2b
        WHEN 'EU|DTC' THEN p.available_eu_dtc WHEN 'EU|FBA' THEN p.available_eu_fba WHEN 'EU|B2B' THEN p.available_eu_b2b
        WHEN 'AU|DTC' THEN p.available_au_dtc WHEN 'AU|FBA' THEN p.available_au_fba WHEN 'CA|FBA' THEN p.available_ca_fba
      END IS TRUE )                                                                       -- explicit flag
    AND NOT (pc.discontinue_date IS NOT NULL AND pc.discontinue_date < CURRENT_DATE)        -- not discontinued
    AND NOT (c.channel = 'B2B' AND pc.launch_date_wholesale IS NOT NULL AND pc.launch_date_wholesale > CURRENT_DATE)
    AND NOT (c.channel IN ('DTC','FBA') AND pc.launch_date_retail IS NOT NULL AND pc.launch_date_retail > CURRENT_DATE)
      AS is_available
  FROM planner.products p
    CROSS JOIN combos c
    LEFT JOIN planner.product_countries pc ON pc.sku = p.sku AND lower(pc.country) = lower(c.country)
  WHERE p.in_planning_scope;
