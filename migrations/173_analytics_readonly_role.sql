-- 173_analytics_readonly_role.sql
-- Read-only Postgres role for the HORIZON conversational-analytics project
-- (claude.ai Supabase connector). Grants SELECT only — no INSERT/UPDATE/DELETE/DDL.
--
-- RUN BY: Diviyaj, on production (oolwklahstnvocaugryg). One writer to prod.
-- SECRET: set a real password out-of-band (Supabase dashboard or psql \password);
--         do NOT commit the real password. The placeholder below must be replaced.
--
-- Covers existing AND future tables/views in the planner schema (+ public for the
-- Trade Board, optional). ALTER DEFAULT PRIVILEGES must be run as each role that
-- CREATES tables in these schemas (postgres and, if it creates tables, the n8n/ETL
-- role) so new tables inherit SELECT automatically.

-- 1) Login role (replace the password before running)
CREATE ROLE horizon_readonly WITH LOGIN PASSWORD 'REPLACE_ME_STRONG_PASSWORD';

-- 2) Connect + schema usage
GRANT CONNECT ON DATABASE postgres        TO horizon_readonly;
GRANT USAGE   ON SCHEMA   planner          TO horizon_readonly;

-- 3) SELECT on everything that exists now
GRANT SELECT ON ALL TABLES    IN SCHEMA planner TO horizon_readonly;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA planner TO horizon_readonly;  -- read seq values if needed

-- 4) SELECT on everything created later (run as the table-owning role, e.g. postgres)
ALTER DEFAULT PRIVILEGES IN SCHEMA planner GRANT SELECT ON TABLES TO horizon_readonly;

-- 5) OPTIONAL: public schema (Trade Board) — uncomment if analytics should read it too
-- GRANT USAGE  ON SCHEMA public TO horizon_readonly;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO horizon_readonly;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO horizon_readonly;

-- 6) Belt-and-braces: make sure it can never write to planner even if a future grant slips
--    (Postgres has no schema-wide REVOKE-write shortcut; the role simply never receives
--     INSERT/UPDATE/DELETE above, so it cannot write. Do not grant those anywhere.)

-- Connection string for the connector (Supabase pooler / Supavisor tenant format):
--   postgresql://horizon_readonly.<PROJECT_REF>:<password>@<pooler-host>:6543/postgres
-- or direct:
--   postgresql://horizon_readonly:<password>@<db-host>:5432/postgres
