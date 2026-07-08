-- 066: financial-model scenario overlay → add sub-category granularity.
-- The overlay (growth % + price-increase %) was keyed by (channel, country); it now also keys on
-- sub-category, so the financial forecast model can override growth/price per channel × country × sub-category.
-- Existing channel×country rows get subcategory='' (no longer applied; the model reads per-sub-category rows).

ALTER TABLE planner.scenario_fin_overlay ADD COLUMN IF NOT EXISTS subcategory text NOT NULL DEFAULT '';
ALTER TABLE planner.scenario_fin_overlay DROP CONSTRAINT IF EXISTS scenario_fin_overlay_pkey;
ALTER TABLE planner.scenario_fin_overlay ADD CONSTRAINT scenario_fin_overlay_pkey PRIMARY KEY (channel, country, subcategory);
