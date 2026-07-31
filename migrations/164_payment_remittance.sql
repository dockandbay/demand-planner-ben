-- 164: Payments Report — remittance upload + delayed "paid" notification email to the supplier.
-- A payment-run row is keyed by run_key = '<YYYY-MM-DD>|<supplier>' (same grouping as payment_fx / payments-report).
-- On "Mark paid & notify", an email is QUEUED with send_after = now()+5min so a remittance can be uploaded first;
-- a background worker sends it (attaching the remittance if present) unless cancelled inside the window.

CREATE TABLE IF NOT EXISTS planner.payment_remittances (
  id          bigserial PRIMARY KEY,
  run_key     text NOT NULL,
  supplier_name text,
  filename    text,
  mime        text,
  byte_size   int,
  data        bytea,
  uploaded_by text,
  uploaded_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_remittances_run_idx ON planner.payment_remittances(run_key);

CREATE TABLE IF NOT EXISTS planner.payment_emails (
  id          bigserial PRIMARY KEY,
  run_key     text NOT NULL,
  supplier_name text,
  to_emails   text,
  amount      numeric,
  currency    text,
  pay_date    text,
  send_after  timestamptz NOT NULL,
  status      text NOT NULL DEFAULT 'queued',   -- queued | sending | sent | cancelled | failed
  sent_at     timestamptz,
  error       text,
  created_by  text,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_emails_status_idx ON planner.payment_emails(status, send_after);
CREATE INDEX IF NOT EXISTS payment_emails_run_idx ON planner.payment_emails(run_key);
