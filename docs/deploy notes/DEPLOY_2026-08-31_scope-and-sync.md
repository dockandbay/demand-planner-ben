# DEPLOY 2026-08-31 — planning-scope self-maintenance (for Diviyaj)

**From Ben.** Goal: make `in_planning_scope` **self-maintaining** so new SKUs stop silently missing from the demand plan. Two parts, **strict order**: DB trigger first, then n8n field additions.

Root cause we're fixing: `variant_type` was deliberately NOT synced by n8n (your own comment), so a SKU that's `MASTER`/`SET` in Airtable arrives with `variant_type=NULL` in Supabase → the mig-109 trigger computes `in_planning_scope=false` → it never appears. We now sync `variant_type`, but that alone would flood scope, so the trigger gets a status gate first.

---

## STEP 1 — apply `migrations/248_planning_scope_status_gate.sql` to LIVE (do this FIRST)
Extends the mig-109 trigger. New rule (Ben's decision):
```
in_planning_scope = variant_type IN ('MASTER','SET')
                    AND upper(btrim(status)) IN ('ACTIVE','LAST SEASON','PHASE OUT')
                    AND (any available_* = TRUE)
```
- Adds the **status gate** (was absent). No discontinue-date gate — LAST SEASON / PHASE OUT are run-off and must stay visible.
- **Effect on live immediately (before any n8n change):** in-scope **903 → ~868** — it only drops the **35 CLOSED** SKUs that were wrongly in scope (their availability flags were left TRUE on close). Nothing else moves. Safe to deploy on its own.
- Applied + validated on sandbox (SQL clean, 0 CLOSED remain in scope). **Not applied to live — yours to run** (single-writer rule).

## STEP 2 — add fields to the n8n `build upsert` node (AFTER step 1 is live)
Add these to `DIM_MAP` (text, COALESCE-guarded, so blank Airtable values preserve existing):
```js
 ['variant_type','variant_type'],          // ⚠ THE ENABLER — see note below
 ['product_scope','product_scope'],
 ['polybags','polybags'],                  // Airtable now authoritative (Ben confirmed) — overwrites the mig-247 seed
 ['colour_long','colour_long'],
 ['supplier_multiple_all','supplier_multiple_all'],
 ['sku_invoice_title','sku_invoice_title'],
 ['hscode_uk','hscode_uk'],['hscode_us','hscode_us'],['hscode_eu','hscode_eu'],
 ['hscode_au','hscode_au'],['hscode_ca','hscode_ca'],
```
- **`variant_type`**: this is what makes scope self-maintain. Once synced, any `MASTER`/`SET` + available + ACTIVE/LAST SEASON/PHASE OUT SKU auto-enters the plan. Projected live in-scope after this ≈ **868** (roughly stable — the status gate holds back the ~2,462 flood; ~79% of that flood was CLOSED). Your old comment about `variant_type` pulling ~650 unreviewed masters in is now handled by the STEP-1 status gate.
- **`polybags`**: I seeded this straight to live in mig 247; syncing makes Airtable the source and **overwrites my seed** — Ben confirmed Airtable is authoritative, so this is intended. Make sure the Airtable `polybags` column is populated before the first sync or blanks will COALESCE-preserve (safe either way).
- The other fields are pure data with no scope side-effects (the trigger only reads `variant_type` + `status` + availability).

## Migrations 245 / 246 / 247 (already applied to live+sandbox by me, per Ben) — reconcile only
- 245 `products.polybags` (+ seed) · 246 `branches.returns_pct` (+ seed) · 247 seed of `polybags`+`price_type` from Ben's CSV. All additive/idempotent.

## Stopgap already applied to LIVE (Ben-authorised, 2026-08-31) — before you deploy
To let Ben forecast/buy AW26/SS27 now, I set `variant_type` **directly on live** for **20 SKUs** (2 MASTER: `PONCHK-CAB-MD/SM-YELL`; 18 SET: the `TEATWL-MD-*SET-*` + `TOWLH-CLB/DES-*SET-*` multipacks). This is safe/durable because n8n doesn't sync `variant_type`, and it's consistent with the mig-248 rule (all whitelist status + available). **Nothing to undo** — when you enable the `variant_type` sync it will set the same values. (5 more AW26/SS27 SKUs — `BAGTOI-MD-CACTMNTN`, `BAGF-DES-MD-GYOW`, `PP-TEATWL-MD-3SET-TAPTIM`, `TOWLB-DES-LG/XL-CACTMNTN` — are `WHOLESALE`/`BOTH` but have availability=false in Airtable; Ben to fix availability there.)

## Order matters
1. Run mig 248 on live. 2. Verify in-scope ≈ 868 (35 CLOSED dropped). 3. Add the n8n fields. 4. Run the sync. 5. Confirm scope stays ~868 (not ~2,462). If it floods, mig 248 didn't apply first.
