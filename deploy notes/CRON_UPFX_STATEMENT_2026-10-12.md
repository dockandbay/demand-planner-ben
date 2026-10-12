# Cron note for Diviyaj: Universal Partners FX weekly statement (12-Oct-26)

**Update v28.291:** the same cron now also covers **Wise FX USD (Xero AU)**: one email per account, only when that account has new lines. Its runs log as job `wise_fx_statement`. No extra schedule needed.

**What:** HORIZON builds a Xero statement-import CSV for the Universal Partners FX USD bank account (Xero UK) and emails it so someone can import it (Xero cannot take statement lines through its API). Built in v28.174, so it is already on live (v28.244). Nothing new to deploy.

**Problem:** live has never run it. planner.etl_runs has no `up_fx_statement` rows and nothing has been emailed, so the n8n schedule was never set up (or never reaches HORIZON).

**Please add an n8n schedule:**
- When: every Monday 08:00, timezone Europe/London
- Request: `POST https://horizon.dockandbay.com/api/cron/up-fx-statement`
- Header: `x-webhook-secret: <N8N_WEBHOOK_SECRET>` (same secret as the other HORIZON crons)
- Body: none (`{}`)

**First run, please do a dry run:** `POST .../api/cron/up-fx-statement?dry=1` returns what would be emailed without sending or marking anything. Then let the real run go.

**What it does:** reads Xero UK (GET only) for the Universal Partners FX USD account, and emails ONLY when there are unreconciled lines no earlier email carried. Two CSVs are attached: the new lines (to import) and every unreconciled line. Recipients default to rita@ and accounts@ (override: app_settings `up_fx_statement_recipients`). Each real run logs one `planner.etl_runs` row, job `up_fx_statement`. A 500 also logs an error row.

**Xero API cost:** a few GET calls per run (paged, 100 rows a page). Fine within the 1,000-a-day allowance.

**Check after the first Monday:** `SELECT * FROM planner.etl_runs WHERE job IN ('up_fx_statement','wise_fx_statement') ORDER BY ran_at DESC LIMIT 6;`
