-- v28.022 (Ben): persist the per-SKU buy plan (computed in the browser) to a table so it is queryable
-- (SQL + Ask Claude), mirroring planner.auto_forecast_feed. The browser posts a snapshot after each build;
-- only the latest few are kept. planner.buy_plan_latest unnests the newest snapshot into per-SKU rows.
-- Additive only.

CREATE TABLE IF NOT EXISTS planner.buy_plan_snapshot (
  id           bigserial PRIMARY KEY,
  computed_at  timestamptz NOT NULL DEFAULT now(),
  computed_by  text,
  app_version  text,
  row_count    integer,
  units_total  bigint,
  rows         jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS buy_plan_snapshot_at_idx ON planner.buy_plan_snapshot (computed_at DESC);

-- The latest buy plan, one row per SKU x market, for easy querying.
CREATE OR REPLACE VIEW planner.buy_plan_latest AS
SELECT s.computed_at, s.app_version,
       (r->>'sku')                       AS sku,
       upper(r->>'mkt')                  AS market,
       (r->>'buy_3pl')::numeric          AS buy_3pl,
       (r->>'buy_3pl_urgent')::numeric   AS buy_3pl_urgent,
       (r->>'buy_fba')::numeric          AS buy_fba,
       (r->>'transfer')::numeric         AS transfer,
       (r->>'future_qty')::numeric       AS future_qty,
       (r->>'soh_3pl')::numeric          AS soh_3pl,
       (r->>'soh_fba')::numeric          AS soh_fba,
       (r->>'on_order')::numeric         AS on_order,
       (r->>'inbound')::numeric          AS inbound
FROM planner.buy_plan_snapshot s,
     LATERAL jsonb_array_elements(s.rows) r
WHERE s.id = (SELECT id FROM planner.buy_plan_snapshot ORDER BY computed_at DESC LIMIT 1);
