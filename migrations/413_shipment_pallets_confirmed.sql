-- v28.657 (Ben 04-Nov-26): the master supplier confirms the shipment's pallet count in the supplier portal (PO > SHIPMENT); the pallet
-- labels print 1 of N .. N of N from it. One count per shipment (the master supplier palletises everything aboard).
ALTER TABLE planner.shipments ADD COLUMN IF NOT EXISTS pallets_confirmed int;
ALTER TABLE planner.shipments ADD COLUMN IF NOT EXISTS pallets_confirmed_by text;
ALTER TABLE planner.shipments ADD COLUMN IF NOT EXISTS pallets_confirmed_at timestamptz;
