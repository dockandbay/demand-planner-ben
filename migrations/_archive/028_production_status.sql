-- 028_production_status.sql — supplier production-confidence layer (v20.55)
--
-- The PO date chain gives us PLANNED milestones, but no signal that the supplier is actually tracking to
-- them. These two columns capture the supplier-confirmed production status + when it was last confirmed,
-- so as a completion date approaches we can tell confidence (recently confirmed "nearing completion") from
-- silence (no confirmation in weeks → chase). production_status is a free-text code from a small set:
--   not_started | in_production | nearing_completion | complete | shipped
-- production_confirmed_at is stamped server-side whenever the status is set/changed.
ALTER TABLE planner.purchase_orders ADD COLUMN IF NOT EXISTS production_status       text;
ALTER TABLE planner.purchase_orders ADD COLUMN IF NOT EXISTS production_confirmed_at  timestamptz;
