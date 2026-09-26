-- PO PLAN ▸ CLIENT: the final delivery address (where the goods ultimately go), also rendered on crossdock labels.
ALTER TABLE planner.purchase_orders ADD COLUMN IF NOT EXISTS final_delivery_address text;
