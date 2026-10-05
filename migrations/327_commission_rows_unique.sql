-- 327_commission_rows_unique.sql  (v28.151, review E8) - stop a double "Build run" creating duplicate provisional rows.
-- POST /api/client/commission/runs/build checked "does (run_id, order_ref) exist?" then inserted, row by row, so two
-- overlapping builds (double click, two tabs) could both insert the same Fulfil order. The build now inserts with
-- ON CONFLICT (run_id, order_ref) WHERE source='fulfil' DO NOTHING, which needs this index.
--
-- PARTIAL on source='fulfil' on purpose: a full UNIQUE(run_id, order_ref) would break legitimate rows. The Xero CSV
-- import (source 'xero_csv') carries a credit note as a second row with the SAME order_ref as its invoice, and a CSV can
-- hold several payment lines for one order. Only the provisional Fulfil rows are one-per-order by construction.
--
-- Dedupe guard: the index cannot be created while duplicates exist. Sandbox checked 05-Oct-26: 0 duplicate fulfil rows
-- (5 rows total). Before applying on LIVE run:
--   SELECT run_id, order_ref, count(*) FROM planner.commission_rows WHERE source='fulfil' GROUP BY 1,2 HAVING count(*) > 1;
-- If that returns rows, the DELETE below keeps the lowest id of each duplicate set (the first build's row; later copies
-- are identical provisional rows). It is a no-op when there are no duplicates. Additive otherwise; safe to re-run.
DELETE FROM planner.commission_rows a
 USING planner.commission_rows b
 WHERE a.source = 'fulfil' AND b.source = 'fulfil'
   AND a.run_id = b.run_id AND a.order_ref = b.order_ref
   AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS commission_rows_run_order_fulfil_uq
  ON planner.commission_rows (run_id, order_ref) WHERE source = 'fulfil';
