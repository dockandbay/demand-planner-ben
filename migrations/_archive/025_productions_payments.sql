-- 025_productions_payments.sql — production↔deposit link + payment alt-currency (v20.39)
--
-- PRODUCTIONS = one supplier within a prod_no (the bulk run for that supplier). A production can have
-- one or many deposits assigned to it; the per-PO starting deposits are allocations that draw down
-- from these. production_deposits is the parent link (PO.deposit_ref stays as the per-PO allocation).
CREATE TABLE IF NOT EXISTS planner.production_deposits (
  prod_no       text,
  supplier_name text,
  deposit_ref   text,
  created_at    timestamptz DEFAULT now(),
  PRIMARY KEY (prod_no, supplier_name, deposit_ref)
);

-- Payments may be paid in a non-USD currency (GBP/EUR/AUD); record the actual paid currency + amount
-- alongside the USD figure on each transaction (for the Payments report).
ALTER TABLE planner.payment_transactions ADD COLUMN IF NOT EXISTS paid_currency text;
ALTER TABLE planner.payment_transactions ADD COLUMN IF NOT EXISTS paid_amount   numeric;
