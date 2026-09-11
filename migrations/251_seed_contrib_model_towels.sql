-- 251_seed_contrib_model_towels.sql
-- Seeds planner.app_settings.contrib_model (SETS % contribution model) for the towel
-- categories from a revenue back-analysis of planner.sales_actuals (trailing 12 complete
-- months, Sep-2025 → Aug-2026). Grain: channel defaults (*|CH|subcat) + US overrides.
-- A/B/C tier mix left at the existing 50/25/25 default so tier-mix behaviour is unchanged;
-- only the `sets` value is introduced. Merge-safe: preserves any other existing keys.
INSERT INTO planner.app_settings(key, value) VALUES
('contrib_model', '{"*|DTC|Tea Towel":{"A":50,"B":25,"C":25,"sets":43},"*|FBA|Tea Towel":{"A":50,"B":25,"C":25,"sets":18},"*|DTC|Towel - Beach CORE":{"A":50,"B":25,"C":25,"sets":45},"*|FBA|Towel - Beach CORE":{"A":50,"B":25,"C":25,"sets":15},"*|DTC|Towel - Beach SEASONAL":{"A":50,"B":15,"C":35,"sets":41},"*|FBA|Towel - Beach SEASONAL":{"A":50,"B":15,"C":35,"sets":10},"*|DTC|Towel - Beach SEASONAL BRIGHTS":{"A":50,"B":25,"C":25,"sets":0},"*|FBA|Towel - Beach SEASONAL BRIGHTS":{"A":50,"B":25,"C":25,"sets":0},"*|DTC|Towel - Beach SEASONAL SUM":{"A":50,"B":25,"C":25,"sets":8},"*|FBA|Towel - Beach SEASONAL SUM":{"A":50,"B":25,"C":25,"sets":6},"*|DTC|Towel - Home":{"A":50,"B":25,"C":25,"sets":22},"*|FBA|Towel - Home":{"A":50,"B":25,"C":25,"sets":0},"US|DTC|Towel - Beach CORE":{"A":50,"B":25,"C":25,"sets":63},"US|FBA|Towel - Beach CORE":{"A":50,"B":25,"C":25,"sets":18},"US|DTC|Towel - Beach SEASONAL":{"A":50,"B":15,"C":35,"sets":56},"US|FBA|Towel - Beach SEASONAL":{"A":50,"B":15,"C":35,"sets":15},"US|DTC|Towel - Beach SEASONAL SUM":{"A":50,"B":25,"C":25,"sets":30},"US|FBA|Towel - Beach SEASONAL SUM":{"A":50,"B":25,"C":25,"sets":9},"US|DTC|Towel - Home":{"A":50,"B":25,"C":25,"sets":29}}')
ON CONFLICT (key) DO UPDATE
  SET value = ( COALESCE(NULLIF(planner.app_settings.value,'')::jsonb, '{}'::jsonb)
                || (EXCLUDED.value)::jsonb )::text;
