-- migration 439
-- v28.792 (Ben 11-Nov-26): ACCOUNTS > Prepayments. Customer prepayments are recorded in Xero by hand as overpayments (RECEIVE-OVERPAYMENT).
-- HORIZON reads them (prepayments), lets ACCOUNTS users link each one to one or more Fulfil sales orders (prepayment_links), and when a linked
-- order's invoice posts to Xero it allocates the overpayment to that invoice and emails madison@ / rita@ (prepayment_allocations = the log).
-- Safe to re-run.
CREATE TABLE IF NOT EXISTS planner.prepayments (
  overpayment_id text PRIMARY KEY,              -- Xero OverpaymentID
  org            text NOT NULL,                 -- uk / au
  contact_id     text,
  contact_name   text,
  pay_date       date,
  reference      text,
  currency       text,
  total          numeric(14,2),
  remaining      numeric(14,2),                 -- Xero RemainingCredit
  status         text,                          -- Xero status: AUTHORISED / PAID / VOIDED / DELETED
  allocations    jsonb NOT NULL DEFAULT '[]'::jsonb,
  synced_at      timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS planner.prepayment_links (
  id             bigserial PRIMARY KEY,
  overpayment_id text NOT NULL,
  org            text NOT NULL,
  sale_id        integer NOT NULL,              -- Fulfil sale.sale id
  so_number      text,
  customer       text,
  linked_by      text,
  linked_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (overpayment_id, sale_id)
);
CREATE INDEX IF NOT EXISTS prepayment_links_sale_idx ON planner.prepayment_links (sale_id);
CREATE TABLE IF NOT EXISTS planner.prepayment_allocations (
  id             bigserial PRIMARY KEY,
  overpayment_id text NOT NULL,
  org            text NOT NULL,
  sale_id        integer,
  so_number      text,
  invoice_id     text,                          -- Xero InvoiceID
  invoice_number text,
  amount         numeric(14,2),
  currency       text,
  status         text NOT NULL,                 -- allocated / flagged / error / dry_run
  message        text,
  created_by     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  emailed_at     timestamptz
);
CREATE INDEX IF NOT EXISTS prepayment_alloc_op_idx ON planner.prepayment_allocations (overpayment_id, invoice_number);
-- Read back: SELECT to_regclass('planner.prepayments'), to_regclass('planner.prepayment_links'), to_regclass('planner.prepayment_allocations');   -- all non-null
