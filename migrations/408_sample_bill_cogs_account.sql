-- 408 (v28.613, Ben 02-Nov-26): Create sample bills. Freight / duty on a PO that is NOT in Fulfil (an old, pre-Fulfil PO) go to a Xero UK
-- bill on UK Wholesale COGS ("those would simply be uk wholesale cogs"); POs in Fulfil go on a Fulfil supplier invoice (landed cost).
-- Import VAT ("Taxes") goes to Xero on the 'vat' / 'au_vat' row: added once Ben confirms the Xero account code.
INSERT INTO planner.sample_purpose_accounts (purpose, account_code, org, account_name, kind) VALUES
  ('cogs_pre_fulfil', '311.1c', 'uk', 'COGS - UK - Wholesale', 'charge')
ON CONFLICT (purpose) DO NOTHING;
