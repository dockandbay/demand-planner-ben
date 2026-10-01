-- 325_seed_payment_xero_bills.sql  (v28.136, Ben) — ONE-TIME import of the supplier-payment bills already in Xero into
-- planner.payment_xero_bills (migration 324), so the Payments Report shows "done ↗" linked to each historic payment's bill.
-- DATA migration (no schema change). Run AFTER 324. Safe to re-run (ON CONFLICT DO NOTHING; never overwrites a 'post' row).
--
-- Source: planner.xero_bills (Horizon's synced Xero ACCPAY cache) — nothing is read from or written to Xero.
-- Match: bill number SUPPLIER-PAYMENT-<CODE>-<YYYY-MM-DD> → supplier by suppliers.code. Older bills have no code
--   (SUPPLIER-PAYMENT-<YYYY-MM-DD>) → match the Xero contact name to the supplier name, exactly or with the trailing
--   "(contact)" stripped (AU org: "XR Textile (Jack)" → XR Textile), plus one alias: "Jinmatex (Merry)" → Jinma (Merry).
--   Date = the date in the bill NUMBER (Xero's stored InvoiceDate is UTC-shifted a day early).
-- Only bills that land on a REAL payment (a PO completion/balance or deposit/other paid that supplier that day) are inserted.
-- Run key = 'YYYY-MM-DD|<supplier>' (all of these predate the 01-Oct-26 UK/AU split, so no '|AU').
--
-- Dry-run on LIVE 01-Oct-26 (read-only): 275 live bills → 273 inserted, covering 264 payments. Not inserted (by design):
--   SUPPLIER-PAYMENT-BE-2026-09-29 ($1 DRAFT test, no payment that day) and SUPPLIER-PAYMENT-2025-12-29 (F-Orchid, not a
--   Horizon supplier). Payments before 21-Sep-26 with no bill still show "done" (no link) in the report.
BEGIN;

WITH sup AS (
  SELECT coalesce(code, '') code, name, lower(trim(regexp_replace(name, '\s*\(.*\)\s*$', ''))) base
    FROM planner.suppliers WHERE coalesce(name, '') <> ''
), b AS (
  SELECT invoice_id, region, invoice_number, status,
         substring(invoice_number FROM '(\d{4}-\d{2}-\d{2})$') dt,
         substring(invoice_number FROM '^SUPPLIER-PAYMENT-(.+)-\d{4}-\d{2}-\d{2}$') code,
         lower(trim(CASE WHEN lower(trim(contact_name)) = 'jinmatex (merry)' THEN 'Jinma (Merry)' ELSE contact_name END)) cfull,
         lower(trim(regexp_replace(CASE WHEN lower(trim(contact_name)) = 'jinmatex (merry)' THEN 'Jinma (Merry)' ELSE contact_name END, '\s*\(.*\)\s*$', ''))) cbase
    FROM planner.xero_bills
   WHERE invoice_number ILIKE 'SUPPLIER-PAYMENT-%' AND coalesce(status, '') NOT IN ('DELETED', 'VOIDED')
), m AS (
  SELECT b.*, coalesce(
           (SELECT s.name FROM sup s WHERE trim(s.code) <> '' AND upper(trim(s.code)) = upper(trim(b.code)) LIMIT 1),
           (SELECT s.name FROM sup s WHERE lower(trim(s.name)) = b.cfull LIMIT 1),
           (SELECT s.name FROM sup s WHERE s.base = b.cbase LIMIT 1)) supplier
    FROM b
), pay AS (
  SELECT DISTINCT d || '|' || s k FROM (
    SELECT to_char(pay_completion_date, 'YYYY-MM-DD') d, coalesce(supplier_name, '(none)') s FROM planner.purchase_orders WHERE pay_completion_date IS NOT NULL AND coalesce(pay_completion_assigned, 0) > 0
    UNION ALL SELECT to_char(pay_balance_1_date, 'YYYY-MM-DD'), coalesce(supplier_name, '(none)') FROM planner.purchase_orders WHERE pay_balance_1_date IS NOT NULL AND coalesce(pay_balance_1_amount, 0) > 0
    UNION ALL SELECT to_char(pay_balance_2_date, 'YYYY-MM-DD'), coalesce(supplier_name, '(none)') FROM planner.purchase_orders WHERE pay_balance_2_date IS NOT NULL AND coalesce(pay_balance_2_amount, 0) > 0
    UNION ALL SELECT to_char(date_paid, 'YYYY-MM-DD'), coalesce(supplier_name, '(none)') FROM planner.deposits WHERE date_paid IS NOT NULL AND round(coalesce(amount, 0)) <> 0
  ) z
)
INSERT INTO planner.payment_xero_bills (bill_id, run_key, run_date, supplier, region, bill_number, bill_url, status, source, created_by)
SELECT m.invoice_id, m.dt || '|' || m.supplier, m.dt::date, m.supplier,
       CASE WHEN lower(m.region) = 'au' THEN 'AU' ELSE 'UK' END, m.invoice_number,
       'https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=' || m.invoice_id, m.status, 'sweep', 'migration 325'
  FROM m
 WHERE m.supplier IS NOT NULL AND m.dt IS NOT NULL AND (m.dt || '|' || m.supplier) IN (SELECT k FROM pay)
ON CONFLICT (bill_id) DO NOTHING;

COMMIT;

-- Post-check (expect ~273 rows / ~264 payments on live as of 01-Oct-26; more if bills were added since):
-- SELECT count(*) bills, count(DISTINCT run_key) payments FROM planner.payment_xero_bills WHERE source = 'sweep';
