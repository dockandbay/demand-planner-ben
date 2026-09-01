# DEPLOY 2026-09-01 — Filter Rules + discontinued run-off + refresh rework (for Diviyaj)

**From Ben.** Covers **code v27.327 → v27.359** and **migrations 249 + 250**. Reviewed pre-handoff
(two-pass debugging review + live migration-safety check). **No blockers.** One buy-plan behaviour
change to expect (see ⚠ below). No new env vars, no new npm dependencies.

Baseline: the last note (`DEPLOY_2026-08-31_scope-and-sync.md`) covered up to ~v27.326 / mig 248.

---

## Migrations to apply to LIVE

Both are **additive and order-independent**. Verified against live on 2026-09-01 (read-only): neither
object exists on live yet, and `v_product_availability` has **0 dependent views**.

### `migrations/249_filter_rules.sql`
- `CREATE TABLE IF NOT EXISTS planner.filter_rules` (jsonb-first: `id, name, enabled, definition, timestamps`).
- Backs the demand-plan **Filter Rules** engine. The server reads it via `buildFilterRules()`, which
  returns `[]` if the table is missing — so **the app is safe on live even before this is applied** (the
  feature just shows no saved filters until then).

### `migrations/250_avail_no_disc.sql`  ⚠ buy-plan behaviour change — read below
- `CREATE OR REPLACE VIEW planner.v_product_availability` — **appends one column `available_no_disc`**
  (the channel availability flag, ignoring the discontinue date). The existing `is_available` column is
  left **byte-identical and in the same position**. I compared the live view definition to this migration:
  the `is_available` clause matches exactly, so nothing else that reads the view changes.
- Server (`server.mjs`) switches the **demand-plan `av` string** (`buildSKURAW`) and the **subcategory-row
  query** (`buildDATA`) from `is_available` → `available_no_disc`.

---

## ⚠ Expected buy-plan delta (this is intended, NOT byte-identical)

Mig 250 + the server switch make **discontinued SKUs that still have stock** stay in the demand + buy plan
so their run-off is forecast down as stock sells off (they're hidden under "Active only", shown under
"All"; buy = 0 because their forecast is capped to remaining stock). Because run-off SKUs now carry part
of their sub-category forecast, **active SKUs stop being over-bought to cover demand the run-off stock will
satisfy**. In the sandbox this **reduced active buys ~9% (−3,326 units)**; the ~1,308 exposed run-off
SKU×markets add **0 buy** each (verified via BP snapshot). So after deploy, expect buy quantities to shift
**down** in sub-categories that contain discontinued-with-stock SKUs. This is Ben's intended behaviour.

---

## Still pending from the prior note (independent of the above)

`migrations/248_planning_scope_status_gate.sql` is **not yet on live** — 35 CLOSED SKUs remain in scope
(923 total; exactly the drop the 2026-08-31 note predicted). Mig 250 does **not** depend on 248, but 248
should still be run (its own note has the detail + the n8n step 2).

---

## Code changes (v27.327 → v27.359)

- **Refresh rework (v27.327–329):** removed the per-view "↻ Refresh" buttons (`#act-refresh`, `#sp-refresh`,
  `#supply-refresh-cache`) in favour of one **context-sensitive top-nav ↻** (`hzRefreshCache`) that busts the
  right cache in place. New **ungated** endpoint `POST /api/demand/cache/invalidate` (rebuild-only, no DB
  write → no webhook secret, like its supply sibling; whitelisted in `requiredCap`).
- **Auto-smooth (v27.330–332):** before→after review popup before committing; fills 0-sum cells; excludes
  inactive/run-off categories from the sweep.
- **Filter Rules Engine (v27.333–350, mig 249):** saveable demand-plan SKU filters (attribute + exception +
  trend + inventory conditions, bespoke numeric thresholds). Display/row-filter only — **no effect on the
  buy engine** (gated behind `FR_ACTIVE`; byte-identical when off).
- **EDI labels FIX (v27.348):** quote-aware (RFC4180) CSV parse — fixes false "SSCC not in CSV" on ASNs
  whose address/routing columns contain commas.
- **Exceptions FIXES (v27.351–353):** report now uses the derived (cascade) forecast not just overrides;
  no longer blank at a month boundary; readable deep-link slugs (`/forecast-less-actual`,
  `/forecast-greater-run-rate`); SKU double-click copy matches the PO-grid UX.
- **Smoothing settings → country×channel matrix (v27.354–355).**
- **Exceptions ▸ Data & config → link to CONFIG ▸ BOM upload (v27.356).**
- **Demand plan (v27.357, 359):** SKU search shows only matching SKUs (hides category header, sub-category
  row and the subtotal summary unless the query matches the category/sub-category name); FY24/25 actuals
  columns rendered light-green; inbound hover shows the goods reference, not the SKU.
- **Discontinued run-off SKUs (v27.358):** see mig 250 above.

## Data already applied to LIVE this session (FYI — reconcile only, Ben-authorised)
- `planner.set_bom` BOM/bundle + prepack recipes loaded (live now has 1,763 rows). No action needed.

## Known latent item (not a deploy blocker)
- `excComputeMaps` uses a hardcoded last-year window `lym=['2025_01'…'2025_12']` (must match the plan's LY
  window). Correct through 2026; **should be made year-dynamic before Jan-2027** or the filter/exception
  metric maps will drift to a two-years-ago window. Tracked for a follow-up — not in this deploy.
