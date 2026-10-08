-- 340_intake_deadlines.sql  (v28.224/225, Ben, SUG-0045): DEMAND ▸ Analysis ▸ Intake deadlines.
-- intake_deadlines: the date stock must be in a branch location (warehouse code, e.g. uk_3pl, uk_fba, us_fba).
--   sku = '*' is the LOCATION intake date (applies to every SKU there); a real SKU is a per-SKU override.
--   Precedence: SKU at location > location date > the market launch date (app_settings.intake_lead_days, default 0).
-- alert_snoozes: generic per-alert snooze (alert_key e.g. 'intake|SKU|uk_3pl') until a date.
-- Additive + idempotent; until applied the view works on launch-date deadlines and edits/snoozes return 503.
CREATE TABLE IF NOT EXISTS planner.intake_deadlines (
  sku        text NOT NULL,
  location   text NOT NULL,
  deadline   date NOT NULL,
  note       text,
  set_by     text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sku, location)
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
COMMENT ON TABLE planner.intake_deadlines IS 'DEMAND intake deadline per branch location (sku=*) or SKU x location override; default = launch date. v28.225';
COMMENT ON TABLE planner.alert_snoozes IS 'Generic alert snooze by alert_key until a date. v28.224';
