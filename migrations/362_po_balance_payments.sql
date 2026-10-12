-- v28.307 (Ben 13-Oct-26): "we can have balance 3,4,5 in reality". A PO's balance can be paid in any number of parts.
-- Balance payments 1 and 2 stay on purchase_orders (pay_balance_1_*, pay_balance_2_*); balance payment 3 onward is one row
-- here per payment. Every paid / owed / remaining figure, Payments Due, the cash flow, the Payments Report and supplier
-- statements add these rows to balance payments 1 and 2. Additive and idempotent.
CREATE TABLE IF NOT EXISTS planner.po_balance_payments (
  id bigserial PRIMARY KEY,
  po text NOT NULL,
  seq integer NOT NULL,                 -- 3, 4, 5 ... (balance payment number on the PO)
  amount numeric NOT NULL,              -- supplier currency, like pay_balance_2_amount
  paid_date date,                       -- blank = recorded but not yet paid
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (po, seq)
);
CREATE INDEX IF NOT EXISTS po_balance_payments_po_idx ON planner.po_balance_payments (po);
