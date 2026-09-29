# 🚚 Diviyaj deploy package — v27.906 → v28.079 (30-Sep-2026)

Consolidated handoff for the whole batch since prod (**prod is live on v27.905**). Pull
`phase-2.1-suppliers` @ **v28.079** and ship. Per-range detail is in the individual deploy
notes referenced below; this is the single action checklist.

Ben's product logic is unchanged unless a note says so. All Xero / Flexport / 3PL **write**
paths are admin + explicit-confirm gated and Ben validates them live — none auto-fire.

---

## ⚠ 1. Migrations — apply to prod IN ORDER
Pending on prod (301/302 already applied, 303 was yours):

| # | file | what |
|---|------|------|
| 304 | `304_auto_forecast_feed.sql` | auto-forecast feed |
| 305 | `305_erp_drift_approved.sql` | ERP drift sign-off cols |
| 306 | `306_client_portal.sql` | client portal tables |
| 307 | `307_ai_assistant.sql` | Ask/AI assistant |
| 308 | `308_forecast_inheritance.sql` | forecast inheritance |
| 309 | `309_buy_plan_snapshot.sql` | buy-plan snapshot |
| 310 | `310_auto_forecast_result.sql` | auto-forecast result store |
| 311 | `311_po_links.sql` | PO Linked Records (`planner.po_links`) |
| 312 | `312_xero_push_queue.sql` | Xero payments push queue |
| 313 | `313_flexport_api_shipments.sql` | Flexport API table + `flexport_shipments_effective` view |
| 314 | `314_v_po_finance_flexport_effective_split.sql` | `v_po_finance` → effective view + freight = invoiced-first/quote-fallback, **pallet-split** across POs on a shipment (CREATE OR REPLACE VIEW, no data change) |
| 315 | `315_app_permissions_inbox_types.sql` | `app_permissions.inbox_types jsonb` (nullable, no backfill) — per-user Inbox filter |

313 keeps the legacy `planner.flexport_shipments` table + its n8n/report feed until Ben
decommissions it (reads go through the `_effective` view). 314 must run **after** 313.

## ⚠ 2. Env vars (Vercel prod)
- **`FLEXPORT_API_TOKEN`** — Flexport API key (Bearer). Without it the Flexport import,
  status, booking-registry/preview/submit routes are inert (503).
- Xero custom-connection creds already added (`XERO_UK/AU_CLIENT_ID/SECRET`). Confirm both
  connections were granted **`accounting.settings`** AND **`accounting.transactions`**
  (full read+write) for the bill/payment/credit-note/3PL/commission writes.
- `N8N_WEBHOOK_SECRET` already set — gates the crons below (fail closed).

## ⚠ 3. Cloud crons (secret-gated: header `x-webhook-secret: <N8N_WEBHOOK_SECRET>`)
- **`POST /api/cron/flexport-import`** every **4 hours** — Flexport shipment import
  (dates, MBL, containers, cost) into `flexport_api_shipments`; stamps
  `app_settings.flexport_last_sync`.
- **`POST /api/cron/resolve-po-links`** every **4–6 hours** — sweeps Xero ACCPAY bills per
  org + Fulfil/Flexport/DHL joins, upserts `planner.po_links` (keeps Linked Records +
  Xero-payments Exceptions populated).

## ⚠ 4. Login-gate exemptions (prod hotfix gate)
Mirror these path exemptions (auth handled inside the handler):
- `/api/export/csv/*` — token-protected Sheets exports (`x-export-token`).
- The two `/api/cron/*` above — `x-webhook-secret`.
(`/api/hz-search` — the new global search — is a normal authed app route; no exemption.)

---

## What's in the batch (by area)

**Nav overhaul (v28.072–079) — inject.html + server.mjs only, NO migration**
- Global **command search (⌘K)** — one box across POs / shipments / SKUs / suppliers /
  samples + pages + quick actions (`GET /api/hz-search`).
- **Left rail** replaces the top module nav (desktop): L1 modules → L2 sections → L3 tabs,
  collapse-to-icons toggle, version badge in the foot. It drives the existing view-switch
  functions (clicks the now-hidden buttons) — gated on `body.hz-rail`; mobile keeps its
  drawer. Sandbox banner offsets the rail.

**Inbox permission filter (v28.070, mig 315)** — top-bar bell aggregates unread PO /
sample / client messages, filtered by per-user `inbox_types` (CONFIG ▸ Permissions ▸
Inbox). `POST /api/supply/inbox-read`.

**Xero payments + COA (v28.028–061)** — bank/account registry + Production tracking
(SUPPLY ▸ CONFIG ▸ Xero), payments push queue + Exceptions reconciliation (replaces Xero
Compare), starting-deposit credit notes, region rule (AU always new; UK two-method from
P58), commission bill create. Live writes admin+confirm gated.

**Flexport (v28.040–069)** — richer import (MBL/HAWB, freight type, quoted/freight/est
cost, transit, containers); **booking/quote request** on a PO (registry harvest → preview
→ gated `POST /bookings`) with best-value cargo sizing; landed costs now flow from the
Flexport quote, **split by pallet volume** across POs on a shipment (mig 314).

**3PL invoicing (v28.038–039)** — "Create DRAFT bill in Xero" (Coghlans→AU) + approve
toggle, TEST- prefix; keeps the CSV.

**PO grid (v28.042–066)** — 2-tier tabbed view (status folder-tabs + region pills + Last
12m/archive + saved views), Linked Records (Master Data & Docs), open-actions + Flexport
tracking on the PO, removed the decommissioned **Cin7 column** + "ERP drift approved" box.

**Google Sheets import (v28.071)** — the generated Apps Script now takes per-report
tab / start cell / clear toggle / clear range.

**Earlier in range** — v27.906 3PL cross-month dup box; v28.001 Sheets CSV exports;
v28.006 iFulfilment VAT; v28.007 ERP drift sign-off (mig 305); client portal (306),
Ask/AI (307), forecast inheritance (308), buy-plan snapshot (309), auto-forecast (304/310).

## Reference notes (detail)
`DEPLOY_2026-09-28_v27.906-v28.017.md` · `DEPLOY_2026-09-29_v28.029-v28.041.md` ·
`DEPLOY_2026-09-29_v28.062-v28.064.md` (extended through v28.070).

## Not for prod
`FULFIL_LIVE_WRITES` stays OFF until company-routing is resolved (unchanged).
Sandbox seed/test artifacts (test Xero bills/payments, any test Flexport booking) are
Ben's to clean in the live tools — not part of this deploy.
