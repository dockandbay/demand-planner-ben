-- 270: Create Purchase Orders — "Save Project" (Ben, 2026-09-08).
-- Saves a production-PO build (the selection + overrides + a snapshot of the recommended numbers)
-- so it can be reselected later. On reload the app recomputes the live recommendations and flags
-- any SKU that has MOVED since the project was saved (without overwriting the saved numbers).
CREATE TABLE IF NOT EXISTS planner.buy_projects (
  id          bigserial PRIMARY KEY,
  name        text NOT NULL,
  mode        text NOT NULL DEFAULT '3pl',            -- '3pl' | 'fba'
  data        jsonb NOT NULL DEFAULT '{}'::jsonb,      -- {prod_no,batch_id,start_date, ovr, tick, sup, tiertop, cn, inca, rec}
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
-- One project per name (case-insensitive) → "Save" upserts, "Save as" makes a new one.
CREATE UNIQUE INDEX IF NOT EXISTS buy_projects_name_key ON planner.buy_projects (lower(name));
