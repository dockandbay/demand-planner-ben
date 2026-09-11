-- 121: Export port on suppliers + shipments.
-- The supplier's export_port is the default; a shipment inherits it from its master PO's supplier and can
-- override it (shipments.export_port). Effective = coalesce(shipment override, master-PO supplier default).
ALTER TABLE planner.suppliers ADD COLUMN IF NOT EXISTS export_port text;
ALTER TABLE planner.shipments ADD COLUMN IF NOT EXISTS export_port text;
