-- 138: snapshot of the Direct-to-Client details a supplier approved.
-- Captured on approval (portal + admin preview). When D&B later edits a DtC field, dtc_accepted_at is reset
-- (existing behaviour) but this snapshot is KEPT, so the portal can diff current vs approved and highlight
-- exactly what changed + prompt for re-approval. Overwritten on each fresh approval.
ALTER TABLE planner.purchase_orders
  ADD COLUMN IF NOT EXISTS dtc_approved_snapshot jsonb;
