-- Shared Xero Compare snapshot (v26.600). Whoever uploads the Xero XLSX, the parsed rows are stored here
-- (single row, id=1) so EVERYONE sees the same last upload, re-analysed against live Horizon data, for 1 week.
-- Replaces the old per-browser localStorage persistence. Additive; safe to re-run.
CREATE TABLE IF NOT EXISTS planner.xero_compare_snapshot (
  id          integer PRIMARY KEY,          -- always 1 (single shared snapshot)
  rows        jsonb   NOT NULL,             -- parsed Xero rows (the output of /api/supply/xero-parse)
  filename    text,
  period      text,                          -- report period end (bounds the comparison)
  uploaded_by text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
