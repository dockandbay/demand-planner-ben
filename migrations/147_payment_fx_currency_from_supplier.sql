-- 147: Correct planner.payment_fx so every existing payment carries an amount AND the SUPPLIER'S currency.
--
-- Background: migration 145b back-filled every payment "run" (one bank payment = a given pay date × supplier) with a
-- paid_amount and hard-coded paid_currency = 'USD'. But payment amounts are held in the SUPPLIER'S currency (costs are
-- stored in supplier currency; GBP is the account base). So a GBP supplier like Spectas had its GBP amount mislabelled
-- as USD — the number was right, the currency tag was wrong. This migration sets paid_currency = the supplier's
-- default_currency for every payment, and keeps/fills the amount.
--
-- Two steps:
--   Part A — (re)derive every payment run from the plan (PO completion + balance milestones with a paid date, plus the
--            deposit register and Other payments, for suppliers whose master kind = 'supplier'), ensuring each run has
--            a paid_amount. Amounts already present are PRESERVED (COALESCE) so a manually-confirmed bank amount is not
--            clobbered; only blanks are filled. paid_currency is set to the supplier's currency.
--   Part B — force paid_currency = the supplier's currency on EVERY existing payment_fx row (covers any rows that are
--            not derivable from the plan, e.g. manually-entered runs).
--
-- Currency source: planner.suppliers.default_currency (case-insensitive name match on kind='supplier'); defaults to
-- 'USD' when a supplier has none set. Start deposits are excluded (a draw against a register deposit, not cash).
-- Idempotent + safe to run on sandbox and live; re-running only re-asserts the same values.

WITH lines AS (
  SELECT to_char(o.pay_completion_date,'YYYY-MM-DD') dt, o.supplier_name supplier, round(o.pay_completion_assigned,2) amount
    FROM planner.purchase_orders o
    WHERE o.pay_completion_date IS NOT NULL AND coalesce(o.pay_completion_assigned,0)>0
      AND EXISTS (SELECT 1 FROM planner.suppliers s WHERE lower(trim(s.name))=lower(trim(o.supplier_name)) AND coalesce(s.kind,'')='supplier')
  UNION ALL
  SELECT to_char(o.pay_balance_1_date,'YYYY-MM-DD'), o.supplier_name, round(o.pay_balance_1_amount,2)
    FROM planner.purchase_orders o
    WHERE o.pay_balance_1_date IS NOT NULL AND coalesce(o.pay_balance_1_amount,0)>0
      AND EXISTS (SELECT 1 FROM planner.suppliers s WHERE lower(trim(s.name))=lower(trim(o.supplier_name)) AND coalesce(s.kind,'')='supplier')
  UNION ALL
  SELECT to_char(o.pay_balance_2_date,'YYYY-MM-DD'), o.supplier_name, round(o.pay_balance_2_amount,2)
    FROM planner.purchase_orders o
    WHERE o.pay_balance_2_date IS NOT NULL AND coalesce(o.pay_balance_2_amount,0)>0
      AND EXISTS (SELECT 1 FROM planner.suppliers s WHERE lower(trim(s.name))=lower(trim(o.supplier_name)) AND coalesce(s.kind,'')='supplier')
  UNION ALL
  SELECT to_char(date_paid,'YYYY-MM-DD'), supplier_name, round(amount,2)
    FROM planner.deposits
    WHERE is_deposit=true AND date_paid IS NOT NULL AND round(coalesce(amount,0))<>0
      AND EXISTS (SELECT 1 FROM planner.suppliers s WHERE lower(trim(s.name))=lower(trim(supplier_name)) AND coalesce(s.kind,'')='supplier')
  UNION ALL
  SELECT to_char(date_paid,'YYYY-MM-DD'), supplier_name, round(amount,2)
    FROM planner.deposits
    WHERE is_deposit=false AND date_paid IS NOT NULL AND round(coalesce(amount,0))<>0
      AND EXISTS (SELECT 1 FROM planner.suppliers s WHERE lower(trim(s.name))=lower(trim(supplier_name)) AND coalesce(s.kind,'')='supplier')
), runs AS (
  SELECT dt::date run_date, supplier, round(sum(amount),2) total
  FROM lines WHERE supplier IS NOT NULL AND dt IS NOT NULL
  GROUP BY dt::date, supplier
)
INSERT INTO planner.payment_fx (run_date, supplier, paid_amount, paid_currency)
SELECT r.run_date, r.supplier, r.total, coalesce(s.default_currency,'USD')
  FROM runs r
  LEFT JOIN planner.suppliers s
    ON lower(trim(s.name))=lower(trim(r.supplier)) AND coalesce(s.kind,'')='supplier'
ON CONFLICT (run_date, supplier) DO UPDATE SET
  paid_amount   = COALESCE(planner.payment_fx.paid_amount, excluded.paid_amount),   -- keep an existing (e.g. confirmed) amount; only fill blanks
  paid_currency = excluded.paid_currency,                                           -- always the supplier's currency
  updated_at    = now();

-- Part B: force the supplier's currency on every existing payment_fx row (incl. any not derivable above).
UPDATE planner.payment_fx pf
   SET paid_currency = coalesce(s.default_currency,'USD'), updated_at = now()
  FROM planner.suppliers s
 WHERE lower(trim(s.name)) = lower(trim(pf.supplier))
   AND coalesce(s.kind,'') = 'supplier'
   AND coalesce(pf.paid_currency,'') IS DISTINCT FROM coalesce(s.default_currency,'USD');
