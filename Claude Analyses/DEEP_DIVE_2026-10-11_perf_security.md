# HORIZON deep dive: performance, security, app health (11-Oct-26)

Scope: branch `review-fixes-2026-10-05` at v28.250 (HEAD 8e46a18e); live is v28.244. Read only: no code changed, nothing written to any system. Sources: live App health log (7 days, Supabase MCP read-only), sandbox health log and endpoint timings, four code reviews (back end security, back end performance, front end boot and menus, supplier and client portals), jsdom probes of the served page (no headless Chrome).

One action was taken during the review: the sandbox was restarted with `HZ_ACCOUNTS_CRON=0` because the v28.249 hourly bank-ageing timer was hitting the Xero connections that live shares (28 failed runs in 2 days).

## 1. App health, live (04 to 11-Oct)

| Signal | Result |
|---|---|
| Real DB connection timeouts | 1,162 on 07-Oct (v28.214), 551 on 08-Oct, 286 on 09-Oct, then **0 on 10 and 11-Oct** after v28.244 went live. The v28.231 fixes worked. 7 red alerts ("53 DB timeouts in 5 min") were all before the deploy. |
| Noise after Vercel freezes | 146 + 78 "connection terminated" / "query read timeout" rows tagged `thaw_gap_ms`: background work resuming after an instance freeze. Not user facing, but each still logs an event. ~90 "Instance resumed after N s freeze" rows an hour, constant. |
| ETL | `n8n_sync_flexport` last ran 07-Oct 18:00 (normally hourly): **stopped 4 days**. `n8n_sync_sales_sheets` rows_affected identical (93,349) on 6 runs: source may have stopped changing. `preorders_fulfil` has 1 run (Ben's manual run); the n8n cron is not built. |
| Integrations | Upstash KV: 136 timeouts (30 s each) in 7 days on the data-cache blob read. Fulfil `purchase.purchase/search_read`: 17 timeouts at 30 s, 13 x 429. Resend: 2 timeouts. |
| Slow requests (no freeze) | `/api/supply/:section` p50 968 ms (n 96); `/api/data-cache/invalidate` 1.9 s; `/api/tracking/poll` 2.3 s; `import-pos` 4.6 s; `tpl/cin7-sweep` 10 s; one `flexport-import` at 113 s. Nothing pathological. |
| Client side | `/api/version` > 10 s: 56 events (34 with the tab hidden); 7 network failures. Slow views: `#/supply/purchase-orders/orderplan` p50 5.7 s, max 21 s; `#/supply/purchase-orders/plan` p50 4 s, max 106 s; `#/demand/plan` p50 4.6 s. Long tasks (main thread >= 1 s): 32, biggest orderplan 21 s and 10 s, demand plan 15 s, scenario 5 s. 1 dead click (AI Insights). |
| Data sanity | 223 SKU/warehouse rows with negative on-hand; 15 in-scope products without a category. |
| Portal | Supplier Confirm now persists on live: 12 POs confirmed since 05-Oct (1 supplier, last 10-Oct). |
| Headers on live | HSTS, nosniff, X-Frame-Options SAMEORIGIN, Referrer-Policy present (Diviyaj's layer). The repo itself sets only nosniff. |

## 2. Prioritised list

P0 = before or with the next deploy. P1 = next two weeks. P2 = backlog.

### P0

| # | Area | Finding | Fix |
|---|---|---|---|
| 1 | Security | **Write-permission gate bypassed by letter case or a trailing slash.** Express matches `/API/supply/po/X` and `/api/save-forecasts/` to the real handlers (verified on sandbox: `/API/Version` and `/api/version/` both 200), but `requiredCap()` (server.mjs ~1389-1432) compares exact lower-case paths and returns null (fail open) for anything it does not recognise. Any logged-in read-only user can write anywhere. | `app.set('case sensitive routing', true)` and `strict routing`; normalise `req.path` (lower-case, strip trailing slash) in the gate; flip the default at ~1428 to fail closed with an explicit allowlist. Same normalisation for the outer gate (~1278) and the portal checks (~1345, ~1391). |
| 2 | Security | **Fail-open DEMAND writes** (same class as the preorders hole fixed in v28.245): `POST /api/demand/stock-cover/target`, `/api/demand/inventory-upload`, `/api/demand/snapshots` and `/snapshots/:id/delete`, `/api/export/email-csv` (emails caller-supplied CSV), and `GET /api/cron/action-metrics` (no secret, writes snapshots). | `p.startsWith('/api/demand/')` => 'demand'; classify email-csv; give action-metrics the x-webhook-secret check and make it POST. |
| 3 | This package (front end) | **Reload or deep link on any `#/accounts/*` page lands on SUPPLY.** Boot regex at `supply/inject.html:19627` has no `accounts`. Also drops the "Gmail connected" banner after the OAuth return (the token itself is saved). | Add `accounts` to that regex. |
| 4 | This package (front end) | **DEMAND cold build and full grid render run on ACCOUNTS pages.** `hzDemandOnScreen()` (`artifact_v16.7.html:1946`) excludes only supply/product/client/config. Measured: DEMAND_BUILT true and 11,634 DOM nodes on `#/accounts/3pl-invoicing`. | Add `accounts` to that regex. |
| 5 | This package (back end) | **Bank-ageing refresh runs a 1 to 2 minute Xero scan inside the POST** (68.6 s and 111.3 s measured) with 20 s per-call timeouts and no cross-instance lock. Sandbox: 28 failed runs vs 4 successes in 2 days (32 x Xero HighVolume 400 earlier, then 7 hourly 20 s timeouts). The sandbox timer was burning the Xero quota live shares. **Learn job** (`/api/accounts/backdate/refresh`) starts a detached promise that dies when the Vercel function returns (not wrapped in `hzWaitUntil`), and a first run (~10 min) exceeds the 300 s cap anyway; the weekly cron POST awaits it, so the cron also times out. | Return 202 and let n8n be the only runner; `pg_try_advisory_lock` (or an etl_runs running row) instead of per-instance flags; Xero reads incremental (If-Modified-Since watermark, last 60 days plus known unreconciled ids), quarter windows, 45 s timeout with one retry on GET; learn job staged by `?stage=` with a 240 s budget; multi-row inserts for the Gmail cache (one INSERT per message today). |
| 6 | Security | **Xero OAuth callback not bound to the starting browser** (server.mjs ~6309-6334): state is an in-memory Map keyed by value, so a callback URL started by one user can be completed by any key holder and the stored tenant swapped. Live uses custom connections (client credentials), so the flow is rarely used, which limits the exposure. | Mirror the Gmail pattern: HMAC state + HttpOnly cookie, permsFor in the callback, tenant id allowlist. |
| 7 | Live ops | `n8n_sync_flexport` stopped 07-Oct; sales sheets flat; preorders cron not built; `PAYMENT_EMAIL_CRON=1` not set so every warm Vercel instance polls `payment_emails` every 30 s (its UPDATE shows as a slow query). | Diviyaj: restart the Flexport workflow, check the sales sheet source, build the preorders cron, set PAYMENT_EMAIL_CRON=1 with its n8n schedule. |

### P1

| # | Area | Finding | Fix |
|---|---|---|---|
| 8 | Front end | **Hourly synchronous DEMAND build on every open tab**, SUPPLY-only tabs included (`artifact_v16.7.html:17603`, `17624`): `afBuildBuyFeed` and `bpPushFeed` call `buildLiveDemand()` when DEMAND_BUILT is false, then POST two feeds. That is the ~3 s freeze v28.143 removed from boot, back once an hour per tab. | Guard both timers with `DEMAND_BUILT && hzDemandOnScreen()`; let the server own the hourly feed snapshot. |
| 9 | Front end | **28 boot fetches on a SUPPLY landing, ~13.9 MB raw (1.1 MB compressed).** Badge counts fetch whole tables (purchase-orders 3.1 MB, order-plan 5.3 MB, shipments 0.9 MB); `prewarmOrderPlan` runs even on a DEMAND landing; the PO grid's two follow-ups (grid-status, internal-shipments) run serially after the grid paints. Measured: grid painted ~3.4 s, complete at 4.3 s. | A `/api/supply/nav-counts` endpoint for the five numbers; badge fetches in `hzLate()`; skip `ensureRoot` fetches on non-SUPPLY landings; run grid-status and internal-shipments in parallel with purchase-orders. |
| 10 | Back end | **Upstash KV read has a 30 s timeout** and timed out 136 times in 7 days. A cold instance waits the full 30 s before falling back to Supabase, which is the likely cause of the `/api/version` > 10 s events. | 3 to 5 s KV timeout; circuit-break KV for 5 min after a timeout. (Likely cause, not proven.) |
| 11 | This package (security) | Gmail connect accepts **any** Google mailbox (no check against `GMAIL_MAILBOX_ACCOUNTS`), and connect, disconnect and both Refresh endpoints need only `accounts_access`, not admin. Seal key derived from the client secret, so rotating the secret bricks the stored token. | Reject a mailbox other than accounts@; require `is_admin` for non-GET under `/api/accounts/`; dedicated `GMAIL_SEAL_KEY`. |
| 12 | Supplier portal | Sample-shipment linking is not ownership-checked across suppliers (`/api/portal/product-sample/:id/assign`, `/sample/:id/dev-samples`, `/sample-create` accept any SR or dev-sample id). Supplier-chosen filename lands unescaped in the staff notification email (`emailDocSubmit`). Direct-to-Storage uploads are served with the uploader's Content-Type. | `portalOwnsSample` / `portalOwnsProductSample` on every id; `escHtml` in the email; force `download=` for Storage rows or set bucket `allowed_mime_types`. |
| 13 | Client portal | Magic link consumed on GET (mail scanners burn it); email enumeration by timing on `/api/cp/request-link`; `tag` visibility matches the whole metadata JSON by substring; 7 day link life. | Port the supplier redeem page and the fixed 1.8 s window; match tags with `tags @> ARRAY[$n]` only; 24 to 48 h links. |
| 14 | Back end perf | PO grid section (`/api/supply/purchase-orders`) is not in the lazy section cache: 3.4 s cold, 0.65 s warm; live p50 2.8 s, p95 26 s. Cold-per-instance builds: dtc/mismatch 5 s, price-list 4 s, open-pos 2.7 s, erp-status 3 s, bi/reallocations p50 6.3 s. | Add purchase-orders (param-free) to `SECTION_CACHE_TTL_MAP`; persist the heaviest to the KV blob or precompute via n8n. |
| 15 | Back end perf | `/api/health` runs 8 builders per hit (3 s, fans 8 queries into a pool of 4); `/api/version` awaits `freshnessCached()` on a cold instance (live p50 10 s). | Answer from cache or `SELECT 1`; counts behind `?deep=1`; version returns at once. |
| 16 | Front end | DEMAND landing renders the full plan grid three times at boot (948 ms, 1.8 s, 3.56 s; ~1.2 s main thread in jsdom, more in Chrome with 16.6k nodes). | Debounce the post-boot render; fold the prepack-cover build into the first build; patch calendar markers instead of re-rendering. |
| 17 | Health log gaps | Cron 401s (wrong secret) are silent; `/api/health` probe cost; keepalive `SELECT 1` logged as slow; portal bootstrap size unmeasured. | Red alert on `cron_run` 401; skip the keepalive in slow-query capture; a `metric` row for bootstrap bytes and build ms. |

### P2

- Headers in the repo: add X-Frame-Options / CSP frame-ancestors, Referrer-Policy (live already has them from Diviyaj's layer, the sandbox and any new host do not).
- `/api/perf/recent` open to any key holder (reconnaissance); `/api/storage/sign-upload` open to read-only users (bucket fill).
- 693 staff-facing 500s echo raw Postgres/Xero/Fulfil messages; portal path is sanitised, staff path is not.
- Non-constant-time compares: `/api/cron/payment-emails` uses `!==`; Gmail state HMAC `===` (cookie binding mitigates).
- Master key accepted in `?key=` (lands in history and logs).
- Serial N+1 in cron paths (Fulfil import-pos per PO, internal shipments per row, po-bulk, fulfil-dates-sync, xero push-queue): batch with unnest and `['number','in',[...]]`.
- 1 MB of DEMAND data inlined in `<head>` on every load (no-store HTML, 246 KB gz); FBA_DIMS 265 KB only needed on FBA screens; `/portal-view.js` (116 KB br) loaded sync on the staff shell for CONFIG previews only.
- ACCOUNTS client: `_acWait` never resets (after 40 polls every later accounts route bounces); `r.json()` without `r.ok` on bank refresh and gmail status; no `.catch` on backdate refresh and gmail disconnect; double-submit on Back-date Refresh; whole-table innerHTML rebuild per keystroke; backdate list uncapped; `AC_BD.poll` keeps polling after leaving the tab; Refresh buttons are spans (not focusable, no disabled).
- `/api/accounts/payables`: 3 serial round trips (988 ms for 6.9 KB; the SQL itself is 25 ms). One statement with a pre-aggregated po_links CTE; partial indexes on `po_links(external_id) WHERE system='xero' AND status='linked'` and `xero_bills(due_date) WHERE amount_due > 0`.
- PRODUCT first click: 15 fetches in two waves; CONFIG click: 3 serial fetches.
- Duplicate boot fetches: `/api/filter-rules` twice, `fba-transfers/list` twice on a DEMAND landing.
- Portal: staff emails sent raw in note payloads; `/label-data` returns retail prices; PO-scoped writes accept any SKU string; last-write-wins on line cost, production status, carrier, pallets; session memo outlives logout up to 60 s across instances; magic-link rate limits are per process; supplier host serves the admin shell and key prompt; Google Fonts on the client page (blocked in China); timestamps assume a UTC DB session.
- Module caches without eviction (`_trendsCache`, `_specSupMemo`, `_upfxLeg`); `express.json` limit 25 MB globally; image proxy fetch without timeout.
- Sandbox only: pool contention from jsdom probes (pool max 8 on the session pooler), 06-Oct 02:00 to 05:00 UTC incident; health-log thaw noise from the laptop sleeping.

## 3. Risk assessment: deploying v28.245 to v28.250

| Version | What | Risk | Notes |
|---|---|---|---|
| 245 | Preorders sync gated as demand; vercel.json matches prod | Low | Closes a fail-open write. |
| 246 | Preorders exclude stock assigned on pick moves | Medium, intended | Buy-changing: sandbox 17 cells moved down (AU 2,503 preorder units to 0). Snapshot before/after taken. Re-run the preorder sync on live after deploy and compare. |
| 247 | ACCOUNTS menu, grant (mig 347), Payables, 3PL invoicing moved | Medium | Gate fails closed (verified: 403 without the grant). **Blocked by P0 #3 and #4**: reload on an ACCOUNTS page bounces to SUPPLY and DEMAND work runs on ACCOUNTS pages. Both are one-word regex fixes. Payables query is 3 serial round trips (fine at 102 open bills). |
| 248 | Gmail connect (mig 348) | Medium | OAuth flow verified clean (HMAC state, cookie binding, no open redirect, scope asserted, token sealed). Gaps: any mailbox accepted, non-admin can connect/disconnect, seal key tied to the client secret (P1 #11). Env vars already on Vercel (Ben). New external service: Diviyaj's OK still needed. |
| 249 | Bank ageing (mig 349), hourly job | **High as is** | In-request 1 to 2 min Xero scan, 20 s timeouts, 28 of 32 sandbox runs failed, no cross-instance lock, shares the Xero quota with bill sync and payments. The Vercel timer is correctly guarded off; the risk is the Refresh button and the n8n cron calling the same path. |
| 250 | Back-date learn job (mig 350), weekly | **High as is** | Detached promise dies on Vercel; first run exceeds 300 s; `running:true` sticks on the frozen instance; Gmail quota pacing can sleep minutes inside a request. |
| Migrations 347 to 350 | Additive, idempotent | Low | Applied on sandbox; no data changes. |

Recommendation: deploy **245 to 248** once P0 #3, #4 and P1 #11 (admin-only writes, mailbox check) are in, and get Diviyaj's OK for Gmail. Hold **249 and 250** until P0 #5 is done (cron-only runner, advisory lock, incremental Xero reads, staged learn job). If they must go together, disable the two Refresh buttons on Vercel and do not schedule the crons yet.

## 4. Measurements kept for reference

Landing payload (sandbox): HTML 1.54 MB raw / 246 KB gz (no-store, includes 1 MB `__HZ_G` and 265 KB `FBA_DIMS`); app0 2.19 MB / 646 KB gz; supply0 2.95 MB / 798 KB gz; portal-view 530 KB / 116 KB br; theme 117 KB / 20 KB br. Total JS 5.71 MB raw / 1.57 MB compressed (immutable after first visit). Boot API on a SUPPLY landing ~13.9 MB raw / ~1.1 MB compressed.

First click from a SUPPLY landing (jsdom, JS and DOM only): DEMAND 539 ms block (grid 30 rows, 16,620 nodes); BUY & MOVE 222 ms; REPORTS 211 ms; PRODUCT none (15 fetches); CLIENT none (3 fetches); ACCOUNTS none (1 fetch, 1.28 s server); CONFIG none (3 serial fetches, 0.95 s).

Sandbox endpoint timings (1 hit, ~300 to 400 ms per DB round trip): version 1 ms; health 3.1 s; payables 988 ms; bank-ageing 631 ms; backdate 637 ms; sku-data 90 ms (497 KB gz); purchase-orders 3.4 s cold / 0.65 s warm (183 KB gz); order-plan 46 ms (139 KB gz); dtc/mismatch 5.0 s cold / 2 ms; price-list 4.0 s / 7 ms; open-pos 2.7 s / 0.3 s; demand-actions 2.7 s / 0.4 s; erp-status 3.0 s / 0.6 s.

Router check: SUPPLY > DEMAND > SUPPLY > ACCOUNTS > CONFIG then Back x3 restored ACCOUNTS, SUPPLY, DEMAND exactly; one history entry per navigation; module roots hide correctly; the 3PL redirect uses `location.replace` (no loop).

Verified clean: login-gate exemption list (every cron fails closed with safeEq); accountsGate covers all methods and fails closed; Gmail OAuth state, cookies, scope, sealing; all dynamic SQL builders whitelisted; no SSRF (only the allow-listed image proxy); no secrets logged; all cookies HttpOnly + SameSite=Lax + Secure on https; portal tokens 24 random bytes hashed at rest, single-use, rate-limited with a fixed response window; portal IDOR checks on PO, shipment, attachment, product and tracking routes; `esc()` on every ACCOUNTS innerHTML concatenation except an unmapped currency code; hz-health.js idempotent, capped, no leak; no timer leaks found.
