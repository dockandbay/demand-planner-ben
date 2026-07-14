# Advisory for Diviyaj — Horizon silent auto-update (2026-07-14)

## The problem
After we deploy, some users stay on an **old version** of Horizon until they manually hard-refresh.

## Root cause
Two parts:
1. **Open-tab / SPA:** Horizon is a single-page app. A tab left open for hours/days keeps running the version
   it *booted* with — it never reloads on its own, so it never picks up a new deploy. This is the main cause
   for our always-open internal dashboards.
2. **Possible edge/browser caching of the HTML shell** — needs confirming on the live domain (see "What we
   need from you").

## What we want to achieve
Users always end up on the latest Horizon **without manual action**, and **without interrupting** work in
progress — i.e. silent when possible, a gentle nudge otherwise.

## Update: this also covers stale DATA, not just stale code (v25.530)
The bigger issue than stale code: the demand/buy-plan data is **baked into the page at load and frozen** for
an open tab (it's read from in-memory globals as the user navigates the SPA). So after an ETL sync (new sales
/ inventory / on-order), an open tab shows **old numbers all day** until reloaded. We now detect this too:
`/api/version` returns `{version, data}` where `data` is the latest change across the **ETL-fed source tables**
(sales_actuals, products, inbound_shipments, flexport_shipments). The client reloads (silent/nudge) when
`data` advances. We deliberately EXCLUDE user-edited tables (forecasts, POs, deposits) from that signal so a
user's own edits never force a reload. **Nothing extra needed from you for this** — same caching asks below.
(If you'd like live cross-user sync of POs/deposits without a reload, that's a separate mechanism — tell us.)

## What we've built (app code — already in this package)
- **`GET /api/version`** — tiny endpoint returning the running `APP_VERSION`, sent `Cache-Control: no-store`.
- **Client version-poll** (in the SUPPLY harness, so it runs across the whole main app): polls `/api/version`
  every 5 minutes, on tab focus, and ~15s after load. When the server reports a version different from the one
  the tab booted with:
  - if the tab is **backgrounded** → it reloads **silently** (no interruption; the user returns to the new
    version), and
  - if the tab is in the **foreground** → it shows a small, dismissible **"A new version of HORIZON is ready —
    Refresh"** nudge (user clicks to reload).
- The main app HTML (`/`) is already served **`Cache-Control: no-store`** (server.mjs), so a reload always
  fetches the latest — provided nothing caches it upstream (that's the ask below).

## What we need from you (hosting / Vercel)
1. **Confirm the HTML shell is not edge-cached.** Verify our `Cache-Control: no-store` on the `/` (→ `/api/index`)
   function response is honoured end-to-end on the **live domain (horizon.dockandbay.com)** and that Vercel /
   any CDN in front isn't adding `s-maxage` / caching the HTML. (Serverless responses aren't edge-cached by
   default, but please confirm on the live project incl. the custom domain.)
2. **Confirm `/api/version` is never cached** (we send `no-store`; make sure nothing overrides it).
3. **`portal-view.js`** (served by the function) should be **no-cache / must-revalidate** (or versioned) on live
   so supplier-portal users don't run a stale copy. Please confirm the live response headers.
4. **No Service Worker / PWA cache** and **no page-rule/CDN caching of HTML** on the live domain. Please confirm.
5. **Every deploy carries a bumped `APP_VERSION`.** We already bump it on every change — the client relies on it
   to detect a new deploy. Nothing needed unless the build ever strips/overrides `APP_VERSION`.

## Verify after wiring
- Open the app, deploy a version bump, then either switch away & back (should reload **silently**) or stay on
  the tab (~5 min, or on focus → the **Refresh nudge** appears). The version chip should show the new version.

## Trade-off / options (your call)
- The background reload could drop **unsaved in-progress edits** in that tab. Most Horizon edits auto-save, and
  the silent reload only fires when the tab is **already backgrounded** (user not actively typing). If you'd
  prefer a stricter **"never auto-reload, always nudge"** mode, say so and we'll flip one line.
- If you'd rather drive this off a server signal (build id / ETag) than `APP_VERSION`, we can switch the client.
- The poll currently runs on the **main app**; we can extend it to the **supplier portal** (portal.html) too if
  you want.
