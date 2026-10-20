-- v28.418 (Ben 21-Oct-26): ACCOUNTS > Reconcile, customer receipts. A money-in bank line matched to Shopify order(s): mark them paid in
-- Shopify, then a Xero Receive Money to the store's clearing account. One live row per bank line, written BEFORE the Shopify / Xero calls,
-- so a second click (or a second person) cannot post the same line or the same order twice. Additive only.
CREATE TABLE IF NOT EXISTS planner.accounts_customer_receipts (
  id            bigserial PRIMARY KEY,
  org           text NOT NULL,                       -- uk | au (Xero org of the bank account)
  account_id    text,                                -- Xero bank AccountID
  account_name  text NOT NULL,
  line_date     date NOT NULL,
  line_amount   numeric NOT NULL,
  line_ref      text NOT NULL DEFAULT '',
  currency      text,
  orders        jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{sale_id, number, reference, store, customer, amount, shopify_id, shopify_done}]
  sale_ids      bigint[] NOT NULL DEFAULT '{}',
  clearing_code text,
  contact_name  text,
  xero_txn_id   text,
  status        text NOT NULL DEFAULT 'creating',    -- creating | shopify_done | created | error
  error         text,
  created_by    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_customer_receipts_line_uq ON planner.accounts_customer_receipts (org, account_name, line_date, line_amount, line_ref) WHERE status <> 'error';
CREATE INDEX IF NOT EXISTS accounts_customer_receipts_sales_idx ON planner.accounts_customer_receipts USING gin (sale_ids);
