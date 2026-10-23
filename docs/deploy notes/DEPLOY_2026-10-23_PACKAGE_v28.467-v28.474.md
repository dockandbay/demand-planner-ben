# HORIZON deploy package v28.467 → v28.474 (23-Oct-26)

**AT A GLANCE:** Ben's branch `review-fixes-2026-10-05` HEAD `666039eb` (666039eb7b06be8cee0eb794e374c5a644d229ee); the code is at `1f0bc2fe`, and this note is the only later commit. Live `/api/version` verified **v28.466** (23-Oct-26). Production repo `dockandbayteam/dock-bay-demand-planner`: **PR #9 squash-merged, `main` = `7540d188`** (7540d1881cc282ac1ac66292cffe375a1d26e262).

**STATUS: merged and migrated, NOT live.** The CI deploy job fails at "Check the deploy token": Vercel returns HTTP 403 for `VERCEL_TOKEN`. Last good deploy 22-Oct 12:35. Failed runs: 39931926508 (push) and 39932940152 (workflow_dispatch, after Ben set a new token).

Ben approved this deploy. Claude ran it through your PR + checks process with Ben approving each step.

## Div: what's needed
1. **Deploy token / Vercel membership.** Your 22-Oct token stopped working (403 since about 09:26 23-Oct), possibly when Ben enabled 2FA or through the shared login. Ben revoked a token and set a new one, but it also gets a 403 and the job reads it as 92 characters, so it is probably the wrong scope or account. Ben's own Vercel login still isn't in the DockandBay team (he has been signing in as you). Please set a team-scoped `VERCEL_TOKEN`, ideally after fixing Ben's membership so he can make tokens himself.
2. **Re-run the deploy:** Actions ▸ CI ▸ Run workflow on `main` (no code change needed). Then run the smoke checks below.
3. **Delete a misnamed repo secret.** A secret whose name starts `VCP_3PEB…` was created by mistake (Ben pasted a token into the name field). That token has been revoked; the secret is just clutter.
4. **Port job, two weaknesses found:**
   - `conflicts=$(grep -c '^<<<<<<< ' server.mjs)` counts **server.mjs only**. This port had a conflict in `supply/client-view.js`, and the PR text would have said "clean".
   - Port branches get **no CI**: pushes made with GITHUB_TOKEN don't trigger workflows, so `ben-sync/*` branches had no checks (b73e8b1f, 5efa2fa5, 83195133, 1f0bc2fe). Checks ran on #9 only because the fix was pushed from the dockandbay account.
5. **Stale client portal files (fixed in #9, FYI).** Production `supply/client-view.js` was Ben's v28.333 and `supply/client.html` was Ben's v28.212; an earlier port dropped them. So the image galleries (v28.441 / v28.464 / v28.465) never reached live, although the v28.437-v28.466 package was reported live. Production had never edited either file, so both were taken from `1f0bc2fe` as-is. Worth checking whether any other file was dropped the same way; a sweep against Ben's base found only dev scripts and `templates/supply_import_templates/*` differing.

## Done in this deploy
- **Migrations, applied to production and read back on 23-Oct-26** (via apply_migration as `384_commission_draft_statement` and `385_sample_request_send_status`):
  - 384: `planner.commission_runs` gets `draft_sent_at`, `draft_sent_to`, `draft_sent_by`.
  - 385: `planner.sample_requests` gets `send_status` (default 'draft', NOT NULL, check draft/sent), `sent_at`, `sent_by`. All 9 live requests (7 Shipped, 2 Completed) set to sent.
- **Port resolution (PR #9):** `server.mjs`, `supply/inject.html` and `package.json` merged clean. Production's own drift from Ben is unchanged (624 / 34 / 1 lines), so the hardening is intact. `.ben-port.json` benBase advanced to `1f0bc2fe`.
- **Checks:** pre-deploy checks and regression tests green on PR #9 and on `main`. Also run locally: run-all, npm test, prebuild-race.
- **New env:** none. **New cron / webhook routes:** none. **New dependencies:** none. vercel.json unchanged.
- **Buy plan:** identical to baseline after every change on Ben's branch.

## Interim effect (migrations live, code not)
New sample requests created on live before the deploy lands default to `send_status = 'draft'`. v28.466 ignores the column, but after the deploy any such request is hidden from the supplier until it is set to Sent. Check SUPPLY ▸ Samples for Draft requests after deploying.

## What changed (v28.467 to v28.474)
- v28.467 Commission runs: Draft → In review → Approved workflow, statement as XLSX.
- v28.468 Commission runs: send the draft statement to the agency for review (migration 384).
- v28.469 SUPPLY sample requests: Draft → Sent; the supplier portal shows Sent only (migration 385).
- v28.470 DEMAND ▸ Scenario ▸ Sales Planning: "Hide discontinued" tick box, ticked by default.
- v28.471 Commission credit notes take back only the paid part (Xero and Fulfil).
- v28.472 Commission runs never pay an invoice twice (capped at invoice value × rate, net of what is already paid).
- v28.473 Client portal: Commission page error ("syntax error at or near on") fixed; line sheet Material wraps; carton and product dimensions and weights as separate columns (screen and CSV).
- v28.474 PO grid and Shipments: PLAN opens in a 70% right-hand drawer on desktop (phones unchanged).
- Also, through the portal file catch-up: v28.441 / v28.464 / v28.465 image galleries.

## Smoke checks after the deploy lands
1. `/api/version` = v28.474.
2. Client portal (CLIENT ▸ Portal preview): the Commission page loads; the Catalogue line sheet shows Ctn L/W/H, Ctn weight, Prod L/W/H, Prod weight; with `view_images` on for that client, "Image gallery" shows.
3. SUPPLY ▸ PO grid: PLAN opens the 70% drawer; Esc closes it. The same applies to the Shipments tab.
4. SUPPLY ▸ Samples: the 9 existing requests show Sent.
5. DEMAND ▸ Scenario ▸ Sales Planning: Hide discontinued is ticked.
