-- v28.253 (Ben 11-Oct-26): cache of RECONCILED Xero spend money + bill payments (UK + AU, last 120 days) for the ACCOUNTS > Back-date
-- learn job, so each run only reads what changed in Xero (If-Modified-Since watermark in app_settings) instead of the whole window.
-- recon=false rows are items that were modified and are no longer reconciled / authorised (kept so the id is known, skipped by the match).
-- Additive and idempotent. Lock, watermark and progress rows live in planner.app_settings (job_lock:*, accounts_*_wm:*, job_progress:*, job_state:*).
CREATE TABLE IF NOT EXISTS planner.accounts_recon_txns (
  org text NOT NULL,
  kind text NOT NULL,                -- spend | billpay
  xero_id text NOT NULL,             -- BankTransactionID | PaymentID
  txn_date date,
  amount numeric,
  currency text,
  contact text,
  bank text,
  account text,
  tax text,
  has_att boolean NOT NULL DEFAULT false,
  link_id text,                      -- bill id for a payment
  recon boolean NOT NULL DEFAULT true,
  synced_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org, xero_id)
);
CREATE INDEX IF NOT EXISTS accounts_recon_txns_date_idx ON planner.accounts_recon_txns (org, txn_date);
