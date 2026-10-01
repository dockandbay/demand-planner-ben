-- 312_xero_push_queue.sql  (v28.035, Ben)
-- PAYMENTS ▸ Xero payments — the manual push ledger. Every Xero object HORIZON will create (a supplier-payment
-- BILL, a PAYMENT against a linked PO bill, or a deposit CREDIT NOTE) is queued here as 'pending' and pushed to
-- live Xero manually from the tab. Once pushed, xero_id/xero_ref are stored and status flips to 'pushed'.
--   kind:    'bill' | 'payment' | 'credit_note'
--   status:  'pending' | 'pushed' | 'error' | 'cancelled'
CREATE TABLE IF NOT EXISTS planner.xero_push_queue (
  id                bigserial PRIMARY KEY,
  kind              text NOT NULL,
  region            text NOT NULL DEFAULT 'uk',
  status            text NOT NULL DEFAULT 'pending',
  supplier          text,
  po                text,                     -- related PO (payment / credit note)
  reference         text,                     -- bill reference / narration
  amount            numeric(14,2),
  currency          text DEFAULT 'USD',
  account_code      text,                     -- 602 / 602.1 (credit note account, or a single-account note)
  tracking_option   text,                     -- P<n> for deposits (Production tracking)
  bank_account_id   text,                     -- Xero bank AccountID for a payment
  linked_invoice_id text,                     -- Xero InvoiceID the payment / credit note allocates to
  fx_rate           numeric(12,6),            -- payment posted at the bill's exchange rate
  payload           jsonb,                    -- full detail (bill line items etc.)
  source            text,                     -- 'payments_report' | 'deposit_assign' | 'manual'
  source_key        text,                     -- run key / deposit ref (idempotency + grouping)
  xero_id           text,                     -- resulting Xero object id after a successful push
  xero_ref          text,
  error             text,
  created_by        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  pushed_at         timestamptz,
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS xpq_status_idx ON planner.xero_push_queue (status);
CREATE INDEX IF NOT EXISTS xpq_kind_idx   ON planner.xero_push_queue (kind);
CREATE INDEX IF NOT EXISTS xpq_srckey_idx ON planner.xero_push_queue (source, source_key);
