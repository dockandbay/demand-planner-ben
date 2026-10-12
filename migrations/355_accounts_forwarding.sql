-- v28.272 (Ben 12-Oct-26): regular payees whose receipts do NOT reach accounts@, so someone can set up auto-forwarding (or change the
-- billing email) at the source, with an Actioned flag. Coverage is computed by the weekly back-date learn job from reconciled Xero items.
-- Additive and idempotent.
CREATE TABLE IF NOT EXISTS planner.accounts_payee_coverage (
  org text NOT NULL,
  contact text NOT NULL,              -- Xero contact on the reconciled items
  txns integer NOT NULL,              -- reconciled spend / bill payments in the window
  matched integer NOT NULL,           -- of those, how many had their receipt in accounts@
  xero_files integer NOT NULL DEFAULT 0,   -- how many already carry a file in Xero (receipt arrives some other way)
  last_date date,
  avg_amount numeric,
  currency text,
  account text,                       -- most common account code
  sender text,                        -- most common accounts@ sender when matched
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org, contact)
);
CREATE TABLE IF NOT EXISTS planner.accounts_forward_actions (
  org text NOT NULL,
  contact text NOT NULL,
  actioned_by text,
  actioned_at timestamptz NOT NULL DEFAULT now(),
  note text,
  PRIMARY KEY (org, contact)
);
