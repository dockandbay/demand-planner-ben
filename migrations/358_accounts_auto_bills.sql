-- v28.276 (Ben 12-Oct-26): one process for every payee whose receipt reaches accounts@ (Snapchat included): HORIZON creates a Xero BILL
-- (Awaiting payment, the receipt PDF attached) and the person reconciles the statement line with Match. Xero bank rules are retired for
-- those payees. Treatments: autobill (created automatically), bill (pre-filled, created from a ticked batch), rule (no receipt: bank fees),
-- ignore. The old 'spend' treatment becomes 'bill'. Additive and idempotent.
ALTER TABLE planner.accounts_payee_rules ADD COLUMN IF NOT EXISTS contact_id text;          -- Xero ContactID (looked up by name, never created)
ALTER TABLE planner.accounts_payee_rules ADD COLUMN IF NOT EXISTS bill_from date;           -- auto bills for receipts on or after this date
ALTER TABLE planner.accounts_payee_rules ADD COLUMN IF NOT EXISTS bank_rule_done_at timestamptz;   -- the person deleted the Xero bank rule
ALTER TABLE planner.accounts_payee_rules ADD COLUMN IF NOT EXISTS bank_rule_done_by text;
ALTER TABLE planner.accounts_payee_rules DROP CONSTRAINT IF EXISTS accounts_payee_rules_treatment_check;
UPDATE planner.accounts_payee_rules SET treatment = 'bill' WHERE treatment = 'spend';
ALTER TABLE planner.accounts_payee_rules ADD CONSTRAINT accounts_payee_rules_treatment_check CHECK (treatment IN ('autobill','bill','rule','ignore'));
CREATE TABLE IF NOT EXISTS planner.accounts_bill_log (
  id bigserial PRIMARY KEY,
  org text NOT NULL,
  payee_key text,
  email_id text NOT NULL,
  invoice_id text,                      -- Xero InvoiceID of the bill
  invoice_number text,                  -- the bill's Reference in Xero
  contact text,
  bill_date date,
  amount numeric,
  currency text,
  account_code text,
  tax_type text,
  stmt_line text,                       -- the open statement line it was matched to, if any
  mode text,                            -- auto | batch
  status text NOT NULL,                 -- created | error | voided (marked by a person)
  error text,
  run_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_bill_log_once ON planner.accounts_bill_log (org, email_id, amount) WHERE status = 'created';
CREATE INDEX IF NOT EXISTS accounts_bill_log_inv ON planner.accounts_bill_log (invoice_id);
