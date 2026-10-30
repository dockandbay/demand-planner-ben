-- 406_workflows.sql (v28.599, Ben 31-Oct-26): WORKFLOWS (CONFIG > Admin > Workflows). A workflow is a saved copy of a template
-- (When / If / Then / Guardrails): enabled, mode dry / ask / auto, and its settings in config. Each run finds items (a change it
-- would make); an item waits for approval (ask), is applied (auto, or once approved), or is skipped. dedupe_key stops the same
-- change being raised twice. Additive only; HORIZON creates the two supply workflows (switched off) the first time the page loads.
BEGIN;
CREATE TABLE IF NOT EXISTS planner.workflows (
  id           serial PRIMARY KEY,
  template     text NOT NULL,                 -- e.g. 'supplier_completion', 'fulfil_dates'
  name         text NOT NULL,
  enabled      boolean NOT NULL DEFAULT false,
  mode         text NOT NULL DEFAULT 'ask' CHECK (mode IN ('dry','ask','auto')),
  config       jsonb NOT NULL DEFAULT '{}'::jsonb,   -- conditions, recipients, caps (per template)
  last_run_at  timestamptz,
  created_by   text, created_at timestamptz NOT NULL DEFAULT now(),
  updated_by   text, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS planner.workflow_runs (
  id           bigserial PRIMARY KEY,
  workflow_id  int NOT NULL REFERENCES planner.workflows(id) ON DELETE CASCADE,
  trigger      text NOT NULL DEFAULT 'cron',  -- cron / manual
  mode         text NOT NULL,
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz,
  found int NOT NULL DEFAULT 0, applied int NOT NULL DEFAULT 0, waiting int NOT NULL DEFAULT 0, failed int NOT NULL DEFAULT 0,
  error        text,
  by_user      text
);
CREATE INDEX IF NOT EXISTS workflow_runs_wf_idx ON planner.workflow_runs (workflow_id, started_at DESC);
CREATE TABLE IF NOT EXISTS planner.workflow_items (
  id           bigserial PRIMARY KEY,
  workflow_id  int NOT NULL REFERENCES planner.workflows(id) ON DELETE CASCADE,
  run_id       bigint REFERENCES planner.workflow_runs(id) ON DELETE SET NULL,
  dedupe_key   text NOT NULL,
  record_type  text,                          -- po / shipment / is
  record_ref   text,
  title        text,
  detail       jsonb NOT NULL DEFAULT '{}'::jsonb,   -- old / new values and what the action needs
  state        text NOT NULL DEFAULT 'waiting' CHECK (state IN ('dry','waiting','applied','skipped','failed','superseded')),
  result       text,
  decided_by   text, decided_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS workflow_items_dedupe_uq ON planner.workflow_items (workflow_id, dedupe_key);
CREATE INDEX IF NOT EXISTS workflow_items_state_idx ON planner.workflow_items (state, created_at DESC);
COMMIT;
