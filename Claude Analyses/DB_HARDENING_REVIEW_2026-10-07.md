# Live database hardening review (07-Oct-26)

Project `oolwklahstnvocaugryg` (Postgres 17, eu-west-2, 461 MB). Read-only review: Supabase security advisor plus direct catalogue queries. Nothing was changed.

## What is already good
- `planner`, `china`, `ops`, `demand` are **not** reachable through the public REST API (`anon` has no USAGE on them). Only `public` (Trade Board) is API-exposed.
- All 13 `public` tables have RLS on, with no `anon` policies, so the browser anon key cannot read or write them today.
- All 27 Supabase Auth users are @dockandbay.com. Both storage buckets are private. SSL on. Extensions minimal. 18 of 120 connections in use.
- `forecast_outputs` / `forecast_inputs` have no primary key but do have unique keys, so no duplicate risk.
- Statement timeouts: postgres 30 s, authenticated 8 s, anon 3 s.

## Findings (ranked)

### High
**H1. Everything connects as `postgres`.** HORIZON (Vercel), n8n and local tooling use the `postgres` role: BYPASSRLS, owner of every table, password never expires. One leaked env file = read, change or drop every schema including `auth`. Ben's laptop `.env` `LIVE_DATABASE_URL` is also this full `postgres` login (used read-only by Claude, but not enforced by the role).
Fix (Diviyaj): create least-privilege roles, `horizon_app` (DML on `planner` only), `n8n_etl` (only the tables it syncs), `horizon_ro` (SELECT only, for Claude/local, see docs/querying-live-db.md), then rotate the `postgres` password and move every consumer over. Do `horizon_ro` first: smallest change, removes the laptop risk.

**H2. Portal login tokens are stored in plain text.** `portal_sessions.token`, `portal_magic_tokens.token`, `client_sessions.token`, `client_magic_tokens.token`, `external_access_tokens.token`. Anyone who can read these tables (SQL editor, MCP, backups, `planner_ro`) can sign in as a supplier or client. 124 of 129 portal sessions are expired but never purged.
Fix (Ben, code): store a SHA-256 of the token and compare hashes; purge expired rows on a schedule. App change, no data migration beyond invalidating current sessions (users re-request a link).

**H3. Trade Board tables grant `anon` everything** (SELECT, INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES) on all 13 `public` tables. Today RLS blocks it, but one mistaken policy or a disabled RLS opens them to the internet with the anon key that ships in the browser. Policies for `authenticated` are mostly `using (true)`: any signed-in Supabase user can read and edit board data, so the Auth signup setting is the real gate.
Fix (Diviyaj): `REVOKE ALL ... FROM anon` on those tables; confirm Auth > Sign-ups are disabled or restricted to @dockandbay.com; enable leaked-password protection (advisor).

### Medium
**M1. Two SECURITY DEFINER functions callable by anyone**: `public.uat_log_status()` and `public.uat_touch_row()` via `/rest/v1/rpc/...` by `anon` and `authenticated`. Fix: revoke EXECUTE from anon/authenticated (they look like trigger helpers, which do not need it).

**M2. `planner_ro` login role has BYPASSRLS and SELECT on 86 tables, including `portal_sessions`, `portal_magic_tokens`, `supplier_portal_users`.** Not connected now. Fix: confirm who holds its password; revoke the token tables; drop BYPASSRLS.

**M3. 188 `planner` tables have RLS off.** Not exploitable today (schema not exposed), but defence in depth: if `planner` is ever added to the API schemas, everything is open. Fix: enable RLS with no policies (deny-all for API roles; `postgres` bypasses, so the app is unaffected). Needs a plan alongside H1, since a new `horizon_app` role would then need BYPASSRLS or policies.

**M4. 22 old backup/copy tables in `planner`** (copies of products, POs, PO lines, suppliers, forecasts, Jun to Oct): stale commercial data, no keys. Includes `_bak_po_links_po373_20261007` and `_bak_products_catfinal_20261006`. Fix: drop those past their rollback window (list below).

**M5. Top DB load is one query.** The per-PO payment/date core (`v_po_fi`) used 40,464 s total, 2.7 s average over 15k calls; order-plan lines 1.8 s average. Not a security issue, but it is the query most likely to hit the 30 s timeout under load. Fix (Ben): materialise or cache `v_po_fi`.

### Low
- L1. 4 functions with mutable `search_path` (`public.set_updated_at`, `planner.stamp_invoice_processed_date`, `planner.set_in_planning_scope`, `planner.stamp_flexport_updated_at`): add `SET search_path = ''`/`planner, public`.
- L2. `log_connections` off: no record of who connected. Consider enabling, or pgaudit for the `postgres` role.
- L3. Backups/PITR cannot be seen from SQL. Confirm in the dashboard that PITR is on; manual `_bak` tables are not a substitute.
- L4. 10 foreign keys without an index; 85 never-used indexes (1.3 MB, harmless).

## Quick-win SQL for Diviyaj (run on live after review)
```sql
-- H3: anon never needs table rights on the Trade Board (RLS + authenticated policies do the work)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
-- M1: SECURITY DEFINER helpers not callable over the API
REVOKE EXECUTE ON FUNCTION public.uat_log_status(), public.uat_touch_row() FROM anon, authenticated, public;
-- M2: read-only role must not see login tokens or bypass RLS
REVOKE SELECT ON planner.portal_sessions, planner.portal_magic_tokens FROM planner_ro;
ALTER ROLE planner_ro NOBYPASSRLS;
-- H2 interim: purge expired sessions / links
DELETE FROM planner.portal_sessions WHERE expires_at < now();
DELETE FROM planner.portal_magic_tokens WHERE expires_at < now();
DELETE FROM planner.client_sessions WHERE expires_at < now();
DELETE FROM planner.client_magic_tokens WHERE expires_at < now();
-- L1
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION planner.stamp_invoice_processed_date() SET search_path = planner, public;
ALTER FUNCTION planner.set_in_planning_scope() SET search_path = planner, public;
ALTER FUNCTION planner.stamp_flexport_updated_at() SET search_path = planner, public;
```
Check first that the Trade Board front end never uses the anon key without signing in (it should not, since no anon policies exist).

## Backup tables to review for DROP (M4)
set_bom_bak_20260908, z_products_bak_20260708, forecast_outputs_bak_20260908_sets, z_product_countries_bak_20260710, z_products_bak_20260710, forecast_outputs_bak_20260908_b2b_runoff, po55ukxr2_bak_20260626, z_products_bak_20260713_avail, erp_purchase_order_lines_bak_20260626, z_products_bak_full_20260713, purchase_order_lines_bak_20260626, suppliers_bak_20260626, erp_purchase_orders_bak_20260626, erp_lines_pruned_20260626, z_scope_bak_20260814, z_payment_fx_bak_20260727, forecast_outputs_bak_20260908_disc_zero_purge, forecast_outputs_bak_20260907_fba_smooth, _bak_po_links_po373_20261007, _bak_products_catfinal_20261006.
Note: the 08-Sep disc-zero purge and 07-Sep FBA smooth backups are the only rollback for those live writes; drop only once Ben is sure.
