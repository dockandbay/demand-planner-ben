# HORIZON deploy: v28.245 to v28.296

Branch `review-fixes-2026-10-05`, code HEAD `8fed453f` (`8fed453fa1cdae3d1074b6921c45ca9e609203e1`, v28.296). Live checked 12-Oct-26: v28.244. Migrations 347 to 360 are not on live.

## 1. Migrations (in order, all additive and idempotent)
- 347 `app_permissions.accounts_access` (ACCOUNTS grant; until applied only admins see ACCOUNTS)
- 348 `accounts_gmail` (one row, sealed Gmail token)
- 349 `accounts_bank_items`, `accounts_bank_accounts`
- 350 `accounts_backdate`, `accounts_gmail_msgs` (amounts only, no bodies)
- 351 `accounts_recon_txns`
- 352 `accounts_stmt_lines`, `accounts_stmt_uploads`
- 353 `tpl_invoice_files.invoice_no / period_end / source_msg_id` (+ backfill), `tpl_coghlans_mail`
- 354 `accounts_payee_rules`
- 355 `accounts_payee_coverage`, `accounts_forward_actions`
- 356 `accounts_spend_history`
- 357 `accounts_payee_rules.attach_auto / attach_from`, `accounts_attach_log`
- 358 `accounts_payee_rules.contact_id / bill_from / bank_rule_done_at / bank_rule_done_by`, treatment check `autobill, bill, rule, ignore` (saved `spend` rows become `bill`), `accounts_bill_log`
- 359 `accounts_credit_log`
- 360 `xero_run_payments`, `payment_fx.bank_account_id / bank_name`

## 2. Env
**New, needed for ACCOUNTS Gmail (read only; heads-up as a new external service):**
- DONE by Ben: `GMAIL_CLIENT_ID_ACCOUNTS` and `GMAIL_CLIENT_SECRET_ACCOUNTS` are set in Vercel production (Google OAuth client, Internal consent screen, scope `gmail.readonly`, live callback `https://horizon.dockandbay.com/api/accounts/gmail/callback` registered).
- DONE by Ben 12-Oct-26: `GMAIL_SEAL_KEY` set in Vercel production (new random key, not the sandbox one). Nothing to do for Gmail env; it applies from your deploy.
- After deploy Ben clicks Connect Gmail in ACCOUNTS > Reconcile as accounts@.
- Optional: `GMAIL_MAILBOX_ACCOUNTS` (default accounts@dockandbay.com), `GMAIL_REDIRECT_URI_ACCOUNTS`.

**Email senders (v28.295), only after `dockandbay.com` is verified in Resend:**
- `EMAIL_FROM_ADMIN` = `HORIZON <horizon@dockandbay.com>`
- `EMAIL_FROM_SUPPLIER` = `Dock & Bay Supplier Portal <supplierportal@dockandbay.com>`
- `EMAIL_FROM_CLIENT` = `Dock & Bay Client Portal <clientportal@dockandbay.com>`
- Until they are set, From stays `PORTAL_FROM`. Reply-to switches on deploy with no setup: horizon@ / supplierportal@ / clientportal@ (all aliases of ops@). `EMAIL_REPLY_TO` is no longer read; delete it.
- Resend: add `dockandbay.com` (DKIM TXT `resend._domainkey`, MX + SPF TXT on `send.`; Google Workspace root MX/SPF untouched; check DMARC). Keep `supplier.dockandbay.com` verified until tested.

**Optional (defaults are fine):** `ACC_WRITEOFF_MAX` (200), `ACC_STMT_MAX_DAYS` (5), `ACC_STMT_ALERT_TO` (rita@, sarah@, ben@), `ACC_BANK_FIRST_DAYS` (90), `ACC_LEARN_BUDGET_MS` (240000), `XERO_DAY_ALERT` (200), `ACC_XERO_DAY_MIN` (400), `KV_TIMEOUT_MS` (5000), `XERO_UK_TENANT_ID` / `XERO_AU_TENANT_ID` (pin the org a Xero Connect may store).

