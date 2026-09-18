# HANDOVER — PRODUCT module + SETS in the demand plan

**Date:** 2026-09-05 · **Author:** Ben (with Claude) · **Purpose:** clear this thread; a fresh session can pick up from here.
**Repo/branch:** `horizon-demand-and-supply-planner` @ `phase-2.1-suppliers`. **Version at handover: v27.466.**

Two independent workstreams are covered:
- **PART A — PRODUCT module** (product development, samples, components, config, reports). All work THIS thread: v27.428 → v27.466.
- **PART B — SETS in the demand/buy plan.** Largely built + live in an earlier baseline; this thread only touched the new-set forecast fix. Included so the whole picture is in one place.

Plus **PART C — deploy status** (what Diviyaj still needs) and **PART D — open threads**.

---

# PART A — PRODUCT module

## A1. Where it lives (code map)
- **`supply/inject.html`** — the entire PRODUCT UI (injected server-side into the artifact). Product grid, detail tabs, Config, Dashboard, Range plan, Specifications, Samples.
- **`server.mjs`** — all `/api/product/*` endpoints.
- Product detail tabs: **Master data · Size & variants · Samples · Timeline · Documents** (the standalone **Components** tab was REMOVED — folded into Size & variants, see A3).
- Data model tables (planner schema): `product_dev_items`, `product_dev_sizes`, `product_dev_size_dimensions`, `product_dev_samples`, `product_sample_aspect_feedback`, `component_types`, `product_dev_components`, `sample_reject_reasons`, `product_sample_reject_reasons`, `product_specs`, `supplier_notes` (timeline), `portal_attachments` (files).

## A2. Components-per-supplier redesign (the big one) — DONE
The old model had 5 hard-coded aspects (product/packaging/labels/polybag/other). Replaced with a **configurable component catalogue**, and per product a **set of components each with its own supplier + sampling mode**.

- **Catalogue** (`component_types`, mig 261): editable in **PRODUCT ▸ Config ▸ Components** — name · default supplier (or "= product supplier") · sampling mode (sampled / spec-linked) · sort. Seeded 10-item starter set (`seed_component_types`).
- **Per product** (`product_dev_components`, mig 262): the chosen components, each retargetable to a specific supplier. Migrated components link back to their legacy aspect via a `dimension` column (mig 262 ALTER).
- **Faithful migration** (mig 263): every existing product's aspects were backfilled into component rows so no approval/file history was lost.
- **Folded into Size & variants (v27.455):** the component chooser sits at the top of that tab; the per-size grid lines are now driven by the product's chosen components (not the fixed 5). New components default **on for every size**. Spec-linked components (e.g. Polybag) render "no sampling" + a spec link. Add = a dropdown + **Add component** button (the one-click "Set up from catalogue / Add all" was removed per Ben, v27.464).
- **Link a spec (v27.465):** spec-linked components use a **searchable dropdown** of the Specifications table (was a type-the-id prompt).

**Decisions (Ben):** fold Components INTO Size & variants and remove the standalone tab · keep the tab name "Size & variants" · new components default on for all sizes · capture reject reasons in the Samples tab only.

**Still TODO (the genuinely-remaining slice):**
- **Per-component sampling** — samples/approval are still keyed by the legacy aspect; the Sizes grid reads status/files *through* the `dimension` link. Net-new components (e.g. "Belly band") can hold per-size approval/files under a `comp:<id>` key but have **no sample-version cell** until the sample-creation flow lets you pick a component. This is the last real slice — **mock it before building.**
- **Portal edit-gating** — supplier sees all components, edits only their own, others read-only. Needs a **supplier product-portal view** first (still a Phase-2 TODO).

