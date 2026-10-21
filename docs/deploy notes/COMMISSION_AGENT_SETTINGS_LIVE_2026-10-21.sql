-- HORIZON commission agent settings for LIVE (Supabase SQL editor, Diviyaj). DRAFT 21-Oct-26: filled in as Ben answers; not applied.
-- Same values can instead be entered on each agent's client record (CLIENT > Clients > agent > Commission tab).
-- One transaction: if anything fails, nothing is changed. Safe to re-run.

BEGIN;

-- 1. Currencies (Ben 21-Oct-26: "all are USD except DYA was CAD (not used anymore, can create but close this client as inactive)")
UPDATE planner.rep_groups SET currency = 'USD', currency_checked = true
 WHERE name IN ('Agent - Ivystone', 'Agent - Schauben', 'Agent - Evelyne', 'Agent - KathCo');
UPDATE planner.rep_groups SET currency = 'CAD', currency_checked = true, active = false WHERE name = 'DYA - 10%';
UPDATE planner.clients SET active = false WHERE rep_group_id = (SELECT id FROM planner.rep_groups WHERE name = 'DYA - 10%');

-- 2. Xero bill contact (Xero UK contact name, looked up by exact name when the bill is created)
-- Ben 21-Oct-26: Schauben = Xero contact 5ecaed54-94f9-4bc3-ae50-c334673d94c7 "Appelman Schauben"
UPDATE planner.rep_groups SET xero_contact = 'Appelman Schauben' WHERE name = 'Agent - Schauben';
-- Ben 21-Oct-26: Ideco = Xero contact 729ae19f-c83a-4f79-9a4a-5dec3ceb736e "IDECO" (the only contact with that name)
UPDATE planner.rep_groups SET xero_contact = 'IDECO' WHERE name = 'Agent - Ideco';
-- Ben 21-Oct-26: Patrickco = Xero contact 5742155d-3d4a-475a-ba2f-f83961eee99a "PATRICK AND COMPANY" (the only contact with that name)
UPDATE planner.rep_groups SET xero_contact = 'PATRICK AND COMPANY' WHERE name = 'Agent - Patrickco';
-- Ben 21-Oct-26: TJ = Xero contact 819398f5-bd71-4046-8e3d-b522cd0cf098 "Sparkasse Offenburg/Ortenau - TJ" (the only contact with that name)
UPDATE planner.rep_groups SET xero_contact = 'Sparkasse Offenburg/Ortenau - TJ' WHERE name = 'Agent - TJ';
-- TODO (Ben): Harper Group, KathCo, TR Partners

-- 3. Bill account (Ben 21-Oct-26: "change agent fees to be cost of sales - us - wholesale. and cost of sales - de - wholesale etc"):
--    the Xero UK "Cost of Sales - <market> - Wholesale" account of the agent's market (codes read from Xero UK 21-Oct-26)
UPDATE planner.rep_groups SET xero_account_code = '312.2a'   -- Cost of Sales - US - Wholesale
 WHERE name IN ('Agent - Schauben', 'Agent - Patrickco', 'Agent - Harper Group', 'Agent - KathCo', 'Agent - Ivystone', 'Agent - Roadrunner', 'Agent - Pablo');
UPDATE planner.rep_groups SET xero_account_code = '312.4b' WHERE name = 'Agent - Ideco';         -- Cost of Sales - FR - Wholesale
UPDATE planner.rep_groups SET xero_account_code = '312.4j' WHERE name = 'Agent - TJ';            -- Cost of Sales - DE - Wholesale
UPDATE planner.rep_groups SET xero_account_code = '312.1a' WHERE name = 'Agent - TR Partners';   -- Cost of Sales - UK - Wholesale
UPDATE planner.rep_groups SET xero_account_code = '312.5a' WHERE name = 'Agent - Spruce';        -- Cost of Sales - CA - Wholesale
-- TODO (Ben): Agent - Evelyne (market? FR 312.4b / EU excl. DE, FR 312.4e / US 312.2a)

-- 4. Statement emails
-- TODO (Ben): UPDATE planner.rep_groups SET statement_email = '...' WHERE name = '...';

COMMIT;
