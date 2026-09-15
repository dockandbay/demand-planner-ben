# Handover: PRODUCT section redesign (layout + STAGE model)

**For:** the thread building the top-level **PRODUCT** section of HORIZON.
**Owner:** Ben. **Written:** 03-Sep-26. **App version at handover:** v27.395 (branch `phase-2.1-suppliers`).
Supersedes the earlier PRODUCT handover. The design below is **approved by Ben** (layout + all four features + the STAGE state machine). Build it in order.

---

## 0. READ FIRST: state of play + version collision

Slice 1 (colour fields + STAGE state machine) is **built but UNCOMMITTED and UNVERIFIED**. Two risks:

1. **Version collision.** `package.json` already reads **27.395** (bumped by this/another thread). My slice-1 edits are uncommitted **on top** of that and were never given their own bump. When you integrate, **re-bump to the next free version** (e.g. 27.396+) so 395 is not claimed twice.
2. **My edits may be lost** if the working tree is overwritten. They are preserved as a portable patch:
   - `product-redesign-handover/product_stage_slice1.patch` — server.mjs + supply/inject.html edits (284 lines, verified to contain **only** this PRODUCT work).
   - `product-redesign-handover/255_product_stage_bulk_colour.sql` — the migration (also already in `migrations/`).

**To pick up slice 1:**
```bash
# if the working tree no longer has the edits:
git apply product-redesign-handover/product_stage_slice1.patch
# apply the migration to YOUR sandbox (.env DATABASE_URL):
#   node one-liner with pg, or psql — see migrations/255_*.sql
```
If `git status` already shows `server.mjs` + `supply/inject.html` modified with the STAGE work, it is already in the tree; just verify + commit. **The migration is already applied to Ben's sandbox** (9 items backfilled to `sample_development`), but re-apply to any fresh sandbox.

Then run the **verification checklist** in section 5 before committing.

---

## 1. The task + approach (approved)

Elevate the design/layout/UX of the PRODUCT section, **layout first**, then layer requirements on. Mockups-first is a firm rule here for non-trivial UI. The layout directions were presented as ASCII mockups and Ben chose:

- **Merge PLAN + DASHBOARD** into one grid (approval-matrix info folds into the row). *(Direction A.)*
- **Keep RANGE PLAN**, add a few info points to each swatch card. *(Direction B flavour.)*
- **Detail opens in a right-side drawer** on click (Master · Sizes · Samples · Timeline · Documents), not the current inline row-expand.

---

## 2. The STAGE state machine (approved — the backbone)

Two **orthogonal** fields:

- **STAGE** = the one field the user drives (new, stored on `product_dev_items.stage`).
- **APPROVAL** = the existing `product_dev_items.status` (`in_development | approved | dropped`), **derived from the terminal STAGE**. This is the field PIM / Buy Plan / POs read, so it must stay correct.

### Flow (linear with cycles)
```
              ┌─────────────── ↩ Resample ───────────────┐
              ▼                                            │
  ① SAMPLE DEVELOPMENT ──▶ ② SAMPLE SHIPPED ──▶ ③ SAMPLE IN REVIEW ──┬──▶ ④ APPROVED
      (supplier)               (supplier)            (D&B)            ├──▶ ⑤ APPROVED WITH COMMENTS
                                                                      │
      any stage ──────────────────────────────────────────────────── ┴──▶ ⑥ STOP DEVELOPMENT
```

| # | stage value | label | owner | RAG | APPROVAL (`status`) |
|---|---|---|---|---|---|
| ① | `sample_development` | Sample development | Supplier | ⚪ pending | in_development |
| ② | `sample_shipped` | Sample shipped | Supplier | 🟡 amber | in_development |
| ③ | `sample_in_review` | Sample in review | D&B | 🟡 amber | in_development |
| ④ | `approved` | Approved for bulk | Done | 🟢 green | **approved** |
| ⑤ | `approved_with_comments` | Approved w/ comments | Done | 🟢 green | **approved** |
| ⑥ | `stop_development` | Stop development | Stopped | 🔴 red | **dropped** |

### Transitions
- ①→② and ②→③ **auto-advance** (forward-only) off supplier events; ③→④/⑤/① and any→⑥ are **D&B clicks**.
- **Auto-advance rules (already implemented):** supplier submits a sample version → `sample_in_review`; a sample is linked to a shipment → `sample_shipped`. Forward-only: never moves backwards, never overrides a decided stage (④⑤⑥).
- **No carrier-tracking integration needed** for v1 (that idea is retired). "Shipped" just means a tracked shipment exists; "in review" is the supplier's portal submission.
- **RAG buckets** (for reports, section 4.6): 🟢 approved = ④⑤ · 🟡 in progress = ②③ · ⚪ pending = ① · 🔴 blocked = ⑥.

