# Deploy 09-Nov-26: v28.746

LIVE = v28.746. PR #114 (ben-sync/165ba0e8) squash-merged as f0d8d4f3; CI run 42593196926 (pre-deploy checks, regression tests, deploy to production all passed). /api/version read back v28.746.

## What changed
- v28.746 DEMAND > WSSI release 2 (Kathryn round 2, points 7 to 12): Act/Fcst and Planned £ / units / ASP overtypes (the last two typed win), current selling and full price overtypes, Proposed in £ cost, planned write-offs, who / when on every input, month-end snapshot includes overtypes.

## Migrations
- 425 WSSI overtypes: applied on live by Ben 09-Nov-26, read back.

## New cron routes
- None.

## Env vars
- None.
