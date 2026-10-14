# HORIZON deploy: v28.337 to v28.368

**AT A GLANCE:** branch `review-fixes-2026-10-05`, HEAD `188acb48` (`188acb48779e34d4aa59f50baee82161e7aa3cf7`, v28.368). Live checked 14-Oct-26 (`/api/version`): **v28.336**. Migrations **369 to 371** (all additive, idempotent; none on live yet, checked 14-Oct-26). No new env vars. Two n8n schedules (one new, one optional).

**Deploy from HEAD (v28.351 or later only).** v28.339 to v28.350 were committed hunk by hunk and 7 server.mjs blocks landed in the wrong place; v28.351 restored server.mjs exactly as tested. HEAD = tested file.

## 1. Migrations (in order)
- **369** `sample_purpose_accounts` gets org, account_name, kind; seeds the sample bill Xero accounts per org (v28.339). Sample bills read their accounts from here.
- **370** `dhl_invoice_docs` (ACCOUNTS > Reconcile > DHL import, v28.352): one row per Xero AU bill / Ignore per DHL invoice; a partial unique index stops a second bill for the same invoice.
- **371** `dtc2_snapshot`, `dtc2_review` (SUPPLY > Reports > DTC MISMATCH 2.0, v28.364).

## 2. Data steps on live
1. **Commission set-up:** done by Ben on 14-Oct-26 (COMMISSION_SETUP_LIVE_2026-10-14.sql: seed + migration 366; live has 14 agent groups, SHAUBEN linked). No action.
2. **Commission paid history:** still to run (live `commission_paid_history` = 0 rows): `node scripts/import_commission_history.cjs <csv>` with Ben's PAID_HISTORY CSV, then CLIENT > Clients > an agent > Customers > Sync all agents from Xero.
3. **After deploy, Ben (no action for you):** SUPPLY > CONFIG > Xero mapping on live (602 / 602.1 / 901 and the banks), then the first supervised Paid > Xero push; DTC MISMATCH 2.0 > Refresh from Fulfil once.

## 3. Schedules (n8n)
- **New:** POST `/api/supply/fulfil/import-pos` every **3 hours** (`x-webhook-secret` = `N8N_WEBHOOK_SECRET`). Keeps the Fulfil PO mirror and ERP qty fresh, so ERP deviations follow Fulfil (v28.362).
- **Optional:** POST `/api/cron/dtc2-sync` daily (same secret header; v28.368). Reads live Fulfil only; the report also has a Refresh button.

## 4. Env
No new variables. Existing ones these features use: Xero UK/AU connections, accounts@ Gmail connection (DHL import emails), `FULFIL_LIVE_*` (DTC 2.0 reads live Fulfil, read only), `N8N_WEBHOOK_SECRET`.

## 5. Behaviour changes to know
- **Xero account codes come from the mapping tables** (v28.338 to v28.340): ILG and Geneva 3PL bills and sample bills no longer use hard-coded codes. Codes are text ("308" is not "308.00").
- **Payments Report** (SUPPLY and a mirror under ACCOUNTS, v28.344 to v28.350): Paid and XERO merged into one "Paid > Xero" 4-step popup (bank, supplier payment bill, PO payments, mark paid + push). A missing supplier Xero contact is created on push (exact-name lookup first, never on a failed lookup).
- **ACCOUNTS > Bank statement:** UP FX statement download with a direct Xero import link; Wise FX removed from the statement process (bank feed); the Wise statement endpoint returns 410 (v28.341).
- **ACCOUNTS > Reconcile** (v28.352 to v28.358, v28.366):
  - DHL import tab: ANZ direct-debit DHL invoices to Xero AU bills (AU lines 302 / 405.2, UK/US lines 901) or Ignore.
  - Bill lines from the PDF (GST / GST-free split, labelled GST), invoice number from the PDF name, late receipts up to 60 days, Woolworths loan line (972), Learn from Xero button, a new payee contact created on push.
  - After a push the drawer no longer reloads the PDF.
- **Fulfil PO push price = the PO's Order plan price** (v28.359 to v28.361): line / supplier cost, then supplier price list, then products table, then 0.02 for polybags. No "last PO price" fallback.
- **ERP deviations** (v28.362): the Fulfil PO mirror matches by reference, then the HORIZON PO link, then the reference tail; ERP qty refreshed from Fulfil; "Use Fulfil qty" button (logged to `po_change_log`).
- **PO grid > Import/Export > Export XLSX** (v28.363): read-only GET `/api/supply/po-export.xlsx?status=...`.
- **DTC MISMATCH 2.0** (v28.364, v28.367, v28.368): open Fulfil SOs with dropship / backorder lines vs their Fulfil POs vs HORIZON POs per SKU; Accept / note; "Dropship without a PO" reasons, count and filter.
- **Xero GETs retry** twice on a passing Xero 500 / 502 / 504 (v28.365). Writes are never retried on 5xx.

## 6. Smoke test after deploy
1. `/api/version` = v28.368.
2. SUPPLY > Reports > DTC MISMATCH 2.0 > Refresh from Fulfil: about 42 orders, "Without a PO" about 10.
3. PURCHASE ORDERS > Import/Export > Export XLSX (one status) downloads.
4. ACCOUNTS > Reconcile > DHL import loads (no write).
5. SUPPLY > Payments: the Paid > Xero popup opens to step 1 (do not push).
6. Manual POST to `/api/supply/fulfil/import-pos` with the secret returns ok.