## 3. n8n schedules + login-gate exemptions
All `POST https://horizon.dockandbay.com/...`, header `x-webhook-secret: <N8N_WEBHOOK_SECRET>`. Mirror the gate exemption for each (already in our server.mjs gate list).
- `/api/cron/accounts-bank-sync`: hourly, body `{}`. A full run takes about 2 min; allow it in the function timeout.
- `/api/cron/accounts-learn`: weekly. Loop while the response has `done: false`. The first run is long (reads all accounts@ mail): long n8n timeout, not one 300 s call.
- `/api/cron/up-fx-statement`: Monday 08:00 Europe/London, body `{}`. Never run on live yet. First call `?dry=1`. Covers Universal Partners FX (UK) and Wise FX USD (AU). Detail: `deploy notes/CRON_UPFX_STATEMENT_2026-10-12.md`.
- `/api/cron/payment-emails`: v28.261 adds its gate exemption (every n8n call was 401'd). Replaces your prod-only edit.
- `/api/supply/action-metrics/snapshot` and `/api/forecast/snapshot` accept the scheduler secret or a signed-in editor (v28.261, your prod fix taken upstream).
- Anything calling `/api/cron/action-metrics` must send `x-webhook-secret` (v28.255).
- Auto bills (v28.276) and the stale-statement email (v28.266) ride the existing health-checks cron; no new schedule.

## 4. Behaviour changes to know
- **Buy plan (intended, downward), v28.246:** preorders leave out stock already assigned on the customer shipment. After deploy run DEMAND > Preorders > Sync from Fulfil once (or wait for the cron).
- **Write-permission gate fails closed (v28.255):** case-sensitive routing, path normalisation; newly gated writes listed in CHANGES.md v28.255.
- **ACCOUNTS writes are admin only (v28.252);** the ACCOUNTS grant alone is read access.
- **Live Xero writes happen only on a user action or a payee switched on:** Paid popup (creates Xero payments, v28.288), supplier credit notes (v28.283), deposit credit notes (v28.290/293), Auto bill and auto-attach (off on live until Ben switches payees on).
- **Payments Due (v28.294):** part-paid balances now show as due. On live 4 POs appear (PO-54USXR1-FEB, PO-55EULX2, PO-56UKLX3-AIR, PO-57UKNL1).
- **UK ILG 3PL invoicing (v28.296):** ILG's new INVA invoice layout (from Sep-26) was counted twice, so live overstates September UK ILG by 9,321.64 (shows 135,146.79; correct 125,825.15). After deploy the INVA detail report splits handling per order, and rework goes to its order's cost centre. No data change needed; re-open September to see it.
- **Stale statement email (v28.266):** AU will email once a day until an AU bank export is uploaded in ACCOUNTS > Bank statement.

## 5. What's in it
- 245 preorders sync needs DEMAND edit; vercel.json matches prod
- 246 preorders exclude assigned stock (buy change)
- 247-254 ACCOUNTS menu: Payables, 3PL invoicing moved in, Gmail connect, Bank ageing, learn job, deep links, admin-only writes, Vercel-safe jobs (migs 347-351)
- 255-262 deep dive fixes: fail-closed gate, health gaps, Fulfil 429 retry, KV timeout, Xero OAuth binding, boot fetch diet, your two cron fixes upstream, portal fixes
- 263-264 copied tooltip; DEMAND landing without the synchronous rebuild
- 265-276 Bank statement upload, stale email, Coghlans auto-import, Reconcile (payee rules, coverage, forwarding), auto-attach, Bill route for all receipts (migs 352-358)
- 277-284 ACCOUNTS tabs renamed and reworked (BANK STATEMENT, AGEING, RECONCILE, PAYABLES, 3PL INVOICING, RULES), Xero pickers, PDF preview, metrics, Payables recommendations, supplier credit note under 200 (mig 359)
- 285-286 split-payment key on supplier-payment bills; deposits drawdown matches Xero accounts
- 287 Coghlans 3PL invoicing weekly only
- 288 Payments Report Paid popup with bank account, creates Xero payments (mig 360)
- 289-293 deposits drawdown AU column; deposit credit notes (PO drawer, PLAN > PO > Payments; AU from 01-Oct-26); Wise FX USD in the FX statement; AU banks pay UK runs via 901 loans
- 294 Payments Due: balance paid only when fully paid
- 295 email sender and reply-to by part of the system
- 296 UK ILG: INVA invoice read once, per-order handling from the detail report, rework to its order's cost centre, printed-total read check

## 6. After deploy
- Ben: grant ACCOUNTS in CONFIG > Admin > Permissions; connect Gmail as accounts@; upload the UK and AU bank exports; switch Snapchat UK / Optus AU to Auto bill when ready.
- You: smoke `/api/version` = v28.296; ACCOUNTS opens for an admin; one dry run each of accounts-bank-sync and up-fx-statement; email test per channel once the From env vars are set.
- Ben: re-open UK ILG September and check the total against Rita's reconciled figure before the bill goes to Xero (not yet in Xero). Rework SA17380500 (432.00) stays in Other Fees by choice.
- Check `planner.etl_runs` for `accounts_bank_ageing`, `accounts_learn`, `up_fx_statement` after the first scheduled runs.

Detail per version in CHANGES.md.
