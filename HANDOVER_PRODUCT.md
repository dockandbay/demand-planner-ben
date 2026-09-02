# Handover — PRODUCT section redesign

**For:** a fresh thread picking up the top-level **PRODUCT** section of HORIZON (Dock & Bay demand/supply planner).
**Owner:** Ben. **Date:** 2026-09-03. **Current app version:** v27.388 (branch `phase-2.1-suppliers`).

## The task (Ben's steer)
Elevate the **design, layout and UX of the PRODUCT section, including the grid**. Ben has changing + new
requirements coming, but he's clear: **LAYOUT FIRST** (most critical now), THEN layer the new requirements onto the
approved structure. Do **not** ask for the new requirements yet — nail the layout first.

**Approach (agreed):**
1. Audit the current PRODUCT section + grid (what's there, tabs, columns, pain points).
2. Present **ASCII mockups** of the new layout (grid + section shell) for Ben's approval **before building** — offer a
   couple of directions if the design space is open. (This is a firm rule for non-trivial UI here — mockups first.)
3. Ben reacts / redlines → lock the layout → build it.
4. Only then add the changing + new requirements.

## Where the code lives
PRODUCT is rendered in **`supply/inject.html`** (the "supply module" JS, injected server-side — NOT `artifact_v16.7.html`).
Key functions (approx. line numbers, will drift):
- `selectProductSub(k)` (~12479) — top-level PRODUCT sub-tab switcher; hash `#/product/<sub>`.
- `renderProductPlan` (~12953) — the **PLAN grid** (list of product developments) = the main grid to redesign.
- `renderProductDashboard` (~12722), `renderProductRange` (~12689), `renderProductReports` (~12933), `renderProductSpecs` (~12490).
- `renderProductDetail(ref)` (~13096) — the per-item detail (expands under a grid row), with tabs:
  **Master data · Size & variants · Samples · Timeline · Documents** (tab list ~13120).
- Grid/detail styles: the shared `#supply-root` CSS block near the top of `supply/inject.html` (`.cli-*`, `.tw`, table styles ~260–450, mobile overrides ~540–690).

Data comes from server endpoints under `/api/supply/product*` / `/api/product*` (grep `server.mjs` for `product`),
and `planner.products` (the PIM mirror, n8n-fed from Airtable) + product-dev tables (mig 128).

## Current state / background (read these memories)
- `product-module` — top-level Product dev management (mig 128, v26.013); Phase 1 done; portal tab = Phase 2 TODO.
- `product-specifications-feature` — PRODUCT ▸ Specifications spec-doc source-of-truth (SUG-0019; migs 188–195); admin + browse/matrix/superseding + portal approval DONE.
- `samples-feature`, `sample-shipments-model`, `product-samples-tab-todo` — the Samples sub-tab (SR-nnnn), sample shipments.
- `product-docs-portal-review-todo` — polish PRODUCT ▸ Documents + supplier-portal review.
- `mockups-first-ui`, `mockup-output-location` — mockups for non-trivial UI; save PNGs in `mockups/` (gitignored), SVG→PNG via `qlmanage`.

## Working rules (this repo)
- **Single-file inline-JS**; match surrounding style. `supply/inject.html` is the supply module; the demand app is `artifact_v16.7.html`.
- **Version bump every change**: `package.json` "version" → drives `APP_VERSION`; add a `CHANGES.md` entry.
- **Restart the sandbox server** after edits: `pkill -9 -f "node server.mjs"; nohup node server.mjs > server.log 2>&1 &` (port 8124).
- **Verify the browser RENDERS** (jsdom harness against `localhost:8124`), not just endpoints — the supply module must parse (check `window.openBuyplanModalMulti` is a function + 0 jsdomErrors).
- **Commit + push** every change to GitHub as the `dockandbay` gh account (`gh auth switch --user dockandbay`); branch `phase-2.1-suppliers`.
- **Sandbox = local `.env` DATABASE_URL** (your own Supabase copy). **Never** write to live prod DB — Diviyaj owns prod writes; author migrations as `.sql` in `migrations/` and hand off.
- **Dates dd-mmm-yy** (e.g. 03-Sep-26), never raw ISO. **No em/en-dashes** in writing (org rule). **Left-align** new supply-grid columns.
- Provide **desktop + mobile review URLs** each time a change is ready; mobile via a `cloudflared` quick-tunnel to :8124.
- Deploy handoff: live is **v27.388** (Diviyaj deploys prod). Package changes as a deploy note when a batch is ready.

## Not in scope for the PRODUCT thread
This thread (the one handing over) is continuing separately on the **SETS forecasting logic** — don't touch sets/smoothing/buy-plan here.
