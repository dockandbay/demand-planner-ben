# Deploy package v28.184 to v28.213 (07-Oct-26)

**AT A GLANCE**
- Branch `review-fixes-2026-10-05`, code HEAD `415179b8` (full `415179b8a33b384ebf1167e27396840624f6bb73`). This note is committed on top; deploy by the code SHA or the branch tip.
- Live checked 07-Oct-26 via https://horizon.dockandbay.com/api/version: **v28.183.2**. What are .1 and .2? Tell Ben so they can be mirrored here.
- **6 migrations: 332 to 337.** Checked on live today: none applied yet. All additive and idempotent, and the code works before each one is applied.
- **No new required env vars.** Optional: `PORTAL_LINK_HOURS` (default 24) and `PORTAL_STALE_GRACE_MS` (default 1500). Recommended: `CIN7_WRITES_DISABLED=true` (see section 5).
- **No buy-plan or forecast changes** in this range.
- **Urgent:**
  - v28.186: supplier portal security. C1 was confirmed on live.
  - v28.199: Fulfil push guard; it stops duplicate Fulfil POs.
  - v28.185: invoice and packing list downloads have returned 500 on prod since 21-Sep.

## 1. Migrations (run in order, all `IF NOT EXISTS`)
| # | File | What |
|---|---|---|
| 332 | `332_portal_sessions_last_seen.sql` | `portal_sessions.last_seen_at` + index (v28.188) |
| 333 | `333_shipment_note_reads.sql` | `shipment_note_reads` table (v28.189). Backfills existing reads only while the table is empty |
| 334 | `334_so_supplier_pushes.sql` | `so_supplier_pushes` audit table (v28.192) |
| 335 | `335_client_sessions_last_seen.sql` | `client_sessions.last_seen_at` + index (v28.195) |
| 336 | `336_client_order_threads.sql` | `client_threads.order_key` and the `client_messages` columns for per-order messages and docs (v28.200). Until applied, the order thread routes return 503 |
| 337 | `337_fulfil_sales_agent_code.sql` | `fulfil_sales.agent_code` + index (v28.204) |

## 2. Gate, hosting and bundling checks
- These routes are covered by the existing prefix exemptions:
  - `POST /api/portal/health/login-events` (under `/api/portal/*`).
  - `POST /api/cp/health/login-events` and the new public `GET /api/cp/asset/logo` (under `/api/cp/*`).
- **Exempt `/portal-icon.png`** from the staff gate (v28.189).
- **Bundled files, please confirm both are served on Vercel after deploy:**
  - `lib/templates/` invoice template (v28.185). The 21-Sep move out of the bundle is what broke the downloads.
  - `supply/assets/db-logo.png` (client portal logo, v28.208).
- Check that Vercel passes `Cache-Control`, `ETag` and `Content-Encoding` through on the portal routes (v28.189).
- Upload limit: per-order documents (v28.200) use base64 JSON, about 4.5 MB on Vercel, the same as Messages.
- **Never set `HZ_FULFIL_WRITE_STUB*` in prod.** It's dev only and ignored on Vercel.
- Validate sales order pushes (v28.192) need the existing `FULFIL_LIVE_WRITES=true`; without it they return 423.

## 3. What's in it
**Security and portal**
- **v28.186 SECURITY:** supplier portal access fixes.
  - C1: riders on a consolidated shipment could download the master supplier's PO files and invoices.
  - C2: the portal no longer calls staff routes, and staff routes refuse portal sessions.
  - One shipment role rule (master or rider) across notes, charges, tracking and files.
  - Magic links are single-use through POST redeem, and scanners can't burn them.
  - Errors are generic, with a ref.
- **v28.210:** portal login tokens (supplier and client sessions, magic links, previews) are stored as `h1:` + SHA-256.
  - Raw tokens from the old build still work until they expire, so nobody is logged out.
  - An expired-row purge runs on first request.
  - Optional now: `DELETE FROM planner.portal_magic_tokens WHERE expires_at < now(); DELETE FROM planner.client_magic_tokens WHERE expires_at < now();`
  - `planner.external_access_tokens` (another app) still holds raw tokens.
- **v28.188 / v28.195:** supplier and client portal health-log coverage (migrations 332 and 335).
- **v28.189 to v28.191:** supplier portal speed (migration 333), experience, product-dev access and translations.

