-- 369_sample_bill_accounts.sql (v28.339, Ben 14-Oct-26: "all xero account config should come from the mapping table")
-- Sample bills took freight 302, duty 313 and the AU photography 1000.24 from codes written in the server, and the
-- form's account list was written in the page. They now all come from planner.sample_purpose_accounts:
--   kind 'purpose' = a sample purpose (product, marketing, sales, photography; au_photography = photography shipped to AU)
--   kind 'charge'  = freight / duty on a PO that is not in Fulfil (freight, duty = Xero UK; au_freight, au_duty = Xero AU)
-- org = the Xero org the code belongs to. Codes are TEXT (308 is not 308.00). Seeded with today's values: no change in
-- behaviour. Additive and idempotent.
ALTER TABLE planner.sample_purpose_accounts ADD COLUMN IF NOT EXISTS org text NOT NULL DEFAULT 'uk';
ALTER TABLE planner.sample_purpose_accounts ADD COLUMN IF NOT EXISTS account_name text;
ALTER TABLE planner.sample_purpose_accounts ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'purpose';

UPDATE planner.sample_purpose_accounts SET account_name = v.name
FROM (VALUES ('product', 'Spend - Product (product team)'), ('sales', 'Spend - Wholesale (sales samples)'),
             ('marketing', 'Spend - Marketing (other)'), ('photography', 'Spend - Photo, video & media (shoots)')) v(purpose, name)
WHERE sample_purpose_accounts.purpose = v.purpose AND sample_purpose_accounts.account_name IS NULL;

INSERT INTO planner.sample_purpose_accounts (purpose, account_code, org, account_name, kind) VALUES
  ('au_photography', '1000.24', 'au', 'Spend - Photo, video & media (other costs)', 'purpose'),
  ('freight',        '302',     'uk', 'Shipping Freight Fees (Import Only)', 'charge'),
  ('duty',           '313',     'uk', 'Import Duty', 'charge'),
  ('au_freight',     '302',     'au', 'Shipping Freight Fees (Import Only)', 'charge'),
  ('au_duty',        '313',     'au', 'Import Duty', 'charge')
ON CONFLICT (purpose) DO NOTHING;
