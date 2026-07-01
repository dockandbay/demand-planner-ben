-- 090: "ignore" list for the ERP COMPARE report (SUPPLY ▸ BI & REPORTS ▸ ERP COMPARE).
--
-- The ERP COMPARE report lists open/draft ERP (Cin7) POs that are NOT in the planner's
-- purchase_orders, limited to product suppliers. Some of those will never be brought into the
-- planner (one-offs, mistakes, handled elsewhere). Ignoring a PO number moves it to an "ignored"
-- status: it drops out of the active list and out of the open-actions count, but stays visible
-- under the report's "ignored" section so it can be un-ignored.
--
-- Planner-owned (not an ERP mirror table); safe to write from the app.

CREATE TABLE IF NOT EXISTS planner.erp_compare_ignored (
  po          text PRIMARY KEY,                 -- ERP PO number being ignored (matches erp_purchase_orders.po)
  ignored_by  text,                             -- who ignored it (session email / 'admin')
  ignored_at  timestamptz DEFAULT now()
);

COMMENT ON TABLE planner.erp_compare_ignored IS
  'PO numbers deliberately ignored on the ERP COMPARE report — excluded from the active list and the open-actions count, still shown under the report''s ignored section.';
