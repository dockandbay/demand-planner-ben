-- 082_po_shipment_starred.sql
-- "Focus / favourite" star toggle on Purchase Orders and Shipments.
-- Adds a shared, persistent boolean flag. Toggled from the SUPPLY ▸ Purchase Orders and
-- SUPPLY ▸ Shipments grids; the "⭐ Focus" filter shows only starred + active (non-complete) items.
-- Shared across the team and every device (DB-backed, not per-browser). Idempotent.

ALTER TABLE planner.purchase_orders ADD COLUMN IF NOT EXISTS starred boolean NOT NULL DEFAULT false;
ALTER TABLE planner.shipments       ADD COLUMN IF NOT EXISTS starred boolean NOT NULL DEFAULT false;
