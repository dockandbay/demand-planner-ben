# Deploy TL;DR — v26.657 → v26.729 (2026-08-07)

Full detail: `DEPLOY_2026-08-07_v26.729.md`. This is the quick version.

- **Pull** `phase-2.1-suppliers` @ **v26.729**, redeploy.
- **Migrations:** run **198, 199, 200** (additive — the only ones since live/mig 197).
- **No new npm deps. No new env vars. No new boot-read files. No buy-engine change.**
- **Cache-clear endpoint** is now `POST /api/supply/cache/invalidate` (old `/actions/invalidate` still aliased — no action needed).

**What's in it, in one line each:**
- Multi-currency, Summary/Set-targets rework (mig 198), DEMAND cell rail + do-not-smooth + notes, record-of-change "R" (mig 199), invoice/DTC packing list (mig 200), portal archive, read-only uploads — *(these were the earlier v26.658→720 batch)*.
- **New since: server read-caches** — page-data, Actions, PO-rows/lookups/exceptions, and five more SUPPLY sections (cashflow/bi/manufacturing/payments-report/shipments) are now cached (10-min TTL, drop on edit). All verified byte-identical to before.
- **DB pool keepalive + supplier-portal bootstrap cache** — fixes the sandbox "slow to load" (an ~8s cold-connect stall after idle) and portal 8.4s→0.7s.

**Two caveats worth 30 seconds:**
1. **Vercel:** the in-process caches + keepalive help a warm/long-lived instance; a cold lambda still cold-connects and rebuilds. If the rehost runs as a persistent Node host, they fully apply. (Redis/Vercel KV would be the cross-instance answer later — not needed now.)
2. **Staleness:** changes made *outside* the app (n8n/ERP sync) surface after the ≤10-min cache TTL; in-app edits invalidate immediately.
