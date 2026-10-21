-- v28.432 (Ben 21-Oct-26): CONFIG > Admin > Data health. A daily check of the Fulfil-fed data HORIZON holds (inventory on hand, inbound,
-- sales) that produces review points for action, kept across runs so the daily email shows what is NEW, still open and fixed. Additive only.
-- One row per check + record. sig = a fingerprint of the numbers; a dismissed finding reopens when its numbers change (sig differs).
CREATE TABLE IF NOT EXISTS planner.data_health_findings (
  id            bigserial PRIMARY KEY,
  check_key     text NOT NULL,                     -- e.g. inv_negative
  record        text NOT NULL,                     -- SKU, PO, SO or warehouse the finding is about
  area          text NOT NULL,                     -- inventory | inbound | sales
  severity      text NOT NULL DEFAULT 'amber',     -- high | amber | low
  title         text NOT NULL,
  detail        text,
  link          text,                              -- HORIZON hash route, e.g. #/supply/purchase-orders/plan
  sig           text,
  status        text NOT NULL DEFAULT 'open',      -- open | dismissed | fixed
  first_seen    timestamptz NOT NULL DEFAULT now(),
  last_seen     timestamptz NOT NULL DEFAULT now(),
  fixed_at      timestamptz,
  dismissed_by  text,
  dismissed_at  timestamptz,
  dismiss_reason text,
  dismissed_sig text,
  UNIQUE (check_key, record)
);
CREATE INDEX IF NOT EXISTS data_health_findings_status_idx ON planner.data_health_findings (status, area);
-- One row per run: counts per area (new / open / fixed), per-check errors, warehouse totals (next run's day-on-day compare), email result.
CREATE TABLE IF NOT EXISTS planner.data_health_runs (
  id        bigserial PRIMARY KEY,
  run_at    timestamptz NOT NULL DEFAULT now(),
  run_by    text,
  ms        integer,
  counts    jsonb NOT NULL DEFAULT '{}'::jsonb,
  errors    jsonb NOT NULL DEFAULT '[]'::jsonb,
  meta      jsonb NOT NULL DEFAULT '{}'::jsonb,
  emailed   text
);
CREATE INDEX IF NOT EXISTS data_health_runs_at_idx ON planner.data_health_runs (run_at DESC);
