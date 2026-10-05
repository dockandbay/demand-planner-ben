# Migrations

The `planner` schema is now defined by a single consolidated baseline instead of 61 incremental files.

## Files

- **`schema.sql`** — consolidated baseline. The full `planner` schema (60 tables + 3 views, all
  constraints/indexes/sequences) as of migration 061. Generated via
  `pg_dump --schema=planner --schema-only`. **Validated** by rebuilding it into a throwaway schema
  (recreates all 63 objects cleanly).
- **`_archive/001_*.sql … 061_*.sql`** — the original incremental migrations, kept for history /
  audit. These have already been applied to the sandbox and (where applicable) production.

## How to use

- **Fresh database (e.g. standing up a new env):** run `schema.sql` once. Done — no need to replay
  61 files.
- **Existing database (sandbox / production):** already migrated. **Do NOT run `schema.sql` against
  it** — it would collide with existing objects. (`CREATE SCHEMA` is `IF NOT EXISTS`, but the table
  creates are not idempotent.)
- **New schema changes from here on:** add a new numbered migration on top of the baseline —
  `062_*.sql`, `063_*.sql`, … — and run only that against existing DBs. Periodically these can be
  folded back into `schema.sql` (regenerate the dump) to keep the baseline current.

## Notes for the live migration (Diviyaj)

- The baseline is `planner`-only. The Trade Board (`public`) and China app (`china`) schemas are
  separate and not included here.
- `schema.sql` is pure SQL (psql `\restrict` meta-commands stripped) so it runs under either `psql`
  or the node-`pg` runner scripts.
- If production already has migrations 001–0NN applied, run only the remaining `_archive/` files
  (0NN+1 … 061) to catch up — the baseline is for fresh setups.

## Index of numbered migrations (062 onwards)

v28.151 (review G7). Generated from the tracked files in this folder. **Applied on live:** per Diviyaj's deploy baseline, live
(v28.142.3) had migrations **321 to 326** applied as of **01-Oct-26**; anything numbered above 326 is pending for live. There is no
applied-on-live ledger for older numbers in this repo: confirm with Diviyaj (or the `planner` schema state) before re-running anything.

### Duplicate numbers (check both files were applied; do not renumber files already applied on live)

- **133**: `133_product_sample_shipment_links.sql`, `133_sample_request_dev_samples.sql`
- **145**: `145_portal_payment_notification.sql`, `145b_payment_fx_backfill_bank_usd.sql`
- **095, 096**: each also has a local `*_seed.sql` data file (`095_product_size_long_seed.sql`, `096_manufacturing_bom_seed.sql`), gitignored by the `*_seed.sql` rule, so the repo shows one file per number.
- **098, 099**: `098_product_inventory_refresh.sql` and `099_product_carton_dims.sql` are one-off live data loads, gitignored (not in the repo).

### Unnumbered files (one-off deploy bundles, data fixes and seeds; not part of the numbered sequence)

- `deploy_v25.351_live.sql`
- `diviyaj_deploy_2026-08-10.sql`
- `fix_phantom_zero_forecasts_2026-09-04.sql`
- `fix_planner_created_by_2026-09-04.sql`
- `schema.sql`
- `seed_component_types_2026-09-04.sql`
- `seed_fulfil_channels_2026-09-21.sql`
- `seed_fulfil_ids_2026-09-17.sql`
- `seed_pantone_coated_bootstrap_2026-09-04.sql`
- `seed_pantone_tcx_bootstrap_2026-09-04.sql`
- `seed_timeline_phrases_2026-09-04.sql`
- `_archive/001_*.sql` to `_archive/061_*.sql`: folded into `schema.sql` (see above).

### Numbered files

