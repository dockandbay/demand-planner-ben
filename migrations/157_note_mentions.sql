-- 157: internal @-mention notes on the PO timeline
-- Adds a PRIVATE (team-only) note type to planner.supplier_notes and a mentions list.
-- `private=true`  → the note is internal to Dock & Bay and is FILTERED OUT of every supplier-portal
--                    data path server-side (never sent to the supplier's browser).
-- `mentions`      → lowercased dockandbay.com emails tagged in the note (from planner.app_permissions);
--                    each tagged teammate is emailed once when the note is posted.
-- Additive + idempotent; no backfill (existing notes stay private=false, i.e. supplier-visible as today).
ALTER TABLE planner.supplier_notes ADD COLUMN IF NOT EXISTS private  boolean NOT NULL DEFAULT false;
ALTER TABLE planner.supplier_notes ADD COLUMN IF NOT EXISTS mentions text[];
