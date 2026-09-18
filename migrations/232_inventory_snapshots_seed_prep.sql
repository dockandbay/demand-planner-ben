-- 232_inventory_snapshots_seed_prep.sql
-- Prepares planner.inventory_snapshots for the Category Trends inventory history (seed + weekly capture).
-- Idempotent for BOTH environments: the sandbox has no table (this creates it); prod has the table WITH an FK on
-- warehouse (this drops it + adds the `source` column). Option A from HORIZON_INVENTORY_SNAPSHOT_SEED §3.1: the FK is
-- dropped so non-planning warehouses (us_awd, uk_nongrs, us_nongrs) can be written; the loader validates via allow-list.
BEGIN;

-- Sandbox: create the table if it isn't there yet (same shape as prod, minus the warehouse FK).
CREATE TABLE IF NOT EXISTS planner.inventory_snapshots (
  sku           text NOT NULL,
  warehouse     text NOT NULL,
  snapshot_date date NOT NULL,
  available     numeric,
  source        text,
  PRIMARY KEY (sku, warehouse, snapshot_date)
);

-- Prod: table exists without `source` — add it (seeded vs live rows must be distinguishable).
ALTER TABLE planner.inventory_snapshots ADD COLUMN IF NOT EXISTS source text;

-- Prod: drop the warehouse FK so us_awd / *_nongrs can be seeded (leaf analytics table, no app readers).
ALTER TABLE planner.inventory_snapshots DROP CONSTRAINT IF EXISTS inventory_snapshots_warehouse_fkey;

-- Read-side index for the date-range scans the Category Trends report runs.
CREATE INDEX IF NOT EXISTS inventory_snapshots_wh_date_idx ON planner.inventory_snapshots (warehouse, snapshot_date);

COMMIT;
