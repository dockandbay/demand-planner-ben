-- 236: PO ▸ Shipments tickbox "Confirmed in 3PL system" — a per-PO flag that the PO has been entered into the
-- 3PL's own system. Additive boolean, default false. Surfaced on the Pipeline card as a ✅3pl / ❓3pl badge.
ALTER TABLE planner.purchase_orders ADD COLUMN IF NOT EXISTS confirmed_in_3pl boolean DEFAULT false;
