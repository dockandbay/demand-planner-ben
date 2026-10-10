-- v28.247 (Ben 10-Oct-26): ACCOUNTS top menu has its own grant. Admins always have it.
-- Additive and idempotent. Until applied, the app reads everyone as false (admins still see ACCOUNTS).
ALTER TABLE planner.app_permissions ADD COLUMN IF NOT EXISTS accounts_access boolean NOT NULL DEFAULT false;
