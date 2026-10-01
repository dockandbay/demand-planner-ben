-- 062: ERP (Fulfil/Cin7) mirror table for purchase-order header data.
--
-- Populated by n8n from the ERP — one row per PO that exists in Fulfil/Cin7.
-- Used to detect misalignment between the planner and the ERP. Specifically:
--   * the planner's CALCULATED "completed at warehouse" date (eff_checkin in the PO calc)
--     is compared to the ERP's final_delivery_date — a difference flags the PO as needing
--     a date update in the ERP.
-- Line-level qty/cost drift continues to use planner.purchase_order_lines.erp_qty / erp_cost.
--
-- No FK to purchase_orders: n8n may mirror ERP POs before/independently of the planner, and a
-- missing planner PO should not block the sync. Detection only joins where po matches.

CREATE TABLE IF NOT EXISTS planner.erp_purchase_orders (
  po                  text PRIMARY KEY,                 -- PO number (matches planner.purchase_orders.po)
  erp_po_id           text,                             -- Fulfil/Cin7 internal PO id / reference
  final_delivery_date date,                             -- the ERP's final delivery date (vs our completion date)
  status              text,                             -- ERP PO status (informational)
  raw                 jsonb,                            -- optional: full ERP payload for future fields
  synced_at           timestamptz DEFAULT now()         -- last time n8n refreshed this row from the ERP
);

COMMENT ON TABLE planner.erp_purchase_orders IS
  'Mirror of ERP (Fulfil/Cin7) PO header data, populated by n8n. Compared against the planner calc for misalignment detection (completion date vs final_delivery_date). Line qty/cost drift lives on purchase_order_lines.erp_qty/erp_cost.';
