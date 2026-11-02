-- 408 (v28.613, Ben 02-Nov-26): Create sample bills account mapping.
-- Freight / duty on a PO that is NOT in Fulfil (an old, pre-Fulfil PO) go to a Xero UK bill on UK Wholesale COGS ("those would simply be
-- uk wholesale cogs"); POs in Fulfil go on a Fulfil supplier invoice (landed cost).
-- Import VAT ("Taxes") goes to Xero UK 820 VAT - UK ("xero account for vat import is the vat account 820"). The bill posts it with No VAT:
-- Xero UK has no active "VAT on Imports" rate for bills, so the accountants claim it on the return from the C79 / postponed VAT statement.
INSERT INTO planner.sample_purpose_accounts (purpose, account_code, org, account_name, kind) VALUES
  ('cogs_pre_fulfil', '311.1c', 'uk', 'COGS - UK - Wholesale', 'charge'),
  ('vat',             '820',    'uk', 'VAT - UK (import VAT)', 'charge')
ON CONFLICT (purpose) DO NOTHING;
