-- 218: v_sku_attrs Phase 3 — rebuild the view to read FROM planner.products ONLY. sku_labels is no longer
-- referenced anywhere (app code was repointed to the view in mig 215; this removes the view's own dependency).
-- planner.products is the live-from-Airtable source of truth; sku_labels is n8n-fed but stale, so we decommission it.
--
-- Every output column keeps its sku_labels name/type so the 27 server reads stay transparent. Sources, all verified
-- against the sandbox before switching (populated + ~100% agreement with sku_labels where both held a value):
--   status/size/category/subcategory/size_short/variant_type/release_window ← same-named products columns (100% agree)
--   main_supplier      ← main_supplier_final          product_barcode  ← product_ean (leading-apostrophe artifact stripped; 1036/1036)
--   barcode_sku_name   ← barcode_sku_name_final        carton_barcode   ← carton_barcode      (849/849, no apostrophe)
--   barcode_carton_name← barcode_carton_name (915/915) inner_barcode    ← inner_barcode       (50/50)
--   barcode_inner_name ← barcode_inner_name  (63/63)   swatch_url       ← colour_swatch_url   (679/679)
--   grs_material       ← grs_material_carton (809/809) carton_qty/pallet_qty ← text cols, safe-cast to int
--   uk/us_carton_l/w/h/wt ← uk/us_carton_length/width/height/weight (per-row diffs ≤0.5 rounding; NULLIF(,0) guard)
-- created_at/updated_at: products has no equivalent and no caller reads them → exposed as NULL to preserve the contract.
-- Membership now = all products SKUs (2033) vs sku_labels' 1069. Only 1 SKU is lost (PP-TOWLB-CAB-XL-6SETM, LAST SEASON,
-- absent from products) — a discontinued prepack, inconsequential for an attributes lookup.
-- After this, planner.sku_labels can be dropped once n8n stops writing to it (Diviyaj/n8n coordination).
CREATE OR REPLACE VIEW planner.v_sku_attrs AS
 SELECT pr.sku,
        pr.status,
        pr.size,
        pr.category,
        pr.subcategory,
        NULLIF(TRIM(pr.main_supplier_final), '')                                        AS main_supplier,
        CASE WHEN pr.carton_qty ~ '^[0-9]+(\.[0-9]+)?$' THEN (pr.carton_qty)::numeric::integer END AS carton_qty,
        NULLIF(REGEXP_REPLACE(TRIM(pr.product_ean), '^''+', ''), '')                    AS product_barcode,
        NULLIF(TRIM(pr.carton_barcode), '')                                             AS carton_barcode,
        NULLIF(TRIM(pr.inner_barcode), '')                                              AS inner_barcode,
        NULLIF(TRIM(pr.barcode_sku_name_final), '')                                     AS barcode_sku_name,
        NULLIF(TRIM(pr.barcode_carton_name), '')                                        AS barcode_carton_name,
        NULLIF(TRIM(pr.barcode_inner_name), '')                                         AS barcode_inner_name,
        NULLIF(TRIM(pr.colour_swatch_url), '')                                          AS swatch_url,
        NULLIF(TRIM(pr.grs_material_carton), '')                                        AS grs_material,
        NULL::timestamptz                                                               AS created_at,
        NULL::timestamptz                                                               AS updated_at,
        CASE WHEN pr.pallet_qty ~ '^[0-9]+(\.[0-9]+)?$' THEN (pr.pallet_qty)::numeric::integer END AS pallet_qty,
        pr.release_window,
        NULLIF(pr.uk_carton_length, 0)                                                  AS uk_carton_l,
        NULLIF(pr.uk_carton_width,  0)                                                  AS uk_carton_w,
        NULLIF(pr.uk_carton_height, 0)                                                  AS uk_carton_h,
        NULLIF(pr.uk_carton_weight, 0)                                                  AS uk_carton_wt,
        NULLIF(pr.us_carton_length, 0)                                                  AS us_carton_l,
        NULLIF(pr.us_carton_width,  0)                                                  AS us_carton_w,
        NULLIF(pr.us_carton_height, 0)                                                  AS us_carton_h,
        NULLIF(pr.us_carton_weight, 0)                                                  AS us_carton_wt,
        pr.size_short,
        pr.variant_type
   FROM planner.products pr;
