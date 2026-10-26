-- HORIZON commission set-up for LIVE (Supabase SQL editor). Generated 14-Oct-26 from Claude Analyses/COMMISSION_SEED_2026-10-13.csv
-- with exactly the rules of scripts/seed_commission_setup.cjs, then migration 366 (v28.337, links the existing SHAUBEN client).
-- Needs migrations 364 (rep_groups columns, customer rates, overrides) on live: applied 14-Oct-26.
-- One transaction: if anything fails, nothing is changed. Safe to re-run (upserts; overrides are replaced per order).
-- After this: the paid history import (scripts/import_commission_history.cjs with the PAID_HISTORY CSV), then
-- CLIENT > Clients > an agent > Customers > Sync all agents from Xero.

BEGIN;

-- 1. Shauben = Schauben = Appelman (Ben 13-Oct-26): rename the live group, keeping its id (and any links to it).
UPDATE planner.rep_groups SET name = 'Agent - Schauben' WHERE name IN ('Shauben', 'Schauben') AND NOT EXISTS (SELECT 1 FROM planner.rep_groups WHERE name = 'Agent - Schauben');

-- 2. Agents: rate, currency (left alone if already confirmed), Fulfil agent codes (left alone if already set), no-commission flag, Xero group name.
INSERT INTO planner.rep_groups (name, default_rate, currency, currency_checked, fulfil_codes, no_commission, xero_group_uk_name) VALUES
  ('Agent - Ivystone', 15, 'USD', false, ARRAY[]::text[], false, 'Agent - Ivystone'),
  ('Agent - Faire', 10, 'USD', false, ARRAY[]::text[], true, 'Agent - Faire'),
  ('Agent - Schauben', 15, 'USD', true, ARRAY['appelman']::text[], false, 'Agent - Schauben'),
  ('Agent - Spruce', 17.5, 'CAD', true, ARRAY[]::text[], false, 'Agent - Spruce'),
  ('Agent - Harper Group', 15, 'USD', true, ARRAY['harpergroup', 'harpers']::text[], false, 'Agent - Harper Group'),
  ('Agent - Ideco', 15, 'EUR', true, ARRAY['ideco']::text[], false, 'Agent - Ideco'),
  ('Agent - TR Partners', 8, 'GBP', true, ARRAY[]::text[], false, 'Agent - TR Partners'),
  ('Agent - Roadrunner', 15, 'USD', true, ARRAY['roadrunners']::text[], false, 'Agent - Roadrunner'),
  ('Agent - Evelyne', 15, 'USD', false, ARRAY[]::text[], false, 'Agent - Evelyne'),
  ('No Agent', 0, 'USD', false, ARRAY[]::text[], true, 'No Agent'),
  ('Agent - KathCo', 8, 'USD', false, ARRAY[]::text[], false, 'Agent - KathCo'),
  ('Agent - Pablo', 15, 'USD', true, ARRAY[]::text[], false, 'Agent - Pablo'),
  ('Agent - UK', 0, 'GBP', true, ARRAY[]::text[], true, 'Agent - UK'),
  ('Distributors', 0, 'USD', false, ARRAY[]::text[], true, 'Distributors'),
  ('Agent - Patrickco', 15, 'USD', true, ARRAY['patrick']::text[], false, 'Agent - Patrickco'),
  ('Agent - TJ', 15, 'EUR', true, ARRAY['TJ']::text[], false, 'Agent - TJ'),
  ('DYA - 10%', 10, 'USD', false, ARRAY[]::text[], false, 'DYA - 10%'),
  ('UK - National Trust', 0, 'GBP', true, ARRAY[]::text[], true, 'UK - National Trust')
ON CONFLICT (name) DO UPDATE SET default_rate = EXCLUDED.default_rate,
  currency = CASE WHEN planner.rep_groups.currency_checked THEN planner.rep_groups.currency ELSE EXCLUDED.currency END,
  fulfil_codes = CASE WHEN cardinality(planner.rep_groups.fulfil_codes) > 0 THEN planner.rep_groups.fulfil_codes ELSE EXCLUDED.fulfil_codes END,
  no_commission = EXCLUDED.no_commission,
  xero_group_uk_name = coalesce(planner.rep_groups.xero_group_uk_name, EXCLUDED.xero_group_uk_name);

