# HORIZON deploy: v28.404 to v28.417

**AT A GLANCE:**
- Branch `review-fixes-2026-10-05`, code HEAD `0075f784` (`0075f784a3bdfbb0fefd497aa093d4d663e12e0c`) = v28.417. This note is committed on top; it changes no code.
- Live checked 20-Oct-26 (`/api/version`): **v28.403**. This package follows straight on.
- **Two migrations, both additive:** 377 and 378 (section 1).
- **One new `/api/cron/*` route:** `POST /api/cron/order-lines-sync`. Please add it to the login-gate exemption list (section 4).
- No new env vars. No dependency changes.
- **Files:** `server.mjs`, `artifact_v16.7.html`, `supply/inject.html`, `supply/hz-health.js`, `package.json`, `CHANGES.md`, `lib/ai-logic/*.md`, `migrations/377_*.sql`, `migrations/378_*.sql`.

## 1. Migrations (run in order)
- **`377_weekly_demand_order_lines.sql`:** new tables `planner.order_lines`, `order_exclusions`, `order_exclusions_log`, `sales_actuals_weekly`, `forecast_weekly`, plus indexes. It also adds the app_settings key `order_exclusion_threshold` = 40 (`ON CONFLICT DO NOTHING`).
- **`378_weekly_actuals_import.sql`:** new table `planner.sales_actuals_weekly_import` (real weekly history to load later; empty for now), plus an index.
- Nothing existing is altered. All statements use `IF NOT EXISTS`.

## 2. Data steps on live
- **First full read of Fulfil order lines (after migrations).** An admin opens DEMAND > Inputs > Weekly switch-over and clicks **"Read Fulfil orders now"**.
  - The sync runs in roughly 45-second chunks; the button keeps calling until it's finished.
  - On the sandbox, against live Fulfil, this read 347,620 lines.
  - It only reads Fulfil.
  - The daily cron then reads only the lines that changed.
  - If the first read is left to the cron instead, it would take one chunk per day, so please do the button.
- Nothing else is manual.

## 3. Please look at

### 3.1 Weekly demand phase 1 (v28.416, v28.417): built but NOT switched on
- **Today's numbers don't change:** every monthly screen, the forecasts and the buy plan still read the monthly tables.
- **New pages:** DEMAND > Inputs > **Order exclusions** and DEMAND > Inputs > **Weekly switch-over**.
- **Weekly actuals (`sales_actuals_weekly`):**
  - Rebuilt after each sync.
  - Built from Fulfil order lines from the cut-over month. The month comes from app_settings `weekly_actuals_fulfil_from`, else `cp_cutover_fulfil_from`, else Oct-26.
  - Earlier weeks are the monthly actuals spread evenly across the days of the month, as an estimate. We found Fulfil history before the cut-over is incomplete: only about 75% of the June and July UK Shopify orders are in it.
  - EU DTC stays monthly (app_settings `weekly_actuals_monthly_only`, default 'EU DTC'), because Zalando isn't in Fulfil.
  - Key-account and custom orders are left out.
- **Rebuild:** one transaction, about 30 s on the sandbox, with `statement_timeout` set to 180 s inside it.
- **"Write weekly forecast" on that page:** writes `planner.forecast_weekly` only. It's admin only and needs two clicks to confirm.
- **Buy plan before vs after on the sandbox:** identical (418 SKU-markets, 0 differences).

### 3.2 Push journal to Xero: re-push now overwrites (v28.411), a change to a Xero write path
- **Before:** a second push for a month that's already in Xero was refused as a duplicate.
- **Now:** it finds that month's journal and its reversal and **updates them in place** with the total of all the month's invoices. This follows your review point; Ben approved it.
- **Preview first:** the preview only reads Xero and shows NEW or OVERWRITE ("Xero now -> new"). It flags a month whose new total is lower.
- **If Xero refuses:** all journals go in one call, so nothing changes.
- **Watch for:** pushing Sep-26 Coghlans overwrites the hand-posted journal (77bb72da). Ben OK'd that.
- **First live use:** Ben will be watching.

