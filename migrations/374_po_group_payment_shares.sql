-- v28.376 (Ben 15-Oct-26, master PO payments): a client PO group's payments are shared across its Fulfil client POs IN PROPORTION TO THEIR
-- VALUE. Starting deposit = one credit note DEPOSIT-<po> allocated by share; completion / balance = one payment per client PO bill (602.1 in
-- the paying org, loan 901 in the other org). A share whose Fulfil bill is not in Xero yet waits here as 'pending' and is applied when the
-- bill appears (Fulfil posts each PO's bill to its company's Xero, reference = the Fulfil PO number). Additive.
ALTER TABLE planner.po_fulfil_group ADD COLUMN IF NOT EXISTS total_amount numeric;   -- Fulfil PO value (share basis)
ALTER TABLE planner.po_fulfil_group ADD COLUMN IF NOT EXISTS currency text;
CREATE TABLE IF NOT EXISTS planner.po_group_shares (
  id           bigserial PRIMARY KEY,
  po           text NOT NULL,                 -- the HORIZON master PO
  kind         text NOT NULL,                 -- 'deposit_cn' (credit note allocation) | 'payment' (completion / balance)
  source_ref   text NOT NULL,                 -- credit note id, or the payment run key
  source_label text,                          -- DEPOSIT-<po> / run reference, for people
  fulfil_id    bigint NOT NULL,
  number       text,                          -- Fulfil PO number (the bill's reference in Xero)
  share_pct    numeric,
  amount       numeric NOT NULL,
  currency     text,
  currency_rate numeric,                     -- the run's rate, so a share applied later posts at the same rate
  paying_org   text,                          -- uk | au (where the money / credit note is)
  invoice_id   text,                          -- the Xero bill it was applied to
  status       text NOT NULL DEFAULT 'pending',   -- pending | applied | error
  error        text,
  xero_id      text,                          -- PaymentID / allocation marker
  created_by   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  applied_at   timestamptz,
  UNIQUE (kind, source_ref, fulfil_id)
);
CREATE INDEX IF NOT EXISTS po_group_shares_po_idx ON planner.po_group_shares (po);
CREATE INDEX IF NOT EXISTS po_group_shares_pending_idx ON planner.po_group_shares (status) WHERE status = 'pending';
ALTER TABLE planner.po_group_shares ADD COLUMN IF NOT EXISTS currency_rate numeric;