-- 3. Customer-specific rates (beat the agency rate). Les Raffineurs left out (rate blank).
INSERT INTO planner.commission_customer_rates (customer_name, rate, note, created_by) VALUES
  ('Clement', 10, NULL, 'seed'),
  ('Charlotte Lambert', 10, NULL, 'seed'),
  ('Lagardere', 10, NULL, 'seed'),
  ('Nature et Decouvertes', 12, NULL, 'seed'),
  ('Galeria', 8, NULL, 'seed'),
  ('THE BRITISH SHOP', 10, NULL, 'seed')
ON CONFLICT (lower(customer_name)) DO UPDATE SET rate = EXCLUDED.rate;

-- 4. Order overrides (32): credited agent, % (NULL = agent rate), commissionable amount (NULL = cash received). Replaced per order.
DELETE FROM planner.commission_overrides WHERE order_ref IN ('EUWS-2411', 'USWS-16053', 'USWS-12959', 'EUWS-2508', 'EUWS-2509', 'EUWS-2510', 'EUWS-2526', 'USWS-14400', 'USWS-14399', 'USWS-14338', 'USWS-16731', 'USWS-16646', 'USWS-16746', 'USWS-17281', 'USWS-16350', 'USWS-16318', 'USWS-17338', 'USWS-17427', 'USWS-17774', 'USWS-17312', 'USWS-17684', 'USWS-17842', 'USWS-18331', 'USWS-18132', 'USWS-18140', 'USWS-18139', 'USWS-16944', 'USWS-17448', 'USWS-17673', 'USWS-17521', 'USWS-17239', 'USWS-17143');
INSERT INTO planner.commission_overrides (order_ref, rep_group_id, rate, commissionable_amount, reason, created_by)
SELECT v.order_ref, g.id, v.rate, v.amt, 'from the commission sheet (13-Oct-26)', 'seed' FROM (VALUES
  ('EUWS-2411', 'Agent - TJ', NULL::numeric, 3825.9::numeric),
  ('USWS-16053', 'Agent - Schauben', 15::numeric, NULL::numeric),
  ('USWS-12959', 'Agent - Patrickco', NULL::numeric, NULL::numeric),
  ('EUWS-2508', 'Agent - Ideco', 10::numeric, NULL::numeric),
  ('EUWS-2509', 'Agent - Ideco', 10::numeric, NULL::numeric),
  ('EUWS-2510', 'Agent - Ideco', 10::numeric, NULL::numeric),
  ('EUWS-2526', 'Agent - Ideco', 12::numeric, NULL::numeric),
  ('USWS-14400', 'Agent - Patrickco', NULL::numeric, NULL::numeric),
  ('USWS-14399', 'Agent - Patrickco', NULL::numeric, NULL::numeric),
  ('USWS-14338', 'Agent - Patrickco', NULL::numeric, NULL::numeric),
  ('USWS-16731', 'Agent - Faire', NULL::numeric, NULL::numeric),
  ('USWS-16646', 'Agent - Schauben', NULL::numeric, NULL::numeric),
  ('USWS-16746', 'Agent - Spruce', NULL::numeric, NULL::numeric),
  ('USWS-17281', 'Agent - Faire', NULL::numeric, NULL::numeric),
  ('USWS-16350', 'Agent - Faire', NULL::numeric, NULL::numeric),
  ('USWS-16318', 'Agent - Faire', NULL::numeric, NULL::numeric),
  ('USWS-17338', 'Agent - Faire', NULL::numeric, NULL::numeric),
  ('USWS-17427', 'Agent - Faire', NULL::numeric, NULL::numeric),
  ('USWS-17774', 'Agent - Schauben', 15::numeric, 2007.35::numeric),
  ('USWS-17312', 'Agent - Faire', NULL::numeric, NULL::numeric),
  ('USWS-17684', 'Agent - Harper Group', 15::numeric, 255::numeric),
  ('USWS-17842', 'Agent - Faire', NULL::numeric, NULL::numeric),
  ('USWS-18331', 'Agent - Schauben', 15::numeric, 1014.98::numeric),
  ('USWS-18132', 'Agent - Patrickco', 15::numeric, NULL::numeric),
  ('USWS-18140', 'Agent - Patrickco', 15::numeric, NULL::numeric),
  ('USWS-18139', 'Agent - Patrickco', NULL::numeric, NULL::numeric),
  ('USWS-16944', 'Agent - Patrickco', NULL::numeric, NULL::numeric),
  ('USWS-17448', 'Agent - Faire', NULL::numeric, NULL::numeric),
  ('USWS-17673', 'Agent - Faire', NULL::numeric, NULL::numeric),
  ('USWS-17521', 'Agent - Faire', NULL::numeric, NULL::numeric),
  ('USWS-17239', 'Agent - Faire', NULL::numeric, NULL::numeric),
  ('USWS-17143', 'Agent - Faire', NULL::numeric, NULL::numeric)
) AS v(order_ref, agent, rate, amt) JOIN planner.rep_groups g ON g.name = v.agent;

