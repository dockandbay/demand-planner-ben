# HORIZON deploy package v28.508 (27-Oct-26)

**AT A GLANCE:** Ben's branch `review-fixes-2026-10-05` at `8f6358d5` (`8f6358d562b096cb84652bf877bbe4ad88ce881c`; code v28.508). Live `/api/version` before: **v28.507** (production `main` = `632c73e6`). Production port: PR #24, branch `port/v28.508` (`36aa8600`). Owner of production steps: Ben.

**STATUS 27-Oct-26: PR OPEN.** No migration: merge when the checks are green.

## What changed
- v28.508 Client emails: reply-to = the client's owner mailbox (sales-uk@ / sales-us@ / sales-eu@ / keyaccounts@), ops@ when no owner. clientportal@ does not exist, so client replies were bouncing. From unchanged.

## Port notes
- `scripts/port/sync-ben.cjs` aacf507d → 47ebe02f: clean. Checks: run-all, npm test, prebuild-race all pass.

## Migration, env, routes
- No migration, no new env. **New cron / webhook routes: none.** No new routes.

## Buy plan
No planning logic changed.

## Smoke checks after the deploy
1. `/api/version` = v28.508.
2. Next client email (e.g. a sign-in link): Reply-To header is the client's sales mailbox.

## Deploy record
- 27-Oct-26: PR #24 opened.
