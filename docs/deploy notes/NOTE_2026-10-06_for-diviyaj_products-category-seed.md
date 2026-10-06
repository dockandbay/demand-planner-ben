# For Diviyaj: products category_name_final seed + n8n products sync gap (06-Oct-26)

## Ask
Please run `docs/deploy notes/SEED_2026-10-06_products_category_name_final.sql` on prod (`oolwklahstnvocaugryg`). It is one transaction with a backup table, a preview count, the update and a check. Rollback SQL is at the bottom of the file.

## What it does
- Fills `planner.products.category_name_final` and `subcategory_name_final` from Ben's Airtable SKU_CHILD export of 06-Oct-26 (2,868 SKUs, 2,158 with a category).
- Expected on prod (checked read-only today): **1,209 rows**. That is 1,190 filled from NULL plus 19 `subcategory_name_final` corrections (8 in scope: TOWLB-DES-LG/XL-BLUSKY, MELLOW, PSTPIER, RSPROAD move Towel - Beach SEASONAL to SEASONAL BRIGHTS, which already matches their `subcategory`).
- Blank CSV values are skipped, never written as NULL. `cost` is not touched (it already matches on all 2,868 rows).
- Safe to re-run: a second run updates 0 rows (tested on Ben's sandbox).
- **No forecast or buy impact.** The planner engine groups by `products.category` / `subcategory`, which your sync keeps current. The `_name_final` fields feed exports, price lists, the urgent-buy Cat column and the health check.

## Root cause (n8n, needs your fix)
1. **The n8n products sync (`n8n_sync_products`, map v3.3) does not carry `category_name_final`, `subcategory_name_final` or `product_category`.** On prod, 1,955 of 2,929 products have the `_name_final` fields NULL, including SKUs that have them in Airtable (e.g. PICNIC-DES-LG-BRNCLB, created in Airtable 28-Sep). Please add all three fields to the map; otherwise every new SKU will be NULL again and this seed goes stale.
2. **SKUs deleted or renamed in Airtable are never removed from `planner.products`.** 61 products on prod are not in SKU_CHILD; 12 of them are still `in_planning_scope`:
   BUNDLE-MIXMATCH-2SET-XL-BLUSKY, `TEATWL-MD-6SET-SUNKITCH ` (trailing space), `TOWLB-DES-LG-4SET-PSTPARA ` (trailing space), TOWLB-DES-XL-4SET-BOBSHRS, TOWLB-DES-XL-4SET-GRTPARA, TOWLB-DES-XL-4SET-OCDRF, TOWLB-DES-XL-4SET-SUNSORB, TOWLB-SUM-XL-4SET-DSCPRT, GIFT-BOX-HOME-CACTMNTN-SET, PP-TEATWL-MD-2SET-FRUVEG, PP-TEATWL-MD-2SET-RNROO, PP-TEATWL-MD-3SET-SETTAB.
   Suggest the sync sets `in_planning_scope = false` (or a status like REMOVED) for SKUs no longer in SKU_CHILD, rather than deleting them, so history and PO lines keep their product row. Please check none of the 12 have open POs or forecasts before changing them.

## Related
- v28.169 changed the health check "no category" rule to use the same field the app uses (`category_name_final`, else `category`). It now reports 15 instead of 92.
