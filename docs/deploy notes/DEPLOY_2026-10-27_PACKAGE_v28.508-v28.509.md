# HORIZON deploy package v28.508-v28.509 (27-Oct-26)

**AT A GLANCE:** Ben's branch `review-fixes-2026-10-05` at `82946822` (code v28.509 = `8f6358d5`). Live `/api/version` before: **v28.507** (production `main` = `632c73e6`). Production port: PR #24, branch `port/v28.508`, head `afdec43` (v28.508 port `36aa860` + v28.509 port `afdec43`). Supersedes DEPLOY_2026-10-27_PACKAGE_v28.508.md. Owner of production steps: Ben.

**STATUS 27-Oct-26: PR #24 OPEN, checks green on `afdec43`.** No migration. Ben to squash-merge (auto mode blocks the merge for Claude).

## What changed
- v28.508 Client emails: reply-to = the client's owner mailbox (sales-uk@ / sales-us@ / sales-eu@ / keyaccounts@), ops@ when no owner.
- v28.509 Payments, several POs on one Xero bill (Ballast 1723: Fulfil merged 10 POs into one supplier bill):
  - A payment run posts ONE Xero payment per bill for all its POs (reference = the PO numbers); amount-due check on the total; POs on one bill that settle from different accounts or rates block the post. Before, the 2nd PO was skipped as "already paid by this run".
  - After every Xero bill sync, HORIZON reads live Fulfil's posted supplier bills (180 days, read only) and links each Xero bill to every HORIZON PO on it (found_by 'fulfil-bill'; only fills empty links). Master PO client POs: map in app_settings 'fulfil_bill_xero_map'.
  - Fixes v28.508: an apostrophe in the CLIENT > Notices editor ("client's") broke supply/inject.html's script, so SUPPLY would not have loaded. Never live.

## Port notes
- `scripts/port/sync-ben.cjs` 47ebe02f -> 82946822: clean (server.mjs, supply/inject.html, package.json merged clean). Checks: run-all, npm test, prebuild-race all pass. supply/inject.html script parses (node --check).

## Migration, env, routes
- No migration, no new env. **New cron / webhook routes: none** (the Fulfil linker runs inside the existing /api/cron/xero-bills-sync).
- New live reads: the hourly bill sync now also reads Fulfil account.invoice + purchase.purchase (live, read only). Writes only HORIZON's planner.po_links and one app_settings row.

## Buy plan
No planning logic changed.

## Smoke checks after the deploy
1. `/api/version` = v28.509.
2. SUPPLY loads (the v28.508 script fix).
3. After the next hourly bill sync (or SUPPLY > CONFIG > Xero > sync): PO-57UKBL1, PO-57EUBL1, PO-57UKBL-GOLDSEAL linked to UK 1723 and PO-57AUBL1 to AU 1723 (Linked records, found by fulfil-bill).
4. Payments Report: a Ballast run with two balances on 1723 previews "One payment per bill: 1723 pays 2 POs". Watch the first real post: one payment on 1723 with both PO numbers in its reference.

## Deploy record
- 27-Oct-26: PR #24 opened (v28.508), v28.509 port pushed to the same branch, PR retitled; checks green on afdec43. Merge attempted by Claude, blocked by auto mode: Ben merges.