| # | File |
|---|---|
| 062 | `062_erp_purchase_orders.sql` |
| 063 | `063_po_credit_amount.sql` |
| 064 | `064_erp_sync_model.sql` |
| 065 | `065_supplier_link_fix.sql` |
| 066 | `066_fin_overlay_subcategory.sql` |
| 067 | `067_fin_overlay_period.sql` |
| 068 | `068_erp_lines_backfill.sql` |
| 069 | `069_add_cin7_suppliers.sql` |
| 070 | `070_oplan_exception_approvals.sql` |
| 071 | `071_fix_po55ukxr2_lines.sql` |
| 072 | `072_client_fba_tab.sql` |
| 073 | `073_po_asn_numbers.sql` |
| 074 | `074_supplier_po_confirmation.sql` |
| 075 | `075_shipment_notes.sql` |
| 076 | `076_shipment_escalated.sql` |
| 077 | `077_prod_require_confirmation.sql` |
| 078 | `078_shipment_notes_read.sql` |
| 079 | `079_shipment_supplier_created.sql` |
| 080 | `080_forecast_export_settings.sql` |
| 081 | `081_prod_no_p53_to_53.sql` |
| 082 | `082_po_shipment_starred.sql` |
| 083 | `083_streamline_prod_no.sql` |
| 084 | `084_samples.sql` |
| 085 | `085_sample_change_requested.sql` |
| 086 | `086_po_packing_labelling.sql` |
| 087 | `087_pack_default_yes.sql` |
| 088 | `088_po_deposit_ref_index.sql` |
| 089 | `089_productions_57_78_active_confirm.sql` |
| 090 | `090_erp_compare_ignored.sql` |
| 091 | `091_invoice_processed_date.sql` |
| 092 | `092_key_accounts.sql` |
| 093 | `093_product_dims.sql` |
| 094 | `094_availability_include_prelaunch.sql` |
| 095 | `095_product_size_long.sql` |
| 096 | `096_manufacturing_bom.sql` |
| 097 | `097_manufacturing_accept.sql` |
| 100 | `100_inventory_from_products.sql` |
| 101 | `101_sample_production_status.sql` |
| 102 | `102_supplier_cin7_member_id.sql` |
| 103 | `103_app_permissions.sql` |
| 104 | `104_product_invoice_fields.sql` |
| 105 | `105_invoice_consignees.sql` |
| 106 | `106_supplier_te_id.sql` |
| 107 | `107_preship_not_required.sql` |
| 108 | `108_action_state_snoozed_by.sql` |
| 109 | `109_planning_scope_derived.sql` |
| 110 | `110_retire_product_countries.sql` |
| 111 | `111_crossdock_notes.sql` |
| 112 | `112_forecast_notes.sql` |
| 113 | `113_app_settings.sql` |
| 114 | `114_cleanup_unused_tables.sql` |
| 115 | `115_shipping_prodstatus_shipped.sql` |
| 116 | `116_po_approved_lines.sql` |
| 117 | `117_completed_delivered_prodstatus_shipped.sql` |
| 118 | `118_po_line_country_risk_approved.sql` |
| 119 | `119_product_supplier_costs.sql` |
| 120 | `120_supplier_grs_fulfil.sql` |
| 121 | `121_export_port.sql` |
| 122 | `122_weather_cache.sql` |
| 123 | `123_v_po_finance.sql` |
| 124 | `124_tpl_invoice.sql` |
| 125 | `125_ka_forecast_id.sql` |
| 126 | `126_suggestions.sql` |
| 127 | `127_dtc_shipment_details.sql` |
| 128 | `128_product_module.sql` |
| 129 | `129_product_supplier.sql` |
| 130 | `130_product_samples.sql` |
| 131 | `131_landing_page.sql` |
| 132 | `132_product_sample_shipments.sql` |
| 133 | `133_product_sample_shipment_links.sql` |
| 133 | `133_sample_request_dev_samples.sql` |
| 135 | `135_product_approved_at.sql` |
| 136 | `136_sample_status_planned.sql` |
| 137 | `137_key_account_forwarder.sql` |
| 138 | `138_dtc_approved_snapshot.sql` |
| 139 | `139_branch_delivery_notes.sql` |
| 140 | `140_shipment_delivery_notes.sql` |
| 141 | `141_sample_approved_lines.sql` |
| 142 | `142_additional_cost_approved.sql` |
| 143 | `143_document_approval.sql` |
| 144 | `144_branch_delivery_notes_apply.sql` |
| 145 | `145_portal_payment_notification.sql` |
| 145b | `145b_payment_fx_backfill_bank_usd.sql` |
| 146 | `146_null_stale_landing_date_overide.sql` |
| 147 | `147_payment_fx_currency_from_supplier.sql` |
| 148 | `148_product_size_sku_and_approved_sample.sql` |
| 149 | `149_portal_attachment_uploader_kind.sql` |
| 150 | `150_product_dimensions.sql` |
| 151 | `151_product_components.sql` |
| 152 | `152_sample_aspects.sql` |
| 153 | `153_sample_sizes.sql` |
| 154 | `154_sample_supplier_status.sql` |
| 155 | `155_note_attachment.sql` |
| 156 | `156_sample_admin_feedback.sql` |
| 157 | `157_note_mentions.sql` |
| 158 | `158_po_change_log.sql` |
| 159 | `159_email_log.sql` |
| 160 | `160_quality_docs.sql` |
| 161 | `161_supplier_expedited_weeks.sql` |
| 162 | `162_suggestion_stakeholders.sql` |
| 163 | `163_branch_fulfil_id.sql` |
| 164 | `164_payment_remittance.sql` |
| 165 | `165_shipment_change_log.sql` |
| 166 | `166_product_recipient_countries.sql` |
| 167 | `167_sample_second_recipient.sql` |
| 168 | `168_demand_revenue_targets.sql` |
| 169 | `169_price_changes.sql` |
| 170 | `170_buy_complex_rules.sql` |
| 171 | `171_transfer_lead_times.sql` |
| 172 | `172_sample_change_log.sql` |
| 173 | `173_analytics_readonly_role.sql` |
| 174 | `174_revenue_quarterly_targets.sql` |
| 175 | `175_revenue_target_periods.sql` |
| 176 | `176_tpl_cin7_orders.sql` |
| 177 | `177_tpl_cin7_imports.sql` |
| 178 | `178_tpl_cin7_imports_status.sql` |
| 179 | `179_fba_pending_transfers.sql` |
| 180 | `180_custom_orders.sql` |
| 181 | `181_product_dev_change_log.sql` |
| 182 | `182_zalando_stock.sql` |
| 183 | `183_xero_compare_snapshot.sql` |
| 184 | `184_b2b_analysis.sql` |
| 185 | `185_ka_carton_label_format.sql` |
| 186 | `186_klaviyo_bis.sql` |
| 187 | `187_klaviyo_bis_uploads.sql` |
| 188 | `188_product_spec_types.sql` |
| 189 | `189_product_specs.sql` |
| 190 | `190_product_specs_confirm_suppliers.sql` |
| 191 | `191_product_specs_effective_split.sql` |
| 192 | `192_zalando_stock_uploaded_by.sql` |
| 193 | `193_product_specs_approval_status.sql` |
| 194 | `194_product_specs_superseding.sql` |
| 195 | `195_product_spec_approvals.sql` |
| 196 | `196_dtc_sales_orders.sql` |
| 197 | `197_manufacturing_stock_cover.sql` |
| 198 | `198_revenue_target_gbp.sql` |
| 199 | `199_forecast_changes.sql` |
| 200 | `200_key_account_seller_entity.sql` |
| 203 | `203_zalando_forecast.sql` |
| 204 | `204_sales_actuals_allow_zal.sql` |
| 205 | `205_channels_registry.sql` |
| 206 | `206_recently_received_pos.sql` |
| 207 | `207_product_dev_type.sql` |
| 208 | `208_xero_compare_file.sql` |
| 209 | `209_master_pos.sql` |
| 211 | `211_products_3pl_onhand.sql` |
| 212 | `212_inventory_3pl_imports.sql` |
| 213 | `213_vpol_carton_from_products.sql` |
| 214 | `214_supplier_timing_review.sql` |
| 215 | `215_v_sku_attrs.sql` |
| 216 | `216_inventory_fba_imports.sql` |
| 217 | `217_v_sku_attrs_products_first.sql` |
| 218 | `218_v_sku_attrs_products_only.sql` |
| 219 | `219_po_delivery_history.sql` |
| 220 | `220_forecast_snapshots.sql` |
| 221 | `221_po_pallets_override.sql` |
| 222 | `222_dtc_po_review.sql` |
| 223 | `223_ship_plan_locks.sql` |
| 224 | `224_sales_actuals_allow_tik.sql` |
| 225 | `225_sample_notify_emails.sql` |
| 226 | `226_action_metrics_snapshot.sql` |
| 227 | `227_action_metrics_reallocations.sql` |
| 228 | `228_sample_purpose_accounts.sql` |
| 229 | `229_set_bom.sql` |
| 230 | `230_planning_scope_include_sets.sql` |
| 231 | `231_user_favourites.sql` |
| 232 | `232_inventory_snapshots_seed_prep.sql` |
| 233 | `233_prepack_map.sql` |
| 234 | `234_drop_sell_through_targets.sql` |
| 235 | `235_v_po_finance_blank_deposit_est.sql` |
| 236 | `236_po_confirmed_in_3pl.sql` |
| 237 | `237_v_po_finance_completion_floor.sql` |
| 238 | `238_seed_set_bom_prepack_data.sql` |
| 239 | `239_price_lists.sql` |
| 240 | `240_price_type_meta.sql` |
| 241 | `241_price_list_excluded_skus.sql` |
| 242 | `242_report_notes.sql` |
| 243 | `243_launch_ramp.sql` |
| 244 | `244_edi_projects.sql` |
| 245 | `245_products_polybags.sql` |
| 246 | `246_branches_returns_pct.sql` |
| 247 | `247_seed_polybags_price_type.sql` |
| 248 | `248_planning_scope_status_gate.sql` |
| 249 | `249_filter_rules.sql` |
| 250 | `250_avail_no_disc.sql` |
| 251 | `251_seed_contrib_model_towels.sql` |
| 252 | `252_seed_glow_dtc_forecasts.sql` |
| 253 | `253_remove_gift_box_cactmntn_set.sql` |
| 254 | `254_dtc_po_so_map.sql` |
| 255 | `255_product_stage_bulk_colour.sql` |
| 256 | `256_product_sample_aspect_feedback.sql` |
| 257 | `257_sample_received.sql` |
| 258 | `258_product_timeline_tags_snippets.sql` |
| 259 | `259_pantone_colors.sql` |
| 260 | `260_barcode_projects.sql` |
| 261 | `261_component_types.sql` |
| 262 | `262_product_dev_components.sql` |
| 263 | `263_backfill_components_from_dimensions.sql` |
| 264 | `264_sample_reject_reasons.sql` |
| 265 | `265_sample_photography_approval.sql` |
| 266 | `266_sample_aspect_awc_comment.sql` |
| 267 | `267_portal_attachments_aspect.sql` |
| 268 | `268_barcode_projects_pos.sql` |
| 269 | `269_timeline_note_attachments.sql` |
| 270 | `270_buy_projects.sql` |
| 271 | `271_po_client_fba_fields.sql` |
| 272 | `272_key_account_client_fba_fields.sql` |
| 273 | `273_sample_request_recipients.sql` |
| 274 | `274_sample_internal_stakeholders.sql` |
| 275 | `275_sample_fulfilment_source.sql` |
| 276 | `276_storage_paths.sql` |
| 277 | `277_category_colour.sql` |
| 278 | `278_product_dev_requests.sql` |
| 279 | `279_product_doc_latest_thumb.sql` |
| 280 | `280_size_component_sampling.sql` |
| 281 | `281_carrier_tracking.sql` |
| 282 | `282_fulfil_po_mirror.sql` |
| 283 | `283_po_cin7_not_required.sql` |
| 284 | `284_sample_short_code.sql` |
| 285 | `285_drop_moved_item_columns.sql` |
| 286 | `286_note_sample_id.sql` |
| 287 | `287_dev_request_accepted.sql` |
| 288 | `288_fulfil_compare_ignored.sql` |
| 289 | `289_tpl_fulfil_orders.sql` |
| 290 | `290_fulfil_mirror_req_delivery.sql` |
| 291 | `291_fba_pending_transfers_source.sql` |
| 292 | `292_perf_indexes.sql` |
| 293 | `293_product_workshop_barcodes.sql` |
| 294 | `294_product_dev_sizes_barcode_working_sku.sql` |
| 295 | `295_product_pim_waiting_room.sql` |
| 296 | `296_product_dev_requests_recipient_addresses.sql` |
| 297 | `297_product_dev_requests_action_owner.sql` |
| 298 | `298_supplier_notes_supplier_scope_backfill.sql` |
| 299 | `299_feedback_notes_sample_id_backfill.sql` |
| 300 | `300_perf_indexes.sql` |
| 301 | `301_supplier_onboarding.sql` |
| 302 | `302_fulfil_internal_shipments_mirror.sql` |
| 303 | `303_tpl_fulfil_shipments.sql` |
| 304 | `304_auto_forecast_feed.sql` |
| 305 | `305_erp_drift_approved.sql` |
| 306 | `306_client_portal.sql` |
| 307 | `307_ai_assistant.sql` |
| 308 | `308_forecast_inheritance.sql` |
| 309 | `309_buy_plan_snapshot.sql` |
| 310 | `310_auto_forecast_result.sql` |
| 311 | `311_po_links.sql` |
| 312 | `312_xero_push_queue.sql` |
| 313 | `313_flexport_api_shipments.sql` |
| 314 | `314_v_po_finance_flexport_effective_split.sql` |
| 315 | `315_app_permissions_inbox_types.sql` |
| 316 | `316_v_po_finance_flexport_split_fix.sql` |
| 317 | `317_xero_bills.sql` |
| 318 | `318_distributor_offers.sql` |
| 319 | `319_client_price_tier.sql` |
| 320 | `320_review_indexes.sql` |
| 321 | `321_po_finance_perf_indexes.sql` |
| 322 | `322_v_po_finance_setbased.sql` |
| 323 | `323_payment_fx_region.sql` |
| 324 | `324_payment_xero_bills.sql` |
| 325 | `325_seed_payment_xero_bills.sql` |
| 326 | `326_ai_message_feedback.sql` |
