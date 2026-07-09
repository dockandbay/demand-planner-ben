-- 103_app_permissions.sql
-- App access control for HORIZON. Gates EDIT access to SUPPLY and DEMAND features; everyone who can load
-- the app is read-only by default. Enforcement is LIVE-ONLY: it applies only when the Gmail auth proxy
-- forwards a signed-in email (see authUser() in server.mjs). Sandbox/local has no proxy → full access.
-- FBA is always read-only except its client-only Override column; SCENARIO is open to all; the supplier
-- portal has its own separate magic-link auth and is NOT covered here.

CREATE TABLE IF NOT EXISTS planner.app_permissions (
  email        text PRIMARY KEY,          -- lowercased Gmail login
  supply_edit  boolean NOT NULL DEFAULT false,
  demand_edit  boolean NOT NULL DEFAULT false,
  is_admin     boolean NOT NULL DEFAULT false,   -- can use the (admin-only) Permissions panel
  updated_at   timestamptz DEFAULT now(),
  updated_by   text
);

-- Seed: Ben + Diviyaj + Sarah + Andy + Abi — all admin, full SUPPLY + DEMAND edit.
INSERT INTO planner.app_permissions (email, supply_edit, demand_edit, is_admin) VALUES
  ('ben@dockandbay.com',      true, true, true),
  ('diviyaj@dockandbay.com',  true, true, true),
  ('sarah@dockandbay.com',    true, true, true),
  ('andy@dockandbay.com',     true, true, true),
  ('abi@dockandbay.com',      true, true, true)
ON CONFLICT (email) DO UPDATE
  SET supply_edit = excluded.supply_edit,
      demand_edit = excluded.demand_edit,
      is_admin    = excluded.is_admin,
      updated_at  = now();
