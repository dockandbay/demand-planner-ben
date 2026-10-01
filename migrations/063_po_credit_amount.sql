-- 063: credit amount on purchase orders.
--
-- A decimal credit/charge ADDED to the supplier invoice that we must pay. It is settled as part of the
-- BALANCE payment, so the PO calc adds it to balance_owing (and the "total amount due"):
--   balance_owing = invoice_value + credit_amount − start_deposit − completion
-- Deposit and completion are still computed from the invoice value only.

ALTER TABLE planner.purchase_orders ADD COLUMN IF NOT EXISTS credit_amount numeric(14,2);

COMMENT ON COLUMN planner.purchase_orders.credit_amount IS
  'Decimal credit/charge added to the supplier invoice that we must pay; included in the balance payment (balance_owing = value + credit_amount − deposit − completion).';
