-- 078: read/unread on shipment timeline notes (mirrors supplier_notes.read_at). A supplier-authored note shows
-- as "new" on the admin SUPPLY ▸ Shipments grid until an internal user marks it read; an unread counter shows
-- on the shipment row. read_at NULL = unread.

ALTER TABLE planner.shipment_notes
  ADD COLUMN IF NOT EXISTS read_at timestamptz;
