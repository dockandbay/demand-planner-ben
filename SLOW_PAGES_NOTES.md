# Slow pages pass (02-Nov-26, health report 26-Oct to 02-Nov)

Worktree branch, based on review-fixes-2026-10-05 at v28.616. Performance only: no business numbers change.
Local numbers are against the SANDBOX DB (every query pays ~300-500 ms of network), so compare before/after
pairs, not absolute values against live.

## 1. #/supply/purchase-orders/plan (first load)

Live evidence (planner.app_health_events, slow_view meta): every slow PO plan load was a FIRST load
(meta.first=true). The 3 slowest calls were /purchase-orders, /fulfil/grid-status and /deposits at 1-3.3 s each,
all starting at dom_ready, with /api/supply/actions (2-5 s) starting in the same millisecond. 31-35 requests in
the load window against a 4-connection DB pool.

Cause: hzLate() (v28.081, "badge fetches 3.2 s after page start") measured age from NAVIGATION start. On live the
HTML + supply0.js take 1.5-6.5 s, so by the time the grid asked for its data the 3.2 s had already passed and
every "late" badge fetch (actions, reallocations, DTC, Xero exceptions, op exceptions, samples, nav counts) fired
in the same burst. Five more top-bar badges (ERP compare, bell, product unread, client unread, To do count) were
never deferred at all.

Fix (supply/inject.html):
- hzLate now counts from when the SUPPLY script starts, and also waits (up to 7 s after start) while the first
  view still shows a "Loading..." panel. After 8 s it runs at once, as before.
- First load of the ERP-compare badge, timeline bell, product unread, client unread and To do count go through
  hzLate. Their polls and the "open the drawer" loads are unchanged.

Measured (local, same HTML-rebuild condition, PO plan cold load):
- before: grid rendered 3.05 s after DOM ready, 29 API calls in flight before render, grid-status 2.5 s
- after: grid rendered 1.9-2.1 s after DOM ready, 15 API calls before render, grid-status 1.4-1.8 s
- badges still fill (bell count shown, actions/realloc start ~4 s after the grid data).

Left: the DEMAND shell's own boot reads (preorders-ka, trading-calendar, filter-rules, fba-transfers/list,
buy-extra-stock) still load with the grid; they feed the artefact's model and moving them needs a wider review.
lib/ai-logic/reports.md hash refreshed (the checker's source hashes moved; no logic change).

## 1b. PO drawer tabs (:id/order-plan, :id/master-data, :id/dates) and orderplan "Accept all" freezes

Live evidence (long_task meta.actions): the biggest "freezes" were native dialogs, not work:
- :id/dates 19.3 s and 7.4 s = click #erp-cin7 "Update Fulfil Date" -> confirm('... writes to the LIVE Fulfil ERP')
- orderplan 28.5 s, 3.9 s, 3.4 s = "Accept all (N)" -> confirm('Accept all exceptions on PO?')
- :id/master-data 6.6 s = "Delete this PO" -> confirm(); :id/order-plan 5.3 s / 3.4 s = "Update / Create Fulfil PO" (confirm)
A confirm() blocks the main thread while the person reads it, and the longtask observer counted that.

Fix (supply/hz-health.js, measurement only): confirm / alert / prompt are wrapped to note when a dialog was open,
and that time is taken off each long task before it is recorded; a task under 1 s after that is dropped.
App behaviour is unchanged (the wrapper calls the native dialog and returns its answer).

Verified: shell loads, window.confirm / alert are wrapped, orderplan renders, no console errors.
Left (real but smaller, mostly on v28.52x-v28.54x builds): tr.fpl-row expand 3-5 s, "Approve all partials (16)" 5 s,
"Use Fulfil qty" 3.3 s. Re-check next week's report with dialog time removed before working on these.

## 2. #/supply/purchase-orders/orderplan (freezes up to 28 s, slow view 13 s)

- The 28.5 s, 3.9 s and 3.4 s freezes were the "Accept all (N)" confirm() dialog (see 1b, now excluded).
- Measured locally (Production, PROD# All, 20 PO columns): "Ordered" 0.55 s, "All SKUs" 1.5 s (2,994 SKU rows x
  20 POs = ~60,000 qty <input> cells, ~16 MB of HTML; ~1 s of it is layout of the inputs). "Show all 98" POs
  multiplies that, which is the likely source of the 9 s "Ordered" freeze on live.
Left (deliberately): the real fix is to stop rendering 60k <input>s (plain cells that become an input on focus,
or row virtualisation). That changes how typing / Tab between cells works on the main ordering screen, so it
needs Ben's sign-off and a mockup first; not done in a perf-only pass. Cheap partial win noted for later: the
per-cell inline style (min-width/width/text-align, ~3 MB on All SKUs) can become one CSS class.

## 3. #/demand/plan, #/demand/inputs/calendar

- Slow views were all FIRST loads: dom_ready 1.4-7.5 s (HTML + app0/supply0 scripts) + demand_build_ms 2.1-5.9 s
  (worker build + main-thread apply). The DEMAND build is already worker-based (v28.4xx); no contained fix found
  in this pass. The PO plan deferral (1) also removes ~10 badge calls from these first loads.
- calendar 9.6 s = one click on #cal-imp (Import), a rare file import, not a page load. Left.
- demand/plan 6.4 s long task = "click button.pill (FBA)" on v28.520 (old build), not seen since. Left.
Note: Chrome in this environment kept the test tab in a hidden state, so rAF / timer-driven DEMAND rendering could
not be timed fairly here; re-measure on a visible tab before working on the build itself.

## 4/5. #/buy-move/fba, #/buy-move/buy, #/product/products, PO-57UKXR2/shipments (hidden-tab artefacts)

Live meta: #/product/products 981,572 ms (first:false, timeout:true), #/buy-move/fba 101,767 ms (timeout:true) and
#/supply/purchase-orders/PO-57UKXR2/shipments 60,136 ms (timeout:true) were "still loading after 60 s" reports whose
timer ran while the tab was hidden (timers freeze, so the next tick came minutes later). Noise, not slowness.
The remaining product/products (3.5-7 s) and buy-move/buy (10-14 s) slow views are first loads: HTML + the two
static scripts take 3-6 s (dom_ready) and the DEMAND build 4-8 s on zera's machine; same as section 3.

Fix (supply/hz-health.js, measurement only): a slow-view timing is dropped when the tab was hidden at the start or
at any point during the load (counter on visibilitychange). Visible loads are timed exactly as before.
