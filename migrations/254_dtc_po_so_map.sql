-- 254_dtc_po_so_map.sql
-- In-app PO <-> Sales Order mapping for the DTC-mismatch report (Ben, 02-Sep-26).
--
-- Cin7's purchase_orders.sales_order_ref is n8n-fed and holds a single free-text value per PO
-- (sometimes several refs packed together, e.g. "JLEW11511-59, JLEW11511-63" or "A and B"). It
-- can't be edited without touching Cin7, and packed refs can't be matched exactly. This table lets
-- HORIZON add PO<->SO edges (many-to-many) and suppress a wrong Cin7 edge, surviving n8n resyncs.
--   link = true  -> an added edge  (this PO belongs to this sales order)
--   link = false -> a suppressed edge (this PO does NOT belong to that sales order; hides a Cin7 link)
-- The reconciliation builds the SO<->PO graph = (parsed Cin7 refs UNION app link=true) MINUS
-- (app link=false), groups by connected component, and compares grouped SO vs PO SKU/qty.
--
-- Additive, non-destructive: nothing reads this table until v27.377 ships. No existing rows change.
CREATE TABLE IF NOT EXISTS planner.dtc_po_so_map (
  po               text        NOT NULL,
  sales_order_ref  text        NOT NULL,
  link             boolean     NOT NULL DEFAULT true,
  created_by       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (po, sales_order_ref)
);
CREATE INDEX IF NOT EXISTS dtc_po_so_map_so_idx ON planner.dtc_po_so_map (sales_order_ref);
