-- 256: PRODUCT samples — per-aspect feedback + decision, and the "rejected_new_sample" stage
--
-- A supplier sample can cover several ASPECTS (Product / Packaging / Labels-wraps / Polybag / Other).
-- We now capture feedback AND an approve/reject decision PER ASPECT on each sample version, instead of one
-- feedback box for the whole sample. The decision also flows to the Variants tab: approving/rejecting an aspect
-- writes the matching component approval on planner.product_dev_size_dimensions for the sizes the sample covers
-- (handled in the app/server; this table is the sample-side record + the per-aspect feedback text).
--
-- No live data yet (Ben) — the old single planner.product_dev_samples.admin_feedback column is left in place
-- (a whole-sample note) and simply superseded by the per-aspect rows below.

CREATE TABLE IF NOT EXISTS planner.product_sample_aspect_feedback (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sample_id  bigint NOT NULL REFERENCES planner.product_dev_samples(id) ON DELETE CASCADE,
  aspect     text   NOT NULL,                       -- product | packaging | labels | polybag | other
  feedback   text   NOT NULL DEFAULT '',
  decision   text   NOT NULL DEFAULT 'pending',     -- pending | approved | rejected
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sample_id, aspect)
);

CREATE INDEX IF NOT EXISTS product_sample_aspect_feedback_sample ON planner.product_sample_aspect_feedback (sample_id);

-- The product STAGE machine gains a "rejected_new_sample" state: a D&B decision that sends the item back to the
-- supplier to produce a fresh sample (i.e. back into sampling). Derived approval status = 'in_development'.
-- `stage` is a free-text column (no enum), so no column change is needed — the app/server allow-list is widened.
-- (Documented here so the state is discoverable alongside the schema.)
