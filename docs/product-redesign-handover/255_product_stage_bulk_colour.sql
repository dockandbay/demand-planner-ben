-- 255: PRODUCT development — bulk colour name + STAGE state machine
--
-- Two new columns on planner.product_dev_items:
--   * bulk_colour_name — the production/bulk colour name. When set, the grid shows
--       "bulk_colour_name (colour_name)"; colour_name is relabelled "Development colour name".
--   * stage — the workflow state machine (one field the user drives):
--       sample_development  (ball: supplier)
--       sample_shipped      (ball: supplier — a tracked shipment exists)
--       sample_in_review    (ball: D&B — supplier has submitted a sample)
--       approved            (approved for bulk)
--       approved_with_comments
--       stop_development
--     Linear flow with cycles: development -> shipped -> in_review -> {approved | approved_with_comments | back to development(resample) | stop}.
--     stage 1->2 and 2->3 auto-advance (forward-only) off sample events; the decisions from in_review are D&B clicks.
--
-- APPROVAL (the existing planner.product_dev_items.status, read by PIM / Buy Plan / POs) DERIVES from the terminal stage:
--   approved / approved_with_comments -> 'approved' ; stop_development -> 'dropped' ; else 'in_development'.

ALTER TABLE planner.product_dev_items
  ADD COLUMN IF NOT EXISTS bulk_colour_name text,
  ADD COLUMN IF NOT EXISTS stage            text NOT NULL DEFAULT 'sample_development';

-- Backfill stage from the existing approval status so nothing regresses on first load.
-- (Every row is 'sample_development' straight after ADD COLUMN, so this seeds the terminal stages.)
UPDATE planner.product_dev_items
   SET stage = CASE WHEN status = 'approved' THEN 'approved'
                    WHEN status = 'dropped'  THEN 'stop_development'
                    ELSE 'sample_development' END
 WHERE stage = 'sample_development';

CREATE INDEX IF NOT EXISTS product_dev_items_stage ON planner.product_dev_items (stage);
