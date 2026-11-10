-- migration 432
-- v28.767 (Ben 10-Nov-26): Order exclusions v2. Additive except the view, which gains the SKU exclusion.
-- 1. SKUs that never count as demand, in any source (Ben: "DB-WL skus excluded fully", "same for CUSTOM-LOGO"). Patterns use ILIKE.
CREATE TABLE IF NOT EXISTS planner.demand_excluded_skus (
  pattern    text PRIMARY KEY,
  note       text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO planner.demand_excluded_skus (pattern, note, created_by) VALUES
  ('DB-WL%', 'Ben 10-Nov-26: excluded fully', 'ben'),
  ('CUSTOM-LOGO%', 'Ben 10-Nov-26: excluded fully', 'ben')
ON CONFLICT (pattern) DO NOTHING;
-- 2. Exclude single lines (an order can be excluded whole in planner.order_exclusions, or line by line here).
CREATE TABLE IF NOT EXISTS planner.order_line_exclusions (
  line_id    bigint PRIMARY KEY,
  sale_id    bigint NOT NULL,
  sku        text,
  excluded   boolean NOT NULL DEFAULT true,
  note       text,
  changed_by text,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_line_exclusions_sale_idx ON planner.order_line_exclusions (sale_id);
-- 3. Dismiss: reviewed, keep counting, take it off the list.
ALTER TABLE planner.order_exclusions ADD COLUMN IF NOT EXISTS dismissed boolean NOT NULL DEFAULT false;
ALTER TABLE planner.order_exclusions ADD COLUMN IF NOT EXISTS dismissed_by text;
ALTER TABLE planner.order_exclusions ADD COLUMN IF NOT EXISTS dismissed_at timestamptz;
-- 4. The final view leaves the excluded SKUs out of every source (the Cin7 sheet included).
CREATE OR REPLACE VIEW planner.sales_actuals_final AS
SELECT u.* FROM (
  SELECT s.sku, s.country, s.channel, s.month, s.units, s.revenue, s.source, s.loaded_at, 0::numeric AS units_free
  FROM planner.sales_actuals s
  WHERE (SELECT value FROM planner.app_settings WHERE key = 'sales_actuals_source') IS DISTINCT FROM 'fulfil_monthly'
    AND (SELECT value FROM planner.app_settings WHERE key = 'sales_actuals_source') IS DISTINCT FROM 'fulfil_weekly'
UNION ALL
  SELECT s.sku, s.country, s.channel, s.month, s.units, s.revenue, s.source, s.loaded_at, 0::numeric
  FROM planner.sales_actuals s
  WHERE (SELECT value FROM planner.app_settings WHERE key = 'sales_actuals_source') IN ('fulfil_monthly', 'fulfil_weekly')
    AND NOT EXISTS (SELECT 1 FROM planner.sales_source_cuts c WHERE c.country = s.country AND c.channel = s.channel AND s.month >= c.fulfil_from)
UNION ALL
  SELECT f.sku, f.country, f.channel, f.month, f.units, f.revenue, 'fulfil_monthly', f.loaded_at, f.units_free
  FROM planner.sales_actuals_fulfil f JOIN planner.sales_source_cuts c ON c.country = f.country AND c.channel = f.channel AND f.month >= c.fulfil_from
  WHERE (SELECT value FROM planner.app_settings WHERE key = 'sales_actuals_source') = 'fulfil_monthly'
UNION ALL
  SELECT w.sku, w.country, w.channel, date_trunc('month', d.d)::date, round(sum(w.units / 7.0), 4), round(sum(w.revenue / 7.0), 2), 'fulfil_weekly', max(w.loaded_at), round(sum(w.units_free / 7.0), 4)
  FROM planner.sales_actuals_fulfil_weekly w
  CROSS JOIN LATERAL generate_series(w.iso_week, w.iso_week + 6, interval '1 day') d(d)
  JOIN planner.sales_source_cuts c ON c.country = w.country AND c.channel = w.channel AND date_trunc('month', d.d)::date >= c.fulfil_from
  WHERE (SELECT value FROM planner.app_settings WHERE key = 'sales_actuals_source') = 'fulfil_weekly'
  GROUP BY 1,2,3,4
) u
WHERE NOT EXISTS (SELECT 1 FROM planner.demand_excluded_skus x WHERE u.sku ILIKE x.pattern);
