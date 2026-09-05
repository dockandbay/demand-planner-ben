-- 223: Plan Shipments "Confirmed — do not change" lock. Keyed by the container reference (the shipment's master PO
-- number). When confirmed, that shipment + its POs are frozen in the Plan Shipments drawer (not draggable) and are
-- excluded from the consolidation recommendations. Purely a planning lock — does not touch the shipment/PO records.
CREATE TABLE IF NOT EXISTS planner.ship_plan_locks (
  ref         text PRIMARY KEY,
  confirmed   boolean NOT NULL DEFAULT true,
  updated_by  text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
