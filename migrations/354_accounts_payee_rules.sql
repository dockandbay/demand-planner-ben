-- v28.269 (Ben 12-Oct-26): ACCOUNTS > Inbox matcher. One treatment per bank-statement payee, remembered:
--   bill (supplier invoice with terms), spend (card / direct-debit spend with a receipt: Spend Money in Xero), rule (left to a Xero bank rule,
--   no receipt needed), ignore (transfers, loans, tax). HORIZON pre-fills it (source 'auto'); a person's choice (source 'manual') wins.
-- Additive and idempotent.
CREATE TABLE IF NOT EXISTS planner.accounts_payee_rules (
  org text NOT NULL,
  payee_key text NOT NULL,              -- normalised from the statement reference, e.g. "GOOGLE ADS", "HMRC CUSTOMS"
  treatment text NOT NULL CHECK (treatment IN ('bill','spend','rule','ignore')),
  contact text,                         -- Xero contact to use (later step)
  account_code text,
  tax_type text,
  source text NOT NULL DEFAULT 'manual',
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org, payee_key)
);