---

## 3. What slice 1 delivers (BUILT — verify, do not rebuild)

Migration + colour fields + STAGE core, wired end to end. Grid still has its current shape (Category/Season columns, inline-expand detail) — the **merge/drawer/reports come in steps 4 to 7**.

### 3a. Migration `255_product_stage_bulk_colour.sql`
Adds `bulk_colour_name text` and `stage text NOT NULL DEFAULT 'sample_development'` to `planner.product_dev_items`; backfills stage from `status` (approved→`approved`, dropped→`stop_development`, else `sample_development`); indexes `stage`.

### 3b. `server.mjs`
- New helpers before `/api/product/items`: `PROD_STAGES`, `PROD_STAGE_DECIDED`, `prodStageRank`, `prodStatusFromStage(stage)`, and `async prodStageAdvance(itemRef, target)` (forward-only, never clobbers a decision, also syncs `status`).
- `bulk_colour_name` + `stage` added to the SELECTs in `/api/product/items`, `/api/product/dashboard`, `/api/product/item/:ref`, `/api/product/item/:ref/core`.
- `POST /api/product/item` (create) accepts `bulk_colour_name`.
- `POST /api/product/item/:ref` (update): `allow` gains `bulk_colour_name`; a `stage` in the body is normalised, stored, and **derives `status`** (so the two never diverge) with the existing `approved_at` stamp. Timeline change-log labels updated ("Colour way"→"Development colour name", added Bulk colour name + Stage; Stage logged by friendly label).
- Auto-advance hooks: `createProductSample` → `prodStageAdvance(itemRef,'sample_in_review')`; `linkSampleToShipment` → `prodStageAdvance(item_ref,'sample_shipped')`.

### 3c. `supply/inject.html`
- **STAGE model helpers** (after `prodStatusSelHtml`): `STAGE_META` (value,label,owner,bg,fg,rag), `stageMeta`, `prodStageStyle`, `prodStatusFromStage`, `prodStageChip`, `prodStageOwner`, `prodStageRag`, `prodStageSelHtml(ref,val)` (coloured dropdown + "with Supplier/D&B" sub-label), `prodApprovalPill(stage)` (read-only derived pill), `prodColourDisplay(r)` (returns `Bulk (Development)` when a bulk name exists).
- **CSS** near the `.pg-*` block: `.pg-stage-wrap`, `.pg-stage-owner`, `.pg-stage-sel`.
- **Grid (`renderProductPlan`):** header row `Status` → `Stage` + `Approval` (8→9 cols; all three `colspan="8"`→`"9"`). Colour cell uses `prodColourDisplay` (with `.pg-colour[data-ref]`). New cells: Stage (`prodStageSelHtml`) + Approval (`.pg-approval-cell[data-ref]`). Change handler rewritten from `.pg-status-sel` to **`.pg-stage-sel`** (posts `{stage}`, patches owner + approval pill in place). Mobile card uses `prodColourDisplay` + `.pgm-stage-chip` + owner in the sub-row.
- **`prodSyncGridCell`** extended: colour branch rebuilds the combined display for both colour fields; new `stage` branch live-patches grid select/owner/approval + mobile chip + the master-form derived-approval chip.
- **Master data (`renderProdMaster`):** "Colour way" → **Development colour name**; new **Bulk colour name** field (`data-f="bulk_colour_name"`); the **Status** row replaced by a **Stage** dropdown (`data-f="stage"`) with a live "→ Approval: <chip>" derived read-out.
- **New-product form** label "Colour way name" → "Development colour name" (bulk colour is set later on Master data; not added to create to avoid the multi-colour ambiguity).
- **Detail seed + drawer header** carry `bulk_colour_name` + `stage`; header shows the stage chip + derived approval chip.

---

## 4. Remaining build steps (NOT started) — build in order, one at a time

### 4.1 Version + verify slice 1 first
Re-bump version (section 0), add a CHANGES.md entry, run the verification checklist, commit + push. Only then continue.

### 4.2 Merge DASHBOARD into the grid (Components column)
- Fold the approval-matrix (`/api/product/dashboard` per-component `{req,appr}` counts) into a **Components** column: a small progress bar `appr/req` across all required components + which types are pending (e.g. `pkg,label ⌛`). The full matrix lives in the drawer.
- Consider dropping the now-redundant **Category/Season** columns (they are the group headers). If you drop 2 and add 1, re-do the colspans + `nth-child` sticky rules.
- The DASHBOARD sub-tab becomes a **Matrix view** of the same grid (view switcher: Table / Gallery / Matrix), so `renderProductDashboard` content is reachable without a separate tab. Keep SPECIFICATIONS + REPORTS as their own tabs.

