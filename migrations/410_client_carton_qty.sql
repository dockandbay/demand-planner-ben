-- 410 (v28.624): client-specific carton quantity per PO line (Ben, NEXT direct-to-client orders).
-- key_accounts.client_carton_qty = toggle (CONFIG > Key Accounts): that client's POs get a "Client ctn" column on the ORDER PLAN tab.
-- purchase_order_lines.client_carton_qty = the override for this order. Blank = the standard carton qty.
-- When set it drives the carton labels, the shipment-plan carton counts and the supplier portal.
ALTER TABLE planner.key_accounts ADD COLUMN IF NOT EXISTS client_carton_qty boolean NOT NULL DEFAULT false;
ALTER TABLE planner.purchase_order_lines ADD COLUMN IF NOT EXISTS client_carton_qty integer;
ALTER TABLE planner.purchase_order_lines DROP CONSTRAINT IF EXISTS purchase_order_lines_client_carton_qty_pos;
ALTER TABLE planner.purchase_order_lines ADD CONSTRAINT purchase_order_lines_client_carton_qty_pos CHECK (client_carton_qty IS NULL OR client_carton_qty > 0);
COMMENT ON COLUMN planner.key_accounts.client_carton_qty IS 'Client-specific carton qty: adds the Client ctn column to this client''s PO order plans (v28.624).';
COMMENT ON COLUMN planner.purchase_order_lines.client_carton_qty IS 'Carton qty this client wants on this order (overrides the standard). Null = standard (v28.624).';
UPDATE planner.key_accounts SET client_carton_qty = true WHERE name = 'NEXT';
