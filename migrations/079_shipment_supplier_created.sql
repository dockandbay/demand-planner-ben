-- 079: flag shipments that a supplier created from the portal (by submitting carrier/tracking on a PO with no
-- shipment). These raise a "Supplier created new shipment" action so the planner reviews the new shipment.

ALTER TABLE planner.shipments
  ADD COLUMN IF NOT EXISTS supplier_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS supplier_created_by text;
