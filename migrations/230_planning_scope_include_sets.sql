-- 230_planning_scope_include_sets.sql
-- SETS feature P1: bring SET variants into planning scope so they show in the DEMAND plan.
-- Extends the mig-109 derived-scope trigger: variant_type = 'MASTER' → variant_type IN ('MASTER','SET').
-- Everything else is IDENTICAL to 109 (same availability columns, same null-handling → null stays out of scope).
-- Effect: the only NEW in-scope SKUs are SETs that have availability. MASTER scope is unchanged.
-- The app keeps SETs OUT of the buy plan (they explode into component demand, SETS feature P2), so buy is
-- byte-identical for non-set SKUs.
BEGIN;

CREATE OR REPLACE FUNCTION planner.set_in_planning_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.in_planning_scope := coalesce(
    (NEW.variant_type IN ('MASTER','SET'))
    AND (
         NEW.available_uk_dtc IS TRUE OR NEW.available_uk_fba IS TRUE OR NEW.available_uk_b2b IS TRUE
      OR NEW.available_us_dtc IS TRUE OR NEW.available_us_fba IS TRUE OR NEW.available_us_b2b IS TRUE
      OR NEW.available_eu_dtc IS TRUE OR NEW.available_eu_fba IS TRUE OR NEW.available_eu_b2b IS TRUE
      OR NEW.available_au_dtc IS TRUE OR NEW.available_au_fba IS TRUE
      OR NEW.available_ca_fba IS TRUE
    ), false);
  RETURN NEW;
END;
$$;

-- One-time backfill to the new rule.
UPDATE planner.products
SET in_planning_scope = coalesce(
    (variant_type IN ('MASTER','SET'))
    AND (
         available_uk_dtc IS TRUE OR available_uk_fba IS TRUE OR available_uk_b2b IS TRUE
      OR available_us_dtc IS TRUE OR available_us_fba IS TRUE OR available_us_b2b IS TRUE
      OR available_eu_dtc IS TRUE OR available_eu_fba IS TRUE OR available_eu_b2b IS TRUE
      OR available_au_dtc IS TRUE OR available_au_fba IS TRUE
      OR available_ca_fba IS TRUE
    ), false);

COMMIT;
