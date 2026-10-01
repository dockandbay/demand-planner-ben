-- 294_product_dev_sizes_barcode_working_sku.sql
-- Product SIZES master (Ben, phase 2): two new columns on the sizes table so a size can carry a workshop barcode and a
-- provisional "working" SKU before it exists as a real planner.products SKU.
--  • barcode      — an EAN-13 claimed from planner.product_workshop_barcodes (mig 293). One barcode ↔ one size.
--  • working_sku  — a provisional SKU not yet in the products master; the alternative to mapped_sku (the real SKU).
-- Both nullable; existing sizes are unaffected. The claim/release of a pool barcode is handled transactionally in the
-- /api/product/size/:id/barcode endpoint (keeps product_workshop_barcodes.status in sync).
ALTER TABLE planner.product_dev_sizes
  ADD COLUMN IF NOT EXISTS barcode      text,
  ADD COLUMN IF NOT EXISTS working_sku  text;
CREATE INDEX IF NOT EXISTS product_dev_sizes_barcode ON planner.product_dev_sizes (barcode);
