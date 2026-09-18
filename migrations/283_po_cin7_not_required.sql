-- 283: per-PO "not required in Cin7" flag (v27.740, Ben).
--
-- The ERP split (Cin7 + Fulfil) on the PO grid: a PO can be marked "not required in Cin7" (ticked on the order plan),
-- which suppresses Cin7 drift / update actions for it. Every PO is still REQUIRED in Fulfil (no fulfil opt-out).
-- Additive; default false so existing POs are unchanged (still tracked against Cin7).

ALTER TABLE planner.purchase_orders ADD COLUMN IF NOT EXISTS cin7_not_required boolean NOT NULL DEFAULT false;
