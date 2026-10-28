# Deploy package v28.553 (28-Oct-26)

**STATUS 28-Oct-26: MERGED 06:19Z (6e56e74c, squash) by Claude at Ben's request ("merge 33"); deploy run 40643185142 success; LIVE v28.553 (read back /api/version).** Was: PR https://github.com/dockandbayteam/dock-bay-demand-planner/pull/33.

## What changed
- v28.553 ILG daily stock report into Manage 3PL > UK (3 owner tabs, Fulfil compare at report time) and a ticked rebaseline written to Fulfil by the n8n stocktake flow.

## Migrations / routes / env / cron
- Migration 399_ilg_stock_rebaseline: applied on live by Claude at Ben's request ("run 399") and read back (28-Oct-26).
- New cron routes (secret-gated, handlers fail closed): POST /api/cron/ilg-stock-import, POST /api/cron/ilg-rebaseline/claim, POST /api/cron/ilg-rebaseline/result.
- Other new routes: GET /api/supply/ilg/status, POST /api/supply/ilg/import, /api/supply/ilg/upload, /api/supply/ilg/rebaseline, /api/supply/ilg/rebaseline/:id/cancel.
- Env: optional N8N_ILG_STOCKTAKE_WEBHOOK (https://n8n.dockandbay.com/webhook/ilg-stocktake).
- n8n: "Ops | ILG stock report import (hourly)" Y6CVOdJlZQBpAyfi and "Fulfil | ILG stocktake [SANDBOX]" DxTKSZ3PCq0zocH2, both INACTIVE until Ben confirms.

## Port note
server.mjs login-gate conflict: kept the hardened secret-gated list, added the three ILG cron paths inside its bracket.

## Checks
scripts/checks/run-all.cjs (login-gate 23 cron paths), npm test, tests/prebuild-race.cjs: all pass.
