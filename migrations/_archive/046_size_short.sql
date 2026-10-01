-- 046_size_short.sql — short size code for the barcode label's size circle (v20.208)
--
-- The product barcode label shows a small black circle with a short size code (S / M / L / XL / XS …).
-- This comes from the source PIM field "size_short". It was not previously extracted into sku_labels.
-- Rule: display size_short verbatim in the circle; when size_short is "One Size" (or blank) show no circle.
-- POPULATE from the SKU_CHILD / Airtable source (Diviyaj / n8n) — this migration only adds the column.
ALTER TABLE planner.sku_labels ADD COLUMN IF NOT EXISTS size_short text;
