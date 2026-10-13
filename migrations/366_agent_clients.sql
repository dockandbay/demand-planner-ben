-- v28.331 (Ben 13-Oct-26): every agent (rep group) is a CLIENT of type Agent, so its settings live on one client record
-- (CLIENT ▸ Clients ▸ <agent> ▸ Commission / Customers). Portal OFF until the clean-up: every portal feature off, no users.
-- Additive and idempotent: only rep groups with no client linked (clients.rep_group_id) get one.
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
