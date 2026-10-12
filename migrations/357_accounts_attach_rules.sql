-- v28.275 (Ben 12-Oct-26): automatic receipt attachment. A payee switched on (Config > Payee treatments) gets its accounts@ receipt attached
-- to each RECONCILED Spend Money in Xero from a start date (Snapchat from 12-Oct-26: daily ad receipts, no backdating). The email's own PDF is
-- used, else the email is rendered to a one-page PDF. Every attachment is logged; Xero's API cannot delete attachments, so undo = remove in
-- Xero by hand (link in the log). Additive and idempotent.
ALTER TABLE planner.accounts_payee_rules ADD COLUMN IF NOT EXISTS attach_auto boolean NOT NULL DEFAULT false;
ALTER TABLE planner.accounts_payee_rules ADD COLUMN IF NOT EXISTS attach_from date;
CREATE TABLE IF NOT EXISTS planner.accounts_attach_log (
  id bigserial PRIMARY KEY,
  org text NOT NULL,
  payee_key text,
  xero_id text NOT NULL,                -- BankTransactionID
  txn_date date,
  amount numeric,
  currency text,
  email_id text,
  filename text,
  attachment_id text,
  status text NOT NULL,                 -- attached | error | removed (marked by a person after removing it in Xero)
  error text,
  run_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_attach_log_once ON planner.accounts_attach_log (org, xero_id) WHERE status = 'attached';
