-- 409 (v28.616, Ben 02-Nov-26): Create sample bills. Freight / duty on an old (not in Fulfil) US PO, e.g. the Dillards POs, go to Xero UK
-- 311.2c COGS - US - Wholesale ("we need to allow for cogs us wholesale in samples push as well for dillards"); EU POs to 311.3c COGS - EU -
-- Wholesale ("also have the option for cogs - eu - wholesale in the dropdown"). UK POs stay on 311.1c (408). DE 311.3d and FR 311.3b are
-- dropdown options only ("also have the eu wholesale DE and FR options"): an EU PO defaults to 311.3c and can be switched by hand.
-- The market comes from the PO's branch, else the market code in the PO ref, else the courier line's ship-to country (server.mjs sbPoMarket).
INSERT INTO planner.sample_purpose_accounts (purpose, account_code, org, account_name, kind) VALUES
  ('cogs_pre_fulfil_us', '311.2c', 'uk', 'COGS - US - Wholesale', 'charge'),
  ('cogs_pre_fulfil_eu', '311.3c', 'uk', 'COGS - EU - Wholesale (excl. DE, FR, Dist)', 'charge'),
  ('cogs_wholesale_de',  '311.3d', 'uk', 'COGS - DE - Wholesale', 'charge'),
  ('cogs_wholesale_fr',  '311.3b', 'uk', 'COGS - FR - Wholesale', 'charge')
ON CONFLICT (purpose) DO NOTHING;
