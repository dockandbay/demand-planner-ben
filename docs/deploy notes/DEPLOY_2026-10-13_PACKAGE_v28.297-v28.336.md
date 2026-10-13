# HORIZON deploy: v28.297 to v28.336

**AT A GLANCE:** branch `review-fixes-2026-10-05`, HEAD `c3ea56a5` (`c3ea56a554c06459869074dd6fb511b7e90e8220`, v28.336). Live checked 13-Oct-26 (`/api/version`): **v28.296**. Migrations **361 to 368** are not on live. No new dependencies, `vercel.json` unchanged.

## 1. Migrations (in order, all additive and idempotent)
- 361 `health_check_runs` (App health runs saved, history)
- 362 `po_balance_payments` (balance payments 3, 4, 5 ...)
- 363 `commission_paid_history` (paid commission history, Jan-22 onward)
- 364 commission set-up: `rep_groups` gets currency, currency_checked, fulfil_codes, xero_group_uk/au id + name, statement_email, portal_on, no_commission, notes; `commission_overrides.rate` nullable + commissionable_amount; new `commission_customer_rates`, `commission_customers`
- 365 `sample_bills`, `sample_bill_lines`; `deposits` gets sample_bill_id, doc_system, doc_org, doc_id, doc_number, doc_url, doc_status, doc_landed_cost_id, doc_error, doc_pushed_at, doc_pushed_by
- 366 **agents as clients**: inserts one `clients` row (type agent, portal features all OFF, no users) for every rep group with no client. **Run after 364.** Idempotent.
- 367 commission engine: `commission_rows` gets currency, currency_src, amount_src, fx_rate, invoice_date, earn_date, rate_source, agent_source; `commission_runs` gets currency, built_at
- 368 commission payout: `commission_runs` gets xero_bill_id, xero_bill_url, xero_bill_status, statement_sent_at, statement_sent_to, statement_sent_by

Reads of the new columns go through `to_jsonb(...)` where a page could load before the migration, but please apply 361 to 368 with the code.

## 2. Data steps on live (after the migrations)
1. **Commission set-up seed:** `node scripts/seed_commission_setup.cjs` (18 agents with rates, currencies, Fulfil codes; 6 customer rates; 32 order overrides; renames "Shauben" to "Agent - Schauben"). Idempotent. Run **before** 366 if you want the renamed agent to get its client record in the same pass, or re-run 366 afterwards (safe).
2. **Commission paid history import:** `node scripts/import_commission_history.cjs <csv>` with Ben's CSV (`XERO-INVOICE-PAYMENTS - Commission Statement Wholesale (source) - PAID_HISTORY.csv`). Sandbox import: 8,408 rows, paid 990,480.71 (matches the sheet). Rows labelled Dec-26 map to Dec-25 (Ben confirmed).
3. **Commission customers:** CLIENT ▸ Clients ▸ any agent ▸ Customers ▸ "Sync all agents from Xero" (reads the Xero UK contact groups; about a minute, roughly 120 Xero calls).
4. **Already done on live by Ben's approval (no action):** Fulfil `metafield.field` **COMMISSIONS_ACTUAL** (Number / Decimal on sale.sale) created 13-Oct-26: **live id 98**, sandbox id 99. AU bank statement upload fix (14 uploads, 67 lines moved UK to AU) done 12-Oct.

## 3. Env
- **New, optional:** `FULFIL_LANDED_ACCOUNT` (Fulfil line account for sample / PO charge supplier invoices). Default `9039` (Inventory Landed Cost Accruals), which exists in live for both companies. **Leave unset on live.** Only the Fulfil sandbox lacks 9039.
- **Existing gates that now matter for new features:**
  - `FULFIL_LIVE_WRITES=true` is needed for: sample bills to Fulfil (draft supplier invoice + landed cost), commission "Push to Fulfil" (COMMISSIONS_ACTUAL). Without it they return 423 and write nothing.
  - `RESEND_API_KEY` + verified `dockandbay.com` for the commission statement email (client channel).
- `ACC_XERO_DAY_MIN` (default 400) now also guards the commission engine's Xero reads.

No new cron. No new gate exemptions.

## 4. Behaviour changes to know
- **Permissions:**
  - **Bill writes:** the 3PL Xero bill needs ACCOUNTS or admin, and the commission Xero bill needs CLIENT or admin (v28.301). Payments Report paid, payment-fx and xero-post also need ACCOUNTS or admin (v28.305).
  - **SUPPLY edit is enough** to create sample bills and charges and push them to Xero or Fulfil, at Ben's request.
