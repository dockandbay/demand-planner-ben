-- 262: PRODUCT development — per-product COMPONENT instances (redesign P2). A product development is made of
-- components chosen from the catalogue (mig 261), each aligned to a supplier and each with its own sampling.
--
--   item_ref          — the product (planner.product_dev_items.ref)
--   component_type_id — the catalogue type it was added from (nullable — a type can be renamed/removed)
--   name              — snapshot of the type name (survives catalogue edits)
--   supplier          — resolved supplier for THIS product's component; NULL = the product's main supplier
--   sampling_mode     — 'sampled' (sample + approval cycle) | 'spec_linked' (points at a Specification, no sampling)
--   spec_id           — when spec_linked, the linked Specification (planner.product_specifications.id)
--
-- Files / approval / samples will hang off a component in the next slice; this table is the per-product component set
-- + its supplier + sampling mode. Portal edit-gating (a supplier edits only their own components, others read-only)
-- reads `supplier` here.

CREATE TABLE IF NOT EXISTS planner.product_dev_components (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  item_ref          text    NOT NULL,
  component_type_id bigint  REFERENCES planner.component_types(id) ON DELETE SET NULL,
  name              text    NOT NULL,
  supplier          text,                                  -- NULL = the product's main supplier
  sampling_mode     text    NOT NULL DEFAULT 'sampled',    -- sampled | spec_linked
  spec_id           bigint,
  sort              int     NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_ref, name)
);
CREATE INDEX IF NOT EXISTS product_dev_components_item ON planner.product_dev_components (item_ref);