-- 5. Migration 366 (v28.337): link the existing SHAUBEN client, then a client of type Agent (portal OFF) for every agent without one.
-- v28.331 (Ben 13-Oct-26): every agent (rep group) is a CLIENT of type Agent, so its settings live on one client record
-- (CLIENT ▸ Clients ▸ <agent> ▸ Commission / Customers). Portal OFF until the clean-up: every portal feature off, no users.
-- Additive and idempotent: only rep groups with no client linked (clients.rep_group_id) get one.
-- Step 1 (v28.337, Diviyaj 14-Oct-26): an EXISTING agent client with no rep group is linked to its agent's rep group by name first,
-- so no duplicate client is made next to it (live has client "SHAUBEN" with users and portal features, rep_group_id NULL, and the rep
-- group "Shauben", renamed "Agent - Schauben" by scripts/seed_commission_setup.cjs). Names compare without an "Agent -" prefix and
-- without non-letters; Shauben / Schauben / Appelman are the same agent (Ben 13-Oct-26). Only links a rep group that no client has.
WITH g AS (SELECT id, regexp_replace(regexp_replace(lower(name), '^agent\s*-?\s*', ''), '[^a-z]', '', 'g') k FROM planner.rep_groups),
     c AS (SELECT id, regexp_replace(regexp_replace(lower(name), '^agent\s*-?\s*', ''), '[^a-z]', '', 'g') k FROM planner.clients WHERE rep_group_id IS NULL AND type = 'agent'),
     m AS (SELECT DISTINCT ON (c.id) c.id client_id, g.id group_id FROM c JOIN g
             ON g.k = c.k OR (c.k IN ('shauben', 'schauben', 'appelman') AND g.k IN ('shauben', 'schauben', 'appelman'))
           WHERE NOT EXISTS (SELECT 1 FROM planner.clients x WHERE x.rep_group_id = g.id)
           ORDER BY c.id, (g.k = c.k) DESC, g.id)
UPDATE planner.clients cl SET rep_group_id = m.group_id, updated_at = now(), updated_by = 'migration 366'
  FROM m WHERE cl.id = m.client_id;

-- Step 2: a client of type Agent for every rep group still without one.
INSERT INTO planner.clients (name, code, type, owner_email, market, currency, warehouse_code, rep_group_id, features, active, notes, created_by, updated_by)
SELECT g.name,
       'agent-' || trim(both '-' from regexp_replace(lower(g.name), '[^a-z0-9]+', '-', 'g')) || '-' || g.id,
       'agent', NULL,
       CASE upper(coalesce(g.currency,'USD')) WHEN 'EUR' THEN 'EU' WHEN 'GBP' THEN 'UK' WHEN 'AUD' THEN 'AU' WHEN 'CAD' THEN 'CA' ELSE 'US' END,
       upper(coalesce(g.currency,'USD')),
       CASE upper(coalesce(g.currency,'USD')) WHEN 'EUR' THEN 'eu_3pl' WHEN 'GBP' THEN 'uk_3pl' WHEN 'AUD' THEN 'au_3pl' WHEN 'CAD' THEN 'ca_fba' ELSE 'us_3pl' END,
       g.id,
       '{"messaging": false, "view_stock": false, "order_placement": false, "sample_requests": false, "view_commission": false, "view_line_sheet": false}'::jsonb,
       g.active,
       'Agent client made from its rep group (migration 366). Portal off until the clean-up.',
       'migration 366', 'migration 366'
FROM planner.rep_groups g
WHERE NOT EXISTS (SELECT 1 FROM planner.clients c WHERE c.rep_group_id = g.id)
ON CONFLICT (code) DO NOTHING;

COMMIT;

-- Checks (run after COMMIT): expect 18 agents, 6 customer rates, 32 overrides, SHAUBEN linked to Agent - Schauben, 18 agent clients.
SELECT count(*) AS agents FROM planner.rep_groups;
SELECT count(*) AS customer_rates FROM planner.commission_customer_rates;
SELECT count(*) AS overrides FROM planner.commission_overrides WHERE created_by = 'seed';
SELECT c.id, c.name, g.name AS agent FROM planner.clients c LEFT JOIN planner.rep_groups g ON g.id = c.rep_group_id WHERE c.type = 'agent' ORDER BY c.id;