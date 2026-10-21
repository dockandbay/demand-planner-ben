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
-- TODO (Ben): Patrickco, Harper Group, KathCo, Ideco, TJ, TR Partners

-- 3. Agent-fees account (proposed 21-Oct-26, to confirm): US agents 430 Agent Fees - US, Ideco 430.1 FR, TJ 430.4 DE, TR Partners 431 UK
-- TODO (Ben confirms): UPDATE planner.rep_groups SET xero_account_code = '430' WHERE name IN (...);

-- 4. Statement emails
-- TODO (Ben): UPDATE planner.rep_groups SET statement_email = '...' WHERE name = '...';

COMMIT;
