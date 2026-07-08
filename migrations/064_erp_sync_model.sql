-- 064: dedicated ERP-sync model — a clean ERP mirror (header + lines) + a drift view.
--
-- Separates "what the ERP says" from "what the planner wants":
--   * ERP MIRROR  (n8n-written, planner READ-ONLY): planner.erp_purchase_orders (header, mig 062, extended
--     here) + planner.erp_purchase_order_lines (lines, NEW). The ERP (Cin7 now / Fulfil later) is the
--     source of truth; n8n upserts these on a schedule.
--   * THE PLAN     (planner-owned, editable): planner.purchase_orders / purchase_order_lines (unchanged).
--   * DRIFT        (computed): planner.v_erp_po_drift — every difference between the plan and the ERP mirror.
--     Drives the exceptions/actions list AND the outbound push payload (what to create/update in the ERP).
--
-- Note: this SUPERSEDES the embedded purchase_order_lines.erp_qty / erp_cost columns. The app can be
-- rewired to read v_erp_po_drift instead (follow-on patch); until then the existing columns still work.

-- 1) ERP HEADER mirror — extend the existing erp_purchase_orders to a fuller snapshot.
ALTER TABLE planner.erp_purchase_orders ADD COLUMN IF NOT EXISTS supplier_name text;
ALTER TABLE planner.erp_purchase_orders ADD COLUMN IF NOT EXISTS order_date    date;
ALTER TABLE planner.erp_purchase_orders ADD COLUMN IF NOT EXISTS total_value   numeric(14,2);
ALTER TABLE planner.erp_purchase_orders ADD COLUMN IF NOT EXISTS currency      text;

-- 2) ERP LINE mirror — the dedicated ERP-sync line table (one row per ERP PO × SKU).
CREATE TABLE IF NOT EXISTS planner.erp_purchase_order_lines (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  po        text NOT NULL,
  sku       text NOT NULL,
  qty       integer,
  cost      numeric(12,4),
  line_ref  text,                              -- ERP's internal line id, if any
  synced_at timestamptz DEFAULT now(),
  UNIQUE (po, sku)
);
COMMENT ON TABLE planner.erp_purchase_order_lines IS
  'ERP (Cin7/Fulfil) PO line mirror — n8n-written, planner read-only. The ERP source of truth for lines; the planner''s plan lives in purchase_order_lines.';

-- 3) DRIFT view — planner (plan) vs ERP mirror. One row per difference.
--    drift_type: po_not_in_erp | po_not_in_planner | qty_change | cost_change | line_not_in_erp | line_not_in_planner | completion_mismatch
--    ERP status is open/complete (Cin7) only; the planner's PRODUCTION/SHIPPING/… lifecycle is NOT compared,
--    except the completed state must agree (completion_mismatch).
CREATE OR REPLACE VIEW planner.v_erp_po_drift AS
  SELECT p.po, NULL::text sku, 'po_not_in_erp'::text drift_type,
         NULL::numeric planner_qty, NULL::numeric erp_qty, NULL::numeric planner_cost, NULL::numeric erp_cost,
         'PO exists in the planner but not in the ERP — create it'::text detail
    FROM planner.purchase_orders p LEFT JOIN planner.erp_purchase_orders e ON e.po = p.po
   WHERE e.po IS NULL AND coalesce(p.status,'') NOT ILIKE '%complete%'
  UNION ALL
  SELECT e.po, NULL, 'po_not_in_planner', NULL, NULL, NULL, NULL,
         'PO exists in the ERP but not in the planner — should be mirrored in'
    FROM planner.erp_purchase_orders e LEFT JOIN planner.purchase_orders p ON p.po = e.po
   WHERE p.po IS NULL
  UNION ALL
  SELECT l.po, l.sku, 'qty_change', l.qty::numeric, el.qty::numeric, NULL, NULL,
         'Planned qty '||l.qty||' vs ERP '||el.qty
    FROM planner.purchase_order_lines l JOIN planner.erp_purchase_order_lines el ON el.po = l.po AND el.sku = l.sku
   WHERE l.qty IS DISTINCT FROM el.qty
  UNION ALL
  SELECT l.po, l.sku, 'cost_change', NULL, NULL, l.cost_price, el.cost,
         'Planned cost '||l.cost_price||' vs ERP '||el.cost
    FROM planner.purchase_order_lines l JOIN planner.erp_purchase_order_lines el ON el.po = l.po AND el.sku = l.sku
   WHERE l.cost_price IS DISTINCT FROM el.cost
  UNION ALL
  SELECT l.po, l.sku, 'line_not_in_erp', l.qty::numeric, NULL, l.cost_price, NULL,
         'Line in the planner but not in the ERP — add it'
    FROM planner.purchase_order_lines l LEFT JOIN planner.erp_purchase_order_lines el ON el.po = l.po AND el.sku = l.sku
   WHERE el.po IS NULL
  UNION ALL
  SELECT el.po, el.sku, 'line_not_in_planner', NULL, el.qty::numeric, NULL, el.cost,
         'Line in the ERP but not in the planner — mirror it in'
    FROM planner.erp_purchase_order_lines el LEFT JOIN planner.purchase_order_lines l ON l.po = el.po AND l.sku = el.sku
   WHERE l.po IS NULL
  UNION ALL
  -- completion-status mismatch. The ERP status is just open/complete (Cin7); the planner's status is a
  -- management lifecycle (PRODUCTION/SHIPPING/…) — NOT comparable, EXCEPT the completed state must agree.
  -- Flag when the ERP says complete (received) but the plan isn't, or vice-versa.
  SELECT p.po, NULL, 'completion_mismatch', NULL, NULL, NULL, NULL,
         CASE WHEN coalesce(e.status,'') ILIKE 'complete%'
              THEN 'ERP marks this PO complete (received) but the plan does not — close it in the plan'
              ELSE 'Plan marks this PO complete but the ERP has not received it (still open)' END
    FROM planner.purchase_orders p JOIN planner.erp_purchase_orders e ON e.po = p.po
   WHERE (coalesce(p.status,'') ILIKE '%complete%') <> (coalesce(e.status,'') ILIKE 'complete%');
COMMENT ON VIEW planner.v_erp_po_drift IS
  'Every difference between the planner (plan) and the ERP mirror — drives exceptions/actions and the outbound push payload. Date drift (completion vs ERP final_delivery_date) is computed in the app for now.';
