-- 097_manufacturing_accept.sql
-- Sign-off of a component shortage/overage in SUPPLY ▸ Manufacturing: when the manufacturing POs' component
-- quantity doesn't match the finished-bundle demand, a user ticks "Accept" to acknowledge the difference.
CREATE TABLE IF NOT EXISTS planner.manufacturing_accept (
  component_sku text PRIMARY KEY,
  accepted      boolean NOT NULL DEFAULT true,
  accepted_by   text,
  accepted_at   timestamptz DEFAULT now()
);
