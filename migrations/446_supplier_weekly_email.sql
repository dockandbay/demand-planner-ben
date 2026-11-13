-- migration 446
-- v28.814 (Ben 13-Nov-26): SUPPLIER WEEKLY WRAP-UP email. Per supplier switch (CONFIG > Suppliers: "Enable weekly email wrap", default off)
-- and a log of every Sunday run (one row per supplier per week: sent / skipped (nothing to say) / error), so a week is never sent twice. Safe to re-run.
ALTER TABLE planner.suppliers ADD COLUMN IF NOT EXISTS weekly_email_enabled boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS planner.supplier_weekly_log (
  id           bigserial PRIMARY KEY,
  supplier     text NOT NULL,
  week_ending  date NOT NULL,
  status       text NOT NULL,                 -- sent / skipped / error / test
  recipients   text,
  actions      int,
  payments     int,
  new_pos      int,
  error        text,
  by           text,
  at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS supplier_weekly_log_sup_wk ON planner.supplier_weekly_log (supplier, week_ending);
-- Read back: SELECT count(*) FILTER (WHERE weekly_email_enabled) FROM planner.suppliers;  -- 0 (all off)
--            SELECT to_regclass('planner.supplier_weekly_log');                            -- non-null
