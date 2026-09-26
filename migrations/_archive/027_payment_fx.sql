-- 027_payment_fx.sql — actual paid currency/amount per payment (date × supplier) (v20.45)
-- A payment in the report = a date + supplier. We may have paid it in a non-USD currency (GBP/EUR/
-- AUD); record the actual paid currency + amount here so the report can show it alongside the USD legs.
CREATE TABLE IF NOT EXISTS planner.payment_fx (
  run_date     date,
  supplier     text,
  paid_currency text,
  paid_amount  numeric,
  updated_at   timestamptz DEFAULT now(),
  PRIMARY KEY (run_date, supplier)
);
