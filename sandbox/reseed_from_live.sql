-- ============================================================================
-- RESEED SANDBOX FROM LIVE  (run this in YOUR SANDBOX Supabase SQL editor)
-- ============================================================================
-- Copies the ERP / source-of-truth tables from LIVE (prod) into your sandbox so
-- the buy plan reproduces live numbers (dates, inbound, POs, stock, sales).
--
-- ✅ RESEEDS (overwritten from live): suppliers, branches, products,
--    shipments, purchase_orders, purchase_order_lines, inbound_shipments,
--    sales_actuals
-- ⛔ LEAVES ALONE (your edits are preserved): forecast_outputs, forecast_inputs,
--    buy_complex_rules, transfer_lead_times, preorders, key_account_forecasts,
--    demand_action_state, suggestions, samples/portal tables, etc.
--
-- This is DATA-ONLY (TRUNCATE + INSERT into existing tables). It does NOT touch
-- your schema, so your session migrations stay intact — no need to re-apply them.
-- LIVE is only ever READ (SELECT over the foreign server). Nothing writes to prod.
--
-- ── ONE-TIME SETUP: fill in the 4 LIVE connection values below ───────────────
-- In the Supabase dashboard for the LIVE project (oolwklahstnvocaugryg):
--   Connect ▸ "Session pooler"  → copy Host, and use:
--     host     = <the pooler host, e.g. aws-0-eu-west-2.pooler.supabase.com>
--     port     = 5432
--     dbname   = postgres
--     user     = postgres.oolwklahstnvocaugryg
--     password = <the LIVE database password>
--   (Use the SESSION POOLER, not the direct db.<ref>.supabase.co host — that is
--    IPv6-only and FDW from another project usually can't reach it.)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- fresh foreign link (drops any prior one)
DROP SERVER IF EXISTS live_src CASCADE;
CREATE SERVER live_src FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (host 'REPLACE_LIVE_HOST', port '5432', dbname 'postgres', sslmode 'require');
CREATE USER MAPPING FOR CURRENT_USER SERVER live_src
  OPTIONS (user 'REPLACE_LIVE_USER', password 'REPLACE_LIVE_PASSWORD');

-- mirror the live tables as foreign tables under live_planner.*
DROP SCHEMA IF EXISTS live_planner CASCADE;
CREATE SCHEMA live_planner;
IMPORT FOREIGN SCHEMA planner
  LIMIT TO (suppliers, branches, products, shipments,
            purchase_orders, purchase_order_lines, inbound_shipments, sales_actuals)
  FROM SERVER live_src INTO live_planner;

-- ── LOAD (one transaction; all-or-nothing) ─────────────────────────────────
BEGIN;

-- Disable FK/trigger side-effects during the bulk reload. If your role can't set
-- this, delete the next line and the matching reset below — the load still works
-- (live data is referentially consistent), triggers just fire as normal.
SET session_replication_role = 'replica';

TRUNCATE planner.suppliers, planner.branches, planner.products, planner.shipments,
         planner.purchase_orders, planner.purchase_order_lines,
         planner.inbound_shipments, planner.sales_actuals;

INSERT INTO planner.suppliers (id, code, name, business_name, kind, default_currency, start_deposit_pct, completion_pct, balance_pct, credit_days, credit_type, credit_fee_on_balance_pct, production_days, incoterm, contact_name, email, phone, address_1, address_2, city, state, country, postcode, active, notes, created_at, updated_at, cin7_member_id, te_id, fulfil_id, export_port, include_product_dev, expedited_production_weeks)
  SELECT * FROM live_planner.suppliers;

INSERT INTO planner.branches (name, country_code, sea_lead_time_days, air_lead_time_days, address, shipping_notes, delivery_notes, fulfil_id)
  SELECT * FROM live_planner.branches;

INSERT INTO planner.products (sku, product_name, category, subcategory, market_tier, core_seasonal, replacement_sku, source, loaded_at, moq, case_pack_size, supplier, production_lead_time_weeks, china_to_uk_lead_time_weeks, china_to_us_lead_time_weeks, china_to_eu_lead_time_weeks, china_to_au_lead_time_weeks, china_to_ca_lead_time_weeks, transfer_3pl_to_fba_lead_time_weeks, in_planning_scope, awd_us, prod_weight_uk, uk_rt, us_rt, eu_rt, available_uk_dtc, available_uk_fba, available_uk_b2b, available_us_dtc, available_us_fba, available_us_b2b, available_eu_dtc, available_eu_fba, available_eu_b2b, available_au_dtc, available_au_fba, available_ca_fba, au_rt, ca_rt, inventory_uk_nongrs, inventory_us_nongrs, main_supplier_final, supplier_multiple_all, status, clearance, colour_long, parent_p1, parent_c1, size, variant_image_url_final, variant_type, shp_upload_final, shp_published_final, asin, "3pl_eu", "3pl_ca", "3pl_au", "3pl_uk", "3pl_us", created_minutes, product_name_final, product_ean, discontinue_date_final, launch_date_overide_ws, release_window, amz_clear_stock, listings_include, discontinue_date_au_final, amz_scope_of_launch_country_list, core_products, marketing_category_final, shp_scope_of_launch_country_list, products, product_select_name, product_category, launch_date_uk, launch_date_us, launch_date_eu, launch_date_au, launch_date_ws, carton_qty, target_cover_overide, target_cover_weeks_au_fba_from, target_cover_weeks_eu_fba_from, target_cover_weeks_us_fba_from, target_cover_weeks_uk_fba_from, target_cover_weeks_eu_3pl_from, target_cover_weeks_au_3pl_from, target_cover_weeks_us_3pl_from, target_cover_weeks_uk_3pl_from, target_cover_weeks_ca_fba_from, launch_date_uk_final, launch_date_au_final, product_scope, notes, is_core, fba_transfer_min_units_uk, fba_transfer_min_units_us, fba_transfer_min_units_eu, fba_transfer_min_units_au, fba_transfer_min_units_ca, discontinue_date_ca, launch_date_ca_retail, from_replacement_sku, target_cover_weeks_uk_3pl_from_category, target_cover_weeks_uk_fba_from_category, target_cover_weeks_us_3pl_from_category, target_cover_weeks_us_fba_from_category, target_cover_weeks_eu_3pl_from_category, target_cover_weeks_eu_fba_from_category, target_cover_weeks_au_3pl_from_category, target_cover_weeks_au_fba_from_category, target_cover_weeks_ca_fba_from_category, target_cover_weeks_uk_3pl, target_cover_weeks_uk_fba, target_cover_weeks_us_3pl, target_cover_weeks_us_fba, target_cover_weeks_eu_3pl, target_cover_weeks_eu_fba, target_cover_weeks_au_3pl, target_cover_weeks_au_fba, target_cover_weeks_ca_fba, category_name_final, subcategory_name_final, categories_copy, sku_barcode, carton_barcode, inner_barcode, barcode_sku_name_final, barcode_carton_name, barcode_inner_name, shp_swatch_final, colour_swatch_url, grs_material_product, grs_approved, grs_material_carton, pallet_qty, inventory_au_3pl, inventory_us_awd, inventory_uk_3pl, inventory_eu_3pl, inventory_us_3pl, inventory_eu_fba, inventory_uk_fba, inventory_us_fba, inventory_au_fba, inventory_ca_fba, size_short, cogs_uk_3pl_final, cogs_us_3pl_final, cogs_eu_3pl_final, cogs_au_3pl_final, cogs_ca_3pl_final, uk_prod_width, us_prod_width, uk_prod_height, us_prod_height, us_prod_length, uk_prod_length, uk_pack_width, us_pack_width, us_pack_height, us_pack_length, uk_pack_height, uk_pack_length, uk_prod_weight, us_prod_weight, uk_carton_width, uk_carton_height, uk_carton_length, uk_carton_weight, us_carton_width, us_carton_height, us_carton_length, us_carton_weight, size_long, sku_invoice_title, hscode_uk, hscode_us, hscode_eu, hscode_ca, hscode_au, cost, cost_lx, cost_xr)
  SELECT * FROM live_planner.products;

INSERT INTO planner.shipments (shipment_ref, master_po, carrier, carrier_ref, departure_date, landing_date, delivery_date, arrival_date, status, notes, created_at, updated_at, mode, cost_manual, tracked_delivery_date, tracked_source, branch, country_code, escalated, escalated_at, supplier_created_at, supplier_created_by, starred, export_port, delivery_notes)
  SELECT * FROM live_planner.shipments;

INSERT INTO planner.purchase_orders (po, supplier_name, supplier_id, status, shipment_ref, prod_no, batch_id, batch_date, branch, client, deposit_ref, erp_po, notes, ship_type, ship_type_overide, sea_lead_time_days, country_code, first_release_window, start_production, end_production_overide, days_production_overide, warehouse_complete_date, landing_date_overide, delivery_date_overide, balance_due_date_overide, supplier_ship_date, supplier_invoice_total, order_value_estimation, deposit_fx_rate, credit_fee_assigned, pay_start_deposit_assigned, pay_start_deposit_date, pay_completion_assigned, pay_completion_date, pay_balance_1_amount, pay_balance_1_date, created_at, updated_at, flexport_reference, start_deposit_pct_override, completion_pct_override, pay_balance_2_amount, pay_balance_2_date, container_size, production_status, production_confirmed_at, client_requirements, sales_order_ref, crossdock_skus, client_po_ref, dispatch_order_ref, final_delivery_address, credit_amount, client_deadline_date, asn_numbers, supplier_confirmed_at, supplier_confirmed_by, starred, pack_polybags, pack_polybags_notes, pack_dnb_barcodes, pack_dnb_barcodes_notes, pack_rfid_barcodes, pack_rfid_barcodes_notes, pack_dnb_carton, pack_dnb_carton_notes, pack_client_carton, pack_client_carton_notes, pack_pallet_notes, pack_other_notes, dtc_accepted_at, dtc_accepted_by, invoice_processed_date, dtc_custom, dtc_key_account, preship_not_required, approved_lines, dtc_approved_snapshot, branch_delivery_notes)
  SELECT * FROM live_planner.purchase_orders;

INSERT INTO planner.purchase_order_lines (id, po_sku, po, sku, qty, carton_qty, partial_carton_approved, cost_price, po_status, created_at, updated_at, erp_qty, proposed_at, proposed_by, erp_cost, supplier_risk_approved, discontinue_approved, country_risk_approved)
  SELECT * FROM live_planner.purchase_order_lines;

INSERT INTO planner.inbound_shipments (id, reference, sku, source_type, source_location, destination_warehouse, quantity, received_quantity, estimated_delivery_date, status, notes, loaded_at)
  SELECT * FROM live_planner.inbound_shipments;

INSERT INTO planner.sales_actuals (sku, country, channel, month, units, revenue, source, loaded_at)
  SELECT * FROM live_planner.sales_actuals;

SET session_replication_role = 'origin';
COMMIT;

-- ── TEARDOWN: remove the live link + creds so nothing lingers ────────────────
DROP SCHEMA IF EXISTS live_planner CASCADE;
DROP SERVER IF EXISTS live_src CASCADE;

-- Sanity check (optional): overdue unreceived inbound now matches live.
-- SELECT count(*) FROM planner.inbound_shipments
--  WHERE coalesce(received_quantity,0) < quantity AND estimated_delivery_date < current_date;
