-- 339_po_fulfil_is_number.sql  (v28.223, Ben, SUG-0042): the Fulfil internal shipment (IS) number that moves a PO from
-- China Port to its destination. Flexport bookings lodged from HORIZON are now NAMED by the IS number (with every PO on
-- the shipment as Purchase Order tags), so the Flexport shipment name no longer equals the PO number. The Flexport import
-- uses this column to link a Flexport shipment named "IS377" back to its PO (sets flexport_reference). Set when a booking
-- is lodged. Additive + idempotent; until applied, bookings still lodge (named by IS) and the link falls back to manual.
ALTER TABLE planner.purchase_orders ADD COLUMN IF NOT EXISTS fulfil_is_number text;
CREATE INDEX IF NOT EXISTS purchase_orders_fulfil_is_number_idx ON planner.purchase_orders (fulfil_is_number) WHERE fulfil_is_number IS NOT NULL;
COMMENT ON COLUMN planner.purchase_orders.fulfil_is_number IS 'Fulfil stock.shipment.internal number (IS...) for this PO; Flexport booking name. v28.223';
