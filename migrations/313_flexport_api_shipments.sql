-- 313_flexport_api_shipments.sql  (v28.040, Ben)
-- Flexport API import lands in its OWN table, kept separate from the legacy report-fed planner.flexport_shipments.
-- Reads resolve via planner.flexport_shipments_effective: an API row wins; a flex_id only in the legacy table falls
-- back to it. When the legacy feed is decommissioned the fallback simply goes empty — no consumer change needed.
CREATE TABLE IF NOT EXISTS planner.flexport_api_shipments (LIKE planner.flexport_shipments INCLUDING ALL);

CREATE OR REPLACE VIEW planner.flexport_shipments_effective AS
  SELECT * FROM planner.flexport_api_shipments
  UNION ALL
  SELECT l.* FROM planner.flexport_shipments l
   WHERE NOT EXISTS (SELECT 1 FROM planner.flexport_api_shipments a WHERE a.flex_id = l.flex_id);
