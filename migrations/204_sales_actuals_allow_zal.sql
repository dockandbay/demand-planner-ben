-- 204_sales_actuals_allow_zal.sql
-- Allow channel 'ZAL' (Zalando) in planner.sales_actuals so Zalando LY actuals can be uploaded into the same
-- actuals table as EU sales (Ben, 2026-08-08). The category_sales_summary VIEW + the SKU-sales feed already
-- group by channel with no filter, so ZAL actuals then flow straight into the demand plan's category + SKU cells.
-- (forecast_inputs/outputs.channel is free text — no constraint change needed there.)
ALTER TABLE planner.sales_actuals DROP CONSTRAINT sales_actuals_channel_check;
ALTER TABLE planner.sales_actuals ADD CONSTRAINT sales_actuals_channel_check
  CHECK (channel = ANY (ARRAY['DTC'::text, 'B2B'::text, 'FBA'::text, 'ZAL'::text]));
