-- 109_planning_scope_derived.sql
-- Make planner.products.in_planning_scope a DERIVED value instead of a sync-fed
-- boolean. Root cause of the LIVE BUY/FBA outage: the overnight n8n product sync
-- clobbered in_planning_scope to false for everything, emptying the planner.
--
-- New rule (Ben, agreed): a SKU is in planning scope iff
--   variant_type = 'MASTER'  AND  it is available in at least one country/channel
-- (available_<country>_<channel> = TRUE for any of the 12 combos).
-- SET variants and rows available nowhere are OUT of scope.
--
-- Per-country/channel granularity is unchanged: v_product_availability already
-- derives is_available per channel from the same available_* columns. This trigger
-- only governs the SKU-level gate (whether the product enters the planner at all).
--
-- A BEFORE trigger (not a GENERATED column) is used deliberately: the n8n sync can
-- keep including in_planning_scope in its upsert column list without erroring; the
-- trigger simply overrides whatever value it sends. Sync can no longer break scope.

BEGIN;

CREATE OR REPLACE FUNCTION planner.set_in_planning_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- coalesce to false: a null variant_type gives (null='MASTER')=null, and null AND true = null,
  -- which would violate the NOT NULL constraint. Treat "unknown" as out of scope.
  NEW.in_planning_scope := coalesce(
    (NEW.variant_type = 'MASTER')
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

DROP TRIGGER IF EXISTS trg_set_in_planning_scope ON planner.products;
CREATE TRIGGER trg_set_in_planning_scope
BEFORE INSERT OR UPDATE ON planner.products
FOR EACH ROW
EXECUTE FUNCTION planner.set_in_planning_scope();

-- One-time backfill of existing rows to the derived value.
UPDATE planner.products
SET in_planning_scope = coalesce(
    (variant_type = 'MASTER')
    AND (
         available_uk_dtc IS TRUE OR available_uk_fba IS TRUE OR available_uk_b2b IS TRUE
      OR available_us_dtc IS TRUE OR available_us_fba IS TRUE OR available_us_b2b IS TRUE
      OR available_eu_dtc IS TRUE OR available_eu_fba IS TRUE OR available_eu_b2b IS TRUE
      OR available_au_dtc IS TRUE OR available_au_fba IS TRUE
      OR available_ca_fba IS TRUE
    ), false);

COMMIT;
