-- 403_campaigns.sql (v28.589, Ben 30-Oct-26, Kathryn's Launch Readiness spec): marketing CAMPAIGNS on the trading calendar.
-- A campaign is one trading_calendar row (title, launch date = event_date, market = one or more markets "UK,US") with new fields
-- (channels DTC / FBA, status draft / confirmed, intake date override + reason, uplift % per tier, target cover) and its SKUs in
-- campaign_skus with a tier each (Hero / Supporting / Cross-sell). sku_list on the row is kept in step by the server so the PLAN
-- "C" markers and DEMAND Actions keep working. Confirmed campaigns feed DEMAND > Analysis > Intake deadlines (computed, not stored).
-- Additive. The second half merges the existing Marketing rows whose Notes hold a tier (15 rows -> 9 campaigns, all left as Draft
-- so merchandising confirms each); it only touches rows not yet converted (status IS NULL), so re-running it does nothing.
BEGIN;
ALTER TABLE planner.trading_calendar
  ADD COLUMN IF NOT EXISTS channels           text,          -- 'DTC', 'FBA' or 'DTC,FBA' (campaigns only)
  ADD COLUMN IF NOT EXISTS status             text CHECK (status IS NULL OR status IN ('draft','confirmed')),   -- NULL = plain event
  ADD COLUMN IF NOT EXISTS intake_date        date,          -- override of launch minus 7 days
  ADD COLUMN IF NOT EXISTS intake_reason      text,
  ADD COLUMN IF NOT EXISTS uplift             jsonb,         -- {"Hero":[20,40],"Supporting":[10,20],"Cross-sell":[0,10]} low/high %
  ADD COLUMN IF NOT EXISTS target_cover_weeks numeric,       -- blank = category target
  ADD COLUMN IF NOT EXISTS updated_by         text;
CREATE TABLE IF NOT EXISTS planner.campaign_skus (
  event_id    bigint  NOT NULL REFERENCES planner.trading_calendar(id) ON DELETE CASCADE,
  sku         text    NOT NULL,
  tier        text    NOT NULL DEFAULT 'Hero' CHECK (tier IN ('Hero','Supporting','Cross-sell')),
  uplift_low  numeric,                                       -- per-SKU override of the tier uplift
  uplift_high numeric,
  PRIMARY KEY (event_id, sku)
);
CREATE INDEX IF NOT EXISTS campaign_skus_sku_idx ON planner.campaign_skus (sku);
REVOKE ALL ON planner.campaign_skus FROM anon, authenticated;

-- Merge: one campaign per (title, launch date, market) among Marketing rows whose Notes is a tier. Keeper = lowest id.
CREATE TEMP TABLE _cm_src ON COMMIT DROP AS
  SELECT id, title, event_date, coalesce(market,'') mk, trim(notes) tier, sku_list
  FROM planner.trading_calendar
  WHERE status IS NULL AND event_type = 'Marketing' AND trim(coalesce(notes,'')) IN ('Hero','Supporting','Cross-sell');
CREATE TEMP TABLE _cm_keep ON COMMIT DROP AS
  SELECT title, event_date, mk, min(id) kid FROM _cm_src GROUP BY 1,2,3;
-- SKU tokens; a parent code (products.parent_p1) stands for every SKU under it. A SKU listed under two tiers keeps the higher tier.
INSERT INTO planner.campaign_skus (event_id, sku, tier)
SELECT DISTINCT ON (k.kid, p.sku) k.kid, p.sku, s.tier
FROM _cm_src s
JOIN _cm_keep k ON k.title IS NOT DISTINCT FROM s.title AND k.event_date IS NOT DISTINCT FROM s.event_date AND k.mk = s.mk
CROSS JOIN LATERAL unnest(string_to_array(coalesce(s.sku_list,''), ',')) t(tok)
JOIN planner.products p ON p.sku = trim(t.tok) OR (p.parent_p1 = trim(t.tok) AND NOT EXISTS (SELECT 1 FROM planner.products q WHERE q.sku = trim(t.tok)))
WHERE trim(t.tok) <> ''
ORDER BY k.kid, p.sku, CASE s.tier WHEN 'Hero' THEN 0 WHEN 'Supporting' THEN 1 ELSE 2 END
ON CONFLICT (event_id, sku) DO NOTHING;
UPDATE planner.trading_calendar c SET
  status = 'draft', channels = 'DTC', notes = NULL, updated_by = 'migration 403',
  sku_list = (SELECT string_agg(cs.sku, ',' ORDER BY cs.sku) FROM planner.campaign_skus cs WHERE cs.event_id = c.id)
WHERE c.id IN (SELECT kid FROM _cm_keep);
DELETE FROM planner.trading_calendar WHERE id IN (SELECT id FROM _cm_src) AND id NOT IN (SELECT kid FROM _cm_keep);
COMMIT;
