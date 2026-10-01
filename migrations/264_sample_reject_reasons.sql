-- 264: configurable Sample reject reasons (PRODUCT ▸ Config) + the per-rejection capture log.
-- When a sample aspect is rejected (rejected_new_sample / stop_development) the reviewer must tag ≥1 reason,
-- so we can report WHY samples are rejected, sliced by supplier / season / product type. Reasons are a defined,
-- editable list; supplier/season/type are derived at report time from the sample's product (no denormalisation).

CREATE TABLE IF NOT EXISTS planner.sample_reject_reasons (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text    NOT NULL,
  sort       int     NOT NULL DEFAULT 0,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name)
);

-- Applied reasons: one row per (sample version × aspect × reason). Re-samples create new sample versions, so
-- history accrues naturally. Cleared for an aspect if its decision moves back off a rejected stage.
CREATE TABLE IF NOT EXISTS planner.product_sample_reject_reasons (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sample_id  bigint NOT NULL,
  aspect     text   NOT NULL,
  reason_id  bigint NOT NULL REFERENCES planner.sample_reject_reasons(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  UNIQUE (sample_id, aspect, reason_id)
);
CREATE INDEX IF NOT EXISTS product_sample_reject_reasons_sample ON planner.product_sample_reject_reasons (sample_id);

-- Starter list (Ben). Idempotent — never clobbers reasons Ben has edited.
INSERT INTO planner.sample_reject_reasons (name, sort, active) VALUES
  ('Colour issue', 1, true),
  ('Finishing',    2, true),
  ('Packing',      3, true)
ON CONFLICT (name) DO NOTHING;