- **ACCOUNTS auto bills (v28.325):** a bill is created only when a matching unreconciled line is on an uploaded statement. A statement upload triggers the run (v28.316).
- **Commissions rebuilt (v28.326 to v28.334):**
  - Settings now live on the client record: every agent is a client (migration 366). CLIENT ▸ Commissions has Orders, Exceptions, Monthly run & bills and Paid history, with deep links `#/client/commission/<tab>`.
  - **Engine:** pays on cash received, ex tax, product lines only, shipped orders only (a deposit earns when the order ships). It reads Fulfil invoices and Xero UK / AU payments plus credit notes, and converts with Fulfil daily FX.
  - **Faire orders** of an agent's customer are a month-end include / exclude decision.
  - **Xero bill** goes to the agent's contact **by ContactID** (never auto-created), in the agent's currency, with the statement PDF attached.
- **Client portal commission:** shown only to Agent clients whose agent has "Portal view" on. All migrated agent clients start with the portal OFF.
- **Balance payments 3+ (v28.307):** extra balance payments count in cash flow, Payments Report, statements, portal, overdue and Payments Due.
- **App health (v28.306):** runs are saved with history. A fast 400 / 404 / 409 / 422 is "needs input", not an error (v28.312).
- **v28.314 (cold start):** the KV client retries once on a fresh connection after an instance freeze, background cache rebuilds are kept alive (`hzWaitUntil`), and slow page builds are logged. Watch App health after deploy.
- **Sample bills (v28.327 to v28.329):**
  - Other Payments ▸ Create sample bills takes the courier template .xlsx upload. One Other payment per document:
    - **Fulfil:** draft supplier invoice per Fulfil PO. The landed cost is made after the invoice is posted ("Create landed cost").
    - **Xero:** AUTHORISED bill per org, due today by default.
  - Supplier charges on a PO or sample have "Accept + bill" (v28.335), and charges now show on the PO under PLAN ▸ SHIPMENTS.

## 5. What's in it (detail per version in CHANGES.md)
- 297 your production fixes taken upstream
- 298 to 300 bank statement drag and drop, AU upload filed as UK fixed, Sync from Xero
- 299 duplicate 3PL charges copy for email
- 301, 305 Xero write permissions
- 302 PO drawer open actions with explainer and snooze
- 303 Payments Due paid-this-session box
- 304 cash flow remainder after balance 1 and 2
- 306, 312 App health saved runs, needs input
- 307 to 311 balance payments 3+ (mig 362), % cleared = 0, likely pay date editable
- 308 reverse charge VAT kept per contact (UK)
- 313 3PL invoicing landing page, Inbox multi-select
- 314 cold-start fixes (KV retry, background rebuilds kept alive)
- 315 to 319, 323, 324 ACCOUNTS: GST split bills, auto bills remove / run after upload / one click, coding from previous Xero bills, contact relevance, longer payee keys, matching fixes
- 320, 321 PO dates tab calculated end, action marker under the date
- 322 commission paid history (mig 363)
- 325 auto bill only with an uploaded statement line
- 326 commissions stage 1 set-up (mig 364)
- 327 to 329 Create sample bills (mig 365)
- 330, 336 CLIENT ▸ Clients as cards, coloured type badges
- 331 commission settings on the client record (mig 366)
- 332 commission engine (mig 367)
- 333 commission payout: Xero bill, statement email, portal, credit notes, missed commission (mig 368)
- 334 Faire month-end decision, COMMISSIONS_ACTUAL push to Fulfil, commission dates
- 335 supplier charges Accept + bill, charges on the PO

## 6. After deploy
- **You:**
  - Smoke-test `/api/version` = v28.336.
  - App health run.
  - CLIENT ▸ Clients shows the agent cards.
  - CLIENT ▸ Commissions ▸ Orders for Sep-26 loads (reads live Fulfil + Xero; about 20 s first time).
  - Other Payments shows the Document column.
  - Check `planner.etl_runs` and App health for slow-request rows after the first hour.
- **Ben:**
  - Agent currencies marked "check" (Exceptions).
  - Xero bill contact and statement email per agent.
  - First live commission run: Finalise, then Create bill in Xero, Email statement, Push to Fulfil.
  - Add Balance 3 (57,609.72, 17-Nov-25) on PO-51USXR1.
- **Not tried on live yet:** sample bill pushes (Xero / Fulfil), Fulfil landed cost (needs a posted invoice), commission Xero bill, statement email, portal view, COMMISSIONS_ACTUAL push.

## 7. Questions for you
1. Which app uses the Xero `POST /Invoices/{id}/Email` endpoint (Xero returns 429 on it from 14-Jan-27)?
2. Writing onto Fulfil lines created by Fulfil's own Shopify connector: OK? (Customiser prototype question, not in this deploy.)
