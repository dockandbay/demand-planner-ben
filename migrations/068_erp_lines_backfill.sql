-- 068: move ERP line data into the dedicated mirror.
-- The app now reads ERP qty/cost from planner.erp_purchase_order_lines (the ERP mirror) for all drift
-- detection — NOT from the embedded purchase_order_lines.erp_qty / erp_cost columns (now DEPRECATED).
-- This backfills the mirror from the current embedded values so drift detection is unchanged on day one.
-- Going forward, n8n (inbound ERP→planner) feeds planner.erp_purchase_order_lines, and ERP data is loaded
-- via supply_import_templates/erp_purchase_order_lines.csv — not via the PO-lines import.

INSERT INTO planner.erp_purchase_order_lines (po, sku, qty, cost, synced_at)
  SELECT po, sku, erp_qty, erp_cost, now()
  FROM planner.purchase_order_lines
  WHERE erp_qty IS NOT NULL
ON CONFLICT (po, sku) DO UPDATE SET qty = excluded.qty, cost = excluded.cost, synced_at = now();

-- NOTE: purchase_order_lines.erp_qty / erp_cost are left in place (deprecated, no longer read). They can be
-- dropped in a later migration once n8n is confirmed feeding the mirror.
