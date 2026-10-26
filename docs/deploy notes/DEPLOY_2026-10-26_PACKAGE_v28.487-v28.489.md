# HORIZON deploy package v28.487 → v28.489 (26-Oct-26)

**AT A GLANCE:** Ben's branch `review-fixes-2026-10-05` at `f7956094` (v28.489). Live `/api/version` before: **v28.486** (production `main` = `2d7f0188`). Production port: PR #16, branch `port/v28.489`, commit `9f5bcb95` (author admin@dockandbay.com). Owner of production steps: Ben.

**STATUS 26-Oct-26: LIVE.** PR #16 merged by Ben (production `main` = `e0b013e4`), CI run 40271897235 green, live `/api/version` = **v28.489**.

## What changed
- **v28.487 DEMAND ▸ Inputs ▸ Open to buy** (#/demand/inputs/otbinput): planned OTB £ at cost by month × market × channel, shared (planner.wssi_otb). Feeds WSSI's OTB planned rows and adds to projected closing stock. WSSI has an "Enter open to buy" button. Routes GET / POST `/api/demand/wssi-otb` (POST needs demand_edit or admin).
- **v28.488** Open to buy as a spreadsheet grid (Key accounts model: select / drag, keyboard, copy / paste / fill, undo, status bar; each change saves at once). xlsx template Download and Upload (`POST /api/demand/wssi-otb/upload`, read-only parse, preview then apply). Site icons at the root (favicon.ico 16/32/48, apple-touch-icon.png, icon-192.png, icon-512.png) so the Claude connector and browsers show the HORIZON sun mark (before, /favicon.ico fell through to the sign-in page).
- **v28.489** Claude connector: every @dockandbay.com account may connect read only, no Permissions tick (people with no permissions row included). ACCOUNTS / COMMISSIONS data still need those grants; suspended people refused. Permissions "Claude connector" column removed.

## Port notes
- `scripts/port/sync-ben.cjs` 2f60168e → f7956094: **clean, no conflicts**.
- **Gotcha:** the port script wrote the four new binary icon files as text and corrupted them. Replaced with Ben's originals and checked byte for byte (cmp). Future binary files need the same, or the script fixed.
- benBase → `f7956094`. Checks: `scripts/checks/run-all.cjs`, `npm test`, `tests/prebuild-race.cjs` all pass.

## Migration
- **388_wssi_otb.sql**: `planner.wssi_otb` (month date, market, channel, otb_cost numeric, note, updated_at, updated_by; primary key month + market + channel). Additive.
- Auto mode blocked Claude from applying it; **Ben ran it in the Supabase SQL editor (26-Oct-26)**. Read back: 7 columns with the right not-null rules, primary key (month, market, channel), 0 rows, anon has no USAGE on planner.

## Env, routes
- No new env. **New cron / webhook routes: none.** New routes `/api/demand/wssi-otb` (GET, POST) and `/api/demand/wssi-otb/upload` (POST) sit behind the normal login gate.

## Buy plan
No planning logic changed.

## Also today (not code)
- Fulfil order import switched on by Ben (CLIENT ▸ Config ▸ Order import), 120-day backfill: 1,783 orders in planner.fulfil_sales. n8n `ujRlaIwO4X9E9eqm` activated 15:12 AEDT; first run 15:35 AEDT success (8.5 s).
- Claude connector switched on (MCP_ENABLED, MCP_SIGNING_KEY set by Ben); Ben's test calls ok in mcp_audit.

## Smoke checks after the deploy
1. `/api/version` = v28.489.
2. `/favicon.ico` returns an icon (image), not the sign-in page.
3. DEMAND ▸ Inputs ▸ Open to buy loads and saves a figure; WSSI shows it in OTB planned.
4. CONFIG ▸ Admin ▸ Permissions: no "Claude connector" column.

## Deploy record
- 26-Oct-26: PR #16 opened, checks green; migration 388 applied by Ben and read back.
- 26-Oct-26 04:59 UTC: merged by Ben, production `main` = `e0b013e4`. CI run 40271897235 (push) green; 40271906190 (Run workflow) also started. Live `/api/version` verified **v28.489**.
- Smoke on live: `/favicon.ico` 200 image/vnd.microsoft.icon, byte-identical to Ben's file; apple-touch-icon.png, icon-192.png, icon-512.png 200 image/png. `/api/demand/wssi-otb` without a login = 401 (gate). `POST /mcp` = 401 sign-in required (connector on). Open to buy save and the Permissions column: for Ben to check in the app.
