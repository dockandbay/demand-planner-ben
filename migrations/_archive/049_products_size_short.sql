-- 049_products_size_short.sql — size_short on products (label size circle source) (v20.218)
-- POPULATE from SKU_CHILD. Values e.g. S/M/L/XL; "One Size" (or blank) = no circle on the label.
ALTER TABLE planner.products ADD COLUMN IF NOT EXISTS size_short text;
