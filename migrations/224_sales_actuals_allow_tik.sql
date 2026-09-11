-- 224_sales_actuals_allow_tik.sql
-- Allow channel 'TIK' (TikTok) in planner.sales_actuals so TikTok actuals can land alongside DTC/B2B/FBA/ZAL.
-- The new TikTok channel (v26.955) behaves like DTC on the 3PL pool. The category_sales_summary (materialised) view
-- + the SKU-sales feed group by channel with no filter, so TIK actuals then flow straight into the demand plan's
-- category + SKU cells. forecast_inputs/outputs.channel is free text (no constraint there) — TIK forecasts already work.
-- Mirrors 204 (which added ZAL). Idempotent-safe to re-run: drops then re-adds the CHECK with the full channel set.
ALTER TABLE planner.sales_actuals DROP CONSTRAINT IF EXISTS sales_actuals_channel_check;
ALTER TABLE planner.sales_actuals ADD CONSTRAINT sales_actuals_channel_check
  CHECK (channel = ANY (ARRAY['DTC'::text, 'B2B'::text, 'FBA'::text, 'ZAL'::text, 'TIK'::text]));
