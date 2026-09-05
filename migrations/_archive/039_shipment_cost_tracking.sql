-- 039_shipment_cost_tracking.sql — shipment freight cost + carrier tracking fields (v20.134)
--
-- Freight cost resolves: Flexport quote (if linked) ▸ manual entry ▸ estimate (AIR = $10/kg × weight; SEA =
-- freight_rates by destination × container; FOB = $0). cost_manual holds a hand-entered freight cost.
-- tracked_delivery_date / tracked_source hold a carrier-API (DHL/Fedex) delivery date when we wire those feeds;
-- for now they can be entered manually. mode (sea/air/fob) already exists on the table (029).
ALTER TABLE planner.shipments ADD COLUMN IF NOT EXISTS cost_manual           numeric;
ALTER TABLE planner.shipments ADD COLUMN IF NOT EXISTS tracked_delivery_date date;
ALTER TABLE planner.shipments ADD COLUMN IF NOT EXISTS tracked_source        text;
