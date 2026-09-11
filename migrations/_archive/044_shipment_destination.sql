-- 044_shipment_destination.sql — shipment-level ship-to / branch override (v20.186)
--
-- The shipment's destination INHERITS from the master PO (calculated: country_code ▸ branch country; branch),
-- but can be OVERRIDDEN here without touching the POs aboard — so an FBA or direct-to-client PO can be
-- crossdocked via e.g. UK ILG. Displayed like the dates: bold "final" (calc/override) with the override below.
ALTER TABLE planner.shipments ADD COLUMN IF NOT EXISTS branch text;
ALTER TABLE planner.shipments ADD COLUMN IF NOT EXISTS country_code text;