## A3. Samples tab — DONE
- **Statuses:** FUTURE → PRODUCTION → SHIPPED → COMPLETED (+ CANCELLED). COMPLETED = received. Mark-received advances linked products to "Sample in review".
- **Reject reasons + metrics (mig 264):** rejecting a sample aspect now **requires ≥1 reason tag** (save blocked until tagged). Reasons are a **tag input** — a dropdown to add (incl. **✎ Create new reason…** which writes to Config + flows to metrics) + wrapping removable pills. Managed in **PRODUCT ▸ Config ▸ Reject reasons** (seeded Colour issue / Finishing / Packing). Report: **PRODUCT ▸ Reports ▸ Sample rejections** — why samples are rejected, by reason (+ top suppliers/seasons) and split by supplier / season / product type.
- **Approved for photography (mig 265):** per-sample **📸 checkbox + comments**. Surfaced in two **📸 Photography views**: **PRODUCT ▸ Dashboard** (status + which sample + comments) and **PRODUCT ▸ Range plan** (status + comments under each swatch).
- **Expand/collapse (v27.459):** only the most recent sample version is expanded; older ones collapse to a one-line summary (click to expand).
- **Sample card:** printable PDF per version (`GET /api/product/sample/:id/card.pdf`).
- **Wider feedback panel** + carrier/dynamic tracking links.

## A4. Sizes & variants matrix polish (v27.460) — DONE
Recent-sample-only cell (+ "N older" expander) · files stacked vertically · description is a multi-line, half-width textarea · Component column widened so names don't clip.

## A5. Config + grid + timeline — DONE
- **PRODUCT ▸ Config** (own tab, standard L3 pill menu): Season/release · Categories (add/delete + auto-code) · Components · Reject reasons · Timeline tags & badges · Timeline quick phrases. (v27.453 fixed a bug where the Components catalogue always rendered empty.)
- **Grid:** swatch size **S / M / L** toggle (persisted).
- **Timeline:** colour tags/badges + "/" quick-phrase picker + "/p" **Pantone** inline swatch cards (mig 259; TCX + Coated bootstrap seeds) + native spellcheck + newest-first + retag existing.
- **Barcodes ▸ Customise (mig 260):** per-SKU P/C/I overrides, saved projects, EAN-13/Code128.

## A6. Key endpoints touched
`/api/product/item/:ref` + `/sizes` (now return `components` + `photo`), `/component-types`, `/component`, `/reject-reasons` + `/reject-reason`, `/sample/:id/aspect` (reject_reasons capture), `/sample/:id/photography`, `/reports` (reject rollup), `/dashboard` + `/items` (photo array), `/specs`.

---

# PART B — SETS in the demand plan

**State: P0–P3 BUILT and LIVE** (earlier baseline v27.001–009). This thread only added the new-set forecast fix (B3). Full detail in memory `sets-feature-spec`.

## B1. What sets do now
- Sets are **first-class SKUs** in availability + the demand plan (`variant_type='set'`, mig 230 put 190 sets in scope). They forecast like masters, show LY actuals/revenue, a **SET badge**, and **3PL-only** stock (FBA builds from 3PL).
- Sets are **excluded from direct buying** — a set never appears as a buy line.
- **Component explosion (P2, v27.003):** each set's forecast explodes onto its component SKUs via `SET_BOM` (`output_sku, input_sku, input_quantity`, table `planner.set_bom`, mig 229; managed in **CONFIG ▸ BOM ▸ Build on Fly Sets**). Component buy = Σ(set forecast × component qty). Shown as a **"DTC demand (sets)"** row in the buy popup with a source tooltip.
- **Contribution model (P3):** editable matrix in CONFIG (Country × Sub-cat × Channel + a sets-vs-master split); normalises to 100% at compute time. Sets now contribute to forecast (P3b-2 was buy-changing, Ben-approved).
- **Grouping:** MASTER/SET collapsible groups; show/hide/only filter.

## B2. Critical basis finding (audit 2026-09-03) — settled
Set forecasts are **stored in BOXES** (sale-basis), not item-equivalents. The buy explosion is **already correct**; the once-planned "÷setSize the override path" fix is **UNNECESSARY and would under-buy** — do NOT do it. Rule: **STORE sale-basis everywhere, DISPLAY exploded.**

