-- 140: delivery notes on a shipment record.
-- Shows under SHIPMENTS ▸ Shipment details. Inherits from the master PO's branch delivery notes (which itself
-- falls back to the branch); editing stores a shipment-level override.
ALTER TABLE planner.shipments
  ADD COLUMN IF NOT EXISTS delivery_notes text;
