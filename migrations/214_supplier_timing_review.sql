-- 214: Supplier Timing report — mark a PO's delay as OUR issue (not the supplier) so it's excluded from the
-- supplier's slip stats, with an optional manually-entered delay (days) + note. Additive.
CREATE TABLE IF NOT EXISTS planner.supplier_timing_review (
  po                text PRIMARY KEY,
  our_issue         boolean DEFAULT false,
  manual_delay_days integer,
  note              text,
  updated_by        text,
  updated_at        timestamptz DEFAULT now()
);
