-- 321_po_finance_perf_indexes.sql  (v28.124, Ben) — planner.v_po_finance hot-path indexes.
-- Prod EXPLAIN (ANALYZE, BUFFERS) 30-Sep-2026: 1,397 ms, 512,567 buffers, all in memory (CPU on a bad plan, not I/O).
-- Indexes only: the view definition is NOT touched (output byte-identical).
--
-- HOW TO APPLY (Diviyaj):
--   * CREATE INDEX CONCURRENTLY cannot run inside a transaction block. Run with plain `psql -f` (autocommit, NO -1 /
--     --single-transaction), or paste ONE statement at a time. A multi-statement paste into the Supabase SQL editor or a
--     migration runner that wraps the file in BEGIN/COMMIT will fail with "cannot run inside a transaction block".
--   * Safe to re-run (IF NOT EXISTS). BUT: if a CONCURRENTLY build is interrupted it leaves an INVALID index, and
--     IF NOT EXISTS will then silently skip it. Run the check at the bottom afterwards; any row it returns must be
--     dropped (DROP INDEX CONCURRENTLY planner.<name>;) and this file re-run.

-- 1) Shipment-group key. SubPlan 9 (ship_pal) and SubPlan 12 (ship_n) in the palshare LATERAL each seq-scan
--    purchase_orders once per PO on COALESCE(NULLIF(shipment_ref,''), po) = <this PO's group>: 2 x 1,432 scans that
--    keep 3 rows and discard 1,429. 324,821 buffers = 63% of the view. The expression below is written exactly as the
--    view writes it so the planner matches it (both functions are immutable on text).
CREATE INDEX CONCURRENTLY IF NOT EXISTS purchase_orders_ship_group_idx
  ON planner.purchase_orders ((COALESCE(NULLIF(shipment_ref, ''::text), po)));

-- 2) Flexport match. The fx LATERAL filters flexport_shipments_effective (flexport_api_shipments UNION ALL
--    flexport_shipments) on flex_id = po.flexport_reference OR shipment_name = po.po OR shipment_name = po.shipment_ref,
--    once per PO. flex_id is already the PK on both tables; shipment_name has no index, so the OR forces a seq scan.
--    With these the planner can BitmapOr the three probes.
CREATE INDEX CONCURRENTLY IF NOT EXISTS flexport_api_shipments_shipment_name_idx
  ON planner.flexport_api_shipments (shipment_name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS flexport_shipments_shipment_name_idx
  ON planner.flexport_shipments (shipment_name);

-- Refresh stats so the new expression index has statistics straight away (autovacuum would get there eventually).
ANALYZE planner.purchase_orders;
ANALYZE planner.flexport_api_shipments;
ANALYZE planner.flexport_shipments;

-- Post-check: must return 0 rows. Any row = an interrupted build → DROP INDEX CONCURRENTLY it, then re-run this file.
-- SELECT c.relname FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
--  WHERE NOT i.indisvalid AND c.relname IN ('purchase_orders_ship_group_idx',
--        'flexport_api_shipments_shipment_name_idx', 'flexport_shipments_shipment_name_idx');
