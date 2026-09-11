-- 110_retire_product_countries.sql
-- Retire planner.product_countries. Ben maintains only planner.products, and product_countries was only
-- still used by (a) v_product_availability's discontinue gate and (b) a per-SKU duty override in the PO
-- duty calc (that duty_pct column is 100% empty — dead). The demand plan now reads launch/discontinue
-- from planner.products (v25.395), and the PO duty calc no longer references it (v25.396).
--
-- This migration repoints the availability view's discontinue check at planner.products (per country:
-- AU → discontinue_date_au_final, CA → discontinue_date_ca, else discontinue_date_final), then drops the
-- table. Ship alongside the v25.396 server code (which removes the last runtime references).

BEGIN;

CREATE OR REPLACE VIEW planner.v_product_availability AS
WITH combos(country, channel) AS (
  VALUES ('UK','DTC'),('UK','FBA'),('UK','B2B'),
         ('US','DTC'),('US','FBA'),('US','B2B'),
         ('EU','DTC'),('EU','FBA'),('EU','B2B'),
         ('AU','DTC'),('AU','FBA'),
         ('CA','FBA')
)
SELECT p.sku,
       c.country,
       c.channel,
       (CASE (c.country || '|' || c.channel)
          WHEN 'UK|DTC' THEN p.available_uk_dtc
          WHEN 'UK|FBA' THEN p.available_uk_fba
          WHEN 'UK|B2B' THEN p.available_uk_b2b
          WHEN 'US|DTC' THEN p.available_us_dtc
          WHEN 'US|FBA' THEN p.available_us_fba
          WHEN 'US|B2B' THEN p.available_us_b2b
          WHEN 'EU|DTC' THEN p.available_eu_dtc
          WHEN 'EU|FBA' THEN p.available_eu_fba
          WHEN 'EU|B2B' THEN p.available_eu_b2b
          WHEN 'AU|DTC' THEN p.available_au_dtc
          WHEN 'AU|FBA' THEN p.available_au_fba
          WHEN 'CA|FBA' THEN p.available_ca_fba
          ELSE NULL::boolean
        END) IS TRUE
       -- discontinued in the past → not available (per-country discontinue date from planner.products)
       AND NOT coalesce(
             (CASE c.country
                WHEN 'AU' THEN nullif(p.discontinue_date_au_final,'')
                WHEN 'CA' THEN nullif(p.discontinue_date_ca,'')
                ELSE nullif(p.discontinue_date_final,'')
              END)::date < CURRENT_DATE, false) AS is_available
FROM planner.products p
CROSS JOIN combos c
WHERE p.in_planning_scope;

DROP TABLE IF EXISTS planner.product_countries;

COMMIT;
