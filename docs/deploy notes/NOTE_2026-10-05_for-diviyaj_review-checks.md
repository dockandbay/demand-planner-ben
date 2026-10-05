# For Diviyaj: thanks + prod checks from the 05-Oct review (v28.150.1)

Thanks for shipping v28.143 to v28.150 and for the numbers (cold BUY 3.7 s to 4 ms, sku-data 2.2 s to 254 ms).

## Your points, acknowledged
- **.1 to .3:** we'll take .1 and .2 and skip .3. Please send the .1 and .2 diffs (or the commit SHAs/patch files). The "PROD DIVERGENCE" markers are in your repo, not ours, so we can't grep for them here.
- **vercel.json:** agreed, yours wins. Ours has no `horizon-login.html`, and this repo has no signed-cookie login at all, so shipping ours would drop the login. Fixes in this round touch `includeFiles` (adds pdfjs, see below) and remove the legacy cron; please merge those two lines into yours rather than taking our file.
- **buildLiveDemand not idempotent:** confirmed and root-caused. The Preorder/KA fold adds into B2B for every pka month, but the reset only clears the 18-month forecast window, so past-dated (and beyond-window) preorder/KA rows are added again on every rebuild. Sandbox: +6,566 units per rebuild, every rebuild (yours: +19,637). A second path lets it leak into the window via the "same month last year" rule when the browser month and the latest actuals month differ. Fix in progress (Ben's call: overdue preorder/KA months are ignored, so today's buy stays byte-identical); you'll get it with before/after buy snapshots.

## Please check on prod (read-only)
1. **Supplier PO confirmations.** In our code `/api/portal/submit` never writes `supplier_confirmed_at` (only the admin preview route does), so portal "Confirm order" and the new Approve / Approve all look successful but don't save. Live has **0** POs with `supplier_confirmed_at` ever. Is your prod portal submit patched? Fix is in this round either way.
2. **statement_timeout.** Our 30 s cap is a connection startup option; the transaction pooler (6543) likely drops it. Please run `SHOW statement_timeout` through 6543 and, if it isn't 30s, `ALTER ROLE <app role> SET statement_timeout='30s'`.
3. **Vercel region.** No `regions` in vercel.json. If the function runs in iad1 while Supabase is eu-central-1, that explains the ~0.3 s floor even on `/api/version`. Worth pinning fra1.
4. **Static file exposure.** `outputDirectory: "."` with no `.vercelignore`: please check whether `/CLAUDE.md`, `/server.mjs` or `/migrations/001_*.sql` are fetchable on a preview URL without login. If yes, point output at an empty `public/` or add `.vercelignore`.
5. **`/vendor/pdfjs`.** Served from `node_modules/pdfjs-dist/build/`, which isn't in includeFiles, so PDF thumbnails probably fail silently on prod.
6. **Payment-email worker.** It runs on a `setInterval`, so on Vercel queued remittance emails only send while an instance is warm. Needs a cron (n8n or Vercel) once our fix lands.
7. **FBA `last_run`** still not advancing after a successful refresh (from the 02-Oct note).

## Coming in the next package (being built now, not ready yet)
Demand engine idempotency + Jan-2027 year rollover (CUR_MONTH is hardcoded to 2026); upload/image-proxy XSS hardening and HttpOnly key cookie; portal confirm/approve persistence and ownership checks; Fulfil atomic line update + per-PO push lock; Xero refresh no longer deletes the connection on a 400; outbound fetch timeouts; pool connection/query timeouts; Shipments/Productions "still loading" fix. Full list with file:line: ask Ben for `REVIEW_2026-10-05_v28.150.md`.