### 4.3 Detail as a right-side drawer
- Replace the inline row-expand (`pg-detrow` / mobile `pg-mdet`) with a **right-side drawer**, consistent with the PO drawer (`openPODrawer` / `.hz-drawer-overlay`). `renderProdDetailShell` already renders inline vs header modes; point the "PLAN"/card click at a drawer container instead of the inline `.pg-det`. Preserve the `#/product/<ref>[/<tab>]` hash router.

### 4.4 New-product + Master data polish
Optional: allow setting bulk colour at create for single-colour creates.

### 4.5 Season "Generate report" (feature 1)
- Button on each **season group header** → printable PDF (reuse the `rangePDF` print-popup pattern in `renderProductRange`, no new dependency), products **grouped by category**, showing swatch, colour (`Bulk (Development)`), STAGE, APPROVAL, RAG.

### 4.6 Category "Generate report" + RAG (feature 2)
- Button on each **category group header** → PDF of that season+category, with a **RAG status report**: per-product 🟢/🟡/⚪/🔴 (from `prodStageRag`) + a summary tally (e.g. `🟢2 🟡4 🔴1`). Show the same tally inline on the category header.

### 4.7 RANGE PLAN card extras (feature 3 visual)
- On each `renderProductRange` swatch card add: **STAGE chip** (`prodStageChip`), **APPROVAL dot**, component progress `4/6`. Keep season picker / approved-only / PDF. Cards already show `colour_name` — switch to `prodColourDisplay`.

---

## 5. Verification checklist (every change)
1. `node --check server.mjs` (server) — must pass.
2. **Restart sandbox:** `pkill -9 -f "node server.mjs"; nohup node server.mjs > server.log 2>&1 &` (port 8124). (Kill by process, not port — stale-process gotcha.)
3. **jsdom render check** against `localhost:8124`: the supply module must parse and render (`window.openBuyplanModalMulti` is a function, 0 jsdomErrors). Verify the browser RENDERS, not just that endpoints 200. Do **not** spawn headless Chrome (leaks processes, has crashed Ben's Chrome).
4. Smoke: `/api/product/items` returns `stage` + `bulk_colour_name`; changing STAGE in the grid flips the Approval pill; setting a Bulk colour name shows `Bulk (Development)` in the grid.
5. **Commit + push** as the `dockandbay` gh account (`gh auth switch --user dockandbay` if a push 403s); branch `phase-2.1-suppliers`.
6. **Review URLs** every time (desktop + mobile). Mobile via a `cloudflared` quick-tunnel to :8124.

---

## 6. Code map
PRODUCT is rendered in **`supply/inject.html`** (supply module, injected server-side). Approx lines drift.
- `selectProductSub(k)` — sub-tab switcher; hash `#/product/<sub>`.
- `renderProductPlan` (~12980) — the **PLAN grid** (main). `renderProductDashboard`, `renderProductRange`, `renderProductReports`, `renderProductSpecs`.
- `renderProductDetail(ref)` / `renderProdDetailShell` / `renderProdMaster` — the per-item detail + tabs.
- STAGE/colour helpers live just after `prodStatusSelHtml` (~12806); grid CSS in the `#product-root` block near the top (~19 to 137).
- Server: `/api/product/*` handlers in `server.mjs` (~6034 onward); STAGE helpers just before `/api/product/items`.
- Data: `planner.product_dev_items` (mig 128 family; now + `stage`, `bulk_colour_name`), `product_dev_sizes`, `product_dev_size_dimensions`, `product_dev_samples`, sample shipments.

---

## 7. Working rules (this repo)
- **Single-file inline-JS**, match surrounding style. `supply/inject.html` = supply module; the demand app is `artifact_v16.7.html` (do not touch here).
- **Version bump every change** (`package.json` "version" drives `APP_VERSION`) + CHANGES.md entry.
- **Sandbox = local `.env` DATABASE_URL** (your own Supabase copy). Author migrations as `.sql` in `migrations/`; apply to sandbox via `.env` + `pg`. **Never write to live prod DB** — Diviyaj owns prod writes; hand off migrations. Live MCP (`oolwklahstnvocaugryg`, planner schema) is READ-ONLY.
- **Dates dd-mmm-yy** (03-Sep-26), never raw ISO. **No em/en-dashes** (org rule). **Left-align** new supply-grid columns.
- Confirm before writing to any live system. Mockups-first for non-trivial UI.

## 8. Not in scope for this thread
The buy-plan **complex-rules** investigation (COOL-DES-GLDGRN etc.) is being handled separately. Do not touch sets/smoothing/buy-plan logic here.
