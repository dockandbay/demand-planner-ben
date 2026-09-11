-- 166: recipient country/countries for a product-development item (SUG-0005). UK / AU / both, default UK.
-- Stored as a comma list ('UK', 'AU', 'UK,AU'). Shown to the supplier on the portal product tab; a change
-- drops a supplier-visible note on the product timeline.
ALTER TABLE planner.product_dev_items ADD COLUMN IF NOT EXISTS recipient_countries text DEFAULT 'UK';
