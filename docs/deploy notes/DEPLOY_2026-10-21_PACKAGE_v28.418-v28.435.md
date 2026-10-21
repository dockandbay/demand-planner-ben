# HORIZON deploy: v28.418 to v28.435

**AT A GLANCE:**
- Branch `review-fixes-2026-10-05`, code HEAD `6e2fd952` (`6e2fd9523a7e22e0f8c5862e27b80385ae36de27`) = v28.435. This note is committed on top; it changes no code.
- Live checked 21-Oct-26 (`/api/version`): **v28.417**. This package follows straight on.
- **Four migrations, all additive:** 379, 380, 381, 382 (section 1). Checked on live 21-Oct-26: none applied yet (377 is).
- **One new `/api/cron/*` route:** `POST /api/cron/data-health`. Please add it to the login-gate exemption list (section 4).
- **New env:** Shopify domain + token per store (14 values), optional `PLANNER_URL` (section 5).
- No dependency changes.
- **Files:** `server.mjs`, `artifact_v16.7.html`, `supply/inject.html`, `package.json`, `CHANGES.md`, `lib/ai-logic/*.md` (actions, data-health (new), demand-engine, reports, supply-finance), `migrations/379_*.sql` to `382_*.sql`. Other commits in the range are `Claude Analyses/` and `docs/deploy notes/` only.

