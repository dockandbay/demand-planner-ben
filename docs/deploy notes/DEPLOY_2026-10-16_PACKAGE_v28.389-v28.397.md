# HORIZON deploy: v28.389 to v28.397

**AT A GLANCE:**
- Branch `review-fixes-2026-10-05`, HEAD `a026f1d4` (`a026f1d4e33a6d7f2c8a719e88705154e1753967`) = v28.397.
- Live checked 16-Oct-26 (`/api/version`): **v28.388**. This package follows straight on.
- **One migration: 376** (additive, idempotent; not on live).
- **No new env vars.** No dependency changes.
- **No new `/api/cron/*` or other secret-only routes:** nothing to add to the login-gate exemption list. The two new routes are normal signed-in ACCOUNTS routes (section 6).

## 1. Migrations
- **376** `planner.flexport_au_settlements` (new table + partial unique index). One row per Bank of America Flexport statement line settled against Xero AU bills (v28.396).

## 2. Data steps on live
- None.
- FYI, done by Ben in Xero (not HORIZON data), 16-Oct-26: five Xero AU bills pushed by Fulfil had the wrong exchange rate (Fulfil sent its USD-per-GBP rate, 1.32644, as the AUD rate). Corrected to 0.694575: PO-57AULX1 (its payment was deleted and re-added unchanged), FLEX-4004425-3A, FLEX-4004425-4, FLEX-4025988-6, FLEX-4025988-5. Being raised with Fulfil support.

## 3. Please look at
1. **v28.396 / v28.397 Flexport AU writes to both Xero orgs** (confirmed by the user, admins and ACCOUNTS users):
   - **(a) Xero AU:** `PUT Payments` on the AU bill(s) from 901 Loan - Dock & Bay Ltd (UK), dated the Bank of America line, no CurrencyRate (Xero's day rate, the same as the cross-org PO payments).
   - **(b) Xero UK:** `PUT BankTransactions` SPEND in Bank of America, contact Flexport, 901 Loan - Dock & Bay PTY LTD (Australia), USD, NoTax.
   - **Guard:** the row in migration 376 is written before the Xero calls. If (a) succeeds and (b) fails, the row stays `partial` and the next press only does (b).
   - **Allowlist:** `accountsGate` now lets ACCOUNTS users POST `/api/accounts/flexport-au/settle` (as `bills/create`).
   - Ben will supervise the first real use.
2. **v28.397 DHL matching fix:**
   - **The bug:** the DHL statement query selected `l.id`, which `accounts_stmt_lines` does not have. The error was swallowed, so on live no DHL invoice has ever matched its ANZ line ("not on the ANZ statement").
   - **The fix:** it now matches on date, amount and reference. Expect DHL rows to appear in Reconcile after the deploy.

## 4. Schedules (n8n)
No changes.

## 5. Env
No new variables.

## 6. Behaviour changes to know
- **v28.389 FBA Transfer Upload AU:** the file uses Amazon's AU template layout (Prep owner + Labeling owner, no lot code). Seller Central AU rejected the old one ("D8"). Other markets unchanged.
- **v28.390 Transfer FBA:** only 3PL stock on hand can be sent. Inbound later this month no longer counts. This is an intended buy-screen change: Transfer FBA only; Buy 3PL / Urgent / Buy FBA / Zalando are unchanged on the sandbox before/after.
- **v28.391 3PL Push actuals:** 120 ms between Fulfil reference lookups and 1 s between chunks (your 13-Oct 429 burst was rita@'s EU iFulfilment push).
- **v28.392 Paid > Xero:** PO bill payments listed one per PO with the Xero bill link (display only).
- **v28.393 Payments follow-up:** warnings only before the Xero push (no bill linked / voided bill). After the push, only a logged failed payment is flagged; "still owes" is gone.
- **v28.394 Reconcile GST:** before saying "No GST", a receipt's PDF is read once more for labelled GST (Gmail read only, at most 6 per load). Checked emails are marked `gstchecked` in `pdf_words`.
- **v28.395 Reconcile:** a "Hide lines with bill created" tick box (per browser).
- **v28.396 / v28.397 Reconcile:**
  - **Tabs removed:** the DHL import and Flexport AU tabs are gone; both now show as custom rows in Bank lines > Receipt found.
  - **Flexport:** a Bank of America Flexport line matching an open Xero AU Flexport bill gets one button, "Pay AU bill + Spend Money".
  - **DHL:** an ANZ DHL line gets "Review", which opens the DHL invoice card under the line.
  - **Xero AU reads:** open AU Flexport bills are read live from Xero AU (one call, kept 5 minutes; falls back to the bills cache) when the Bank lines contain Bank of America Flexport lines.

**New signed-in routes** (none secret-only):
- `GET /api/accounts/flexport-au`
- `POST /api/accounts/flexport-au/settle`
