# DEPLOY package for Diviyaj: v28.151 to v28.180 (supersedes DEPLOY_2026-10-05_PACKAGE_v28.151-v28.155.md)

**AT A GLANCE:** branch `review-fixes-2026-10-05`, HEAD `5c1fcc55` (`5c1fcc55accdbc4c299a652ad4700babefaff1c0`, v28.180). Live verified 06-Oct-26 via `https://horizon.dockandbay.com/api/version` = **v28.150.2**.
**Base:** forked from `fix/first-click-boot-freeze` at v28.150 (`625e4258`). Please keep your **.1 and .2 patches of v28.150** and your PROD DIVERGENCE patches on top, as before (this branch has none of them).
**Urgent part:** v28.179 fixes the "needs 2 clicks" bug that is on live today (left menu redrew itself every ~270 ms and swallowed clicks).
Full detail per version is in CHANGES.md; this note is only what you need to deploy.

## Order of operations
1. **Migrations (all additive, idempotent):**
   - `327_commission_rows_unique.sql`: run its duplicate SELECT first (sandbox 0).
   - `328_app_health_events.sql`, `329_app_health_kinds.sql`: App health log.
   - `330_supplier_xero_contacts.sql`: `suppliers.xero_contact_uk/au`, seeded "<name> - <code>" with Fulfil's names for MQ / JM / HDQ. Xero contacts already aligned in both orgs (06-Oct, all 11 Fulfil suppliers resolve).
   - `331_app_health_dead_click.sql`: new health event kind. Until applied, the server drops dead_click rows and keeps the rest.
2. **Prod role timeout:** `ALTER ROLE <app role> SET statement_timeout='30s'`, check with `SHOW statement_timeout` through 6543.
3. **Deploy code** (server restart: server.mjs changed throughout).
4. **vercel.json: YOURS WINS** (it carries `horizon-login.html`). Only port: add `node_modules/pdfjs-dist/build/pdf.min.mjs` and `.../pdf.worker.min.mjs` to `includeFiles`, remove the legacy `crons` entry. `lib/**` must stay in `includeFiles` (Ask Claude logic library).
5. **Login gate:**
   - Exempt (all x-webhook-secret checked in the handler, or public script): `/hz-health.js`, `/api/cron/health-weekly`, `/api/cron/health-checks`, `/api/cron/fba-inflight-refresh`, `/api/cron/up-fx-statement`.
   - Pass through cookies `hz_sid` and `hz_rw` (cache read-your-writes, v28.167).
   - Mirror the portal write-hook middleware placement (before the routes) and the `CACHE_DEPS` additions (v28.175).
   - If the shell sets a Content-Security-Policy, allow `worker-src blob:` (v28.178 demand Web Worker; otherwise every build runs chunked, logged once per session).
6. **Env vars (optional, names only):** `PORTAL_URL` (= `https://supplier.dockandbay.com/portal`); `PAYMENT_EMAIL_CRON=1` only after the n8n payment-emails job exists; `CIN7_WRITES_DISABLED=true`; `HZ_MAX_REBUILDS` (default 2); `HZ_CACHE_LOG=1` (debug). Prod already has RESEND_API_KEY and the Xero UK/AU connections.
7. **n8n jobs:**

| Job | Schedule | Call |
|---|---|---|
| Health checks + held alerts | every 15 min | POST `/api/cron/health-checks` (add an n8n error-workflow email if it fails) |
| Weekly health report | Mon 08:00 Australia/Sydney | POST `/api/cron/health-weekly` (test `{"dry_run":true}`) |
| FBA in-flight refresh | daily 06:00 Europe/London | POST `/api/cron/fba-inflight-refresh` |
| UP FX statement email | Mon 08:00 Europe/London | POST `/api/cron/up-fx-statement` (test `?dry=1`) |

All with header `x-webhook-secret: N8N_WEBHOOK_SECRET`, body `{}`.

## One-time, right after deploy
1. **Run `/api/cron/fba-inflight-refresh` once by hand.** Until it runs, live keeps counting ~61k phantom units (Fulfil BOT transfers IS168-IS187 from "UK ILG - Old") as UK FBA cover.
2. Check `/api/supply/xero/supplier-contacts?fresh=1`: every Fulfil supplier "found" in UK and AU (Chilly Bottles, Foamie, Forming Reality, Kangxun, Zhongshan Huiming are not in Fulfil and will be blocked until their contact exists or is set in CONFIG > Suppliers).

