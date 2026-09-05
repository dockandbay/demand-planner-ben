-- 029_shipment_mode.sql — sea/air mode on a shipment (v20.79)
--
-- The PO delivery date is ship date + the branch transit lead, picking the branch's sea_lead_time_days or
-- air_lead_time_days by the shipment's mode. Default 'sea' (also assumed when no shipment is assigned).
ALTER TABLE planner.shipments ADD COLUMN IF NOT EXISTS mode text;   -- 'sea' | 'air' (null → treated as sea)
