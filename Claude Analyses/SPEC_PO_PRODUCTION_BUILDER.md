# SPEC — PO / Production Builder (all-countries, MOQ-aware)

**Status:** DESIGN / mockup approved by Ben 2026-08-08. Not built. Build in phases with testing.
**Owner:** Ben (product). **Supersedes/upgrades:** the current per-SKU BUY→PO workflow (per-SKU supplier pick, 20-pallet split, PO naming).

## Why
POs are created per country, but a supplier **MOQ is a per-production minimum** that's met by the **combined order across all countries**. Enforcing MOQ per country over-orders (e.g. MOQ 500 → forces UK/US/EU each to 500). Ben needs a single all-countries view to see the combined requirement per SKU, judge it against MOQ, and assemble the production (incl. any MOQ excess) in one place.

## The view — full-screen "Create Production" builder
A full-screen tab (not the current drawer). Matrix, all countries at once:

```
┌ Create production ── Supplier: Lixin ── Prod #57 ─────────  Σ 12,340u · £148k  [Save as POs] ✕ ┐
│  Filters: [Supplier ▾] [Production ▾] [Category ▾] [Season ▾]   Countries: (UK)(US)(EU)(AU)(CA) │  ← pills
├──────────────────────────┬──────┬──────┬──────┬──────┬───────┬──────┬─────────────────────────┤
│ SKU                      │ █UK │ █US │ █EU │ █AU │ Total │ MOQ  │ ⚑                        │
│ TOWLB-DES-LG-OCETRES     │ 300 │  50 │ 100 │  —  │  450  │ 500  │ ⚑ short 50              │
│ HAIRW-SUE-MIAMI          │ 120 │  —  │  60 │  60 │  240  │  —   │  ✓                      │
├──────────────────────────┴──────┴──────┴──────┴──────┴───────┴──────┴─────────────────────────┤
│ ⚑ TOWLB-DES-LG-OCETRES — MOQ 500, plan 450 (300 UK·50 US·100 EU). Short 50.                   │
│   [ Add 50 → China stock PO ]   [ Bump a country ]   [ Ignore ]                                │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Rows = union of SKUs** across the shown countries; blank cell where a SKU isn't bought in that country (handles "different SKU list per country").
- **Country columns tinted with the market palette** (reuse existing `MKT_COLORS`).
- **Country pills** toggle which columns show AND narrow the SKU list to SKUs bought in the selected countries.
- **Filters:** supplier / production (prod_no) / category / season dropdowns.
- **Select-all controls:** reuse the existing BUY→PO select-all buttons (per column / all).
- **Per-quantity supplier selection:** each SKU/qty keeps the existing per-SKU supplier pick (a SKU can have multiple suppliers), 20-pallet split, PO naming.
- **Total** (combined across shown countries) + **MOQ** + **flag** per row. Flag click → the China-stock workflow row.
- **Save as POs** → creates the per-country POs (+ a China-stock PO for any excess) in one action.

## MOQ logic (the core change)
- `products.moq`: null → 1; a value → the per-production MOQ. (Field exists; currently 100% NULL — **Phase 0 = load it via Airtable→n8n**.)
- **Remove the per-country round-up** `Math.max(qty, moq)` in the buy engine (wrong unit; over-orders once MOQ populated). No-op today (moq null), so safe to land.
- **Assess MOQ on the combined production total** (sum across the countries in this production). If combined < MOQ → **flag** (do NOT silently inflate). Hover shows: MOQ, per-country breakdown, shortfall.

## China stock (the excess) — NEEDS DECISIONS
The flag offers a **workflow to add the shortfall to a generic "China stock" PO** (un-allocated units held to meet MOQ). This concept does NOT exist yet. Open questions:
1. **Where do China-stock units live + what next?** A holding branch/warehouse (China / supplier-held), un-allocated, later **allocated/transferred to a market** when demand appears (follow-on feature)?
2. **Does China stock count as available supply in the buy plan?** (Recommend YES — else the next buy re-orders those units.)
3. **Granularity:** one China-stock PO per production (`prod_no`)? per SKU? Extra line on the production vs a separate generic PO?

## Phases
- **Phase 0 — data:** load `products.moq` (Diviyaj/n8n from Airtable). Nothing fires without it.
- **Phase 1 — the builder view:** full-screen all-countries matrix, market-coloured, country pills, filters, select-all, per-qty supplier, Save-as-POs. Read-only over existing buy-plan data + existing PO-create logic. High value alone.
- **Phase 2 — MOQ combined check + flag/hover;** remove the per-country round-up. Buy-plan before/after snapshot.
- **Phase 3 — China-stock workflow + model** (needs the 3 answers), incl. whether it feeds back as supply.

## Related
- [[buy-to-po-workflow]] (current per-SKU supplier pick / 20-pallet split / PO naming — this builds on it)
- [[moq-not-in-products]] (moq field empty), [[klaviyo-bis-and-market-colours]] (MKT_COLORS palette)
- [[buy-plan-before-after]] (mandatory snapshot on the Phase-2 engine change), [[crossdock-skus-todo]]
