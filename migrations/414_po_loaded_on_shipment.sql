-- v28.663 (Ben 04-Nov-26): before a shipment can be marked shipped in the supplier portal, the consolidating (master) supplier ticks each PO
-- on board as loaded. Stored per PO (a PO rides on one shipment).
ALTER TABLE planner.purchase_orders ADD COLUMN IF NOT EXISTS loaded_on_shipment boolean NOT NULL DEFAULT false;
ALTER TABLE planner.purchase_orders ADD COLUMN IF NOT EXISTS loaded_at timestamptz;
ALTER TABLE planner.purchase_orders ADD COLUMN IF NOT EXISTS loaded_by text;
