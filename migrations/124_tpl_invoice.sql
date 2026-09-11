-- 124: 3PL Invoice report (REPORTS > 3PL Invoice). Phase 1 — uploaded invoice files per 3PL+month, the
-- account mapping config (region x channel -> COGS/Sales/Fulfilment/Cost-of-Sales, seeded from Ben's MAPPING.csv),
-- and per-3PL storage/other-cost accounts. Parsing + Cin7 order matching land in Phase 2 (tpl_invoice_lines).
-- 3PLs: uk_ilg | us_geneva | eu_ifulfilment (=Blade) | au_coghlans. (Propack decommissioned.)

CREATE TABLE IF NOT EXISTS planner.tpl_invoice_files (
  id bigserial PRIMARY KEY,
  tpl text NOT NULL, period text NOT NULL,            -- period = 'YYYY-MM'
  filename text NOT NULL, content_type text, content bytea NOT NULL, byte_size int,
  uploaded_by text, uploaded_at timestamptz DEFAULT now(), parse_status text DEFAULT 'uploaded');
CREATE INDEX IF NOT EXISTS tpl_invoice_files_tpl_period ON planner.tpl_invoice_files (tpl, period);

CREATE TABLE IF NOT EXISTS planner.tpl_invoice_lines (
  id bigserial PRIMARY KEY,
  file_id bigint REFERENCES planner.tpl_invoice_files(id) ON DELETE CASCADE,
  tpl text NOT NULL, period text NOT NULL,
  sales_order_ref text, amount numeric, cost_type text,   -- cost_type: order | storage | other
  cin7_order text, region text, channel text, fulfilment_account text, raw jsonb);
CREATE INDEX IF NOT EXISTS tpl_invoice_lines_file ON planner.tpl_invoice_lines (file_id);

CREATE TABLE IF NOT EXISTS planner.tpl_account_map (
  id bigserial PRIMARY KEY, label text UNIQUE NOT NULL, region text, channel text,
  cogs_account text, cogs_name text, sales_account text, sales_name text,
  fulfilment_account text, fulfilment_name text, cost_of_sales_account text, cost_of_sales_name text);

CREATE TABLE IF NOT EXISTS planner.tpl_cost_accounts (
  id bigserial PRIMARY KEY, tpl text NOT NULL, cost_type text NOT NULL,  -- cost_type: storage | other
  account_code text, account_name text, UNIQUE (tpl, cost_type));
INSERT INTO planner.tpl_cost_accounts (tpl, cost_type) VALUES
  ('uk_ilg','storage'),('uk_ilg','other'),('us_geneva','storage'),('us_geneva','other'),
  ('eu_ifulfilment','storage'),('eu_ifulfilment','other'),('au_coghlans','storage'),('au_coghlans','other')
ON CONFLICT (tpl, cost_type) DO NOTHING;

INSERT INTO planner.tpl_account_map
  (label, region, channel, cogs_account, cogs_name, sales_account, sales_name, fulfilment_account, fulfilment_name, cost_of_sales_account, cost_of_sales_name) VALUES
  ('US - Wholesale','US','Wholesale','311.2c','COGS - US - Wholesale','210.5b','Sales - US - Wholesale','303.24','Fulfilment - US - Wholesale','312.2a','Cost of Sales - US - Wholesale'),
  ('US - Walmart','US','Walmart','311.2f','COGS - US - Walmart','202.3b','Sales - US - Walmart','311.11b','Fulfilment - US - Walmart','312.2b','Cost of Sales - US - Walmart'),
  ('US - Shopify','US','Shopify','311.2a','COGS - US - Shopify','200b','Sales - US - Shopify','303.25','Fulfilment - US - Shopify','312.2c','Cost of Sales - US - Shopify'),
  ('US - Marketplace','US','Marketplace','311.2d','COGS - US - Marketplace','202b','Sales - US - Marketplace','303.28','Fulfilment - US - Marketplace','312.2d','Cost of Sales - US - Marketplace'),
  ('US - Faire','US','Faire','311.2e','COGS - US - Faire','212b','Sales - US - Faire','303.21','Fulfilment - US - Faire','312.2e','Cost of Sales - US - Faire'),
  ('US - Dropship','US','Dropship','311.10b','COGS - US - Dropship','203b','Sales - US - Dropship','303.23','Fulfilment - US - Dropship','312.2f','Cost of Sales - US - Dropship'),
  ('US - Co-Brand/Custom','US','Co - Brand/Custom','311.9b','COGS - US - Co-Brand/Custom','210.6b','Sales - US - Co-Brand/Custom','303.22','Fulfilment - US - Co-Brand/Custom','312.2g','Cost of Sales - US - Co-Brand/Custom'),
  ('US - Amazon','US','Amazon','311.2b','COGS - US - Amazon','201b','Sales - US - Amazon','303.27','Fulfilment - US - Amazon','312.2h','Cost of Sales - US - Amazon'),
  ('UK - Wholesale','UK','Wholesale','311.1c','COGS - UK - Wholesale','210.5a','Sales - UK - Wholesale','303.34','Fulfilment - UK - Wholesale','312.1a','Cost of Sales - UK - Wholesale'),
  ('UK - Shopify','UK','Shopify','311.1a','COGS - UK - Shopify','200a','Sales - UK - Shopify','303.35','Fulfilment - UK - Shopify','312.1b','Cost of Sales - UK - Shopify'),
  ('UK - Marketplace','UK','Marketplace','311.1d','COGS - UK - Marketplace','202a','Sales - UK - Marketplace','303.38','Fulfilment - UK - Marketplace','312.1c','Cost of Sales - UK - Marketplace'),
  ('UK - Faire','UK','Faire','311.1e','COGS - UK - Faire','212a','Sales - UK - Faire','303.31','Fulfilment - UK - Faire','312.1d','Cost of Sales - UK - Faire'),
  ('UK - Dropship','UK','Dropship','311.10a','COGS - UK - Dropship','203a','Sales - UK - Dropship','303.32','Fulfilment - UK - Dropship','312.1e','Cost of Sales - UK - Dropship'),
  ('UK - Co-Brand/Custom','UK','Co - Brand/Custom','311.9a','COGS - UK - Co-Brand/Custom','210.6a','Sales - UK - Co-Brand/Custom','303.37','Fulfilment - UK - Co-Brand/Custom','312.1f','Cost of Sales - UK - Co-Brand/Custom'),
  ('UK - Amazon','UK','Amazon','311.1b','COGS - UK - Amazon','201a','Sales - UK - Amazon','1000.80','Fulfilment - UK - Amazon','312.1g','Cost of Sales - UK - Amazon'),
  ('ROTW - Dropship','ROTW','Dropship','311.10d','COGS - ROTW - Dropship','202e','Sales - ROTW - Dropship','303.44','Fulfilment - ROTW - Dropship','312.3a','Cost of Sales - ROTW - Dropship'),
  ('ROTW - Co-Brand/Custom','ROTW','Co - Brand/Custom','311.9e','COGS - ROTW - Co-Brand/Custom','210.6e','Sales - ROTW - Co-Brand/Custom','1000.76c','Fulfilment - ROTW - Co-Brand/Custom','312.3b','Cost of Sales - ROTW - Co-Brand/Custom'),
  ('IT - Amazon','IT','Amazon','311.3f','COGS - IT - Amazon','201g','Sales - IT - Amazon','1000.78','Fulfilment - IT - Amazon','312.4a','Cost of Sales - IT - Amazon'),
  ('International Distributors',NULL,NULL,'311.5c','COGS - International Distributors','210.7z','Sales - International Distributors','303.9','Fulfilment - International Distributors','312.3c','Cost of Sales - International Distributors'),
  ('FR - Wholesale','FR','Wholesale','311.3b','COGS - FR - Wholesale','210.5f','Sales - FR - Wholesale','1000.73b','Fulfilment - FR - Wholesale','312.4b','Cost of Sales - FR - Wholesale'),
  ('FR - Amazon','FR','Amazon','311.3g','COGS - FR - Amazon','201f','Sales - FR - Amazon','1000.81','Fulfilment - FR - Amazon','312.4c','Cost of Sales - FR - Amazon'),
  ('EU - Zalando','EU','Zalando','311.5d','COGS - EU - Zalando','202.3c','Sales - EU - Zalando','311.11a','Fulfilment - EU - Zalando','312.4d','Cost of Sales - EU - Zalando'),
  ('EU - Wholesale (excl. DE, FR, Dist)','EU','Wholesale (excl. DE, FR, Dist)','311.3c','COGS - EU - Wholesale (excl. DE, FR, Dist)','210.5d','Sales - EU - Wholesale (excl. DE, FR, Dist)','1000.76','Fulfilment - EU - Wholesale (excl. DE, FR, Dist)','312.4e','Cost of Sales - EU - Wholesale (excl. DE, FR, Dist)'),
  ('EU - Shopify','EU','Shopify','311.3a','COGS - EU - Shopify','200d','Sales - EU - Shopify','1000.71','Fulfilment - EU - Shopify','312.4f','Cost of Sales - EU - Shopify'),
  ('EU - Dropship','EU','Dropship','311.10c','COGS - EU - Dropship','203d','Sales - EU - Dropship','1000.76a','Fulfilment - EU - Dropship','312.4g','Cost of Sales - EU - Dropship'),
  ('EU - Co-Brand/Custom','EU','Co - Brand/Custom','311.9d','COGS - EU - Co-Brand/Custom','210.6d','Sales - EU - Co-Brand/Custom','1000.76b','Fulfilment - EU - Co-Brand/Custom','312.4h','Cost of Sales - EU - Co-Brand/Custom'),
  ('ES - Amazon','ES','Amazon','311.3h','COGS - ES - Amazon','201h','Sales - ES - Amazon','1000.82','Fulfilment - ES - Amazon','312.4i','Cost of Sales - ES - Amazon'),
  ('DE - Wholesale','DE','Wholesale','311.3d','COGS - DE - Wholesale','210.5e','Sales - DE - Wholesale','1000.73a','Fulfilment - DE - Wholesale','312.4j','Cost of Sales - DE - Wholesale'),
  ('DE - Amazon','DE','Amazon','311.3e','COGS - DE - Amazon','201e','Sales - DE - Amazon','1000.79','Fulfilment - DE - Amazon','312.4k','Cost of Sales - DE - Amazon'),
  ('CA - Wholesale','CA','Wholesale','311.4c','COGS - CA - Wholesale','210.5c','Sales - CA - Wholesale','303.46','Fulfilment - CA - Wholesale','312.5a','Cost of Sales - CA - Wholesale'),
  ('CA - Shopify','CA','Shopify','311.4a','COGS - CA - Shopify','200c','Sales - CA - Shopify','303.42','Fulfilment - CA - Shopify','312.5b','Cost of Sales - CA - Shopify'),
  ('CA - Co-Brand/Custom','CA','Co - Brand/Custom','311.9c','COGS - CA - Co-Brand/Custom','210.6c','Sales - CA - Co-Brand/Custom',NULL,NULL,'312.5c','Cost of Sales - CA - Co-Brand/Custom'),
  ('CA - Amazon','CA','Amazon','311.4b','COGS - CA - Amazon','201c','Sales - CA - Amazon','303.41','Fulfilment - CA - Amazon','312.5d','Cost of Sales - CA - Amazon'),
  ('SPEND - WHOLESALE (CONSULTING / OTHER)','SPEND','WHOLESALE (CONSULTING / OTHER)','1000.44','SPEND - WHOLESALE (CONSULTING / OTHER)',NULL,NULL,'1000.44','SPEND - WHOLESALE (CONSULTING / OTHER)',NULL,NULL),
  ('SPEND - MARKETING (OTHER) (EXCL AD SPEND)','SPEND','MARKETING (OTHER) (EXCL AD SPEND)','1000.47','SPEND - MARKETING (OTHER) (EXCL AD SPEND)',NULL,NULL,'1000.47','SPEND - MARKETING (OTHER) (EXCL AD SPEND)',NULL,NULL),
  ('Spend - Photo, Video & Media Creation (Shoots)','Spend','Photo, Video & Media Creation (Shoots)','1000.61','Spend - Photo, Video & Media Creation (Shoots)',NULL,NULL,'1000.61','Spend - Photo, Video & Media Creation (Shoots)',NULL,NULL),
  ('International Distributors (Co Brand)',NULL,NULL,'311.5g','COGS - International Distributors (Co Brand)','210.7y','Sales - International Distributors (Co Brand)',NULL,NULL,'312.3d','Cost of Sales - International Distributors (Co Brand)'),
  ('Charitable or Giveaways',NULL,NULL,'311.7c','COGS - Charitable or Giveaways',NULL,NULL,'311.7c','COGS - Charitable or Giveaways',NULL,NULL),
  ('AU XERO',NULL,NULL,'AU XERO',NULL,NULL,NULL,NULL,NULL,NULL,NULL),
  ('AU - Shopify','AU','Shopify','401.3','COGS - AU - Shopify','200e','Sales - Shopify AU','427','Fulfilment - AU - Shopify','405.1','Shopify Fees - AU'),
  ('AU - Amazon','AU','Amazon','401.4','COGS - AU - Amazon','201e','Sales - Amazon - AU','427.1','Fulfilment - AU - Amazon','311','Seller''s Fees - Amazon (AU)'),
  ('AU - Wholesale & Distributor','AU','Wholesale & Distributor','401.5','COGS - AU - Wholesale & Distributor','210e','Sales - Wholesale - AU','427.2','Fulfilment - AU - Wholesale',NULL,NULL),
  ('AU - Other','AU','Other','401.9','COGS - AU - Other','200z','Sales - Shopify - ROW','427.3','Fulfilment - AU - Other/ROW',NULL,NULL)
ON CONFLICT (label) DO NOTHING;
