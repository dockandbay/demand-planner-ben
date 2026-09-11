-- 076: Shipment escalation — an ESCALATED toggle on a shipment (set from the supplier portal Shipment Plan or
-- the admin Shipments grid). Shows as a column + filter on SUPPLY ▸ Shipments and raises an Action while escalated.

ALTER TABLE planner.shipments
  ADD COLUMN IF NOT EXISTS escalated     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalated_at  timestamptz;
