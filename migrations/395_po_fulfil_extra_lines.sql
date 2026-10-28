-- 395_po_fulfil_extra_lines.sql (v28.537, Ben 28-Oct-26, PO-1892095 - PO475: "i have linked to 2 PO's and when linking the second po i would expect
-- the erp drift to disappear if they match"). Extra Fulfil POs (migration 394) keep a copy of their lines so HORIZON's ERP qty is the MAIN Fulfil
-- PO + its extras, per SKU. Read from Fulfil when an extra is linked and on every Fulfil refresh. Additive.
ALTER TABLE planner.po_fulfil_extra ADD COLUMN IF NOT EXISTS lines jsonb;
ALTER TABLE planner.po_fulfil_extra ADD COLUMN IF NOT EXISTS synced_at timestamptz;
