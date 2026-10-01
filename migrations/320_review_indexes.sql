-- 320_review_indexes.sql  (v28.116, Ben) — code-review P1 items S16–S18 (30-Sep-2026 review plan).
-- All IF NOT EXISTS + idempotent. On the large prod tables Diviyaj may prefer CREATE INDEX CONCURRENTLY
-- (cannot run inside a transaction) — same note as 292_perf_indexes.sql.

-- S16: supplier_notes is scanned per PO row in correlated subqueries (PO grid, cash flow, product list, portal bootstrap)
-- and had only its PK + a partial (sample_id) index. Every PO-grid build was rows × sequential scan.
CREATE INDEX IF NOT EXISTS supplier_notes_po_idx          ON planner.supplier_notes (po);
CREATE INDEX IF NOT EXISTS supplier_notes_po_unread_idx   ON planner.supplier_notes (po, author_kind) WHERE read_at IS NULL;   -- the unread counters
CREATE INDEX IF NOT EXISTS supplier_notes_supplier_id_idx ON planner.supplier_notes (supplier_id);                              -- portal = ANY($1) reads

-- S17: forecast_outputs is filtered on channel alone ('ZAL') and on month alone; the only indexes lead with sku.
CREATE INDEX IF NOT EXISTS forecast_outputs_channel_idx ON planner.forecast_outputs (channel);
CREATE INDEX IF NOT EXISTS forecast_outputs_month_idx   ON planner.forecast_outputs (month);

-- S18: inventory_snapshots is GROUPed BY snapshot_date over the whole table; the only index is (warehouse, snapshot_date).
CREATE INDEX IF NOT EXISTS inventory_snapshots_date_idx ON planner.inventory_snapshots (snapshot_date);
