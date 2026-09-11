-- 250_avail_no_disc.sql — expose run-off (discontinued) SKUs in the demand/buy plan.
-- Adds a second boolean `available_no_disc` to planner.v_product_availability: the channel
-- availability flag (+ in_planning_scope) but IGNORING the discontinue date. `is_available`
-- is left byte-identical (same column, same position), so every existing consumer (KPIs,
-- exceptions, portal) is unaffected. Only the demand-plan `av` string and the plan's
-- subcategory-row query switch to `available_no_disc` (server.mjs), so discontinued SKUs stay
-- visible in the plan's "All" mode + the buy plan (where their forecast is already capped to
-- remaining stock → 0 buy). The client's Active/All toggle hides them in "Active".
-- NOTE: new column MUST be appended last — CREATE OR REPLACE VIEW cannot reorder/rename cols.
BEGIN;

CREATE OR REPLACE VIEW planner.v_product_availability AS
 WITH combos(country, channel) AS (
         VALUES ('UK'::text,'DTC'::text), ('UK'::text,'FBA'::text), ('UK'::text,'B2B'::text), ('US'::text,'DTC'::text), ('US'::text,'FBA'::text), ('US'::text,'B2B'::text), ('EU'::text,'DTC'::text), ('EU'::text,'FBA'::text), ('EU'::text,'B2B'::text), ('AU'::text,'DTC'::text), ('AU'::text,'FBA'::text), ('CA'::text,'FBA'::text)
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
        END IS TRUE AND NOT COALESCE(
        CASE c.country
            WHEN 'AU'::text THEN NULLIF(p.discontinue_date_au_final, ''::text)
            WHEN 'CA'::text THEN NULLIF(p.discontinue_date_ca, ''::text)
            ELSE NULLIF(p.discontinue_date_final, ''::text)
        END::date < CURRENT_DATE, false) AS is_available,
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
        END IS TRUE AS available_no_disc
   FROM planner.products p
     CROSS JOIN combos c
  WHERE p.in_planning_scope;

COMMIT;
