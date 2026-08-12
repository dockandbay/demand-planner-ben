-- 220: forecast Snapshots — lock a version of the SKU-level demand forecast to compare against later (DEMAND ▸ Snapshots)
-- and to show "what we forecast for this month" next to the actual on past months (#4). A snapshot is a copy of
-- planner.forecast_outputs (SKU × warehouse × channel × month → units) at a point in time, plus a header (name/who/when).
-- We copy the raw stored unit VALUES (not the inputs) so a past month's forecast is preserved exactly — recomputing
-- from inputs would return the actual for a now-complete month, not what was forecast. Category level = SUM of SKU rows.
-- Many named snapshots; deletable (rows cascade). Compare = diff any two (or vs live).
CREATE TABLE IF NOT EXISTS planner.forecast_snapshots (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        text NOT NULL,
  taken_at    timestamptz NOT NULL DEFAULT now(),
  taken_by    text,
  row_count   integer
);
CREATE TABLE IF NOT EXISTS planner.forecast_snapshot_rows (
  snapshot_id bigint NOT NULL REFERENCES planner.forecast_snapshots(id) ON DELETE CASCADE,
  sku         text NOT NULL,
  warehouse   text NOT NULL,
  channel     text NOT NULL,
  month       date NOT NULL,
  units       integer,
  PRIMARY KEY (snapshot_id, sku, warehouse, channel, month)
);
CREATE INDEX IF NOT EXISTS forecast_snapshot_rows_snap_idx ON planner.forecast_snapshot_rows (snapshot_id);
