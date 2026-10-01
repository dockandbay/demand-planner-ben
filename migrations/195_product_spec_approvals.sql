-- SUG-0019 P3: per-supplier acknowledgement of a "Require Supplier Confirmation" spec. One row per (spec, supplier) once approved.
CREATE TABLE IF NOT EXISTS planner.product_spec_approvals (
  spec_id integer NOT NULL,
  supplier_name text NOT NULL,
  approved_by text,
  approved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (spec_id, supplier_name)
);
