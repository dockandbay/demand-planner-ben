-- 370_dhl_invoice_docs.sql (v28.352, Ben 14-Oct-26): ACCOUNTS > Reconcile > DHL import. One row per document HORIZON creates (or an
-- Ignore) for a "Your latest DHL invoice" (AU account 51214671, direct debit from ANZ). part = 'au_bill' (the Xero AU bill) or
-- 'ignore'. Written BEFORE the Xero call; the partial unique index stops a second bill for the same invoice. Additive, idempotent.
CREATE TABLE IF NOT EXISTS planner.dhl_invoice_docs (
  id bigserial PRIMARY KEY,
  invoice_number text NOT NULL,        -- SYDIR02851742
  part text NOT NULL,                  -- au_bill | ignore
  status text NOT NULL,                -- creating | created | error | ignored | unignored
  xero_invoice_id text,
  xero_url text,
  amount numeric,
  lines jsonb,                         -- the bill lines as sent (awb, account, amount)
  error text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS dhl_invoice_docs_once ON planner.dhl_invoice_docs (invoice_number, part) WHERE status IN ('creating','created','ignored');
