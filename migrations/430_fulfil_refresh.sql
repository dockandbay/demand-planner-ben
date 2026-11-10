-- migration 430
-- v28.760 (Ben 10-Nov-26): Fulfil sales import, part 3. Additive.
-- 1. A DTC channel's orders that are not Shopify orders can be reclassified instead of dropped: ref_miss_channel = the HORIZON channel they
--    count in (NULL = drop, as before). HISTORICAL dockandbay-eu -> B2B (Ben: EU's are distributors / retailers / shops; big ones are handled
--    as anomaly orders). US / AU / CA keep dropping theirs (key accounts).
ALTER TABLE planner.fulfil_channel_map ADD COLUMN IF NOT EXISTS ref_miss_channel text;
UPDATE planner.fulfil_channel_map SET ref_miss_channel = 'B2B' WHERE channel_name = 'HISTORICAL dockandbay-eu' AND ref_miss_channel IS NULL;
-- 2. Re-import (refresh) of a channel x date range: every line read in the refresh is stamped with the run; when the refresh finishes, the
--    range's lines NOT stamped (orders Diviyaj deleted or re-imported under new ids) are removed, so nothing double counts.
ALTER TABLE planner.order_lines ADD COLUMN IF NOT EXISTS refresh_run bigint;
CREATE INDEX IF NOT EXISTS order_lines_chan_date_idx ON planner.order_lines (fulfil_channel, order_date);
-- 3. Fulfil history is used from 2024 (Ben 10-Nov-26: only back to 2024 is needed); the import's default start.
INSERT INTO planner.app_settings (key, value) VALUES ('sales_history_from', '2024-01-01') ON CONFLICT (key) DO NOTHING;
