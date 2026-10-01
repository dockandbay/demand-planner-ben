-- v28.023 (Ben): persist the Auto-Forecast RESULT (cash-out phasing) server-side so it is queryable (SQL + Ask Claude),
-- not just computed in the browser. Computed from the persisted demand feed (auto_forecast_feed) each time it is posted.
-- planner.auto_forecast_latest unnests the newest result's transactions into per-payment rows. Additive only.

CREATE TABLE IF NOT EXISTS planner.auto_forecast_result (
  id           bigserial PRIMARY KEY,
  computed_at  timestamptz NOT NULL DEFAULT now(),
  computed_by  text,
  app_version  text,
  txn_count    integer,
  total_usd    bigint,
  result       jsonb NOT NULL     -- full output: { months, units, payments{deposit,completion,balance,freight,duty,total}, transactions[], assumptions }
);
CREATE INDEX IF NOT EXISTS auto_forecast_result_at_idx ON planner.auto_forecast_result (computed_at DESC);

-- The latest Auto-Forecast, one row per phased payment (deposit / completion / balance / freight / duty).
CREATE OR REPLACE VIEW planner.auto_forecast_latest AS
SELECT s.computed_at, s.app_version,
       (t->>'month')                 AS month,
       (t->>'type')                  AS payment_type,
       (t->>'reference')             AS reference,
       upper(t->>'country')          AS market,
       (t->>'supplier')              AS supplier,
       (t->>'amount_usd')::numeric   AS amount_usd
FROM planner.auto_forecast_result s,
     LATERAL jsonb_array_elements(s.result->'transactions') t
WHERE s.id = (SELECT id FROM planner.auto_forecast_result ORDER BY computed_at DESC LIMIT 1);
