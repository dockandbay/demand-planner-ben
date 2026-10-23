# HORIZON deploy package v28.467 → v28.474 (23-Oct-26)

**STATUS: merged to production `main`, NOT yet live.** The GitHub Actions deploy job failed at "Check the deploy token": Vercel returned HTTP 403 for `VERCEL_TOKEN` (set 22-Oct 12:01, last good deploy 22-Oct 12:35). Live `/api/version` is still **v28.466**. Once the token is replaced, re-run the deploy (CI workflow_dispatch on `main`); no code change needed.

**AT A GLANCE:** Ben's branch `review-fixes-2026-10-05` HEAD `1f0bc2fe` (1f0bc2feebbcc0c88334125bb7285bd4748ed693). Production repo `dockandbayteam/dock-bay-demand-planner`: PR #9 squash-merged, `main` = `7540d188` (7540d1881cc282ac1ac66292cffe375a1d26e262). Deployed by Claude with Ben's approval through Diviyaj's PR + checks process.

- **Migrations:** 384 and 385, **already applied to production and read back (23-Oct-26)**.
  - 384 `planner.commission_runs` + `draft_sent_at`, `draft_sent_to`, `draft_sent_by`.
  - 385 `planner.sample_requests` + `send_status` (default 'draft', NOT NULL, check draft/sent), `sent_at`, `sent_by`. All 9 live requests (7 Shipped, 2 Completed) set to sent.
- **New env:** none. **New cron / webhook routes:** none. **New dependencies:** none. vercel.json unchanged.
- **Checks:** pre-deploy checks and regression tests green on PR #9 and on `main`; also run locally (run-all, npm test, prebuild-race).
- **Buy plan:** identical to v28.436 baseline after every change on the branch.

## Port fixes made in this deploy
- `supply/client-view.js` had 1 merge conflict. The port job counts conflicts in `server.mjs` only, so its PR text would have called the port clean.
- **Live client portal files were stale:** production `supply/client-view.js` = Ben's v28.333 and `supply/client.html` = Ben's v28.212 (an earlier port dropped them). So v28.441 / v28.464 / v28.465 (image galleries) and v28.473 never reached live, although the v28.437-v28.466 package was reported live. Production never edited either file, so both were taken from `1f0bc2fe` as-is.
- `server.mjs`, `supply/inject.html`, `package.json` merged clean; production's own drift unchanged (624 / 34 / 1 lines).
- `.ben-port.json` benBase advanced to `1f0bc2fe`.
- Port branches get no CI on the job's own push (GITHUB_TOKEN pushes do not trigger workflows); checks ran because the fix was pushed from the dockandbay account.

## What changed (v28.467 to v28.474)
- v28.467 Commission runs: Draft → In review → Approved workflow, statement as XLSX.
- v28.468 Commission runs: send the draft statement to the agency for review (migration 384).
- v28.469 SUPPLY sample requests: Draft → Sent; supplier portal shows Sent only (migration 385).
- v28.470 DEMAND ▸ Scenario ▸ Sales Planning: "Hide discontinued" tick box, ticked by default.
- v28.471 Commission credit notes take back only the paid part (Xero and Fulfil).
- v28.472 Commission runs never pay an invoice twice (capped at invoice value × rate, net of already paid).
- v28.473 Client portal: Commission page error ("syntax error at or near on") fixed; line sheet Material wraps; carton and product dimensions and weights as separate columns (screen and CSV).
- v28.474 PO grid and Shipments: PLAN opens in a 70% right-hand drawer on desktop (phones unchanged).
- Plus, via the portal file catch-up: v28.441 / v28.464 / v28.465 image galleries.

## Interim effect (code not live, migrations applied)
- Sample requests created on live before the deploy lands default to `send_status = 'draft'`. The v28.466 code ignores the column, but after the deploy any such request is hidden from the supplier until set to Sent. Check SUPPLY ▸ Samples for Draft requests after the deploy.

## Smoke checks after the deploy lands
1. `/api/version` = v28.474.
2. Client portal (CLIENT ▸ Portal preview): Commission page loads; Catalogue line sheet shows Ctn L/W/H, Ctn weight, Prod L/W/H, Prod weight; with `view_images` on, "Image gallery" shows.
3. SUPPLY ▸ PO grid: PLAN opens the 70% drawer; Esc closes it.
4. SUPPLY ▸ Samples: the 9 existing requests show Sent.
5. DEMAND ▸ Scenario ▸ Sales Planning: Hide discontinued ticked.
