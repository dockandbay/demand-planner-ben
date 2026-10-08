-- 343_po_grid_indexes.sql  (v28.232, Ben): two indexes for the PO grid query (PO_ROWS_SQL, the biggest DB cost on live by
-- pg_stat_statements). Per grid build Postgres scanned planner.shipments in full by master_po ~865 times (consolidated-shipment
-- lookups: SELECT s.shipment_ref FROM planner.shipments s WHERE s.master_po = <po> LIMIT 1) and planner.purchase_orders in full by
-- shipment_ref ~318 times (the crossdock 3PL check, XDOCK_3PL_SQL). Neither column was indexed.
-- Additive, results identical (indexes only). Small tables (shipments ~460 rows, purchase_orders ~1,400), so the build is instant;
-- CONCURRENTLY is not needed. Safe to re-run.
CREATE INDEX IF NOT EXISTS shipments_master_po_idx ON planner.shipments (master_po);
CREATE INDEX IF NOT EXISTS purchase_orders_shipment_ref_idx ON planner.purchase_orders (shipment_ref);
ANALYZE planner.shipments;
ANALYZE planner.purchase_orders;
