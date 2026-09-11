-- Shared B2B allocation analyses (v26.602). SCENARIO ▸ B2B: when a user clicks "Save & share", the run is stored
-- here so the team can see recent analyses provided by others (input SKUs/qtys + the point-in-time result). Additive.
CREATE TABLE IF NOT EXISTS planner.b2b_analysis (
  id          serial PRIMARY KEY,
  client      text,
  market      text,
  required_by date,
  lines       jsonb NOT NULL,     -- input [{sku, qty}]
  result      jsonb,              -- point-in-time analysis rows (as run)
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS b2b_analysis_recent_idx ON planner.b2b_analysis (created_at DESC);
