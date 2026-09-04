-- 261: PRODUCT development — configurable COMPONENT catalogue (replaces the hard-coded product/packaging/labels/
-- polybag/other aspects). Each product development is made of components, each aligned to a supplier and each with
-- its own sampling. This table is the catalogue of component TYPES, managed in PRODUCT ▸ Config (flat list).
--
--   name             — e.g. Product body · Pouch · Box · Hang tag · Care label · Polybag
--   default_supplier — a specific supplier name, or NULL = "the product's main supplier" (overridable per product)
--   sampling_mode    — 'sampled' (full sample+approval cycle) | 'spec_linked' (points at a Specification, no sampling
--                       unless it changes, e.g. Polybag)
--
-- P2 (per-product components + supplier override + portal read-only-others) builds on this; nothing reads it yet.

CREATE TABLE IF NOT EXISTS planner.component_types (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name             text    NOT NULL,
  default_supplier text,                                  -- NULL / '' = the product's main supplier
  sampling_mode    text    NOT NULL DEFAULT 'sampled',    -- sampled | spec_linked
  sort             int     NOT NULL DEFAULT 0,
  active           boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name)
);
