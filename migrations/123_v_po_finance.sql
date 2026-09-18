-- 123: Shared PO-finance view. ONE canonical per-PO payment/date computation that BOTH the admin
-- purchase-orders/cashflow query AND the supplier portal read, so their figures can never drift (they used to be
-- two hand-maintained copies of this CTE — that drift was the portal payment bug). This view is the base..calc4
-- chain verbatim (own-PO dates, no supplier filter, no shipment mastering); admin adds mastering + landed-cost +
-- ERP + action flags on top, the portal selects a supplier-scoped subset. Idempotent (CREATE OR REPLACE).
--
-- Deploy: run BEFORE (or with) the server.mjs change that repoints both queries here — the app will 500 on
-- purchase-orders/portal until this view exists.

CREATE OR REPLACE VIEW planner.v_po_finance AS 
          WITH base AS (
            SELECT po.*, s.credit_days, s.credit_type,
              -- effective %s: per-PO override wins over the supplier's standard terms; small POs (value used
              -- < $500) default to 0% start + 0% completion (→ 100% balance) unless a per-PO override is set.
              -- ONLY for open POs (not complete) — completed history keeps its original supplier terms.
              coalesce(po.start_deposit_pct_override,
                CASE WHEN coalesce(po.status,'') NOT ILIKE '%complete%' AND coalesce(po.supplier_invoice_total, lv.line_value, po.order_value_estimation, 0) < 500 THEN 0 ELSE s.start_deposit_pct END, 0) sp,
              coalesce(po.completion_pct_override,
                CASE WHEN coalesce(po.status,'') NOT ILIKE '%complete%' AND coalesce(po.supplier_invoice_total, lv.line_value, po.order_value_estimation, 0) < 500 THEN 0 ELSE s.completion_pct END, 0) cp,
              coalesce(lv.line_value, po.order_value_estimation) value_est,
              (lv.line_value IS NOT NULL) value_from_lines,
              -- final supplier invoice amount trumps the estimate for every payment / landed calc
              coalesce(po.supplier_invoice_total, lv.line_value, po.order_value_estimation, 0) val,
              fx.flex_id, fx.landing_date flex_landing, fx.arrival_date flex_arrival, fx.departure_date flex_departure,
              sh.landing_date sh_landing, sh.delivery_date sh_delivery, sh.departure_date sh_departure, sh.arrival_date sh_arrival,
              coalesce(sh.status,'') sh_status_raw,
              sh.mode sh_mode, sh.carrier sh_carrier, sh.carrier_ref sh_carrier_ref, fx.mode flex_mode,
              (sh.master_po = po.po) is_master,
              da.avail deposit_avail, da.fx_rate deposit_fx,
              -- landed-cost inputs: flexport quote, freight rate-card, import-tax rate, per-line duty
              coalesce(fx.total_quoted_amount, fx.total_freight_cost) flex_quote,
              fr.cost freight_rate, tr.tax_pct tax_pct, coalesce(tr.base,'landed') tax_base_kind,
              dty.duty duty,
              -- lead-time inputs: production from supplier; transit from the branch, picked by the
              -- shipment's mode (air → air_lead, else sea_lead; sea assumed when no shipment/mode)
              s.production_days, b.sea_lead_time_days sea_lead, b.air_lead_time_days air_lead,
              (CASE WHEN lower(coalesce(sh.mode, CASE WHEN fx.mode ILIKE 'air%' THEN 'air' END, 'sea'))='air'
                    THEN b.air_lead_time_days ELSE b.sea_lead_time_days END) transit_lead,
              -- ship-to: explicit override ▸ the branch's country
              b.country_code branch_country,
              -- ERP (Fulfil/Cin7) mirror: final delivery date + id, for date-misalignment detection
              erp.final_delivery_date erp_final_delivery_date, erp.erp_po_id erp_po_id_src, (erp.po IS NOT NULL) erp_present
            FROM planner.purchase_orders po
            LEFT JOIN planner.suppliers s ON s.id=po.supplier_id
            LEFT JOIN planner.branches b ON b.name=po.branch
            LEFT JOIN planner.erp_purchase_orders erp ON erp.po=po.po
            -- Pick up a self-master shipment row (shipment_ref = the PO) even when the PO's shipment_ref column
            -- wasn't set — otherwise a completion override on that shipment never reaches the PO (was showing the calc).
            LEFT JOIN planner.shipments sh ON sh.shipment_ref = coalesce(nullif(po.shipment_ref,''), po.po)
            LEFT JOIN planner.import_tax_rates tr ON tr.country=coalesce(nullif(po.country_code,''), b.country_code)
            LEFT JOIN LATERAL (SELECT sum(l.qty * coalesce(
                (SELECT plc.final_cost FROM planner.portal_line_costs plc WHERE plc.po=l.po AND plc.sku=l.sku AND plc.confirmed_at IS NOT NULL AND plc.final_cost IS NOT NULL),
                l.cost_price,
                -- estimate: default to the products cost for the PO's supplier (cost_<code>) then general cost,
                -- so the goods value / landed cost isn't 0 when lines have no negotiated price yet.
                CASE lower((SELECT s.code FROM planner.suppliers s WHERE s.id=po.supplier_id OR s.name=po.supplier_name LIMIT 1))
                  WHEN 'lx' THEN pr.cost_lx WHEN 'xr' THEN pr.cost_xr END,
                pr.cost)) line_value
              FROM planner.purchase_order_lines l
              LEFT JOIN planner.products pr ON pr.sku=l.sku
              WHERE l.po=po.po) lv ON true
            LEFT JOIN LATERAL (SELECT f.* FROM planner.flexport_shipments f
              WHERE f.flex_id=po.flexport_reference OR f.shipment_name=po.po OR f.shipment_name=po.shipment_ref
              ORDER BY (f.flex_id=po.flexport_reference) DESC NULLS LAST LIMIT 1) fx ON true
            LEFT JOIN LATERAL (  -- remaining on the deposit ref this PO draws on (pool − assigned) + the deposit's Xero FX rate
              SELECT coalesce((SELECT sum(amount) FROM planner.deposits d
                               WHERE d.is_deposit AND d.reference=po.deposit_ref),0)
                   - coalesce((SELECT sum(coalesce(p2.pay_start_deposit_assigned,0)) FROM planner.purchase_orders p2
                               WHERE p2.deposit_ref=po.deposit_ref),0) avail,
                (SELECT d.xero_fx FROM planner.deposits d
                   WHERE d.is_deposit AND d.reference=po.deposit_ref AND d.xero_fx IS NOT NULL
                   ORDER BY d.date_paid DESC NULLS LAST LIMIT 1) fx_rate
              WHERE coalesce(po.deposit_ref,'') <> '') da ON true
            LEFT JOIN LATERAL (SELECT cost FROM planner.freight_rates
              WHERE destination=coalesce(nullif(po.country_code,''), b.country_code) AND container_size=po.container_size LIMIT 1) fr ON true
            LEFT JOIN LATERAL (  -- import duty = Σ line value × duty% (category card in duty_rates by country)
              SELECT sum(l.qty*l.cost_price*coalesce(dr.duty_pct, 0)/100) duty
              FROM planner.purchase_order_lines l
              JOIN planner.products p2 ON p2.sku=l.sku
              LEFT JOIN planner.duty_rates dr ON dr.category=p2.category AND dr.country=coalesce(nullif(po.country_code,''), b.country_code)
              WHERE l.po=po.po) dty ON true
          ), calc AS (
            SELECT *,
              round(val*sp/100,2) start_calc,                                  -- start deposit (full term)
              -- start deposit actually DRAWN: a manual assignment wins; otherwise the term — but when the PO draws
              -- on a deposit ref the draw is CAPPED at that ref's remaining availability, and the shortfall rolls
              -- into the completion deposit (you can't pay more deposit than the ref actually holds).
              coalesce(pay_start_deposit_assigned,
                LEAST(round(val*sp/100,2), CASE WHEN coalesce(deposit_ref,'')<>'' THEN GREATEST(round(coalesce(deposit_avail,0),2),0) ELSE round(val*sp/100,2) END)) start_paid,
              -- completion term (+ any rolled-in start shortfall), but CAPPED at what's actually still owed after
              -- the start deposit AND any balance already paid — completion can never exceed the outstanding
              -- (e.g. if the balance was settled first, a term-based completion must not re-demand paid money).
              -- ONLY when the supplier actually has a completion milestone (cp>0): if there's no completion term,
              -- an unpaid/undrawn start deposit (e.g. deposit ref = NO DEPOSIT, or a pool that ran short) has no
              -- completion to roll into, so it stays in the balance (completion = 0).
              CASE WHEN cp > 0 THEN LEAST(
                round((sp+cp)/100*val - coalesce(pay_start_deposit_assigned,
                  LEAST(round(val*sp/100,2), CASE WHEN coalesce(deposit_ref,'')<>'' THEN GREATEST(round(coalesce(deposit_avail,0),2),0) ELSE round(val*sp/100,2) END)),2),
                GREATEST(round(val + coalesce(credit_amount,0) - coalesce(pay_start_deposit_assigned,
                  LEAST(round(val*sp/100,2), CASE WHEN coalesce(deposit_ref,'')<>'' THEN GREATEST(round(coalesce(deposit_avail,0),2),0) ELSE round(val*sp/100,2) END))
                  - coalesce(pay_balance_1_amount,0) - coalesce(pay_balance_2_amount,0), 2), 0)
              ) ELSE 0 END completion_calc, -- completion term + any rolled-in start shortfall (only if cp>0), capped at the remaining owed
              -- start shortfall rolled into completion — only when there IS a completion milestone (cp>0); else it lands in the balance
              CASE WHEN cp > 0 THEN round(val*sp/100 - coalesce(pay_start_deposit_assigned,
                LEAST(round(val*sp/100,2), CASE WHEN coalesce(deposit_ref,'')<>'' THEN GREATEST(round(coalesce(deposit_avail,0),2),0) ELSE round(val*sp/100,2) END)),2) ELSE 0 END catch_up,  -- start term − start drawn (rolled into completion when cp>0)
              -- production end: manual override ▸ start production + supplier lead (production_days)
              coalesce(end_production_overide,
                CASE WHEN start_production IS NOT NULL AND production_days IS NOT NULL
                     THEN (start_production + (production_days||' days')::interval)::date END) eff_prod_end,
              (end_production_overide IS NULL AND start_production IS NOT NULL AND production_days IS NOT NULL) prod_end_calc
            FROM base
          ), calc2 AS (
            SELECT *,
              -- ship: shipment departure (if assigned) ▸ flexport ▸ production end + 7 days. No PO override.
              coalesce(sh_departure, flex_departure,
                CASE WHEN eff_prod_end IS NOT NULL THEN (eff_prod_end + interval '7 days')::date END) eff_ship,
              CASE WHEN sh_departure IS NOT NULL THEN 'S' WHEN flex_departure IS NOT NULL THEN 'FLEX'
                   WHEN eff_prod_end IS NOT NULL THEN 'calc' END ship_src
            FROM calc
          ), calc3 AS (
            SELECT *,
              -- delivery: shipment delivery/arrival/landing (if assigned) ▸ flexport ▸ ship + branch transit
              -- lead (sea/air by shipment mode). No PO override.
              -- delivery/arrival: shipment overrides ▸ Flexport ARRIVAL (the real arrival date) ▸ Flexport landing
              -- (early ETA) ▸ ship + transit lead. Flexport arrival is preferred over landing (arrival is ~a week
              -- later and is the date shown on the Flexport report), matching the shipment arrival-before-landing order.
              coalesce(sh_delivery, sh_arrival, sh_landing, flex_arrival, flex_landing,
                CASE WHEN eff_ship IS NOT NULL AND transit_lead IS NOT NULL
                     THEN (eff_ship + (transit_lead||' days')::interval)::date END) eff_delivery,
              CASE WHEN sh_delivery IS NOT NULL OR sh_arrival IS NOT NULL OR sh_landing IS NOT NULL THEN 'S'
                   WHEN flex_arrival IS NOT NULL OR flex_landing IS NOT NULL THEN 'FLEX'
                   WHEN eff_ship IS NOT NULL AND transit_lead IS NOT NULL THEN 'calc' END delivery_src
            FROM calc2
          ), calc4 AS (
            SELECT *,
              -- completion = delivery + 7d warehouse check-in — EXCEPT direct-to-client is FOB (no warehouse
              -- leg) → completion = delivery, UNLESS the PO is a child of a consolidated shipment (then we
              -- crossdock via the warehouse, so the +7 applies). A self-master/no shipment stays FOB.
              -- An EXPLICIT shipment completion override (shipments.delivery_date = sh_delivery) IS the
              -- completion date, so it lands exactly (no +7) — matches the shipment drawer's "Completion" field.
              CASE WHEN sh_delivery IS NOT NULL THEN sh_delivery
                   WHEN eff_delivery IS NOT NULL THEN (eff_delivery
                + (CASE WHEN upper(coalesce(nullif(country_code,''), branch_country, ''))='DIRECT'
                          AND coalesce(nullif(shipment_ref,''), po)=po
                        THEN 0 ELSE 7 END||' days')::interval)::date END eff_checkin,
              -- balance due: the PO's "final payment due" override (balance_due_date_overide) takes priority;
              -- then small POs (value used < $500, paid 100% on the balance) are due on the invoice-processed
              -- date once final, else the ship date while still an estimate — no credit terms applied;
              -- else the normal rule: (on-shipment → ship; on-clearance → delivery) + supplier credit days
              coalesce(balance_due_date_overide,
                CASE WHEN val < 500 AND coalesce(status,'') NOT ILIKE '%complete%' THEN coalesce(invoice_processed_date, eff_ship)
                     ELSE ((CASE WHEN credit_type='on_shipment' THEN eff_ship ELSE eff_delivery END)
                        + (coalesce(credit_days,0)||' days')::interval)::date END) bal_due_date
            FROM calc3
          )
SELECT * FROM calc4;
