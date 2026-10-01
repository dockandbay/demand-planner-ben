-- 045_po_client.sql — per-PO Client section (v20.189)
--
-- Each PO gets client info: name (reuses the existing purchase_orders.client column), requirements, sales-order
-- reference, and a crossdock reference = a multi-select of SKUs (stored comma-separated). Eligible crossdock SKUs
-- are any whose code starts with CROSSDOCK or PREORDER. Sets up a future supplier-portal "download crossdock labels".
ALTER TABLE planner.purchase_orders ADD COLUMN IF NOT EXISTS client_requirements text;
ALTER TABLE planner.purchase_orders ADD COLUMN IF NOT EXISTS sales_order_ref text;
ALTER TABLE planner.purchase_orders ADD COLUMN IF NOT EXISTS crossdock_skus text;   -- comma-separated SKU list
