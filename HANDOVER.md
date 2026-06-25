# Handover to Live — for Diviyaj

The single consolidated checklist of what needs wiring to take Ben's build to production.
Ben builds features here; Diviyaj pulls this repo downstream, wires it to production data
(`oolwklahstnvocaugryg`), and ships. Per-change detail lives in `CHANGES.md` (version log);
this doc is the running "what's outstanding to go live" view. Update it as items are done.

> One writer to prod = Diviyaj. Ben never deploys to prod directly.

---

## 1. Database migrations

The `planner` schema is a consolidated baseline (`migrations/schema.sql`, current **as of migration 061**)
plus new numbered migrations on top. See `migrations/README.md`.

- **Existing prod DB** (already migrated through 061): run **only the new numbered migrations**:
  - **`062_erp_purchase_orders.sql`** — new ERP mirror table (see §3). ⬅ *latest, not yet on prod.*
- **Fresh DB** (new env): run `migrations/schema.sql` once, then `062_*.sql`. Do **not** run
  `schema.sql` against an already-migrated DB (the table creates aren't idempotent).

---

## 2. Environment variables

- **`DATABASE_URL`** — production Supabase, **session-pooler** connection string.
- **`ANTHROPIC_API_KEY`** — for the server-side AI calls (use a current model id, e.g. `claude-sonnet-4-6`).
- **`RESEND_API_KEY`** (+ optional **`PORTAL_FROM`**) — supplier-portal **magic-link email**. Until set,
  `sendMagicEmail()` just logs the link to the server console (no email sent). Swap providers by editing
  `sendMagicEmail()` if not using Resend.

No secrets in git — reference by env-var name only.

---

## 3. ERP (Fulfil/Cin7) integration — misalignment + upload  ⬅ NEW (v20.293–v20.294)

The planner detects when a PO is misaligned with the ERP and surfaces it on **SUPPLY ▸ Purchase Orders**
(the **⬆ NEEDS ERP** filter, per-row **⚠ Date ≠ ERP** badge, and ERP recon summary). Wiring needed:

- **Run migration `062_erp_purchase_orders.sql`** — creates `planner.erp_purchase_orders`
  (`po`, `erp_po_id`, `final_delivery_date`, `status`, `raw jsonb`, `synced_at`). No FK, so the sync
  isn't blocked by a missing planner PO.
- **n8n inbound (ERP → planner):**
  - **Mirror NEW POs created directly in the ERP** into the planner (the ERP is the source of truth for
    PO lines). **Upsert** `planner.purchase_orders` + `planner.purchase_order_lines` keyed on the **PO ref**
    so a PO raised in Cin7/Fulfil appears in SUPPLY automatically. On insert, set `qty = erp_qty` and
    `cost_price = erp_cost` so it lands **"in sync"**. **Must-get-right:**
    - **Resolve `supplier_id` from `supplier_name`** on upsert (the payment-terms / lead-time calc joins on
      `supplier_id`; without it, terms won't apply). The CSV importer + `po-create` do this already — mirror that.
    - **Preserve the planner's overlay fields** on re-sync — don't clobber: `deposit_ref`, `pay_*` assignments,
      `*_overide` dates, `client*` / `sales_order_ref` / `dispatch_order_ref` / `final_delivery_address`,
      `crossdock_skus`, `credit_amount`, `notes`, and `purchase_order_lines.partial_carton_approved`.
    - **Don't duplicate planner-originated POs**: POs created in the planner (New PO / BUY→PO) sit at
      `erp_qty=0` ("not in ERP") until pushed — match on PO ref so the inbound sync updates them rather than
      inserting a second row.
    - For a line edited in the planner (`proposed_at` set), refresh `erp_qty`/`erp_cost` from the ERP but
      leave the planner's `qty`/`cost_price` (the proposed change) so the drift stays visible until reconciled.
  - Populate **`planner.erp_purchase_orders`** (header) from Fulfil/Cin7 — at minimum `erp_po_id`,
    `final_delivery_date`, `status`; stamp `synced_at`. This drives the **date** check
    (our calculated *completed-at-warehouse* date vs the ERP `final_delivery_date`).
  - Keep populating **`purchase_order_lines.erp_qty` / `erp_cost`** from the ERP — this drives the
    **qty/cost** drift check (never-pushed + per-line drift).
  - Run this on a schedule (the current `erp_qty`/`erp_cost` are a one-time Cin7 import, not live — so
    today "in sync" means "matches the import," not "matches the live ERP").
- **n8n outbound (planner → ERP) — the "Upload to Fulfil" webhook:**
  - Every upload affordance in the UI (PO-grid ERP buttons, Order-Plan ⬆ Upload, Actions ⬆ Upload to ERP)
    is currently **inert** — it shows *"Upload feature not yet banked. To be integrated to Fulfil or Cin7."*
    and does nothing (it does **not** fake a local sync, so misalignment stays visible).
  - The server endpoint **`POST /api/supply/po/:po/upload`** is left in place. When the n8n webhook is
    built, point the UI buttons at it (re-enable the handlers in `supply/inject.html` — currently they call
    `erpUploadInert()`) and have n8n create/update the Fulfil PO from the staged change. Writing to the live
    ERP is a **gated** action (confirm per the hard rules).
- **Sandbox note:** Ben's sandbox has 2 test rows in `planner.erp_purchase_orders`
  (`PO-1579063` mismatch, `PO-1596956` match) used to validate detection — these are test data only,
  **do not copy to prod**.
- **Deferred (not built):** a matching date card in SUPPLY ▸ Actions — needs the completion-date calc
  shared between the PO query and the Actions query first (avoid two calcs diverging).

### Cleaner ERP-sync model (migration `064_erp_sync_model.sql`)  ⬅ NEW — target architecture
Separates the ERP truth from the plan so drift is explicit:
- **ERP mirror** (n8n-written, planner read-only): `planner.erp_purchase_orders` (header, extended) +
  **`planner.erp_purchase_order_lines`** (lines, NEW). This is the n8n **inbound** write target — upsert
  both keyed on `po` (+ `sku` for lines). One-time CSV snapshot can be loaded now via the two new templates
  (`supply_import_templates/erp_purchase_orders.csv`, `erp_purchase_order_lines.csv`).
- **Drift view** `planner.v_erp_po_drift` = the diff between the plan and the mirror
  (`po_not_in_erp` / `po_not_in_planner` / `qty_change` / `cost_change` / `line_not_in_erp` /
  `line_not_in_planner` / `completion_mismatch`). Drives the exceptions/actions list **and** the outbound
  push payload. ERP status is **open/complete** only (Cin7); the planner's management lifecycle isn't
  compared except the completed state must agree (`completion_mismatch`).
- This **supersedes** the embedded `purchase_order_lines.erp_qty/erp_cost` columns. The app still reads
  those today; rewiring the NEEDS-ERP filter / drift UI to read `v_erp_po_drift` is a follow-on patch once
  the mirror is being fed. n8n can populate both during transition.
- **Run migration `064` on prod** (creates the lines mirror + view + extra header columns).

---

## 4. n8n data population (ETL)

- **Product fields** for the portal / labels / detectors:
  - `products.cogs_{uk,us,eu,au,ca}_3pl_final` (**migration `060`**) — feed via n8n on prod.
  - `size_short`, `variant_type` (used by the supplier portal / barcode labels).
- **Sales actuals:** confirm **≥ 2 years of monthly actuals** history is present — the DEMAND ▸ Actions
  detectors (forecast-vs-trend, anomalies, A-player) rely on it.
- **Inbound stock (`planner.inbound_shipments`):** sync both `source_type='supplier_china'` (supplier PO
  landings) **and `source_type='branch_transfer'`** (3PL↔3PL and 3PL/AWD → FBA replenishments) — these feed
  on-order/cover at each destination warehouse. CSV template: `supply_import_templates/inbound_shipments.csv`.
  Branch transfers are inbound-only here; the source warehouse's reduction comes from its live `product_inventory`.

---

## 5. Infra (Diviyaj-owned, not wired by Ben)

- Vercel production deploy + custom domain (every branch already gets a preview URL).
- Supabase migrations on prod (run the new numbered files per §1).
- n8n workflows (the pipelines in §3–§4).

---

_Last updated: v20.294 (24 Jun 2026)._
