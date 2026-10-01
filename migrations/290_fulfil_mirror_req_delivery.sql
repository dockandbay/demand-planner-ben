-- 290: store the Fulfil PO's requested_delivery_date on the drift mirror (Ben 21-Sep), so the PO grid's Fulfil column
-- can flag a DATE drift (Fulfil delivery date vs Horizon completion date) the same way the Cin7 column does — giving
-- the Fulfil column the same 3 states: in sync / update lines / update date. Additive, rollback-safe.
ALTER TABLE planner.fulfil_purchase_orders ADD COLUMN IF NOT EXISTS requested_delivery_date date;
