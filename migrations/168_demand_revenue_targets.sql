-- 168: DEMAND ▸ Revenue — revenue-growth targets per country × channel × financial year.
-- target_type 'pct' (growth % over last-year revenue) or 'value' (absolute revenue target). Currency = the
-- plan's per-country reporting currency. Baseline/forecast/actuals are derived live from the plan (not stored).
CREATE TABLE IF NOT EXISTS planner.demand_revenue_targets (
  country     text NOT NULL,
  channel     text NOT NULL,
  fy          int  NOT NULL,          -- FY start year (e.g. 2026 = FY26/27, Mar26–Feb27)
  target_type text NOT NULL DEFAULT 'pct',   -- 'pct' | 'value'
  target_pct  numeric,
  target_value numeric,
  updated_by  text,
  updated_at  timestamptz DEFAULT now(),
  PRIMARY KEY (country, channel, fy)
);
