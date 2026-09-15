-- 094_availability_include_prelaunch.sql
-- Make PRE-LAUNCH SKUs count as available everywhere (DEMAND + SUPPLY + reports).
-- Previously v_product_availability forced is_available=false for a channel whose launch date was still in
-- the future (launch_date_retail for DTC/FBA, launch_date_wholesale for B2B). That hid pre-launch SKUs from
-- the demand planner entirely — but pre-launch SKUs must be visible so their launch can be forecast/bought.
-- The forecast's own launch clamp already zeroes pre-launch MONTHS, so listing them is safe.
-- Change: drop the two pre-launch clauses; keep the discontinue guard (discontinued SKUs still drop).

CREATE OR REPLACE VIEW planner.v_product_availability AS
 WITH combos(country, channel) AS (
   VALUES ('UK'::text,'DTC'::text), ('UK'::text,'FBA'::text), ('UK'::text,'B2B'::text),
          ('US'::text,'DTC'::text), ('US'::text,'FBA'::text), ('US'::text,'B2B'::text),
          ('EU'::text,'DTC'::text), ('EU'::text,'FBA'::text), ('EU'::text,'B2B'::text),
          ('AU'::text,'DTC'::text), ('AU'::text,'FBA'::text), ('CA'::text,'FBA'::text)
 )
 SELECT p.sku,
   c.country,
   c.channel,
   CASE (c.country || '|'::text) || c.channel
     WHEN 'UK|DTC'::text THEN p.available_uk_dtc
     WHEN 'UK|FBA'::text THEN p.available_uk_fba
     WHEN 'UK|B2B'::text THEN p.available_uk_b2b
     WHEN 'US|DTC'::text THEN p.available_us_dtc
     WHEN 'US|FBA'::text THEN p.available_us_fba
     WHEN 'US|B2B'::text THEN p.available_us_b2b
     WHEN 'EU|DTC'::text THEN p.available_eu_dtc
     WHEN 'EU|FBA'::text THEN p.available_eu_fba
     WHEN 'EU|B2B'::text THEN p.available_eu_b2b
     WHEN 'AU|DTC'::text THEN p.available_au_dtc
     WHEN 'AU|FBA'::text THEN p.available_au_fba
     WHEN 'CA|FBA'::text THEN p.available_ca_fba
     ELSE NULL::boolean
   END IS TRUE
   AND NOT (pc.discontinue_date IS NOT NULL AND pc.discontinue_date < CURRENT_DATE) AS is_available
 FROM planner.products p
   CROSS JOIN combos c
   LEFT JOIN planner.product_countries pc ON pc.sku = p.sku AND lower(pc.country) = lower(c.country)
 WHERE p.in_planning_scope;
