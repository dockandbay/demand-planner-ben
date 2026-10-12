-- v28.272 (Ben 12-Oct-26): repeat counts per year for bank-account spend (Spend Money, card and bank accounts; bill payments excluded) per
-- Xero contact, from 1-Jan-2024, so the "receipts not reaching accounts@" list can focus on repeating payees. Built once (headroom-guarded),
-- then the current year is refreshed with the weekly learn job. Forwarding flags gain an Ignore state. Additive and idempotent.
CREATE TABLE IF NOT EXISTS planner.accounts_spend_history (
  org text NOT NULL,
  contact text NOT NULL,
  year integer NOT NULL,
  txns integer NOT NULL,
  amount numeric,                      -- sum of absolute totals, in the transaction currency (mixed currencies summed as-is)
  currency text,                       -- most common
  last_date date,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org, contact, year)
);
ALTER TABLE planner.accounts_forward_actions ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'actioned';   -- actioned | ignored
