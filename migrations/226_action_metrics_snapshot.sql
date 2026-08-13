-- 226_action_metrics_snapshot.sql
-- Weekly "open actions" scoreboard (SUPPLY ▸ Reports ▸ Metrics). One row per Thursday 23:59 GMT snapshot; a cron writes
-- the 10 counts so we get a week-over-week record of open actions and how well we clear them. total_our = sum of OUR
-- actions only (supplier-waiting columns are tracked separately, their court). Re-running a week upserts on week_ending.
CREATE TABLE IF NOT EXISTS planner.action_metrics_snapshot (
  week_ending      date PRIMARY KEY,          -- the Thursday the snapshot represents
  captured_at      timestamptz NOT NULL DEFAULT now(),
  -- waiting on supplier (external)
  supplier_pos     int NOT NULL DEFAULT 0,    -- POs awaiting supplier approval
  supplier_dtc     int NOT NULL DEFAULT 0,    -- Direct-to-Client orders awaiting supplier approval
  -- our open actions
  po_actions       int NOT NULL DEFAULT 0,    -- PO action items
  order_plan       int NOT NULL DEFAULT 0,    -- order plan pending (accept/approve + ERP deviations)
  shipments        int NOT NULL DEFAULT 0,    -- shipments needing action
  manufacturing    int NOT NULL DEFAULT 0,    -- manufacturing open
  samples          int NOT NULL DEFAULT 0,    -- samples open
  payments_overdue int NOT NULL DEFAULT 0,    -- payments overdue
  dtc_mismatch     int NOT NULL DEFAULT 0,    -- DTC mismatch open (issues + unmapped POs)
  total_our        int NOT NULL DEFAULT 0,    -- headline: sum of the our-actions columns
  detail           jsonb                       -- optional per-metric breakdown
);
