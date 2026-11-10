-- migration 434
-- v28.773 (Ben 10-Nov-26): Plan monthly's sub-category history and ASP (planner.category_sales_summary, used by buildDATA) now come from
-- the FINAL sales view (planner.sales_actuals_final: the chosen source, excluded anomaly orders and DB-WL / CUSTOM-LOGO SKUs out) instead
-- of planner.sales_actuals (the sheet) directly, so the source switch moves the plan grid too. Adds units_paid = units less free units:
-- free (zero-price) units count as DEMAND (units) but are left out of ASP (revenue / units_paid) (Ben: "free units are not anomalies").
-- On the sheet source nothing changes except the excluded SKUs (units_free = 0 there). Same columns + units_paid; the hourly pg_cron
-- refresh (refresh_category_sales_summary_mv) keeps working (same unique index).
DROP VIEW IF EXISTS planner.category_sales_summary;
DROP MATERIALIZED VIEW IF EXISTS planner.category_sales_summary_mv;
CREATE MATERIALIZED VIEW planner.category_sales_summary_mv AS
  SELECT COALESCE(p.category, 'Unknown'::text) AS category,
    COALESCE(p.subcategory, 'Unknown'::text) AS subcategory,
    s.country, s.channel, s.month,
    round(sum(s.units))::bigint AS units,
    round(sum(s.revenue), 2) AS revenue,
    count(DISTINCT s.sku) AS sku_count,
    bool_or(COALESCE(ce.subcategory IS NOT NULL, false)) AS is_excluded_category,
    round(sum(s.units - COALESCE(s.units_free, 0)))::bigint AS units_paid
  FROM planner.sales_actuals_final s
    LEFT JOIN planner.products p ON p.sku = s.sku
    LEFT JOIN planner.category_exclusions ce ON ce.subcategory = p.subcategory
  GROUP BY (COALESCE(p.category, 'Unknown'::text)), (COALESCE(p.subcategory, 'Unknown'::text)), s.country, s.channel, s.month;
CREATE UNIQUE INDEX category_sales_summary_mv_grain ON planner.category_sales_summary_mv USING btree (category, subcategory, country, channel, month);
CREATE VIEW planner.category_sales_summary AS
  SELECT category, subcategory, country, channel, month, units, revenue, sku_count, is_excluded_category, units_paid FROM planner.category_sales_summary_mv;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'planner_ro') THEN
  GRANT SELECT ON planner.category_sales_summary_mv TO planner_ro; GRANT SELECT ON planner.category_sales_summary TO planner_ro; END IF; END $$;   -- the Claude connector's read role (live)
