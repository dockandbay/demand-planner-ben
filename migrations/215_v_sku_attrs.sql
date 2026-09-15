-- 215: v_sku_attrs — single per-SKU attributes source that prefers planner.products (the live-from-Airtable
-- source of truth) for the fields that ALSO live in products, falling back to sku_labels. This removes the
-- carton_qty / pallet_qty divergence (products was 30/updated, sku_labels stale 40) across every report at once.
-- Exposes exactly the sku_labels columns (same names/types) so callers can swap planner.sku_labels → planner.v_sku_attrs
-- transparently. products.carton_qty / pallet_qty are text → safe-cast to int. Barcodes / carton dims / grs / main_supplier
-- live ONLY in sku_labels for now (passed through) — migrating those into products + n8n is the step before dropping sku_labels.
CREATE OR REPLACE VIEW planner.v_sku_attrs AS
 SELECT sl.sku, sl.status, sl.size, sl.category, sl.subcategory, sl.main_supplier,
        COALESCE(CASE WHEN pr.carton_qty ~ '^[0-9]+(\.[0-9]+)?$' THEN (pr.carton_qty)::numeric::integer END, sl.carton_qty) AS carton_qty,
        sl.product_barcode, sl.carton_barcode, sl.inner_barcode, sl.barcode_sku_name, sl.barcode_carton_name, sl.barcode_inner_name,
        sl.swatch_url, sl.grs_material, sl.created_at, sl.updated_at,
        COALESCE(CASE WHEN pr.pallet_qty ~ '^[0-9]+(\.[0-9]+)?$' THEN (pr.pallet_qty)::numeric::integer END, sl.pallet_qty) AS pallet_qty,
        sl.release_window, sl.uk_carton_l, sl.uk_carton_w, sl.uk_carton_h, sl.uk_carton_wt,
        sl.us_carton_l, sl.us_carton_w, sl.us_carton_h, sl.us_carton_wt, sl.size_short, sl.variant_type
   FROM planner.sku_labels sl
   LEFT JOIN planner.products pr ON pr.sku = sl.sku;
