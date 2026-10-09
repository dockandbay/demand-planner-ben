# HORIZON deploy: v28.231 to v28.244

Branch `review-fixes-2026-10-05`, HEAD `77db674b` (v28.244). Live checked 09-Oct-26: v28.230, migrations 342 to 346 not applied.

## 1. Migrations (in order, all additive and idempotent)
- 342 app_health_events kind: adds `instance`, `cron_run`
- 343 PO grid indexes (2 btree + ANALYZE)
- 344 so_supplier_pushes: `old_mode`, `new_mode`
- 345 COGS: `cogs_values`, `cogs_uploads`, `cogs_analysis`
- 346 Preorders from Fulfil: `preorders.source/customers`, `preorder_lines`, `preorder_syncs`

## 2. Env
- NEW `COGS_AIRTABLE_EMAIL` (Ben has the address; without it the COGS email button is off, endpoint 503)
- Optional `HZ_BUILD_CONC` (default 2 on Vercel)
- Uses existing: `N8N_WEBHOOK_SECRET`, `RESEND_API_KEY`, live Fulfil read creds

## 3. n8n + gate
- New daily cron 06:00 Europe/London: `POST /api/cron/preorders-sync`, header `x-webhook-secret: <N8N_WEBHOOK_SECRET>`, body `{}` (`{"dry_run":true}` = counts only). 200 ok / 401 secret / 500 fail. Logs etl_runs job `preorders_fulfil`.
- Mirror the login-gate exemption for `/api/cron/preorders-sync`.
- After the first good run: switch OFF the old `n8n_sync_preorders` (Airtable) workflow.

## 4. Buy plan change (intended)
- v28.243: preorders now come from Fulfil (future-dated, ship-from-stock, unassigned, 3PL lines; China stock and key accounts excluded) and are added to B2B only when preorder >= 50% of that month's B2B forecast. Sandbox before/after: 1 SKU moved (EYEMASK-DES-BOHMDRM US, Buy 3PL 60 to 0). Expect live moves once the sync runs.

## 5. What's in it
- 231 health review fixes + capture gaps
- 232 PO grid speed-up (mig 343)
- 233 Plan grid column filters (client only)
- 234 Validate sales order: change fulfilment method per line (mig 344)
- 235-240 BUY & MOVE > Inventory > COGS tab, sets, filters, FBA columns (mig 345)
- 241-244 DEMAND > Inputs > Preorders (Fulfil sync, links, cron, 50% rule, tooltip, stale badge, Demand impact report) (mig 346)

## 6. After deploy
- Ben loads the Airtable COGS export once (Load baseline CSV) before the first send.
- Check db checkout metric `meta.wait_until > 0`.
- Still open from before: `PAYMENT_EMAIL_CRON=1` + n8n schedule; confirm transaction pooler (6543) + attachDatabasePool; paste your vercel.json so we copy it in.

Detail per version in CHANGES.md.
