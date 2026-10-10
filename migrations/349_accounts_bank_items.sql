-- v28.249 (Ben 10-Oct-26): ACCOUNTS > Bank ageing (interim). Xero items ENTERED on a bank account but not reconciled
-- (spend / receive money, bill and invoice payments, transfers), UK + AU, refreshed by a background job (n8n cron + Refresh now).
-- Unmatched bank STATEMENT lines need Xero bank statement access (not granted to our custom connections yet) and are not here.
-- Additive and idempotent. Each sync replaces one org's rows.
CREATE TABLE IF NOT EXISTS planner.accounts_bank_items (
  org text NOT NULL,                 -- uk | au
  kind text NOT NULL,                -- spend | receive | payment | transfer
  xero_id text NOT NULL,             -- BankTransactionID / PaymentID / BankTransferID
  bank_account_id text NOT NULL,
  bank_account text,
  currency text,
  txn_date date,
  amount numeric,                    -- signed: money in > 0, money out < 0 (bank account currency)
  contact text,
  reference text,
  description text,
  link_id text,                      -- invoice id for payments (Xero link)
  link_type text,                    -- ACCPAY | ACCREC for payments
  synced_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org, kind, xero_id, bank_account_id)
);
CREATE TABLE IF NOT EXISTS planner.accounts_bank_accounts (
  org text NOT NULL,
  account_id text NOT NULL,
  name text,
  code text,
  currency text,
  status text,
  synced_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org, account_id)
);
