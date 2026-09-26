-- 213: SUG-0023 — order-plan "partial carton" false positive.
-- v_purchase_order_lines computed the full/partial-carton check from planner.sku_labels.carton_qty, which can be
-- stale/wrong (e.g. TOWLB-CAB-XL-AMALG-R: sku_labels=40 → 510/40 flagged "partial", but products=30 → 510/30 = full).
-- Carton dims source of truth is planner.products (see carton-dims migration 093). Switch the view to products.carton_qty
-- (text → int, safe-cast; fall back to sku_labels when products is blank/non-numeric). Same columns/order for CREATE OR REPLACE.
CREATE OR REPLACE VIEW planner.v_purchase_order_lines AS
 SELECT x.id, x.po_sku, x.po, x.sku, x.qty, x.carton_qty, x.partial_carton_approved, x.cost_price, x.po_status,
        CASE
            WHEN ((x.carton_qty IS NULL) OR (x.carton_qty = 0)) THEN NULL::text
            WHEN ((x.qty % x.carton_qty) = 0) THEN '✅ Full Cartons'::text
            WHEN x.partial_carton_approved THEN 'OK Partial'::text
            ELSE ('⚠️ Partial Carton - up to '::text || ((ceil(((x.qty)::numeric / (x.carton_qty)::numeric)) * (x.carton_qty)::numeric))::integer)
        END AS full_carton_check
   FROM (
     SELECT l.id, l.po_sku, l.po, l.sku, l.qty, l.partial_carton_approved, l.cost_price, l.po_status,
            COALESCE(CASE WHEN pr.carton_qty ~ '^[0-9]+(\.[0-9]+)?$' THEN (pr.carton_qty)::numeric::integer END, sl.carton_qty) AS carton_qty
       FROM planner.purchase_order_lines l
       LEFT JOIN planner.sku_labels sl ON sl.sku = l.sku
       LEFT JOIN planner.products   pr ON pr.sku = l.sku
   ) x;
