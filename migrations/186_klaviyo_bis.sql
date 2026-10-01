-- Klaviyo back-in-stock (BIS) subscriber signal (SUG-0018, v26.611). Per (sku, market) active BIS subscriber count,
-- uploaded periodically from the Klaviyo BIS workbook (BIS_REPORT_FILTERED tab). Shown as an informational demand
-- signal on the DEMAND plan. Snapshot table (delete+upsert per upload). Additive.
CREATE TABLE IF NOT EXISTS planner.klaviyo_bis (
  sku        text NOT NULL,
  market     text NOT NULL,      -- UK / US / EU / AU / CA
  subs       integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sku, market)
);
