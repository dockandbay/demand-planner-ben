-- 118: "Country risk" approval on order-plan lines.
-- Flags a line where the SKU is not available (v_product_availability.is_available) in the PO's destination
-- market (UK/US/EU/AU/CA) — i.e. producing a SKU for a market it isn't released in. Availability is
-- authoritative; launch dates are ignored. This column records that a user has reviewed & approved the risk
-- (mirrors partial_carton_approved / supplier_risk_approved / discontinue_approved).
ALTER TABLE planner.purchase_order_lines
  ADD COLUMN IF NOT EXISTS country_risk_approved boolean NOT NULL DEFAULT false;
