-- SUG-0020 DTC Mismatch: on-demand import of Cin7 sales orders for the Direct-to-Client branches
-- (Direct to Client 5051, UK B2B JLEW 27889, UK B2B NEXT 27890) + their line items, to reconcile against POs.
CREATE TABLE IF NOT EXISTS planner.dtc_sales_orders (
  cin7_id bigint PRIMARY KEY,
  reference text, customer_order_no text,
  branch_id bigint, branch_name text, company text,
  stage text, status text, is_void boolean DEFAULT false,
  dispatched_date date, invoice_date date,
  created_date timestamptz, modified_date timestamptz,
  total numeric, imported_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS planner.dtc_sales_order_lines (
  id serial PRIMARY KEY, so_cin7_id bigint NOT NULL,
  code text, name text, qty numeric, barcode text
);
CREATE INDEX IF NOT EXISTS dtc_so_lines_soid_idx ON planner.dtc_sales_order_lines (so_cin7_id);
-- order-level review: a note + "accept discrepancy" so an accepted order drops out of the issue count
CREATE TABLE IF NOT EXISTS planner.dtc_mismatch_review (
  so_cin7_id bigint PRIMARY KEY, note text,
  accepted boolean DEFAULT false, accepted_by text, updated_at timestamptz DEFAULT now()
);
