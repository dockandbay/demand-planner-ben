-- Seed: map Fulfil sales channels → 3PL-invoice account-map rows (Ben 21-Sep, confirmed via quiz). Channel names are
-- identical across the Fulfil sandbox and live tenants, so the same mapping applies to both planner databases.
-- Run on sandbox (done by Ben's app) and on LIVE (Diviyaj). Idempotent — safe to re-run.
UPDATE planner.tpl_account_map SET fulfil_channel='dockandbay-uk'    WHERE label='UK - Shopify';
UPDATE planner.tpl_account_map SET fulfil_channel='dockandbay-eu'    WHERE label='EU - Shopify';
UPDATE planner.tpl_account_map SET fulfil_channel='dockandbay-au'    WHERE label='AU - Shopify';
UPDATE planner.tpl_account_map SET fulfil_channel='dockandbay-uk-ws' WHERE label='UK - Wholesale';
UPDATE planner.tpl_account_map SET fulfil_channel='dockandbay-us-ws' WHERE label='US - Wholesale';
UPDATE planner.tpl_account_map SET fulfil_channel='dockandbay-eu-ws' WHERE label='EU - Wholesale (excl. DE, FR, Dist)';
