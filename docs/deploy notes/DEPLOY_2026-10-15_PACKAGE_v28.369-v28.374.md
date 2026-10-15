> **SUPERSEDED 15-Oct-26** by `DEPLOY_2026-10-15_PACKAGE_v28.369-v28.388.md` (this package was never deployed).

# HORIZON deploy: v28.369 to v28.374

**AT A GLANCE:** branch `review-fixes-2026-10-05`, HEAD `9393201a` (`9393201aeb6b05cde1e73dcbc2c3d1ff35065f6b`, v28.374). Live checked 15-Oct-26 (`/api/version`): **v28.368**. Migrations **372 and 373** (additive, idempotent; not on live). No new env vars. **No new `/api/cron/*` or other secret-only routes** (nothing to add to the login-gate exemption list).

## 1. Migrations (in order)
- **372** `accounts_gmail_msgs.team_note` + `accounts_bill_log.description` (v28.372, Reconcile note for Xero).
- **373** `po_fulfil_group` (v28.374, client PO groups: one HORIZON client PO for many Fulfil client POs).

## 2. Data steps on live
1. **Commission paid history:** Ben is loading it himself in the Supabase SQL editor (4 guarded files, 8,408 rows, £1,035,841.14 paid). When he confirms, run CLIENT > Clients > an agent > Customers > Sync all agents from Xero. Do not run `import_commission_history.cjs` as well (the SQL refuses a second load anyway).
2. Nothing else.

## 3. Schedules (n8n)
No changes.

## 4. Env
No new variables.

## 5. Behaviour changes to know
- **v28.369 ERP Compare background pull kept alive on Vercel.** The Fulfil refresh that Actions starts now goes through `hzWaitUntil`, and an in-flight pull older than 45 s is dropped. Expect the Fulfil `purchase.purchase/search_read` "30s timeouts" (all thaw-tagged) to stop; "ERP POs not in planner" should show reliably.
- **v28.370 App health log.** Slow queries that span an instance freeze (`meta.thaw_gap_ms`) are summarised on one line, not listed, not in p95 or the DB count. `integration_error` rows now carry `meta.example` (route or `background`) and `meta.user`. Answer to your 240 s question: every slow statement over 30 s since v28.231 carried `thaw_gap_ms`; the `postgres` role's 30 s statement_timeout is working.
- **v28.371 Forecast edits reach every instance within seconds.** A save bumps `app_settings` key `data_cache_gen` (row created on first save); each instance checks it every 5 s and waits for the fresh KV blob or rebuilds. The KV meta record gains a `gen` field; old blobs read as gen 0 and refresh on the first save. The saving instance now waits for its own rebuild instead of serving the old KV copy.
- **v28.372 Reconcile note for Xero.** Drawer box "Note for Xero" goes first in the bill line description; explicit notes team members type when forwarding a receipt to accounts@ are used automatically (auto bills too). Older emails are read from Gmail once when they come up for a bill (one read each).
- **v28.373 3PL cross-month repeats classified per parcel** (G10 tracking, ILG HAWB, iFulfilment BID): red duplicate / amber check / grey returns, re-rates, extra parcels. Only red and amber go into Copy for email.
- **v28.374 Client PO groups** (PO drawer > Master & Docs > Linked records > Client POs in Fulfil; client POs only). Reads live Fulfil only. The Fulfil PO import now writes a grouped PO's mirror row as the group sum and refreshes member lines; group members no longer overwrite each other. A grouped PO no longer raises "Link Fulfil PO". DTC MISMATCH 2.0 gains a Client PO groups panel.

## 6. Smoke test after deploy
1. `/api/version` = v28.374.
2. CONFIG > App health log loads; the Database section shows the "Not counted below … instance freeze" line if any.
3. Edit one forecast cell, reload on another device: the new value shows (within ~25 s).
4. ACCOUNTS > Reconcile > open a receipt: "Note for Xero" box with the description preview (do not push).
5. A Direct to Client PO > Master & Docs > Linked records: "Client POs in Fulfil" section shows; Check a Fulfil PO number (read only, do not link).
6. SUPPLY > Reports > DTC MISMATCH 2.0 loads.
7. After the next import-pos run: the health log shows no new thaw-tagged Fulfil `purchase.purchase` timeouts.
