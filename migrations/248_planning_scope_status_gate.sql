-- 248_planning_scope_status_gate.sql — add a STATUS gate to the in_planning_scope trigger (extends mig 109).
--
-- WHY: n8n is about to start syncing `variant_type` (it was deliberately omitted — see the sync's own comment —
-- because the mig-109 rule `variant_type IN ('MASTER','SET') AND any-availability` would pull EVERY typed+available
-- SKU_CHILD master into scope, ~2,462 rows). The flood is ~79% CLOSED / discontinued because their availability
-- flags are left TRUE on close, and the trigger had no status check. Ben's decision (2026-08-31): a SKU is in the
-- demand plan only when its status is ACTIVE / LAST SEASON / PHASE OUT (run-off stays visible; CLOSED drops out).
--
-- NO discontinue-date gate: LAST SEASON / PHASE OUT are discontinued-but-selling-down (run-off) — a not-past-disc
-- gate would delete ~336 of exactly the SKUs we want to keep. Status alone is the gate; CLOSED handles the dead ones.
--
-- ⚠ DEPLOY ORDER (for Diviyaj): run THIS migration on live FIRST, THEN enable the `variant_type` sync in n8n.
-- Applying the trigger first is safe (it only drops the 35 wrongly-in CLOSED SKUs; live in-scope 903 -> ~868). If
-- variant_type were synced before this, scope would briefly flood to ~2,462. See DEPLOY note for the n8n field list.

BEGIN;

CREATE OR REPLACE FUNCTION planner.set_in_planning_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- In planning scope iff: a real product type (MASTER/SET) AND a live/run-off status AND available somewhere.
  -- coalesce to false so a null variant_type / null status can't yield NULL (violates NOT NULL).
  NEW.in_planning_scope := coalesce(
    (NEW.variant_type IN ('MASTER','SET'))
    AND (upper(btrim(NEW.status)) IN ('ACTIVE','LAST SEASON','PHASE OUT'))
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

-- Trigger itself is unchanged (mig 109 created trg_set_in_planning_scope BEFORE INSERT OR UPDATE) — the
-- CREATE OR REPLACE above swaps the function body in place. Backfill existing rows to the new derived value:
UPDATE planner.products
SET in_planning_scope = coalesce(
    (variant_type IN ('MASTER','SET'))
    AND (upper(btrim(status)) IN ('ACTIVE','LAST SEASON','PHASE OUT'))
    AND (
         available_uk_dtc IS TRUE OR available_uk_fba IS TRUE OR available_uk_b2b IS TRUE
      OR available_us_dtc IS TRUE OR available_us_fba IS TRUE OR available_us_b2b IS TRUE
      OR available_eu_dtc IS TRUE OR available_eu_fba IS TRUE OR available_eu_b2b IS TRUE
      OR available_au_dtc IS TRUE OR available_au_fba IS TRUE
      OR available_ca_fba IS TRUE
    ), false)
WHERE in_planning_scope IS DISTINCT FROM coalesce(
    (variant_type IN ('MASTER','SET'))
    AND (upper(btrim(status)) IN ('ACTIVE','LAST SEASON','PHASE OUT'))
    AND (
         available_uk_dtc IS TRUE OR available_uk_fba IS TRUE OR available_uk_b2b IS TRUE
      OR available_us_dtc IS TRUE OR available_us_fba IS TRUE OR available_us_b2b IS TRUE
      OR available_eu_dtc IS TRUE OR available_eu_fba IS TRUE OR available_eu_b2b IS TRUE
      OR available_au_dtc IS TRUE OR available_au_fba IS TRUE
      OR available_ca_fba IS TRUE
    ), false);

COMMIT;
