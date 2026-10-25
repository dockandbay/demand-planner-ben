# HORIZON deploy package v28.475 → v28.482 (25-Oct-26)

**AT A GLANCE:** Ben's branch `review-fixes-2026-10-05`. The code is at `37828ca5` (37828ca537922171c734dc6392bec9521690d8ca, v28.482). Later commits are a PP BOM flip run log, the v28.474 deploy note and this note, with no app code. Live `/api/version` verified **v28.474** (25-Oct-26 02:30 UTC). Production `main` = `3e1f18a6`.

**STATUS 25-Oct-26: LIVE, migration 386 applied and read back.** One migration (386). The Claude connector code ships switched off and stays off until `MCP_ENABLED=1` is set (phase 6 of the runbook), so this package can go live without any Google or env setup.

## Merge rule (new since 25-Oct)
Vercel blocks a deploy whose commit author email it cannot match to a GitHub account in the team. Merge the port PR as **dockandbay** with the commit email **admin@dockandbay.com** (now verified, primary and public on that account), or as Diviyaj. Never with the `…@users.noreply.github.com` address. If a deploy shows **Blocked** in Vercel, that is the cause.

## Div: what's needed
1. **Port and merge** v28.475 to v28.482 (files below). Production's own drift in `server.mjs` / `supply/inject.html` should be kept as usual.
2. **Migration 386 on production, then read it back BEFORE the merge** (see below). It is additive and idempotent, and does nothing on its own.
3. **Env check:** `STORAGE_MAX_MB` must be unset or `100` in production.
4. **Login gate exemptions (for the connector, needed before it is switched on, harmless before):** `/mcp`, `/oauth/*`, `/.well-known/oauth-*`, `/.well-known/openid-configuration`. Each checks its own bearer token or OAuth state in the handler. Ben's gate already lists them in `server.mjs`; mirror them in the production harness gate.
5. **After the deploy (Ben confirms each, live writes):** client portal order import switch-on, and later the connector switch-on. Both are below.

## Migration
- **386_mcp_connector.sql**
  - `planner.app_permissions.mcp_access` boolean NOT NULL default false;
  - new tables `planner.mcp_clients`, `planner.mcp_tokens` (codes and tokens stored as SHA-256 hashes only) and `planner.mcp_audit`, with indexes.
  - Read-back: column exists with default false; the 3 tables exist and are empty.

## New env, new routes, dependencies
- **New env (connector only, not needed for this deploy):**
  - `MCP_ENABLED=1` (off until set);
  - `MCP_SIGNING_KEY` (long random string, e.g. `openssl rand -hex 32`);
  - `MCP_GOOGLE_CLIENT_ID` / `MCP_GOOGLE_CLIENT_SECRET`.
  - Optional: `MCP_BASE_URL`, `MCP_REDIRECT_HOSTS`.
  - **Change of plan since v28.480 was written:** don't use the default (the ACCOUNTS Gmail client in the accounts@ Google Cloud project #1042367754279). Set `MCP_GOOGLE_*` to a sign-in-only client in the new company-owned "Dock & Bay Apps" project (Internal, scopes openid/email/profile, redirect `https://horizon.dockandbay.com/oauth/google/callback`). See the Connect handover and the go-live runbook.
  - `MCP_DEV_LOGIN` is sandbox only; never set it on production (it is ignored under PLANNER_KEY anyway).
- **New cron / webhook routes: none.** `/api/cron/client-sales` already exists (v28.008) and should already be exempt.
- **New connector routes (gate exemptions above):** `/mcp`, `/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource`, `/.well-known/openid-configuration`, `/oauth/register`, `/oauth/authorize`, `/oauth/google/callback`, `/oauth/token`, `/oauth/revoke`.
- **New dependencies: none.** vercel.json unchanged.
- **n8n:** workflow `ujRlaIwO4X9E9eqm` (client portal order import, :05 and :35) exists and is still **inactive**. Activate it only after the switch-on below.

## Files changed (1f0bc2fe → 37828ca5, app files)
`server.mjs` (364 lines), `supply/inject.html`, `supply/client-view.js`, `supply/portal-view.js`, `package.json` (28.482), `migrations/386_mcp_connector.sql`, `lib/ai-logic/reports.md`, `lib/ai-logic/supply-finance.md`, `CHANGES.md`.

