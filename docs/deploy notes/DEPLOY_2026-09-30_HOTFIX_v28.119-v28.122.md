# 🔥 Diviyaj HOTFIX package — v28.119 → v28.122 (30-Sep-2026)

Prod is on **v28.118**. Pull `phase-2.1-suppliers` @ **v28.122**. **No new migrations, no new env vars.**
The headline is **v28.122 — it fixes the live "menus flash / won't load / super slow" outage** and should go out first.

---

## ⚠ 0. DEPLOY FIRST — v28.122 fixes the live menu reload-loop (client-only)

**Symptom:** clicking any menu item reloads the whole app; navigation flashes, is super slow, or never settles.

**Root cause:** the auto-update poll (`supply/inject.html` ~line 18210) sets `pendingCode` whenever
`/api/version !== BOOT` (the version the tab loaded), and **every menu click is a `hashchange` that then calls
`safeReload()`** — a full page reload — with no throttle. So any *persistent* version mismatch = a full reload on
**every navigation**. This can only happen on prod, which is why the sandbox looked clean (single instance, versions
always match). Two prod-only triggers:
- **(a)** Vercel serving **more than one version** behind the domain (rollout not fully promoted / a second aliased
  deployment), so the shell and the `/api/version` poll hit different deploys.
- **(b)** The shell's `__APP_VERSION__` placeholder **not being stamped** at serve time, so `BOOT` stays the literal
  string `'__APP_VERSION__'` and never matches — every click reloads forever.

**The fix (two client guards, no server/DB change):**
1. Ignore a version mismatch when `BOOT` still contains `"APP_VERSION"` (un-stamped placeholder) — prevents (b) looping.
2. Throttle auto-reload to **≤ 1 per 2 minutes** via `sessionStorage.hzVerReloadAt`: if we already reloaded that
   recently and the version *still* mismatches, the deploy is flapping — stay on the stable (maybe slightly stale) app
   instead of reloading on every click. A genuine single new deploy still applies in one reload.

**Please also confirm the root cause on prod** (30-second check), so it doesn't recur:
```
# the served bundle must show a REAL version, not the placeholder:
curl -s https://horizon.dockandbay.com/ | grep -oE '/static/supply0\.[a-f0-9]+\.js'
curl -s https://horizon.dockandbay.com/static/supply0.<hash>.js | grep -oE "var BOOT='[^']*'"
#   → expect  var BOOT='v28.122'   (NOT '__APP_VERSION__')
curl -s https://horizon.dockandbay.com/api/version    # → version must equal that BOOT
```
On the sandbox this correctly reads `var BOOT='v28.122'` and `/api/version` matches. If prod shows the placeholder or a
different version, that is the trigger — check the `__APP_VERSION__` substitution in the serve path and that only one
deployment is aliased to `horizon.dockandbay.com`.

---

## The rest of the batch

**v28.121 — fixes the two v28.120 regressions you flagged** (thank you):
- **S2 auth:** v28.120 returned `req._authEmail` under `PLANNER_KEY`, assuming the prod harness sets it — it doesn't,
  so every signed-in user got "session expired" (your first report; you reverted it on prod). Upstream now matches
  your prod shape: **under GATE, identity comes only from `cookieUser(req)`** (the verified signed `pu` cookie). It
  merges cleanly against your prod version now. It is never exercised in the ungated sandbox — which is exactly why it
  escaped local testing; noted for next time.
- **xeroFetch backoff:** now retries **503 on GET only**. A 503 on a POST/PUT (bill/payment/credit note) may already
  have been processed, so retrying could duplicate. 429 is still retried on any method.

**v28.120 — mirrors your prod hotfixes** (these are the ones you already applied live; upstream now carries them):
- `_resolveAllPoLinks(opts = {})` — the undeclared-`opts` 500.
- Xero bill sync: 429 backoff + persist the high-water `updated_utc` on error so a mid-pull resumes instead of
  restarting at page 1.
- Flexport import: default page size **100 → 25**; cron takes optional `?per=` / `?max_pages=` (default 25×4).

**v28.119 — new feature (no migration, no config):** on the Samples tab, a DHL/FedEx tracking number now shows our
**live status pill that opens the tracking-details modal** (same one used on POs/shipments), not just a link to the
carrier's site. Covers FedEx and bare 10-digit DHL air-waybills (no carrier set); the tracking poll
(`collectTrackingNumbers`) picks those up too. Sample numbers with a carrier set were already polled.

## Assumptions this package makes of prod (per your ask)
- **v28.121 S2** assumes prod provides `cookieUser(req)` returning the signed-in email from the verified `pu` cookie
  (your harness). If that function isn't present under the name `cookieUser`, this line needs adjusting to your
  helper — flag it and I'll rename upstream.
- Everything else is self-contained (no prod-only dependency).

## Not tested locally (can't be, and why)
- **S2 / auth** and **the v28.122 version-loop** only manifest under `PLANNER_KEY` (prod) or with multi-instance
  version skew. The ungated single-instance sandbox can't reproduce either. I verified the v28.122 guards are present
  and correct in the served bundle, and that the sandbox stamps `BOOT` properly — but the failing prod conditions
  themselves aren't reproducible here. For anything auth- or deploy-topology-dependent, I'll keep calling this out
  explicitly rather than implying it was exercised.
