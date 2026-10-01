-- 317_xero_bills.sql  (v28.094, Ben)
-- Local cache of Xero ACCPAY bills, so the PO-link resolver and the payments-Exceptions reconciliation read bill
-- amounts/references from Postgres instead of hitting Xero live on every run (the old full sweep = 60 pages × 2 orgs,
-- ~3 min; the old exceptions view re-fetched every linked bill by id, ~22 s). A sync (cron + admin button) pulls only
-- bills MODIFIED since the last watermark via Xero's If-Modified-Since header; the first run (no watermark) is a full
-- pull. Watermark per region lives in planner.app_settings key 'xero_bills_sync_<region>'.
CREATE TABLE IF NOT EXISTS planner.xero_bills (
  invoice_id     text PRIMARY KEY,
  region         text NOT NULL,                 -- 'uk' | 'au'
  invoice_number text,
  reference      text,
  contact_name   text,
  total          numeric,
  amount_paid    numeric,
  amount_due     numeric,
  currency_code  text,
  status         text,                           -- DRAFT | SUBMITTED | AUTHORISED | PAID | VOIDED | DELETED
  invoice_date   date,
  due_date       date,
  updated_utc    timestamptz,
  synced_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS xero_bills_region_idx ON planner.xero_bills (region);
CREATE INDEX IF NOT EXISTS xero_bills_reference_idx ON planner.xero_bills (reference);
CREATE INDEX IF NOT EXISTS xero_bills_number_idx ON planner.xero_bills (invoice_number);
