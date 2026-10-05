# DEPLOY package for Diviyaj: v28.151 to v28.155 (05-Oct-26 review fixes + PRODUCT catalogue)

**Branch** `review-fixes-2026-10-05`, forked from `fix/first-click-boot-freeze` at v28.150 (`625e4258`, which you shipped as v28.150.1). **HEAD: see the final line of this note** (filled at hand-off; never assume). Live verified at hand-off via `/api/version` = v28.150.1.
**Base you deploy on:** v28.150.1 + your .1 and .2 patches of v28.142 (skip .3 as agreed). This branch still has none of your PROD DIVERGENCE patches; please re-apply them on top, as before.
**Files:** `server.mjs`, `artifact_v16.7.html`, `supply/inject.html`, `supply/portal-view.js`, `vercel.json`, `.env.example`, `.gitignore`, `package.json` + lock, `migrations/327_commission_rows_unique.sql`, `migrations/README.md`, CHANGES.md.

## Order of operations
1. **Migration 327** (`327_commission_rows_unique.sql`): partial unique index on `commission_rows (run_id, order_ref)` for Fulfil-sourced rows, with a dedupe step first. Run its duplicate SELECT first; sandbox had 0. Code falls back cleanly if 327 is not applied, so it can go before or after the code.
2. **Prod role timeout:** `ALTER ROLE <app role> SET statement_timeout='30s'`, then `SHOW statement_timeout` through port 6543 (our startup option is almost certainly dropped by the transaction pooler).
3. **Deploy code.** Server restart needed (server.mjs changed throughout).
4. **vercel.json: YOURS WINS** (it carries `horizon-login.html`; ours never had it). Port only two things from ours: add `node_modules/pdfjs-dist/build/pdf.min.mjs` and `node_modules/pdfjs-dist/build/pdf.worker.min.mjs` to `includeFiles` (the `/vendor/pdfjs` route serves `build/`, so thumbnails 404 on prod today), and remove the legacy `crons` entry (`/api/cron/action-metrics` is behind the planner key so Vercel's call always 401s; n8n does this job).
5. **Env vars** (all optional, names only):
   - `PORTAL_URL` = the real supplier portal base (the code default `https://suppliers.dockandbay.com/portal` has no DNS; the live host is `supplier.dockandbay.com`). Magic links use it when set.
   - `PAYMENT_EMAIL_CRON=1` only AFTER you schedule `POST /api/cron/payment-emails` (webhook-secret gated, every 1-2 min via n8n). Until then the in-process timer keeps running on Vercel exactly as today.
   - `CIN7_WRITES_DISABLED=true` recommended now that we are 100% Fulfil: blocks every non-GET Cin7 call (403, nothing sent).
   - `PG_QUERY_TIMEOUT_MS` override (default 35 s on Vercel). `HOST`/`PORT` are local-dev only.
   - `.env.example` now lists all 74 names the code reads.
6. **Vercel region:** no `regions` in vercel.json. If the function is in iad1 while Supabase is eu-central-1 that explains the ~0.3 s floor on every call; please pin fra1 if so.

## What changed (headlines; full detail per version in CHANGES.md)
- **v28.151 security + portals:** uploads keep an allowlisted mime only; every file response nosniff + CSP sandbox + attachment unless image/PDF; global nosniff; `pk` cookie HttpOnly (+Secure on https); image proxy host-allowlisted (cloudinary/shopify, image/* only, no redirects); permissions FAIL CLOSED when gated with no identity (key-only = read-only, was admin); `cookieUser` guarded; magic links from `PORTAL_URL`; request-link rate limit; timing-safe key/secret compares; AI `tools` stripped. **Portal Confirm order / Approve / Approve all now persist** (`/api/portal/submit` had no `po_confirmed` branch; live has 0 supplier confirmations ever; check whether your prod already diverged here); shipment_ref/escalate ownership; portal payloads scoped to the caller's supplier; client order emails escaped, client `force` ignored.
- **v28.152 integrations + server:** pg pool connect/query timeouts; safe ROLLBACK at 48 sites; Fulfil update = ONE write (delete+create) with re-confirm in finally + per-PO push lock (409) + button disabled in flight; timeouts on every outbound fetch; Xero refresh single-flight and no longer deletes the connection on a generic 400; Xero payment post duplicate guard (409) and `ok:false` on failures; Flexport booking guard; `activeErp()` no longer defaults to Cin7 on DB error; Fulfil null price / missing UOM are pre-flight problems; BLADE partial-page guard; Fulfil import no prune on truncation; data-cache and makeCache generation fixes (no stale build cached or written to KV, no double rebuild); payment-email reclaim of stuck `sending` rows + cron route; Zalando upload in one transaction; commission build batched (mig 327).
- **v28.153 client + deploy:** buy SKU search debounced and no longer wipes BUY_CACHE; SUPPLY Shipments/Productions "still loading" fixed (shared in-flight fetches, ok-only generation-checked caches, no order-plan prewarm off the PO grid, background fetches don't spin the badge); sku-data retry + visible failure bar; demand-build failure banner; per-render document listeners bound once; AI/supplier/error text HTML-escaped; retired model id removed; Actions auto-refresh skips hidden tabs; vercel.json/.env.example/migrations README/engines/gitignore hygiene.
- **v28.154 demand/buy engine (artifact):** `buildLiveDemand` idempotent (your +19,637-per-rebuild finding: the Preorder/KA fold added past-dated months that step 1 never cleared; Ben's rule: past KA/preorder months are past forecasts, ignored, never roll forward); run-off share pool no longer depends on DEMAND filters/search (a SKU search changed 174 buy rows); **Jan-2027 year rollover** (CUR_MONTH was hardcoded to 2026); memo/cache resets. **⚠ BUY-CHANGING (one commit, `2753fb28`):** with CUR_MONTH = Sep-26 and the window starting Oct-26, the chained last-year rule read 0 for Sep-26, so **Sep-27 forecast was 0 for every continuing SKU** (live too). Fixed; sandbox effect Buy 3PL +288 units on 6 UK SKUs, urgent/FBA/transfers unchanged. Expect a small uplift in Sep-27 demand and a few UK buys when this lands.
- **v28.155 PRODUCT:** searchable workshop-barcode picker on the Sizes grid; Reports ▸ Catalogue (season filter, search, CSV, landscape PDF). New read-only endpoints `GET /api/product/reports/catalogue`, `POST /api/product/reports/catalogue/pdf`.

## Verification done on the sandbox (details in CHANGES.md)
- Buy plan: see the comparison line at the end of this note.
- Demand total identical across 4 rebuilds (1,786,072); DEMAND search no longer changes the buy (0 rows).
- Portal in-place tests pass; upload/proxy/permissions/portal ownership curls as listed under v28.151.
- Fulfil/Xero/cache behaviour under stubbed failures and concurrency as listed under v28.152.
- jsdom crawl 0 JS errors; Shipments badge clears at 6 s on a busy pooler (was still spinning at 96 s).

## Please check after deploy
1. `/api/version` = v28.155; a staff page load still shows the login (your gate) and loads normally with the HttpOnly key cookie.
2. A supplier "Confirm order" in the portal writes `supplier_confirmed_at`.
3. PDF thumbnails render on PRODUCT documents (pdfjs includeFiles).
4. Payment emails still go out (timer still on until `PAYMENT_EMAIL_CRON=1`).
5. `SHOW statement_timeout` via 6543 = 30s.

## Left open (not in this package)
Shared consolidated shipments (any supplier aboard can set Shipping); `?key=` still accepted on page load; UI-only hardcoded 2025/FY27 labels (plan shares drift from the buy in Jan-27 without ~10 one-line swaps, queued); cached gzip/ETag for the 6.3 MB / 4.2 MB payloads; business data in pushed git history (needs a joint decision on a history rewrite); `main` still at the initial commit and stale PRs #1/#2.

**Branch HEAD SHA at hand-off:** (filled when Ben approves the push)
**Buy comparison v28.150 → v28.155 (sandbox, jsdom, all 5 markets, every SKU, fields Buy 3PL / urgent / Buy FBA / transfer / Zalando):** exactly 6 rows differ, all UK Buy 3PL, all from the Sep-27 chain fix (`2753fb28`): PICNIC-CAB-LG-NAVY 80→128, BAGCOOL-MD-NAVY 500→520, PONCHA-SUM-MD-CSTCANDY 420→500, PONCHK-SUM-MD-CSTCANDY 390→420, PONCHA-SUM-LG-CSTCANDY 100→180, TOWLB-SUM-XL-MIAMI 900→930. Totals: Buy 3PL 33,561→33,849; urgent 37,972; Buy FBA 1,030; transfers 3,994; Zalando 84 (all unchanged). The combined branch is byte-identical to thread A's isolated after-state (0 rows differ), so the security, server, client and PRODUCT changes moved nothing in the buy. Rebuild-identical in every market.
