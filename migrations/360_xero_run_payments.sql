-- v28.288 (Ben 12-Oct-26): Payments Report "Paid" with a bank account. Marking a run paid can now also create the Xero payment from the
-- chosen bank account against every bill the run pays (the SUPPLIER-PAYMENT bill and each Other payment's own bill), so the one bank
-- line matches them together. One row per bill paid, written BEFORE the Xero call (a bill is never paid twice for the same run), and
-- the bank chosen is remembered on the run (payment_fx). Additive and idempotent.
CREATE TABLE IF NOT EXISTS planner.xero_run_payments (
  id bigserial PRIMARY KEY,
  run_key text NOT NULL,                -- date|supplier (UK) or date|supplier|AU, as the Payments Report row
  region text,                          -- paying Xero org: uk | au
  invoice_id text NOT NULL,             -- the Xero bill paid
  invoice_number text,
  bank_account_id text,
  bank_name text,
  amount numeric,                       -- in the bill currency
  currency text,
  currency_rate numeric,                -- set when a base-currency bank pays a foreign-currency bill (foreign per 1 base)
  payment_date date,
  xero_payment_id text,
  status text NOT NULL,                 -- creating | created | error
  error text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS xero_run_payments_once ON planner.xero_run_payments (run_key, invoice_id) WHERE status IN ('creating','created');
CREATE INDEX IF NOT EXISTS xero_run_payments_run ON planner.xero_run_payments (run_key);
ALTER TABLE planner.payment_fx ADD COLUMN IF NOT EXISTS bank_account_id text;
ALTER TABLE planner.payment_fx ADD COLUMN IF NOT EXISTS bank_name text;
