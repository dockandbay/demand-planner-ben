-- migration 424
-- v28.745 (Ben 09-Nov-26, Kathryn's WSSI round 2, release 1): two new WSSI inputs and shared saved views.
--   cover_wks : target closing stock forward cover in weeks, by month x market x channel x category group (blank = 12 weeks).
--               DTC sets the 3PL pool, FBA the Amazon pool.
--   cutoff    : Cut off Stock Target, a manual figure with no calculation behind it; editable in any month, closed months included.
ALTER TABLE planner.wssi_overrides DROP CONSTRAINT IF EXISTS wssi_overrides_measure_check;
ALTER TABLE planner.wssi_overrides ADD CONSTRAINT wssi_overrides_measure_check
  CHECK (measure = ANY (ARRAY['fc_units'::text, 'target_units'::text, 'cover_wks'::text, 'cutoff'::text]));

-- named row layouts for DEMAND > WSSI, shared with the team (anyone with demand edit saves; the author or an admin deletes)
CREATE TABLE IF NOT EXISTS planner.wssi_views (
  id          bigserial PRIMARY KEY,
  name        text NOT NULL UNIQUE,
  rows_shown  text[] NOT NULL DEFAULT '{}',     -- WSSI row keys shown, in the page's row order
  closed      text[] NOT NULL DEFAULT '{}',     -- collapsed section keys
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
