# HORIZON deploy: v28.369 to v28.388

**AT A GLANCE:**
- Branch `review-fixes-2026-10-05`, HEAD `fb655373` (`fb655373700bf9a9e9c99411813ae725ccb05fc7`; code = v28.388 at `5f16ab52`, HEAD adds only the handover doc).
- Live checked 15-Oct-26 (`/api/version`): **v28.368**.
- **This package replaces** `DEPLOY_2026-10-15_PACKAGE_v28.369-v28.374.md` (not deployed).
- Migrations **372 to 375** (all additive, idempotent; none on live).
- **No new env vars.**
- **No new `/api/cron/*` or other secret-only routes:** nothing to add to the login-gate exemption list. Every new route is a normal signed-in route, listed in section 6.

## 1. Migrations (in order)
- **372** `accounts_gmail_msgs.team_note`, `accounts_bill_log.description` (Reconcile "Note for Xero", v28.372).
- **373** `po_fulfil_group` (client PO groups: one HORIZON client PO for many Fulfil client POs, v28.374).
- **374** `po_fulfil_group.total_amount / currency` + `po_group_shares` (master PO payment shares, v28.376).
- **375** `accounts_gmail_msgs.pdf_words` (payee name found in the PDF receipt, v28.388).

## 2. Data steps on live
- **Commission paid history: done by Ben on 15-Oct-26** (8,408 rows, £1,035,841.14, verified). Please run CLIENT > Clients > an agent > Customers > **Sync all agents from Xero**. Do **not** run `import_commission_history.cjs`.
- **Leftover Fulfil links already deleted on live (15-Oct-26, Ben's OK).** Rollback SQL is in CHANGES.md under v28.378 / v28.379.
  - `po_links` PO363 → 521.
  - `po_links` PO364 → 634.
- Nothing else.

## 3. Please look at (review / questions)
1. **v28.385 pool change** (`hzDropIdleDb` in server.mjs).
   - **What it does:** after an instance freeze of 10 s or more, idle pooled connections are dropped using pg-pool internals (`pool._idle`, `pool._remove`). It is guarded and does nothing if they are absent.
   - **Why:** health log 15-Oct 02:18, "db connect timeout" right after thaws. The first click on CONFIG > Xero failed, the second worked.
   - **Please review.** The browser side of the fix is a single quiet retry for failed same-origin GETs (502 / 503 / 504 or a network error), logged as metric `api_retry`.
2. **PO363 mirror row.** Prod's Fulfil import keeps writing Fulfil PO 521 (PO362, reference "A Play SS27") as mirror row **"PO363"**, even though no link points there and PO363 does not exist. Our code maps it to PO362 (via the PO362 → 521 link). Please check how prod / n8n maps mirror rows, for example whether rows are refreshed by `fulfil_id` and keep their old `po`. After this deploy:
   - the PO363 page offers **Link to HORIZON PO** (v28.379), which moves the copy to PO362;
   - client POs get **Import from Fulfil (recommended)** on the Order plan (v28.380).
3. **Fulfil 429 burst** on 13-Oct 19:38 to 19:43 (`sale.sale`, `metafield.value`, `stock.shipment.out`, `ir.note`): do you know what ran?
4. **Flexport cron** YVIRVLog6PaOjmTF is still `active:false`.
5. **Answers to your 14-Oct note:**
   - **payment-fx:** ACCOUNTS / admin only is intended. Grant nothing to the 10.
   - **AU autobill rules:** the 4 rules (Microsoft from 04-Sep included) are intended.
   - **lookup_failed spelling:** keep camel `lookupFailed` for permsFor. Snake `lookup_failed` is only the Xero contact lookup result.
   - **New cron routes:** none in this package.

## 4. Schedules (n8n)
No changes.

## 5. Env
No new variables.

## 6. Behaviour changes to know
- **v28.369 ERP Compare:** the background Fulfil refresh goes through `hzWaitUntil`, and a pull older than 45 s is dropped (the thaw-tagged "30s timeouts" should stop).
- **v28.370 App health log:**
  - slow queries spanning a freeze are summarised apart and left out of p95 / DB count;
  - `integration_error` rows carry `meta.example` (route) and `meta.user`.
- **v28.371 Forecast edits reach every instance within seconds:**
  - a save bumps `app_settings` key `data_cache_gen` (the row is created on the first save);
  - instances check it every 5 s;
  - the KV meta record gains `gen` (old blobs read as gen 0).
- **v28.372 Reconcile "Note for Xero":** explicit notes typed by team members when forwarding receipts are used automatically. Older emails are read once from Gmail.
- **v28.373 3PL cross-month repeats per parcel:** red duplicate / amber check / grey returns, re-rates, extra parcels.
- **v28.374 Client PO groups** (PO drawer > Master & Docs > Linked records; client POs only; reads live Fulfil only):
  - a grouped PO's mirror row is the group sum;
  - DTC 2.0 gets a groups panel;
  - a grouped PO no longer raises "Link Fulfil PO".
- **v28.375 PO > Payments > Xero bills table:** from the Xero bill cache, no Xero calls.
- **v28.376 Master PO payment shares:**
  - **what it does:** the deposit credit note, completion and balance are split across client PO bills by Fulfil value;
  - **waiting shares:** shares whose bill is not in Xero yet are **auto-applied after the hourly bill sync, on production only** (`!IS_SANDBOX`), or via the button;
  - **first use:** Ben wants the first real use supervised.
- **v28.377 Refresh from Fulfil:** PURCHASE ORDERS > Import/Export > "Refresh from Fulfil" runs `fulfilImportPOs` + internal shipments on demand (supply edit / admin).
- **v28.378 One HORIZON PO per Fulfil link:**
  - the import only uses links of existing POs (newest wins);
  - moving a link needs confirming;
  - delete / merge removes the PO's Fulfil link.
- **v28.379 Leftover Fulfil copy:** relink it to a HORIZON PO from its page.
- **v28.380 / 381 Client PO Order plan "Import from Fulfil (recommended)":**
  - previews the differences;
  - adds new Fulfil SKUs and zeroes removed ones;
  - sets ERP qty and writes the Fulfil copy.
- **v28.382 Paid > Xero date:** the typed Date paid is what is posted. Bad dates are refused by the popup and the server; it never falls back to the run date.
- **v28.383 Payments Report follow-ups:** a database-only check per run turns Paid > Xero red with a follow-up list (no linked bill, voided, failed or unpaid PO bill).
- **v28.384 Receipt PDF from an email:** carriage returns / undrawable characters no longer fail it.
- **v28.385 First-click fix:** see section 3.1.
- **v28.386 Reconcile GST split:** a receipt that shows part GST / part GST-free is always split, whatever tax type is on the rule or drawer.
- **v28.387 Statement line order:** Reconcile / Bank statement lines are oldest first; last month and older are shaded light red.
- **v28.388 Reconcile payee matching:** the payee is found in the PDF receipt's words (`pdf_words`, filled in the background for older emails) and despite small typos.

**New signed-in routes** (none secret-only):
- `POST /api/supply/fulfil/refresh-pos`
- `POST /api/supply/fulfil/mirror/:po/relink`
- `GET /api/supply/po/:po/xero-bills`
- `GET|POST /api/supply/po/:po/fulfil-group` (+ `/check`, `/link`, `/unlink`)
- `GET /api/supply/po/:po/group-shares`, `POST .../group-shares/apply`
- `POST /api/supply/payments/xero-followup`
- `POST /api/supply/po/:po/import-fulfil-lines`

## 7. Smoke test after deploy
1. `/api/version` = v28.388.
2. CONFIG > App health log loads.
3. Edit one forecast cell, then reload on another device: the new value shows within about 25 s.
4. ACCOUNTS > Reconcile:
   - lines oldest first, earlier months shaded;
   - open a receipt: the "Note for Xero" box shows (do not push);
   - after a reload, the 18-Sep AMEX WOOLWORTHS A$225.48 line shows its receipt match.
5. PO362 > Order plan: **Import from Fulfil (recommended)** previews 5 SKUs to add (do not apply unless Ben says).
6. PO363 page > Master data & docs > Linked records: explains the leftover copy and offers Link to HORIZON PO (do not link unless Ben says).
7. SUPPLY > Payments report: the Paid > Xero button is red with a follow-up list on runs with PO-57DILLARDS-XRJULY (no linked bill).
8. PURCHASE ORDERS > Import/Export > Refresh from Fulfil completes (about 7 s).