**Fulfil**
- **v28.199 URGENT, Fulfil push guard.** HORIZON never creates a Fulfil PO for client POs; they must be linked.
  - A push is refused (409) when Fulfil already has a matching PO.
  - A failed lookup stops the push (503), so it can't create blind.
  - New "Link Fulfil PO" picker.
  - **The PO385 / PO373 after-deploy step is already done:** Ben deleted PO385 in Fulfil, and PO373 is linked.
- **v28.207:** "Link Fulfil PO" action item. Expect about 32 active client POs to show it on live until they're linked.
- **v28.192 / v28.194 / v28.205 / v28.206:** Validate sales order (single and bulk, migration 334, supplier dropdown colours, confirm popup).
  - First live use: push one line on a confirmed order (for example SO56641) and check it in Fulfil.
- **v28.193:** production is always Fulfil **Live**. `app_settings.fulfil_env` is ignored and refused on prod; the Sandbox/Live switch shows on the sandbox only.

**Client portal**
- **v28.196 to v28.198, v28.201, v28.203:** commission statement CSV, line sheet label, tabbed client edit, New Order screen (enterable quantities, carton-multiple notice, compact grid).
- **v28.200:** per-order messages and documents (migration 336).
- **v28.204:** rep groups see orders by the Fulfil **Agent Code** metafield (migration 337); the sales import copies it.
  - The live sales import is still off (`cp_sales_import_enabled` not set), so live `fulfil_sales` is empty and no client sees orders yet. Switch it on after 337 when Ben says.
  - SHAUBEN needs its Agent Code set once known.
- **v28.208 / v28.209 / v28.211 / v28.212:** logo in the header, clearer client edit tabs with dd-mmm-yy dates, wider page on desktop.

**Other**
- v28.184: mobile navigation as a full L1 > L2 > L3 side menu.
- v28.187 / v28.202: "Crossdock likely required" action. It covers client POs landing at a 3PL, and FBA/AWD POs routed through a 3PL; AWD counts as a destination, not a 3PL.
- v28.213: Prime Day scenario gets a CSV download and inbound to FBA per country.

## 4. Smoke tests after deploy
1. `/api/version` returns v28.213.
2. Download an invoice and a packing list (admin and supplier portal): both return 200.
3. Supplier portal: a rider supplier on a consolidated shipment **cannot** open the master supplier's PO files (403).
4. Client portal login page shows the logo; My orders and New Order load.
5. PO grid: client POs show "Link Fulfil PO"; "Update lines" on a client PO refuses with no Fulfil write.
6. App health log: no new 500s.

## 5. Live config changed today (FYI, not code)
- **Ben set Active ERP to Fulfil on live** (`app_settings.erp_integration = 'fulfil'`, previously empty, which the code treated as Cin7).
- **Cin7:** PO pushes went to Cin7 until 30-Sep. The Cin7 code paths are still in the server, and a direct call with `?erp=cin7` can still write.
  - **Please set `CIN7_WRITES_DISABLED=true` on prod.** It's an existing kill switch for every non-GET Cin7 call.
  - Ben is removing the dead Cin7 routes in a later version.
- **Fulfil/Xero chart of accounts was tidied in Fulfil and Xero directly** (no app impact): Clearing accounts and AU landed cost 9039.
  - The Xero UK integration in Fulfil disconnected at 08:13 UTC and Ben reconnected it.

## 6. Optional: DB hardening quick wins (please review first)
Source: `Claude Analyses/DB_HARDENING_REVIEW_2026-10-07.md` (H1, H3, M1, M2, L1).
```sql
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
REVOKE EXECUTE ON FUNCTION public.uat_log_status(), public.uat_touch_row() FROM anon, authenticated, public;
REVOKE SELECT ON planner.portal_sessions, planner.portal_magic_tokens FROM planner_ro;
ALTER ROLE planner_ro NOBYPASSRLS;
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION planner.stamp_invoice_processed_date() SET search_path = planner, public;
ALTER FUNCTION planner.set_in_planning_scope() SET search_path = planner, public;
ALTER FUNCTION planner.stamp_flexport_updated_at() SET search_path = planner, public;
```
- Check first that the Trade Board front end never uses the anon key without signing in.
- The bigger item is **H1**: least-privilege roles instead of `postgres` everywhere. Start with a read-only `horizon_ro`.