### 3.3 Add sales orders from Fulfil (v28.409): writes HORIZON POs, reads Fulfil
- **Where:** SUPPLY, client PO groups.
- **What it does:** bulk-adds Fulfil sales orders (for example Dillard's) to client PO groups.
  - It creates or links HORIZON POs.
  - It appends order refs to `sales_order_ref`.
  - It sets PO lines to the group totals.
- **Fulfil:** read only.
- **New signed-in routes:** `GET /api/supply/client-orders`, `POST /api/supply/client-orders/add`.

### 3.4 DTC mismatch 2.0 (v28.407, v28.408, v28.417)
- **Tabs:** Issues / Accepted / OK.
- **Ignored lines:** CUSTOM-LOGO, CUSTOM-LOGO-OLD and CUSTOM-ORDER-OLD.
- **New wording:** "no PO created, sales order not processed".
- **New rule (v28.417):** a HORIZON PO that's already linked to a Fulfil PO matches a sales order by its SO ref only if that Fulfil PO belongs to the same order. Otherwise the card shows "not matched". The SO56618 case: on live, the ref is already corrected to SO56619.
- Report only.

### 3.5 3PL invoices: IS numbers (v28.413)
- **Before:** invoice lines billed against a Fulfil internal shipment fell to "Other".
- **Now:** they resolve through `planner.fulfil_internal_shipments` (the table you found on live).
  - An IS going to an Amazon FBA location goes to that country's Amazon cost centre.
  - An IS going to one of our warehouses goes to OTHER COSTS.
- **Affects:** allocation, the bill split and the cross-month journal.

### 3.6 Reconcile GST (v28.410)
- **Before:** a PDF receipt whose labelled GST hadn't been read could still get a guessed split (Woolworths 160.95).
- **Now:** it's read again once before its bill is decided. Past the 6-per-load cap, it waits for the next load.
- Existing Xero bills aren't changed.

## 4. Schedules (n8n) and the login gate
- **New daily job:** `POST /api/cron/order-lines-sync`
  - header `x-webhook-secret` = `N8N_WEBHOOK_SECRET` (the existing one)
  - optional `?full=1` forces a full re-read (not needed)
  - **Add it to the gate exemptions.**
  - Each run reads changed Fulfil sale lines (live, read only), then rebuilds the weekly actuals. Suggested time: early morning UK, after the monthly actuals load.
- Existing ask, still open: the daily DTC 2.0 refresh.

## 5. Env
No new variables.

## 6. New routes
- **Cron (gate exemption):** `POST /api/cron/order-lines-sync`.
- **Signed in:**
  - `POST /api/demand/order-lines/sync` (admin)
  - `GET /api/demand/order-exclusions`
  - `POST /api/demand/order-exclusions/:sale` (edit access)
  - `POST /api/demand/forecast-weekly/migrate` (admin)
  - `GET /api/demand/weekly-impact`
  - `GET /api/supply/client-orders`
  - `POST /api/supply/client-orders/add`
- `/api/hz-search` returns more groups (v28.405, v28.412). Its route is unchanged.

## 7. Behaviour changes to know (display unless stated)
- **v28.404:** logic library only (the Partial carton pill meaning, from your review).
- **v28.405, v28.412:** Global search finds everything linked to POs: sales orders, refs, notes, freight, barcodes, payments, and pages / config tabs. It's one DB round trip.
- **v28.406:** Klaviyo BIS gets a "Hide closed products" tick box (on by default) and a Last season group.
- **v28.409:** Order plan "Import from Fulfil" works on a client PO group master (imports the group total, with a preview).
- **v28.414:** the Demand plan Combine view is left aligned, a category with one sub-category is collapsed, and financial years collapse and expand.
- **v28.415:** App health freeze events carry `meta.actions`, the last click or key before the freeze. Labels only, never input values.
- **Buy plan:** no change from this package. Every buy-affecting check (v28.406, v28.416, v28.417) was identical before and after on the sandbox.
