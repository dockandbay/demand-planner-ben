-- v28.333 (Ben 13-Oct-26): commission payout. Additive and idempotent.
-- The run remembers its Xero bill (id + link, statement PDF attached) and when its statement was emailed and to whom.
ALTER TABLE planner.commission_runs ADD COLUMN IF NOT EXISTS xero_bill_id text;
ALTER TABLE planner.commission_runs ADD COLUMN IF NOT EXISTS xero_bill_url text;
ALTER TABLE planner.commission_runs ADD COLUMN IF NOT EXISTS xero_bill_status text;
ALTER TABLE planner.commission_runs ADD COLUMN IF NOT EXISTS statement_sent_at timestamptz;
ALTER TABLE planner.commission_runs ADD COLUMN IF NOT EXISTS statement_sent_to text;
ALTER TABLE planner.commission_runs ADD COLUMN IF NOT EXISTS statement_sent_by text;