## 1. Migrations (run in order)
- **`379_accounts_customer_receipts.sql`:** new table `planner.accounts_customer_receipts` (one row per posted money-in bank line), a partial unique index (a bank line can't be posted twice) and a GIN index on `sale_ids`.
- **`380_commission_carry_catchup.sql`:** `commission_rows.client_po`, `commission_rows.carried_from` (+ partial index), `rep_groups.sort_order`, new table `planner.commission_catchup` (+ index).
- **`381_order_lines_agent_code.sql`:** `order_lines.agent_code`, `order_lines.agent_checked` (default false) + partial index.
- **`382_data_health.sql`:** new tables `planner.data_health_findings` (unique on check_key + record) and `planner.data_health_runs`.
- Nothing existing is altered beyond added columns. All statements use `IF NOT EXISTS`.

## 2. Data steps on live
- **Commission agent settings (after migrations):**
  1. An admin runs CLIENT > Commissions > Import data > **Sync agent customers from Xero** (reads Xero UK / AU contact groups; also fills blank statement emails from the agent's Xero contact, v28.422).
  2. Then run `docs/deploy notes/COMMISSION_AGENT_SETTINGS_LIVE_2026-10-21.sql` in the SQL editor (one transaction, safe to re-run): agent currencies, DYA inactive, Xero bill contacts for the 7 paying agents, bill accounts `Cost of Sales - <market> - Wholesale`. Live today: 0 agents have a Xero contact.
- **Data health first run:** optional. CONFIG > Admin > Data health > **Run now** (no email). Otherwise the first cron run fills it and emails.
- Nothing else is manual.

## 3. Please look at

### 3.1 Data health (v28.432, v28.434): new daily check + email
- **What:** a daily check of the Fulfil data in HORIZON. Page: CONFIG > Admin > Data health (`#/config/admin/data-health`). Non-admins get a Data health tab in CONFIG because the email goes to them too.
- **Phase 1 (17 checks):** reads only the HORIZON database (stock feed, POs / shipments, order lines, DTC 2.0 snapshot).
- **Phase 2 (5 checks, all reads, in parallel, each capped at 120 s):**
  - Shopify orders of the last 7 days missing from live Fulfil (every store with credentials).
  - 3PL stock reports (UK / US / AU CSVs, EU via BLADE) vs Fulfil on hand, same comparison as Manage 3PL. Not saved to the Manage 3PL import.
  - Latest FBA report upload vs Fulfil.
  - Market-prefixed set SKUs sold in the last 14 days with no active BOM in live Fulfil.
  - Paid wholesale orders with no agent: the commission engine **without Xero** (Xero's daily limit is shared), so it uses no Xero calls.
- **Writes:** only its own two tables and one `app_settings` key per London day (`data_health_emailed`, so a second cron run that day doesn't email again). Nothing written to Fulfil, Shopify or anywhere else.
- **Email:** via the existing Resend set-up, to app_settings `data_health_email_to` (editable on the page) else ben@, kathryn@, sarah@, diviyaj@, alexandria@. Summary + the 10 most serious new findings + a link to the page. Sent every day.
- **Sandbox:** about 27 s per run, about 215 open findings. On live, the 3PL numbers should be close (live AU spot check: 1,499 vs 1,500); on the sandbox they're stale.
- **BLADE:** if the BLADE login fails, EU shows as a check error on the run and the other markets still report.

### 3.2 Reconcile: customer receipts (v28.418, v28.419): writes Shopify AND Xero
- **Where:** ACCOUNTS > Reconcile > Bank lines > new pill **Money in**.
- **What:** each money-in bank line gets the likely unpaid order from live Fulfil (read). Review, Preview (reads only), then **Mark paid**, which:
  1. writes `planner.accounts_customer_receipts` first (a line can't be posted twice),
  2. Shopify `orderMarkAsPaid` per order,
  3. one Xero **Receive Money** on the bank account, line date, to the store's clearing account (Fulfil manual gateway account: UK 9027, US 9031, EU 9035, UKWS 9030, USWS 9034, EUWS 9038). Contact "Shopify <store> customers" is created if missing.
- **AU retail is left out** (its manual gateway account has no code).
- **Already paid in Shopify:** refused at Preview.
- **Access:** ACCOUNTS users and admins.
- Needs the Shopify env (section 5); without it a store shows "Shopify not connected" and can't post.

### 3.3 Commissions (v28.420 to v28.425, v28.429, v28.430, v28.433)
- **Import data tab:** Sync agent customers from Xero, then **Build / refresh all agents** for a month (one engine pass; finalised / paid runs untouched). The paid-invoices CSV paste and its route `POST /api/client/commission/runs/:id/import-paid` are **removed**.
- **Monthly run & bills:** All <month> tab + one tab per agent (short names), order from CLIENT > Config > Agent order (drag and drop, `rep_groups.sort_order`).
- **Defer (✕):** a row is deferred, not deleted; it's carried into later runs until paid (`carried_from`). **Catch-up:** finds commission earned but never paid in the 6 months before (`commission_catchup`), about 30 s a month of Fulfil + Xero reads.
- **Client PO** on every run row, statement PDF and CSV.
- **Statement emails** filled from the agent's Xero contact (never overwrites). Set-up actions (missing email / Xero contact / bill account) show on Clients & agents.
- **Paid history fix (v28.429):** it was stuck on "Loading…" since v28.326 (missing filter state). Now default last 3 months, 2-minute cache.
- **Tag an order to an agent (v28.433), COMMISSIONS > Orders:** search live Fulfil sale orders (read). **Save tag** = a commission order override. **Also set in Fulfil** writes the `agent_code` metafield on that Fulfil sale order: a **live Fulfil write**, own click + inline confirm, one order, read back, logged to the audit. Tested on the Fulfil sandbox only.

### 3.4 Weekly demand: custom / co-brand orders with an agent count (v28.431, v28.433)
- Custom / co-brand lines now count when the order has an agent: Fulfil `agent_code` metafield, an `agent_*` Shopify tag, or a HORIZON tag (3.3).
- After each order-lines sync, custom orders with changed lines get their tag read from live Fulfil (read, up to 2,000 orders per sync) into `order_lines.agent_code`.
- Weekly demand is still **not switched on**. Buy plan identical before and after.

### 3.5 Fixes
- **v28.426 Payments Due:** since v28.327 the deposits feed dropped `date_paid` (a same-line SQL comment swallowed it), so paid deposits / other payments showed as unpaid (52 rows on live). No data was wrong; the query is fixed. Scanned the server for other same-line comments: none.
- **v28.428 order plan feed:** v28.427 read `erp_qty` from the lines view (no such column) and `/api/supply/order-plan` returned an error. Fixed before it reached live; ship v28.427 and v28.428 together.

### 3.6 ERP deviations follow Fulfil (v28.427)
- The order plan's ERP qty now comes from Fulfil (`purchase_order_lines.erp_qty`), not the old Cin7-era pushed snapshot. A client PO group compares against the sum of its Fulfil POs.
- Group POs have no Push to Fulfil / Upload to ERP; their button reads "Import all N linked Fulfil POs".
- DTC mismatch 2.0 groups expand to their Fulfil POs and SKUs; "Validate sales order" link on unprocessed orders.

## 4. Schedules (n8n) and the login gate
- **New daily job:** `POST /api/cron/data-health`
  - header `x-webhook-secret` = `N8N_WEBHOOK_SECRET` (the existing one)
  - body `{ "dry_run": true }` computes without saving or emailing (optional, for a test)
  - **Add it to the gate exemptions.**
  - Suggested time: early morning UK, after the stock feed and the order-lines sync. One email per London day.
- Existing asks, still open: the daily DTC 2.0 refresh; `POST /api/cron/order-lines-sync` daily (from the v28.404 to v28.417 note).

## 5. Env
- **New (v28.418), per store `UK`, `US`, `EU`, `AU`, `UKWS`, `USWS`, `EUWS`:**
  - `SHOPIFY_<STORE>_DOMAIN`: the myshopify domain
  - `SHOPIFY_<STORE>_TOKEN`: Admin API token, scopes `read_orders` + `write_orders`
  - Ben has the 14 values (set in his local .env, all 7 stores connect). Used by customer receipts (3.2) and the Data health Shopify check (3.1). A store left unset is skipped by Data health and can't post receipts.
- **New, optional:** `PLANNER_URL`, the link in the Data health email. Default `https://horizon.dockandbay.com`; leave unset.
- **Existing, still to set on live:** `COGS_AIRTABLE_EMAIL` (the COGS > Email to Airtable button returns 503 without it). Ben will send the Airtable sync address separately; it's not in git.

## 6. New routes
- **Cron (gate exemption):** `POST /api/cron/data-health`.
- **Signed in:**
  - Data health: `GET /api/admin/data-health`, `POST /api/admin/data-health/:id/dismiss` (any edit right), `POST /api/admin/data-health/run` (admin), `POST /api/admin/data-health/recipients` (admin)
  - Customer receipts: `GET /api/accounts/receipts`, `GET /api/accounts/receipts/search`, `POST /api/accounts/receipts/preview`, `POST /api/accounts/receipts/post`
  - Commissions: `GET /api/client/commission/import-status`, `GET /api/client/commission/readiness`, `GET /api/client/commission/orders/search`, `POST /api/client/commission/orders/fulfil-tag`, `POST /api/client/commission/runs/build-all`, `POST /api/client/commission/statement-emails/fill`, `POST /api/client/commission/rows/:id/defer`, `POST /api/client/commission/catchup/save`, `POST /api/client/commission/groups/order`
  - PLAN: `POST /api/supply/po-lines/approve-partials`
- **Removed:** `POST /api/client/commission/runs/:id/import-paid`.
- **requiredCap:** one exception added, `POST /api/admin/data-health/:id/dismiss` needs `edit` (every other `/api/admin/*` stays admin).

## 7. Behaviour changes to know (display unless stated)
- **v28.423:** a client record always opens on Account unless the link names a tab.
- **v28.424:** commission run "Paid date" is now read-only "Customer paid".
- **v28.428:** PLAN gets **Approve all partials** (open POs, confirm with counts, one record-of-change entry per PO); Create production POs gets supplier tabs.
- **v28.435:** DEMAND Exceptions Forecast < Actual / > Run-rate: "Min gap" label + Gap column; deep links now open the right tab (a Forecast > Run-rate link used to run the Forecast < Actual maths).
- **Live writes in this package, all on a user click with a confirm:** Shopify mark paid + Xero Receive Money (3.2), Fulfil `agent_code` (3.3). The cron writes only HORIZON tables.
- **Xero calls:** Data health uses none. Commission builds and catch-up read Xero as before (catch-up is month by month, admin-started).
- **Buy plan:** no change from this package. Every version was identical before and after on the sandbox.
