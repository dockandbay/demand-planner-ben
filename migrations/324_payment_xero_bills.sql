-- 324_payment_xero_bills.sql  (v28.136, Ben) — record of the Xero SUPPLIER-PAYMENT bill behind each Payments Report payment.
-- Ben 01-Oct-26: once a payment is written to Xero its supplier-payment reference must be stored for future reference; the
-- Payments Report then shows "done" + a link to that bill (+ a redo that relaunches the Create-in-Xero popup).
--
-- One row per Xero bill (a payment can have more than one, e.g. a pre-split run with a UK and an AU bill, or a re-post).
-- run_key matches the Payments Report row: 'YYYY-MM-DD|<supplier>' (UK / legacy) or 'YYYY-MM-DD|<supplier>|AU'.
-- Filled by (a) every Create-in-Xero post and (b) the one-time sweep POST /api/supply/payments/xero-bill-sweep, which matches
-- SUPPLIER-PAYMENT-<CODE>-<DATE> bills already in planner.xero_bills. Safe to re-run. Additive only (new table).
CREATE TABLE IF NOT EXISTS planner.payment_xero_bills (
  bill_id     text PRIMARY KEY,                 -- Xero InvoiceID
  run_key     text NOT NULL,
  run_date    date,
  supplier    text,
  region      text NOT NULL DEFAULT 'UK' CHECK (region IN ('UK', 'AU')),   -- Xero org the bill lives in
  bill_number text,                             -- e.g. SUPPLIER-PAYMENT-LX-2026-09-21
  bill_url    text,
  status      text,                             -- Xero status at record time (DRAFT / AUTHORISED / PAID …)
  source      text NOT NULL DEFAULT 'post' CHECK (source IN ('post', 'sweep')),
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_xero_bills_run_key_idx ON planner.payment_xero_bills (run_key);
