-- ============================================================================
-- RESEED SANDBOX FROM LIVE  (run this in YOUR SANDBOX Supabase SQL editor)
-- ============================================================================
-- Copies the ERP / source-of-truth tables from LIVE (prod) into your sandbox so
-- the PO grid, action counts and buy plan reproduce live numbers.
--
-- ✅ REPLACED from live (wiped + reinserted): products, shipments,
--    purchase_orders, purchase_order_lines, inbound_shipments, sales_actuals
-- ✅ UPSERTED from live (updated in place, NOT wiped): suppliers, branches
--    — because deposits / sample_requests / supplier_portal_users FK-reference
--      suppliers; wiping suppliers would cascade-destroy that sandbox work.
--      Upsert keeps your sandbox-only suppliers + all their linked rows.
-- ⛔ LEFT ALONE (your edits preserved): forecast_outputs, forecast_inputs,
--    buy_complex_rules, transfer_lead_times, preorders, key_account_forecasts,
--    demand_action_state, suggestions, samples/portal tables, deposits, etc.
--
-- Drift-proof: the INSERT/SELECT column lists are built at RUNTIME from the
-- intersection of each live foreign table and its sandbox target, so a column
-- added on one side but not the other (e.g. a not-yet-deployed migration) can
-- never break the load. DATA-ONLY — no schema change, no migration re-apply.
-- LIVE is only ever READ over the foreign server. Nothing writes to prod.
-- Wrapped in one transaction: any error rolls the whole thing back.
--
-- ── ONE-TIME SETUP: fill in the 3 LIVE connection values below ───────────────
-- In the Supabase dashboard for the LIVE project (oolwklahstnvocaugryg):
--   Connect ▸ "Session pooler"  → copy Host, and use:
--     REPLACE_LIVE_HOST     = the pooler host (e.g. aws-1-eu-central-1.pooler.supabase.com)
--     REPLACE_LIVE_USER     = postgres.oolwklahstnvocaugryg
--     REPLACE_LIVE_PASSWORD = the LIVE database password
--   (Use the SESSION POOLER host, not db.<ref>.supabase.co — that is IPv6-only
--    and FDW from another project usually can't reach it.)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- fresh foreign link (drops any prior one)
DROP SERVER IF EXISTS live_src CASCADE;
CREATE SERVER live_src FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (host 'REPLACE_LIVE_HOST', port '5432', dbname 'postgres', sslmode 'require');
CREATE USER MAPPING FOR CURRENT_USER SERVER live_src
  OPTIONS (user 'REPLACE_LIVE_USER', password 'REPLACE_LIVE_PASSWORD');

-- mirror the live tables as foreign tables under live_planner.*
DROP SCHEMA IF EXISTS live_planner CASCADE;
CREATE SCHEMA live_planner;
IMPORT FOREIGN SCHEMA planner
  LIMIT TO (suppliers, branches, products, shipments,
            purchase_orders, purchase_order_lines, inbound_shipments, sales_actuals)
  FROM SERVER live_src INTO live_planner;

-- ── LOAD (one transaction; all-or-nothing) ─────────────────────────────────
BEGIN;

-- Disable FK/trigger side-effects during the bulk reload (live data is already
-- referentially consistent). Also lets the DELETEs run without FK ordering pain.
SET session_replication_role = 'replica';

-- 1) UPSERT the tables that out-of-scope sandbox tables FK-reference. Existing
--    sandbox rows are updated; live-only rows are added; nothing is deleted, so
--    deposits / sample_requests / supplier_portal_users keep their supplier links.
DO $$
DECLARE r record; cols text; setl text;
BEGIN
  FOR r IN SELECT * FROM jsonb_to_recordset('[{"t":"suppliers","k":"id"},{"t":"branches","k":"name"}]'::jsonb)
                        AS x(t text, k text) LOOP
    SELECT string_agg(quote_ident(tgt.column_name), ', ' ORDER BY tgt.ordinal_position),
           string_agg(CASE WHEN tgt.column_name <> r.k
                           THEN quote_ident(tgt.column_name)||'=EXCLUDED.'||quote_ident(tgt.column_name) END,
                      ', ' ORDER BY tgt.ordinal_position)
      INTO cols, setl
      FROM information_schema.columns tgt
     WHERE tgt.table_schema='planner' AND tgt.table_name=r.t
       AND EXISTS (SELECT 1 FROM information_schema.columns f
                    WHERE f.table_schema='live_planner' AND f.table_name=r.t
                      AND f.column_name=tgt.column_name);
    EXECUTE format('INSERT INTO planner.%I (%s) SELECT %s FROM live_planner.%I ON CONFLICT (%I) DO UPDATE SET %s',
                   r.t, cols, cols, r.t, r.k, setl);
    RAISE NOTICE 'upserted planner.%', r.t;
  END LOOP;
END $$;

-- 2) REPLACE the pure source tables (no out-of-scope FK children → safe to wipe).
DO $$
DECLARE t text;
  del_order text[] := ARRAY['inbound_shipments','sales_actuals','purchase_order_lines',
                            'purchase_orders','shipments','products'];       -- child-ish first
  ins_order text[] := ARRAY['products','shipments','purchase_orders',
                            'purchase_order_lines','inbound_shipments','sales_actuals']; -- parent-ish first
  cols text;
BEGIN
  FOREACH t IN ARRAY del_order LOOP
    EXECUTE format('DELETE FROM planner.%I', t);
  END LOOP;
  FOREACH t IN ARRAY ins_order LOOP
    SELECT string_agg(quote_ident(tgt.column_name), ', ' ORDER BY tgt.ordinal_position) INTO cols
      FROM information_schema.columns tgt
     WHERE tgt.table_schema='planner' AND tgt.table_name=t
       AND EXISTS (SELECT 1 FROM information_schema.columns f
                    WHERE f.table_schema='live_planner' AND f.table_name=t
                      AND f.column_name=tgt.column_name);
    EXECUTE format('INSERT INTO planner.%I (%s) SELECT %s FROM live_planner.%I', t, cols, cols, t);
    RAISE NOTICE 'reseeded planner.%', t;
  END LOOP;
END $$;

-- 3) fix identity sequences so future inserts don't collide with reseeded ids
SELECT setval('planner.suppliers_id_seq',            GREATEST((SELECT max(id) FROM planner.suppliers),1), true);
SELECT setval('planner.purchase_order_lines_id_seq', GREATEST((SELECT max(id) FROM planner.purchase_order_lines),1), true);
SELECT setval('planner.inbound_shipments_id_seq',    GREATEST((SELECT max(id) FROM planner.inbound_shipments),1), true);

SET session_replication_role = 'origin';
COMMIT;

-- ── TEARDOWN: remove the live link + creds so nothing lingers ────────────────
DROP SCHEMA IF EXISTS live_planner CASCADE;
DROP SERVER IF EXISTS live_src CASCADE;

-- Sanity checks (optional) — should now roughly match live:
--   SELECT count(*) FROM planner.purchase_orders;      -- ~1367
--   SELECT count(*) FROM planner.products;             -- ~2743
--   SELECT count(*) FROM planner.inbound_shipments;    -- ~2075
