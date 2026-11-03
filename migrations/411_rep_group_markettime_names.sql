-- v28.649 (Ben 03-Nov-26): MarketTime orders now import natively into Fulfil (channel "Markettime US") and carry the rep group in the
-- sale metafield SALES_REP_GROUP (e.g. "SCHAUBEN & CO"), not agent_code. Each agent lists its MarketTime rep group names here; the commission
-- engine and the orders mirror map a listed name to the agent. Seeded from MarketTime's own rep group names (all 5,924 orders, 03-Nov-26).
ALTER TABLE planner.rep_groups ADD COLUMN IF NOT EXISTS markettime_names text[] NOT NULL DEFAULT '{}';

UPDATE planner.rep_groups SET markettime_names = ARRAY['SCHAUBEN & CO'] WHERE name = 'Agent - Schauben' AND markettime_names = '{}';
UPDATE planner.rep_groups SET markettime_names = ARRAY['Patrick and Company'] WHERE name = 'Agent - Patrickco' AND markettime_names = '{}';
UPDATE planner.rep_groups SET markettime_names = ARRAY['Harper Group'] WHERE name = 'Agent - Harper Group' AND markettime_names = '{}';
UPDATE planner.rep_groups SET markettime_names = ARRAY['ROAD RUNNERS'] WHERE name = 'Agent - Roadrunner' AND markettime_names = '{}';
UPDATE planner.rep_groups SET markettime_names = ARRAY['Ivystone Group'] WHERE name = 'Agent - Ivystone' AND markettime_names = '{}';
