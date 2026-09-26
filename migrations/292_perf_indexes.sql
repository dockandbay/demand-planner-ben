-- 292_perf_indexes.sql
-- v27.799 (Ben, technical-review perf item #11): indexes on the hottest WHERE / JOIN / = ANY() columns surfaced by the
-- review. All IF NOT EXISTS + idempotent. On a large prod table Diviyaj may prefer CREATE INDEX CONCURRENTLY (cannot run
-- inside a txn) — the column list is the same. These back the 3PL-invoice map/journal/xero-bill/sweep lookups, the DTC
-- mismatch reconciliation, and the FBA in-flight prune.

-- 3PL invoice cost-centre lookups: tpl/map (= ANY reference|customer_order_no), journal, xero-bill, cin7-sweep covOf.
CREATE INDEX IF NOT EXISTS tpl_cin7_orders_reference  ON planner.tpl_cin7_orders (reference);
CREATE INDEX IF NOT EXISTS tpl_cin7_orders_custorder  ON planner.tpl_cin7_orders (customer_order_no);

-- DTC mismatch: base filter (open, not dispatched) + soByRef join + line fan-out (= ANY(so_cin7_id)) + DELETE on import.
CREATE INDEX IF NOT EXISTS dtc_sales_orders_reference  ON planner.dtc_sales_orders (reference);
CREATE INDEX IF NOT EXISTS dtc_sales_orders_open        ON planner.dtc_sales_orders (is_void, dispatched_date);
CREATE INDEX IF NOT EXISTS dtc_sales_order_lines_so     ON planner.dtc_sales_order_lines (so_cin7_id);
CREATE INDEX IF NOT EXISTS dtc_po_so_map_po             ON planner.dtc_po_so_map (po);

-- FBA in-flight prune (reference IN inbound_shipments) + PO line fan-out used across supply reports.
CREATE INDEX IF NOT EXISTS inbound_shipments_reference  ON planner.inbound_shipments (reference);
CREATE INDEX IF NOT EXISTS purchase_order_lines_po       ON planner.purchase_order_lines (po);
