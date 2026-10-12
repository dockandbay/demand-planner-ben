-- v28.283 (Ben 12-Oct-26): ACCOUNTS > Payables "Create supplier credit note": a small under-payment (amount still due under 200 in the bill's
-- currency on a part-paid supplier bill) is written off with an ACCPAYCREDIT allocated to the bill. One row per write-off; the row is written
-- before the Xero call so a bill is never credited twice. Additive and idempotent.
CREATE TABLE IF NOT EXISTS planner.accounts_credit_log (
  id bigserial PRIMARY KEY,
  org text NOT NULL,
  invoice_id text NOT NULL,             -- the bill written off
  invoice_number text,
  contact text,
  currency text,
  amount numeric,
  account_code text,
  tax_type text,
  reference text,
  reason text,
  credit_note_id text,
  credit_note_number text,
  allocated boolean NOT NULL DEFAULT false,
  status text NOT NULL,                 -- creating | created | error
  error text,
  run_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_credit_log_once ON planner.accounts_credit_log (invoice_id) WHERE status IN ('creating','created');
