-- PO PLAN ▸ CLIENT: the client's own purchase-order reference and the dispatch-order reference.
ALTER TABLE planner.purchase_orders ADD COLUMN IF NOT EXISTS client_po_ref text;
ALTER TABLE planner.purchase_orders ADD COLUMN IF NOT EXISTS dispatch_order_ref text;
