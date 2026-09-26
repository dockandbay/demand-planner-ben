-- 288: Fulfil COMPARE "ignore" list (Ben 21-Sep). Mirrors erp_compare_ignored but for the new Fulfil compare
-- report (open Fulfil POs missing from the planner). Keyed by the Fulfil PO's Horizon key (number, else reference).
-- Additive, rollback-safe.
CREATE TABLE IF NOT EXISTS planner.fulfil_compare_ignored (
  po text PRIMARY KEY,
  ignored_by text,
  ignored_at timestamptz DEFAULT now()
);
