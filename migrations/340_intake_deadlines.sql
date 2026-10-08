-- 340_intake_deadlines.sql  (v28.224, Ben, SUG-0045): DEMAND ▸ Analysis ▸ Intake deadlines.
-- intake_deadlines: an explicit "stock must be in the warehouse by" date per SKU x country. When a SKU x country has no
-- row, HORIZON uses the country launch date minus N days (app_settings.intake_lead_days, default 14).
-- alert_snoozes: generic per-alert snooze (alert_key e.g. 'intake|SKU|UK'), hides an alert from the counters until a date.
-- Additive + idempotent; until applied the view works on default deadlines and snooze/edit return 503.
CREATE TABLE IF NOT EXISTS planner.intake_deadlines (
  sku        text NOT NULL,
  country    text NOT NULL,
  deadline   date NOT NULL,
  note       text,
  set_by     text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sku, country)
);
CREATE TABLE IF NOT EXISTS planner.alert_snoozes (
  alert_key  text PRIMARY KEY,
  kind       text NOT NULL,
  until      date NOT NULL,
  reason     text,
  set_by     text,
  set_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS alert_snoozes_kind_until_idx ON planner.alert_snoozes (kind, until);
COMMENT ON TABLE planner.intake_deadlines IS 'DEMAND intake deadline per SKU x country (explicit; default = launch minus intake_lead_days). v28.224';
COMMENT ON TABLE planner.alert_snoozes IS 'Generic alert snooze by alert_key until a date. v28.224';
