# HORIZON deploy package — v28.123 → v28.142 (01-Oct-26)

**AT A GLANCE**
- Branch `phase-2.1-suppliers` · HEAD **`5990a057`** (`5990a05785fc943038b8cc808b4aa04afbdba348`)
- Live `/api/version` checked 01-Oct-26: **`v28.122.1`**
- Code: `artifact_v16.7.html`, `supply/inject.html`, `server.mjs`, `vercel.json`, `package.json` → **server restart needed**. No new npm deps.
- Migrations for live: **321, 322, 323, 324, 325, 326** (in that order — see below). Checked on live 01-Oct-26: none applied yet; `v_po_finance` md5 = `444a887c0ab6530264c3ea0a0e4500f9` (what 322's guard expects); `payment_fx` PK = (run_date, supplier).
- Env: **optional** `EMAIL_REPLY_TO` (defaults to `ops@dockandbay.com`; only set it to change that).
- **URGENT inside this package: v28.142** — the live BUY plan is empty ("0 SKUs"). It is artifact-only, so if you need it before the rest, cherry-pick `5990a057` alone.

---

## 1. Migrations — run in this order, BEFORE the code (except where noted)

| # | File | What | How to run | Post-check |
|---|---|---|---|---|
| 321 | `321_po_finance_perf_indexes.sql` | 3 indexes for `v_po_finance` (`CREATE INDEX CONCURRENTLY`) | **`psql -f` autocommit — NOT in a transaction / not one batch in the SQL editor** (CONCURRENTLY refuses a txn) | query at file end → **0 invalid indexes** |
| 322 | `322_v_po_finance_setbased.sql` | `v_po_finance` set-based rewrite. Output identical (row-md5 on 7 app query shapes). | One transaction (BEGIN/COMMIT in file). **Guarded**: aborts unless live md5 is `444a887c…` (current) or `c530a41a…` (already applied) | `md5(pg_get_viewdef('planner.v_po_finance'::regclass,true))` = **`c530a41af927203c56b5421f216119d7`** |
| 323 | `323_payment_fx_region.sql` | `payment_fx.region` (default UK) + PK → (run_date, supplier, region). **Must be applied BEFORE the new code.** | One transaction, re-runnable | PK = `(run_date, supplier, region)`; row count / `sum(paid_amount)` unchanged |
| 324 | `324_payment_xero_bills.sql` | New table `payment_xero_bills` (supplier-payment bill per payment) | Additive | table exists |
| 325 | `325_seed_payment_xero_bills.sql` | **One-time data import** of existing `SUPPLIER-PAYMENT-…` bills from `planner.xero_bills` → payments (supplier code, else Xero contact name). Writes only the new table. | One transaction, re-runnable (`ON CONFLICT DO NOTHING`) | `SELECT count(*), count(DISTINCT run_key) FROM planner.payment_xero_bills WHERE source='sweep'` → **≈273 / ≈264** (live dry-run 01-Oct; live now has 276 bills, so +1 is fine). Skipped by design: `SUPPLIER-PAYMENT-BE-2026-09-29` ($1 DRAFT test), F-Orchid (not a Horizon supplier) |
| 326 | `326_ai_message_feedback.sql` | New table `ai_message_feedback` (Ask Claude 👍/👎 + reason) | Additive | table exists with `reason` column |

321 and 322 can go any time (live-safe on the old code). 323 must precede the code.

## 2. Code — deploy HEAD `5990a057`, restart

`vercel.json`: the ignored `memory` line is removed (matches what you already did on prod).

## 3. What's in it (by version)

- **v28.123** mirror of your prod v28.122.1: menu cache-bust fix, `/api/version` served-blob timestamp, portal ASN `portalAuth`+ownership, portal img host allowlist, rail badge padding. **Reconcile — keep your versions if they differ.** Your prod-only pool / headers NOT mirrored.
- **v28.124** migration 321 · **v28.126** migration 322 + left rail 212→240px.
- **v28.125** BUY/FBA entry no longer does redundant 3 s demand rebuilds (client).
- **v28.127** new deposit shows immediately (deposit-create bumps the supply cache epoch) + pinned for edit.
- **v28.128** deposit Supplier/Production pickers keep typed fields; Payments Due fetches in parallel.
- **v28.129** `#/supply/payments/payments-due` deep link.
- **v28.130** Xero payments exceptions P55+ only; Insight column full-width/wraps; equal link sizes.
- **v28.131–132** Create in Xero popup: org selector before the post button; "Pays from" removed.
- **v28.133** **UK and AU supplier payments are separate payments from 01-Oct-26** (AU deposit / AU Other payment). History before 01-Oct unchanged (418 runs byte-identical). Migration 323.
- **v28.134** **LIVE bug:** PO-bill payments were posted FROM THE USD BANK. Now settle from the line's coded account: **P58+ / AU → 602.1 Supplier Payments; pre-P58 → production account (e.g. 620.37 P57)**; cross-org AU via loan 901 (unchanged). All have "Enable payments" on in Xero UK+AU (checked). Post refuses the whole run if an account can't be resolved.
- **v28.135 / v28.138** SUPPLY ▸ CONFIG items in the left rail; CONFIG ▸ Xero deep link; admin-only tabs wait for `/api/me` before the guard.
- **v28.136** Payments Report: "Paid USD" → **Paid** (supplier currency); **Bank ccy removed**; supplier-payment bill in supplier currency; Xero column **done ↗** link + ↻ redo (pre-21-Sep = done). Migrations 324 + 325. Admin `POST /api/supply/payments/xero-bill-sweep` re-runs the match on demand.
- **v28.137** all outgoing emails `reply_to` **ops@dockandbay.com** (`EMAIL_REPLY_TO`).
- **v28.139 / v28.141** Ask Claude 👍/👎 (+ 👎 reason popup) and **CONFIG ▸ Admin ▸ Ask Claude feedback** page; admin export `GET /api/assistant/feedback[?format=csv]`. Migration 326.
- **v28.140** Display settings popup above the rail; no L3-nav flash; Ask Claude answers render as rich HTML (escaped — no injection).
- **v28.142** **LIVE bug (BUY plan empty)**: lazy SKU data (default since v28.081) boots with empty maps; the BP engine captured its SKU list at boot → "0 SKUs". Also the sales key-format sniff ran on empty SKUS → **no sales history in any lookup** (SKU shares fell back to tier weights; demand split ~5/3 off). Fixed both + cache reset when lazy data lands + TIK/ZAL wired on every demand build. **Verified: lazy vs `?lazysku=0` buy plan identical — 0/387 rows, 75,113 units.**

## 4. Verify on live after deploy

1. `/api/version` → **v28.142**.
2. **BUY ▸ Buy plan** shows SKUs ("N SKUs · UK · … active"), not "0 SKUs".
3. **PAYMENTS ▸ Payments Due** opens quickly (v_po_finance EXPLAIN ~0.2–0.4 s vs ~1.4 s).
4. **Payments Report**: "Paid" button, no Bank ccy column; older payments show **done ↗**; a 1-Oct AU deposit is its own row with an **AU** tag.
5. **Create in Xero → preview only (don't post)**: Checks say *Payments settle from 602.1 …* (or 620.3x for pre-P58), not a bank.
6. Add a deposit → it appears at the top in edit mode.
7. **Xero payments ▸ exceptions**: no PO below P55.
8. `#/supply/config/xero` opens; **Config ▸ Admin ▸ Ask Claude feedback** loads.

## 5. Rollback notes

- **Code rollback after 323 breaks bank-amount saves on the old code** (old code upserts `ON CONFLICT (run_date, supplier)`). To roll code back: `DELETE FROM planner.payment_fx WHERE region='AU';` then `ALTER TABLE planner.payment_fx DROP CONSTRAINT payment_fx_pkey, ADD CONSTRAINT payment_fx_pkey PRIMARY KEY (run_date, supplier);` (keep `region` column — harmless).
- 322: re-create the 30-Sep definition (your dump `horizon-v_po_finance-definition-2026-09-30.sql`).
- 321: `DROP INDEX CONCURRENTLY` the 3 indexes. 324/326: drop the new tables. 325: `DELETE FROM planner.payment_xero_bills WHERE source='sweep';`.

## 6. Manual, outside the deploy

- Live Xero bank transaction `8f855720-d224-4ae0-ae23-425f32060639` (created by Horizon, paid from the bank) needs correcting by hand in Xero: void and re-post from 602.1 / 620.3x (finance).
