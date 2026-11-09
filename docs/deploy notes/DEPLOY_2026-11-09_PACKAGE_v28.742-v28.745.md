# Deploy 09-Nov-26: v28.742 to v28.745

LIVE = v28.745. PR #113 (ben-sync/54ff277f) squash-merged as d5db41bc; CI run 42589661120 (pre-deploy checks, regression tests, deploy to production all passed). /api/version read back v28.745.

## What changed
- v28.742 App health: sales freshness needs real volume; false alarms removed; one shared Fulfil call gate (optional env FULFIL_MAX_CONC, default 4); Xero calls counted by caller.
- v28.743 Sample bills: Direct to Client PO freight / duty go to DIRECT-FREIGHT / DIRECT-DUTY on the market's cost of sales (US 312.2g, UK 312.1f, EU 312.4h); no landed cost.
- v28.744 BUY & MOVE > Inventory > Adjustments (SUG-0047): large Fulfil adjustments per location with reasons and tags, Amazon timing reversals, reasons on ILG / Geneva rebaselines.
- v28.745 DEMAND > WSSI release 1 (Kathryn round 2): template rows, target forward cover (default 12), Cut off Stock Target, shortfall rows, shared saved views, keep place, worksheet undo fix.

## Migrations
- 423 stock adjustments: applied on live by Ben 09-Nov-26, read back.
- 424 WSSI cover / cut-off / views: applied on live by Ben 09-Nov-26, read back.

## New cron routes
- POST /api/cron/stock-adjustments/sync (hourly via n8n, x-webhook-secret). Added to the prod auth-gate secret bracket in the port; live returns 401 without the secret. The n8n schedule is still to be created.

## Env vars
- Optional FULFIL_MAX_CONC (default 4). Nothing required.
