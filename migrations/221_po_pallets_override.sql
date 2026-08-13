-- 221: per-PO pallet-count override for shipment planning. The estimate is Σ(line qty ÷ sku pallet_qty) from
-- v_sku_attrs; when this override is set it is used INSTEAD of the estimate in ALL shipment calculations (freight
-- cost, container fill, cash flow). Nullable → null = use the estimate (behaviour identical to before). Editable by
-- both D&B admin (PO ▸ SHIPMENTS tab) and the supplier (portal) — same field; every change is logged to the PO timeline.
ALTER TABLE planner.purchase_orders ADD COLUMN IF NOT EXISTS pallets_override numeric;
