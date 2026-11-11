-- migration 437
-- v28.779 (security review 10-Nov-26, finding 24): the read-only analytics role planner_ro can no longer read supplier-portal sign-in links or
-- sessions. HORIZON itself does not use planner_ro for these tables. app_permissions (no secrets) is left as it is. Safe to re-run; a database
-- without the role (the sandbox) skips it.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'planner_ro') THEN
    REVOKE ALL ON planner.portal_sessions FROM planner_ro;
    REVOKE ALL ON planner.portal_magic_tokens FROM planner_ro;
  END IF;
END
$$;
-- Read back: SELECT grantee, table_name FROM information_schema.role_table_grants
--   WHERE table_schema='planner' AND grantee='planner_ro' AND table_name IN ('portal_sessions','portal_magic_tokens');   -- expect 0 rows
