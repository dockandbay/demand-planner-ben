-- Remove stray SET SKU 'GIFT-BOX-HOME-CACTMNTN-SET' from the planner.
-- Rationale: not a real product — no sales_actuals, no set_bom recipe, never used as a component;
-- only 64 zero-unit forecast_outputs placeholder rows (source review_ui) which put an empty row on
-- the demand plan. Safe to delete.
-- NOTE (durability): planner.products is synced from Airtable via n8n. This product row will be
-- RE-CREATED on the next sync unless it is also removed / de-scoped in Airtable (the PIM). The
-- forecast_outputs rows are NOT synced and will stay deleted.
BEGIN;
DELETE FROM planner.forecast_outputs WHERE sku='GIFT-BOX-HOME-CACTMNTN-SET';   -- ~64 zero-unit rows
DELETE FROM planner.products         WHERE sku='GIFT-BOX-HOME-CACTMNTN-SET';   -- 1 row
COMMIT;
