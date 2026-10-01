-- Decommission the Sell-through targets / Set-targets feature (Ben 17-Aug-26).
-- The DEMAND ▸ Inputs ▸ Sell-through targets page, GET/POST /api/targets, and the Auto-Forecast + Demand Actions
-- table dependencies have all been removed in the app (v27.082). This drops the now-unused table.
DROP TABLE IF EXISTS planner.sell_through_targets;
