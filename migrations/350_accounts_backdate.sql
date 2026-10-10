-- v28.250 (Ben 10-Oct-26): ACCOUNTS > Back-date. Read-only list of past opportunities found by the weekly learn job:
--   receipt : a RECONCILED Xero spend / bill payment whose receipt email is in accounts@ but Xero has no file attached
--   tax     : UK spend coded Reverse Charge (Ben: foreign = Zero Rated Expenses; GBP = 20% VAT or No VAT)
-- Nothing is written to Xero from this list. accounts_gmail_msgs caches parsed accounts@ emails (amounts only, no bodies)
-- so later runs only read new mail. Additive and idempotent.
CREATE TABLE IF NOT EXISTS planner.accounts_backdate (
  org text NOT NULL,
  issue text NOT NULL,               -- receipt | tax
  xero_id text NOT NULL,             -- BankTransactionID or PaymentID
  kind text,                         -- spend | billpay
  txn_date date,
  amount numeric,
  currency text,
  contact text,
  bank text,
  account text,
  tax text,
  suggested_tax text,
  link_id text,                      -- bill id for a bill payment
  email_id text,
  email_date date,
  email_from text,
  email_subject text,
  file_source text,                  -- pdf | email body | stripe link | other attachment
  files jsonb,
  lag_days integer,
  ambiguous boolean,
  synced_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org, issue, xero_id)
);
CREATE TABLE IF NOT EXISTS planner.accounts_gmail_msgs (
  id text PRIMARY KEY,               -- Gmail message id
  msg_date date,
  from_addr text,
  subject text,
  files jsonb,                       -- attachment names
  stripe_link boolean,
  amounts jsonb,                     -- [[ "123.45", "£" ], ...] from subject + body
  pdf_amounts jsonb,                 -- same, from PDF attachment text
  parsed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS accounts_gmail_msgs_date_idx ON planner.accounts_gmail_msgs (msg_date);
