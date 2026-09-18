-- set_bom_bundles_f1_2026-08-20.sql  (NON-migration data load — run manually on LIVE)
-- GIFT-BOX-HOME bundle SETs from the CHILD-BOM Bundles (F1) export: 9 component rows across 3 SETs. Idempotent.

BEGIN;
INSERT INTO planner.set_bom (output_sku, input_sku, input_quantity) VALUES
  ('GIFT-BOX-HOME-BOHMDRM-SET', 'BAGTOI-MD-BOHMDRM', 1),
  ('GIFT-BOX-HOME-BOHMDRM-SET', 'EYEMASK-DES-BOHMDRM', 1),
  ('GIFT-BOX-HOME-BOHMDRM-SET', 'HAIRW-WAF-BOHMDRM', 1),
  ('GIFT-BOX-HOME-CHRYBMB-SET', 'HAIRW-WAF-CHRYBMB', 1),
  ('GIFT-BOX-HOME-CHRYBMB-SET', 'EYEMASK-DES-CHRYBMB', 1),
  ('GIFT-BOX-HOME-CHRYBMB-SET', 'BAGTOI-MD-CHRYBMB', 1),
  ('GIFT-BOX-HOME-SEASOIR-SET', 'BAGTOI-MD-SEASOIR', 1),
  ('GIFT-BOX-HOME-SEASOIR-SET', 'HAIRW-WAF-SEASOIR', 1),
  ('GIFT-BOX-HOME-SEASOIR-SET', 'EYEMASK-DES-SEASOIR', 1)
ON CONFLICT (output_sku, input_sku) DO UPDATE SET input_quantity=excluded.input_quantity, updated_at=now();
COMMIT;
