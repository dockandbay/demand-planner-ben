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
