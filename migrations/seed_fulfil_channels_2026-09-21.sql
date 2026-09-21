-- Seed: map Fulfil sales channels → 3PL-invoice account-map rows (Ben 21-Sep, confirmed via quiz). Covers the full LIVE
-- channel set (35 channels); channel names are identical across sandbox + live, so the same seed applies to both planner
-- DBs. Run on sandbox (done by Ben's app) and on LIVE (Diviyaj). Idempotent — safe to re-run. fulfil_channel is a
-- comma-separated list, so one account row can claim several Fulfil channels.
-- ROTW Amazon marketplaces (Amazon.co.jp/.com.mx/.com.br/.com.tr/.in/.sa/.sg/.ae/.com.za/.com.eg) are intentionally
-- left UNMAPPED per Ben — they fall to OTHER COSTS until dedicated rows exist.
UPDATE planner.tpl_account_map SET fulfil_channel='dockandbay-uk'    WHERE label='UK - Shopify';
UPDATE planner.tpl_account_map SET fulfil_channel='dockandbay-us'    WHERE label='US - Shopify';
UPDATE planner.tpl_account_map SET fulfil_channel='dockandbay-eu'    WHERE label='EU - Shopify';
UPDATE planner.tpl_account_map SET fulfil_channel='dockandbay-au'    WHERE label='AU - Shopify';
UPDATE planner.tpl_account_map SET fulfil_channel='dockandbay-uk-ws' WHERE label='UK - Wholesale';
UPDATE planner.tpl_account_map SET fulfil_channel='dockandbay-us-ws,eZComm' WHERE label='US - Wholesale';
UPDATE planner.tpl_account_map SET fulfil_channel='dockandbay-eu-ws' WHERE label='EU - Wholesale (excl. DE, FR, Dist)';
UPDATE planner.tpl_account_map SET fulfil_channel='Amazon.co.uk'     WHERE label='UK - Amazon';
UPDATE planner.tpl_account_map SET fulfil_channel='Amazon.com'       WHERE label='US - Amazon';
UPDATE planner.tpl_account_map SET fulfil_channel='Amazon.com.au'    WHERE label='AU - Amazon';
UPDATE planner.tpl_account_map SET fulfil_channel='Amazon.de,Amazon.ie,Amazon.pl,Amazon.se,Amazon.com.be,Amazon.nl' WHERE label='DE - Amazon';
UPDATE planner.tpl_account_map SET fulfil_channel='Amazon.es'        WHERE label='ES - Amazon';
UPDATE planner.tpl_account_map SET fulfil_channel='Amazon.ca'        WHERE label='CA - Amazon';
UPDATE planner.tpl_account_map SET fulfil_channel='Amazon.fr'        WHERE label='FR - Amazon';
UPDATE planner.tpl_account_map SET fulfil_channel='Amazon.it'        WHERE label='IT - Amazon';
UPDATE planner.tpl_account_map SET fulfil_channel='Faire UK'         WHERE label='UK - Faire';
UPDATE planner.tpl_account_map SET fulfil_channel='Faire US'         WHERE label='US - Faire';
UPDATE planner.tpl_account_map SET fulfil_channel='TikTok UK'        WHERE label='UK - Marketplace';
