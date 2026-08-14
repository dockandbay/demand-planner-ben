-- 228_sample_purpose_accounts.sql
-- Config table mapping a sample "type"/purpose to the Xero account code it should be charged to. A sample can carry
-- multiple purposes (sample_requests.purpose is an array); when its charge is accepted the amount is split equally
-- across the purposes and each slice is posted as an Other Payment carrying that purpose's account code, so the
-- Payments Report Xero export lands on the right account. Editable in CONFIG.
CREATE TABLE IF NOT EXISTS planner.sample_purpose_accounts (
  purpose      text PRIMARY KEY,
  account_code text NOT NULL DEFAULT '',
  updated_at   timestamptz NOT NULL DEFAULT now()
);
INSERT INTO planner.sample_purpose_accounts (purpose, account_code) VALUES
  ('product','1000.52'),('marketing','1000.44'),('sales','1000.47'),('photography','1000.61')
ON CONFLICT (purpose) DO NOTHING;
