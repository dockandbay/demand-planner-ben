-- v28.265 (Ben 12-Oct-26): bank STATEMENT lines for ACCOUNTS > Bank ageing, from Xero's Bank Reconciliation report export (Excel pack),
-- uploaded by admins and ACCOUNTS users. Xero's public API cannot return statement lines (Xero support, 12-Oct-26).
-- A Summary upload lists every unreconciled line as at its date, so stored lines of that account dated on or before as_at that are
-- not in the upload are marked reconciled. Additive and idempotent.
CREATE TABLE IF NOT EXISTS planner.accounts_stmt_lines (
  org text NOT NULL,
  account_name text NOT NULL,            -- as printed in the report, e.g. "#7060 Lloyds"
  account_id text,                        -- planner.accounts_bank_accounts.account_id when the name matches
  line_date date NOT NULL,
  amount numeric NOT NULL,                -- signed, bank account currency
  reference text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  reconciled boolean NOT NULL DEFAULT false,
  reconciled_seen date,                   -- as_at of the upload that first showed it reconciled (or absent from the unreconciled list)
  first_seen date,                        -- as_at of the first upload that listed it
  last_seen date,                         -- as_at of the latest upload that listed it as unreconciled
  source text NOT NULL DEFAULT 'upload',  -- upload | email
  uploaded_by text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org, account_name, line_date, amount, reference)
);
CREATE INDEX IF NOT EXISTS accounts_stmt_lines_open_idx ON planner.accounts_stmt_lines (org, account_name) WHERE NOT reconciled;
CREATE TABLE IF NOT EXISTS planner.accounts_stmt_uploads (
  id bigserial PRIMARY KEY,
  org text NOT NULL,
  account_name text NOT NULL,
  as_at date,
  period_from date,
  period_to date,
  filename text,
  unreconciled integer,
  lines integer,
  cleared integer,                        -- stored lines marked reconciled by this upload
  source text NOT NULL DEFAULT 'upload',
  uploaded_by text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS accounts_stmt_uploads_acct_idx ON planner.accounts_stmt_uploads (org, account_name, uploaded_at DESC);