## Buy-changing versions (before/after done on sandbox)
- **v28.154:** demand build idempotent; Sep-27 forecast was 0 for every continuing SKU (fixed).
- **v28.168:** SSM FBA cover now applies (75 SKU x market lower when SSM FBA on with box 12); in-flight transfers and AWD/NonGRS load at startup (buy no longer depends on which tab opened first); excluded source warehouses (UKILG-OLD, OPTEST, ILGW, COUGH) raise UK on 21 SKUs once the phantom transfers drop out.
- All perf versions (v28.164, 167, 171, 175, 178, 179) were verified buy-identical (0 rows differ).

## Headlines v28.164 to v28.180 (v28.151 to v28.163 as in the 05-Oct note)
- **Perf roadmap complete:** v28.164 payload cache + ETag; v28.167 lazy, scoped cache invalidation (one PO edit 22 rebuilds / 149 DB-s to 0 / 12.5); v28.171 incremental demand rebuild (cell edit ~1.45 s to 6-60 ms); v28.175 portal speed (warm ~1 ms); v28.178 full demand build in a Web Worker (no main-thread task >= 50 ms; real Chrome 0.34-1.8 s off-thread); v28.179 first-click fix + faster ERP Compare / BUY first entry.
- **v28.165** planner filters (Shown SKUs line, Search overrides filters). **v28.166** Ask Claude logic library + `explain_buy`. **v28.169** health no-category fix. **v28.170** Create in Xero popup (PO never clipped, drawer link, instant "done"). **v28.172** PO linked records: change / search / unlink Xero bill. **v28.173** Xero preflight badges + real Xero validation reasons. **v28.174** UP FX Statement button + weekly email. **v28.176/177** Xero supplier contacts by ContactID, never auto-created. **v28.180** Ask Claude rename + working indicator.

## Separate asks (not code)
- **`cin7_inbound_direct` n8n job:** still rebuilds `inbound_shipments` from frozen Cin7 data; OK to disable once you confirm it cannot empty the table.
- **n8n products sync:** add `category_name_final`, `subcategory_name_final`, `product_category` to the map (Ben seeded live 06-Oct, 1,209 rows); SKUs deleted/renamed in Airtable are never removed (12 still in planning scope). See NOTE_2026-10-06_for-diviyaj_products-category-seed.md.
- **Xero bill sync (`xero_bills`)** missed at least one UK bill (Lixin PO-57DILLARDS-LXJULY, 25-Sep). Worth a full resync after deploy.

## Please check after deploy
1. `/api/version` = v28.180; staff login and page load normal.
2. Single clicks open DEMAND > Inputs tabs, Plan, Scenario, BUY & MOVE first time.
3. CONFIG > App health log shows events; a demand_build metric row appears after opening DEMAND.
4. Supplier portal loads (second load near-instant); a supplier "Confirm order" persists.
5. Payments Report: XERO buttons show preflight badges; "UP FX Statement" downloads.
6. `SHOW statement_timeout` via 6543 = 30s.

**Added after hand-off: v28.181** (DEMAND > Actions faster; fixes a dismissed/snoozed action showing as open for up to 90 s; keep the new `EARLY_DA` `<head>` snippet next to `EARLY_SKU`). No migration, no env vars. Deploy it with the rest: pull `origin/review-fixes-2026-10-05` HEAD.

**Added after hand-off: v28.182 and v28.183** (deploy with the rest; pull `origin/review-fixes-2026-10-05` HEAD).
- v28.182: Key Accounts forecast grid works like a spreadsheet; `POST /api/supply/ka-forecast-cells` now takes per-cell client/warehouse and rejects negative/decimal quantities. No migration, no env vars.
- v28.183: Xero bill links survive voids (live-checked picker, auto-heal, payment runs re-read live); sync on visit when >12 h old + "Sync now"; CONFIG > Xero "Resync all bills". **After deploy run CONFIG > Xero > Resync all bills once.** Correction to the separate ask above: the live hourly bill sync was NOT missing bills (the Lixin bill was created in Xero at 05:02 UTC and cached at 05:20); no resync investigation needed beyond the one-off resync. No migration, no env vars.