## B3. New-set forecast = 0 — ROOT-CAUSED + FIXED (this thread)
- **Symptom:** new set SKUs (e.g. `TEATWL-MD-3SET-MTCHCRSH`) read no forecast when smoothing.
- **Root cause:** they had explicit saved `forecast_outputs = 0` rows (`source='review_ui'`). In `skuMonthlyMap`, a saved value (even 0) beats the auto-forecast, so subcat×share never applied. NOT a sets-logic bug.
- **Fix (v27.437, ⚠ buy-affecting):** `buildSkuChanges` no longer writes a phantom `null→0` for a dirty-but-uncomputed SKU×month. Plus a one-off cleanup SQL (`fix_phantom_zero_forecasts`) clears the ~1,966 existing phantom zeros (~25 new sets). **This is in the v27.432-450 Diviyaj package** — after it runs live, those sets auto-forecast and their components enter the buy. (See memory `new-set-forecast-dilution`.)

## B4. Sets — remaining
- **P4 (data, Diviyaj/n8n):** stop splitting sets/bundles into component units in **LY actuals** — the last source of set-forecasting difficulty. Never blocks P1–P3.
- Any planning-layer polish is additive above a correct buy; **always snapshot buy-plan before/after** (memory `buy-plan-before-after`).
- Related: **prepack map** (`PP-` prepack→SET, mig 233) — prepack on-hand offsets mapped SET demand.

---

# PART C — Deploy status (for Diviyaj)

**Two packages are prepared; nothing in these was deployed to prod by Claude.**

1. **`deploy notes/DEPLOY_2026-09-04_v27.432-450.md`** — migs **259, 260, 261, 262**(base) + data fixes **fix_planner_created_by**, **fix_phantom_zero_forecasts** (⚠ buy-affecting) + optional pantone/phrase seeds. Baseline was live v27.431.
2. **`deploy notes/DEPLOY_2026-09-04_v27.451-466.md`** — migs **262 re-run (adds `dimension`), 263, 264, 265** + optional **seed_component_types**. Files: `server.mjs`, `supply/inject.html`, `artifact_v16.7.html`. **Buy-plan: unaffected.** **Includes the CRITICAL v27.466 fix below.**

### ⚠ CRITICAL — FBA-transfer refusal latch (v27.466)
A read-only user (email without `supply_edit`) on the FBA view could spin an **infinite refresh loop**: a 403 was parsed as JSON and treated as success → `render()` → `_fbaTrfMaybeRefresh()` re-fired forever (last_run never stamped). Fixed in `artifact_v16.7.html` (FBA block): a refusal now **latches `_fbaTrfBlocked`**, never runs the success path, `maybeRefresh` no-ops while latched, manual ⟳ clears it, box shows "⚠ not updating". **Note:** this was re-created in the repo from Ben's scratchpad description — worth a quick diff against his backup before deploy. **Prioritise this deploy.**

---

# PART D — Open threads / decisions pending

- **Suggestions (live, CONFIG ▸ Suggestions):** open = SUG-0037 (branch-transfer requests), SUG-0036 (portal shipping tab → combined packing list — mock first, big), SUG-0033 (split SO invoices by supplier). Deferred: SUG-0029 (DTC-mismatch → order link — **do on the Fulfil move**), SUG-0025 + SUG-0007 (infra, Diviyaj). Standing rule: when a suggestion is confirmed done, mark it `complete` directly in the live DB via Supabase MCP (silent; the app endpoint emails submitters). `closed` = dismissed (used for SUG-0030). Note: `closed` has no pill in the CONFIG triage UI yet.
- **Per-component sampling** (A2) — the last components slice; mock before building.
- **Supplier product-portal view** — prerequisite for portal edit-gating.

## Standing working rules (carry forward)
- Every change → version bump (package.json) + CHANGES.md + restart sandbox + commit/push as `dockandbay`. **Never push/deploy to prod without Ben** (Diviyaj owns prod).
- Dates dd-Mmm-yy. No em/en dashes. Mockups-first for non-trivial UI.
- Live reads via Supabase MCP (project `oolwklahstnvocaugryg`, read-only for data — but suggestion status writes are explicitly authorised). Local `.env` is the SANDBOX.
- Buy-affecting change → snapshot BP.buyplanItems before/after.
