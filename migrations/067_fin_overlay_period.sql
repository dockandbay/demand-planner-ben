-- 067: financial-model overlay → per-PERIOD (quarter) overrides.
-- Adds a `period` key (e.g. 'FY27Q2') so growth %/price % can be set in each quarter cell, per
-- channel × country × sub-category. Price increases compound forward across periods; growth applies per
-- period. Existing rows get period='' (no longer applied — the model reads per-quarter rows).

ALTER TABLE planner.scenario_fin_overlay ADD COLUMN IF NOT EXISTS period text NOT NULL DEFAULT '';
ALTER TABLE planner.scenario_fin_overlay DROP CONSTRAINT IF EXISTS scenario_fin_overlay_pkey;
ALTER TABLE planner.scenario_fin_overlay ADD CONSTRAINT scenario_fin_overlay_pkey PRIMARY KEY (channel, country, subcategory, period);
