# HORIZON deploy package v28.485 → v28.486 (26-Oct-26)

**AT A GLANCE:** Ben's branch `review-fixes-2026-10-05` at `2f60168e` (2f60168e1e843066e35831ce672bd4b9877f9fdf, v28.486). Live `/api/version` before the deploy: **v28.484** (Connect, PR #14, production `main` = `9e8846e4`). Production port: PR #15, branch `port/v28.486`, commit `8d7987db` (author admin@dockandbay.com). Owner of production steps: Ben.

**STATUS 26-Oct-26: LIVE.** PR #15 merged by Ben (production `main` = `2d7f0188`), CI run 40264065647 green, live `/api/version` = **v28.486**.

## What changed
- **v28.485 DEMAND ▸ WSSI** (#/demand/wssi), second in the DEMAND menu after Cross Market view. Weekly sales, stock and intake with open to buy, laid out like Ben's "WSSI OTB Format" sheet. Read only. Logic: `lib/ai-logic/wssi.md`.
  - New `lib/wssi.mjs` and `GET /api/demand/wssi?fy=<start year>` (reads only; cached 10 minutes per year; about 6 s to build on live; `?fresh=1` rebuilds).
  - **REPORTS ▸ Open-to-Buy removed** (tab, view and `/api/scenario/otb`). Old `#/reports/otb` links go to DEMAND ▸ WSSI.
- **v28.486** WSSI Numbers switch: Full or Summary (k / m, 3 significant figures).
- Ben's branch also now contains the Connect commits (v28.483, v28.484), already live via PR #14.

## Port notes
- `scripts/port/sync-ben.cjs` from benBase `2c8f34cc` to `2f60168e`. Clean except:
  - `server.mjs` 2 conflicts, both Connect lines production already had in its hardened form (gate exemption for POST `/api/connect/*` and `/api/identity/*`; `identityBlockSet(true)` after a revoke / restore). Production kept.
  - `package.json` version → 28.486.
- `.ben-port.json` benBase → `2f60168e`.
- Checks in the port clone: `scripts/checks/run-all.cjs` (syntax 43/43, globals, counts, login gate 19 cron paths, vercel-config), `npm test`, `tests/prebuild-race.cjs`: all pass. `lib/**` is already in vercel.json includeFiles.

## Migrations, env, routes
- **No migration.** (387 and the Connect schema were applied with v28.484.)
- **No new env.**
- **New cron / webhook routes: none.** New route `GET /api/demand/wssi` sits behind the normal login gate.

## Buy plan
No planning logic changed. Buy plan untouched.

## Smoke checks after the deploy
1. `/api/version` = v28.486.
2. DEMAND ▸ WSSI opens (first load about 6 s), FY27, actuals to Sep-26.
3. Closing stock units for Sep-26 = 814,828 (the live 01-Oct-26 snapshot, checked read only before the deploy).
4. REPORTS has no Open-to-Buy tab; `#/reports/otb` lands on WSSI.
5. Numbers: Summary shows k / m.

## Deploy record
- 26-Oct-26: PR #15 opened, checks green (two CI runs, one for the branch push and one for the PR; neither deploys).
- 26-Oct-26 03:25 UTC: merged by Ben, production `main` = `2d7f0188`. CI run 40264065647 (push to main: checks, tests, deploy, alias, smoke) green. Live `/api/version` verified **v28.486**. Ben confirmed WSSI is live.
