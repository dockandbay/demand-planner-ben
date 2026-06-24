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
  - Populate **`planner.erp_purchase_orders`** (header) from Fulfil/Cin7 — at minimum `erp_po_id`,
    `final_delivery_date`, `status`; stamp `synced_at`. This drives the **date** check
    (our calculated *completed-at-warehouse* date vs the ERP `final_delivery_date`).
  - Keep populating **`purchase_order_lines.erp_qty` / `erp_cost`** from the ERP — this drives the
    **qty/cost** drift check (never-pushed + per-line drift).
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

---

## 4. n8n data population (ETL)

- **Product fields** for the portal / labels / detectors:
  - `products.cogs_{uk,us,eu,au,ca}_3pl_final` (**migration `060`**) — feed via n8n on prod.
  - `size_short`, `variant_type` (used by the supplier portal / barcode labels).
- **Sales actuals:** confirm **≥ 2 years of monthly actuals** history is present — the DEMAND ▸ Actions
  detectors (forecast-vs-trend, anomalies, A-player) rely on it.

---

## 5. Infra (Diviyaj-owned, not wired by Ben)

- Vercel production deploy + custom domain (every branch already gets a preview URL).
- Supabase migrations on prod (run the new numbered files per §1).
- n8n workflows (the pipelines in §3–§4).

---

_Last updated: v20.294 (24 Jun 2026)._
