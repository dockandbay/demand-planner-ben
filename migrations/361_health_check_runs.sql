-- v28.306 (Ben 13-Oct-26): CONFIG > Admin > App health. "clicking this analyse should persist and also save history".
-- One row per Run health check: the counts, the full per-endpoint results and the Claude Code report, so the page opens on the
-- last run and older runs can be reopened. The server keeps the newest 200 runs. Additive and idempotent.
CREATE TABLE IF NOT EXISTS planner.health_check_runs (
  id bigserial PRIMARY KEY,
  ran_at timestamptz NOT NULL DEFAULT now(),
  ran_by text,
  version text,
  include_live boolean NOT NULL DEFAULT false,
  duration_ms integer,
  total integer, errors integer, slow integer, moderate integer,
  portals jsonb,                        -- { supplier: bool, client: bool }
  results jsonb,                        -- [{ path, group, status, ms, kb, err }]
  report text                           -- the markdown copied for Claude Code
);
CREATE INDEX IF NOT EXISTS health_check_runs_ran_at_idx ON planner.health_check_runs (ran_at DESC);
