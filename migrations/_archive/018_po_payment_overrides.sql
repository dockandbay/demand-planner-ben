-- 018_po_payment_overrides.sql — per-PO payment-plan overrides (v20.7)
--
-- The PURCHASE ORDERS "PLAN" panel shows a payment schedule whose %s come from the supplier's
-- terms (planner.suppliers.start_deposit_pct / completion_pct / balance_pct). Ben needs to be able
-- to override the start/completion % on an individual PO, and to record a second balance payment
-- when balance 1 is paid only partially. The assigned-amount and date overrides for start /
-- completion / balance-1 already exist (pay_*_assigned / pay_*_amount / pay_*_date); these add the
-- remaining pieces.

ALTER TABLE planner.purchase_orders ADD COLUMN IF NOT EXISTS start_deposit_pct_override numeric;
ALTER TABLE planner.purchase_orders ADD COLUMN IF NOT EXISTS completion_pct_override     numeric;
ALTER TABLE planner.purchase_orders ADD COLUMN IF NOT EXISTS pay_balance_2_amount        numeric;
ALTER TABLE planner.purchase_orders ADD COLUMN IF NOT EXISTS pay_balance_2_date          date;
