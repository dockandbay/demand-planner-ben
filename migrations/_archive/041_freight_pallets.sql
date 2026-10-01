-- 041_freight_pallets.sql — pallet capacity per sea container + drop unused sizes (v20.147)
--
-- Each sea container size carries a number of pallets: 40ft = 20, 20ft = 10, LCL = 1. The shipment SEA estimate
-- packs the shipment's pallets into the cheapest combination of containers (e.g. 3 pallets = 3×LCL; 19 pallets =
-- a 40ft if that's cheaper than 19×LCL). 40HC and Air rows are removed from the sea card (40HC unused; air is the
-- separate tiered card, 040).
ALTER TABLE planner.freight_rates ADD COLUMN IF NOT EXISTS pallets int;
UPDATE planner.freight_rates SET pallets = CASE container_size WHEN '40ft' THEN 20 WHEN '20ft' THEN 10 WHEN 'LCL' THEN 1 ELSE pallets END;
DELETE FROM planner.freight_rates WHERE container_size IN ('40HC','Air');
