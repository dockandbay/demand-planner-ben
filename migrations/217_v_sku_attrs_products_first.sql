-- 217: v_sku_attrs Phase 2 — flip the mapped fields to PRODUCTS-first (fallback sku_labels), per Ben's mapping.
-- planner.products is the live-from-Airtable source of truth; sku_labels is n8n-fed but syncs less often (stale).
-- Mapping (sku_labels output col ← products source col), verified against sandbox before flipping:
--   product_barcode   ← product_ean            (products stores a leading-apostrophe Sheets artifact → stripped; 1036/1036 match once stripped)
--   barcode_sku_name  ← barcode_sku_name_final  (1018/1018 identical)
--   grs_material      ← grs_material_carton     (809/809 identical)
--   main_supplier     ← main_supplier_final     (products = SoT; 8 minor diffs)
--   uk/us_carton_l/w/h/wt ← uk/us_carton_length/width/height/weight  (all per-row diffs ≤0.5 = rounding; products = SoT for dims, mig 093)
-- Output columns/names/types are UNCHANGED so every server read of planner.v_sku_attrs is transparent.
-- carton_qty / pallet_qty were already products-first (mig 215). Fields ONLY in sku_labels are passed through.
-- Membership is still driven by sku_labels rows (LEFT JOIN products) — unchanged from mig 215.
CREATE OR REPLACE VIEW planner.v_sku_attrs AS
 SELECT sl.sku, sl.status, sl.size, sl.category, sl.subcategory,
        COALESCE(NULLIF(TRIM(pr.main_supplier_final), ''), sl.main_supplier) AS main_supplier,
        COALESCE(CASE WHEN pr.carton_qty ~ '^[0-9]+(\.[0-9]+)?$' THEN (pr.carton_qty)::numeric::integer END, sl.carton_qty) AS carton_qty,
        COALESCE(NULLIF(REGEXP_REPLACE(TRIM(pr.product_ean), '^''+', ''), ''), sl.product_barcode) AS product_barcode,
        sl.carton_barcode, sl.inner_barcode,
        COALESCE(NULLIF(TRIM(pr.barcode_sku_name_final), ''), sl.barcode_sku_name) AS barcode_sku_name,
        sl.barcode_carton_name, sl.barcode_inner_name, sl.swatch_url,
        COALESCE(NULLIF(TRIM(pr.grs_material_carton), ''), sl.grs_material) AS grs_material,
        sl.created_at, sl.updated_at,
        COALESCE(CASE WHEN pr.pallet_qty ~ '^[0-9]+(\.[0-9]+)?$' THEN (pr.pallet_qty)::numeric::integer END, sl.pallet_qty) AS pallet_qty,
        sl.release_window,
        COALESCE(NULLIF(pr.uk_carton_length, 0), sl.uk_carton_l) AS uk_carton_l,
        COALESCE(NULLIF(pr.uk_carton_width,  0), sl.uk_carton_w) AS uk_carton_w,
        COALESCE(NULLIF(pr.uk_carton_height, 0), sl.uk_carton_h) AS uk_carton_h,
        COALESCE(NULLIF(pr.uk_carton_weight, 0), sl.uk_carton_wt) AS uk_carton_wt,
        COALESCE(NULLIF(pr.us_carton_length, 0), sl.us_carton_l) AS us_carton_l,
        COALESCE(NULLIF(pr.us_carton_width,  0), sl.us_carton_w) AS us_carton_w,
        COALESCE(NULLIF(pr.us_carton_height, 0), sl.us_carton_h) AS us_carton_h,
        COALESCE(NULLIF(pr.us_carton_weight, 0), sl.us_carton_wt) AS us_carton_wt,
        sl.size_short, sl.variant_type
   FROM planner.sku_labels sl
   LEFT JOIN planner.products pr ON pr.sku = sl.sku;
