-- 285: drop the item-level columns that moved to the development-request model (v27.749, Ben — PRODUCT split P5).
--
-- supplier / supplier_code / recipient_countries / approval_method / dev_start_override were per-PRODUCT in the
-- old model. In the split (mig 278) they became per development REQUEST: product_dev_requests carries
-- supplier_name, supplier_code, recipient_countries, approval_method and dev_start (the request-level dev-start
-- that replaces dev_start_override). Every server reader now derives these from the requests, and no code writes
-- the item columns any more (v27.749), so they are dead — drop them.
--
-- Ordering for Diviyaj: deploy the v27.749 code FIRST (it stops reading/writing these columns), then run this.
-- Reversible only by restoring the columns from mig 129/135/166/180 and back-filling from requests.

ALTER TABLE planner.product_dev_items DROP COLUMN IF EXISTS supplier;
ALTER TABLE planner.product_dev_items DROP COLUMN IF EXISTS supplier_code;
ALTER TABLE planner.product_dev_items DROP COLUMN IF EXISTS recipient_countries;
ALTER TABLE planner.product_dev_items DROP COLUMN IF EXISTS approval_method;
ALTER TABLE planner.product_dev_items DROP COLUMN IF EXISTS dev_start_override;