## What changed
- **v28.475** Client portal ▸ My orders:
  - invoice PDF download (Fulfil's own template, streamed by HORIZON; only for orders the signed-in user can see);
  - tracking numbers now link to the carrier;
  - the sales sync stores the tracking number (it stored Fulfil's record id before) and Fulfil's tracking URL.
- **v28.476** Supplier payment email: the internal "pay from a bank linked to Xero" banner no longer goes to the supplier. It stays on the payment run screen.
- **v28.477** Client portal order import:
  - wholesale channels only (new setting `cp_import_channels`, default the 17 wholesale channels). Before, it pulled every channel (about 130,000 orders per 120 days on live, beyond Vercel's 300 s limit);
  - ready for the n8n schedule.
- **v28.478** The order import also picks up recently shipped and updated orders (tracking arriving later), every 30 minutes.
- **v28.479** Client portal: Fulfil order number, a Shipments card with every shipment and every tracking code (one per package), and CSV columns for both.
- **v28.480** Claude connector: HORIZON in Claude chat. Read-only MCP endpoint with per-person Google sign-in.
  - Who can use it: super admins plus anyone ticked in CONFIG ▸ Admin ▸ Permissions "Claude connector".
  - Logging: every call goes to `mcp_audit`.
  - **Security fix included:** Ask Claude's SQL tool can no longer read `app_settings` (Xero tokens), the Gmail connection, other people's chats or the `mcp_*` tables.
- **v28.481 / v28.482** File uploads:
  - the per-file limit is 100 MB everywhere (PRODUCT, supplier portal product docs and sample photos);
  - PRODUCT documents carry on after a failed file and name each failure.

## Buy plan
Identical to baseline after every change on Ben's branch (no planning logic in this package).

## Smoke checks after the deploy lands
1. `/api/version` = v28.482.
2. PRODUCT ▸ any product ▸ Documents: a file over 10 MB uploads.
3. CLIENT ▸ Portal preview ▸ My orders: the page loads. It stays empty until the import is switched on.
4. Supplier payment email preview: no Xero bank banner.
5. CONFIG ▸ Admin ▸ Permissions: a "Claude connector" column shows, all unticked.
6. `https://horizon.dockandbay.com/mcp` returns HTTP 503 "The HORIZON Claude connector is not enabled on this server" (`MCP_ENABLED` not set). It must not show the HORIZON login page; if it does, the gate exemption is missing.

## After the deploy (live writes, Ben confirms each)
**Client portal order import:**
1. CLIENT ▸ Config ▸ Order import: tick enabled (`cp_sales_import_enabled`), check the 17 channels.
2. Run the 120-day backfill once (about 900 orders).
3. Activate n8n `ujRlaIwO4X9E9eqm`.

**Claude connector** (after the "Dock & Bay Apps" Google project exists):
1. Set the `MCP_*` env.
2. Redeploy.
3. Tick people in Permissions.
4. Ben adds `https://horizon.dockandbay.com/mcp` as a custom connector in the Claude organisation.

## Deploy record
- 25-Oct-26: PR #13 (port of 2c8f34cc; one conflict in the login gate, production gate kept + connector exemptions), merged by Ben as admin@dockandbay.com. Production `main` = `7ec02ec2`. CI run 40180526739 green (checks, tests, deploy, alias, smoke).
- Live `/api/version` verified **v28.482** (09:30 UTC).
- Connector smoke: `POST /mcp` and `/.well-known/oauth-protected-resource` return 503 "not enabled" (JSON, not the login page), so the gate exemption works; `GET /mcp` 405.
- Owner of production steps from 25-Oct-26: Ben (no longer Diviyaj).
- Migration 386: applied 25-Oct-26 after the merge with Ben's yes (as `386_mcp_connector`; safe order because the code checks for the column). Read back: `mcp_access` boolean NOT NULL default false, 0 ticked; `mcp_clients`, `mcp_tokens`, `mcp_audit` exist and are empty; 6 indexes. anon / authenticated have no USAGE on schema planner.
