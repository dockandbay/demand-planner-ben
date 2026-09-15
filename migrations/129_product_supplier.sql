-- 129_product_supplier.sql — add supplier to product-development items.
-- Supplier is part of the Product master data (picked via the same supplier search-dropdown as the PO grid),
-- and its short code is embedded in the reference: SEASON-CATEGORYCODE-SUPPLIERCODE-NN (e.g. SS27-TOWLB-LX-01).
-- Ref counter stays per (season, category); the supplier code is captured when the ref is minted.

alter table planner.product_dev_items add column if not exists supplier text;
alter table planner.product_dev_items add column if not exists supplier_code text;
