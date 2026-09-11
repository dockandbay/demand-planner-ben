# Horizon vs. world-class PLM — deep dive & recommendations

*Prepared for Ben (Dock & Bay), 2026-08-06. A review of what Horizon does today, what best-in-class Product Lifecycle Management (PLM) systems do, where the gaps are, and a prioritised set of things worth considering. Not a commitment — a menu.*

---

## 1. What Horizon is today

Horizon is unusual: most tools are **either** a planning system **or** a PLM. Horizon has grown a genuinely strong **demand/supply planning engine** *and* a growing **product-development spine**, wired to the live estate (Cin7, Airtable PIM, Shopify, Xero via n8n/Supabase). That planning depth is a real competitive edge — the big PLM vendors are weak at exactly the thing Horizon is strong at.

**Capability map today:**

- **DEMAND** — SKU×market forecasting (chained last-year, new-SKU contribution, launch/discontinue run-down), smoothing (+ disregard-discontinued, auto-smooth, recalc), KPIs, sell-through targets, Actions/alerts (+ anomalies, weather, AI insights), trading calendar, revenue/price, Klaviyo back-in-stock demand signal.
- **BUY & MOVE** — buy plan (3PL / urgent / FBA), FBA transfers, inter-3PL transfers, create-PO-from-buy-plan.
- **SUPPLY** — POs, Order Plan, shipments, cash flow, payments/deposits, productions, manufacturing, BI & Reports (metrics, pipeline, container fill, consolidation, DTC mismatch, ERP compare), scenarios (B2B allocation, Prime Day, financial model, sales planning).
- **PRODUCT** — dev items (colourways, sizes, components, swatches, docs, timeline), Range Plan, approval Dashboard, **Specifications** (spec docs scoped to all/category/size/SKU, use-from rules, supersede/history, supplier approval), **Samples** (requests/shipments, dev-sample links).
- **SUPPLIER PORTAL** — magic-link, supplier-scoped POs / shipments / samples / quality docs / product-dev / spec approvals, with email + action counters.
- **Integration** — Cin7 ERP (read + gated writes), Airtable as PIM/source-of-truth, Shopify, Xero, n8n ETL, Supabase backend.

**In PLM terms, Horizon already covers:** range/line planning, product-dev management, spec-doc control with approvals, sample management, a supplier collaboration portal, some quality-doc capture (GRS certs), and an approval dashboard — *plus* planning/costing-cash capabilities most PLMs don't have.

---

## 2. What world-class PLM does (the pillars)

Benchmarks (consumer soft-goods / lifestyle, closest to D&B): **Centric PLM** (market leader), **PTC FlexPLM**, **Bamboo Rose** (PLM + sourcing marketplace), **Backbone PLM** (SMB-friendly), **Surefront** (PLM + sourcing + CRM), **WFX**, **Infor CloudSuite Fashion**. Their common pillars:

1. **Line / assortment planning** — seasonal line lists, option counts, price architecture, carryover vs new, merchandising by channel/door.
2. **Design & development** — sketches/CAD, seasonal boards, colourways, style versioning; 3D via CLO/Browzwear.
3. **Material & component libraries** — a reusable fabric/trim/component master shared across styles, linked to suppliers, MOQs, lead times and certs.
4. **Tech packs & multi-level BOM** — construction, measurements (points of measure) + grading, materials/trims/packaging/labels, all revision-controlled.
5. **Costing & margin engineering** — target vs quoted vs actual cost, full breakdown (materials/labour/overhead/freight/duty → landed), margin/IMU targets, RFQ/quotes, what-if.
6. **Time & Action / critical path** — seasonal milestone calendar with dependencies, slippage alerts, stage-gate approvals.
7. **Sample management** — proto→fit→SMS→TOP→PP rounds with fit comments and approvals.
8. **Sourcing & supplier management** — profiles, capabilities, scorecards, RFQ/quote comparison, allocation, compliance.
9. **Quality & compliance** — test reports, certifications, AQL inspections, CAPAs, audits, restricted-substances.
10. **Approvals, workflow & versioning** — stage-gates, e-sign, full audit trail / revision history, role-based access.
11. **DAM** — versioned images/artwork/swatches/spec docs, shareable.
12. **Sustainability & traceability** — material composition, chain-of-custody, and the **EU Digital Product Passport (DPP)** coming into force — a major near-term compliance driver.

---

## 3. Gap analysis — Horizon vs the pillars

| Pillar | Horizon today | Gap |
|---|---|---|
| Line/assortment planning | Range Plan (season/category/colourway/status) | Option counts, price architecture, channel assortment |
| Design & development | Dev items, swatches, docs, timeline | CAD/3D, seasonal boards, formal style versioning |
| **Material/component library** | Components per product | **No shared, reusable material/trim master with supplier+cert links** |
| **Tech pack / multi-level BOM** | Components, specs, carton dims; a "Manufacturing BOM" in Config | **No garment-level PoM/grading; BOM not multi-level/revisioned** |
| **Costing & margin engineering** | Cost prices, portal cost submission (roadmap), cash flow | **No target/quoted/actual cost breakdown, landed-cost build-up, margin targets, RFQ** |
| **Time & Action / critical path** | Production/shipment dates, some alerts | **No seasonal T&A calendar with dependencies + slippage alerts + gates** |
| Sample management | Samples/sample shipments, dev-sample links | Formal sample rounds + fit-comment history |
| Sourcing/supplier mgmt | Supplier records, portal, terms | Scorecards, RFQ/quote comparison, capability matrix |
| Quality & compliance | GRS certs, quality docs | Test-report register, AQL inspections, CAPAs, restricted-substances |
| Approvals/versioning | Spec supersede, product timeline, spec approval | Formal stage-gates, e-sign, full audit trail |
| DAM | Images/swatches/docs scattered | Central versioned asset library |
| **Sustainability / DPP** | GRS material captured | **No composition/traceability model or DPP readiness** |

**Where Horizon already beats generic PLM:** demand forecasting, buy planning, cash-flow/payments, ERP-live reconciliation (e.g. DTC mismatch), scenario modelling. Keep that as the moat.

---

## 4. Recommendations — a prioritised menu

Guiding idea: Horizon is a **planning-led PLM**. The highest-value moves *connect design→cost→source→make→sell* using what's already built (Specifications, Samples, Product dev, the portal), rather than bolting on a generic PLM.

### Tier 1 — high value, builds directly on what exists
1. **Costing & margin engineering.** Extend the cost model to **target vs quoted vs actual**, with a landed-cost build-up (goods + freight + duty + overhead) and a **margin/IMU target** per product — surfaced against the retail/wholesale price you already hold. Pairs with the roadmapped portal cost-price submission (supplier quotes → discrepancy → accept → ERP). This is the single biggest PLM lever for a brand your size.
2. **Time & Action / critical-path calendar.** A per-product / per-season milestone calendar (design → sample rounds → PP approval → PO → production → ship → land) with **dependencies and slippage alerts** rolled into the Actions/counter pattern you already use. Turns the scattered dates (productions, shipments, sample ETAs) into one critical path.
3. **Material / component library.** A reusable master of fabrics/trims/packaging/labels linked to suppliers, MOQs, lead times and certs — so a spec/BOM references a library item instead of re-keying. Your **Specifications** feature is 70% of the way to this; formalise the component master behind it.

### Tier 2 — meaningful, moderate effort
4. **Tech pack / multi-level BOM** built on Specifications + components: construction notes, packaging/label BOM, and (for towels/apparel) **points-of-measure + grading** with sample fit history.
5. **Quality & compliance register.** Extend quality docs into a proper register: test reports, certifications with expiry, **AQL inspection results + CAPAs**, restricted-substance checks — with portal capture (you already have QC-doc upload + approval).
6. **Supplier scorecards & RFQ.** On-time %, quality pass rate, cost competitiveness from data you already hold (PO dates, DTC mismatch, cost prices); plus a simple RFQ/quote-comparison flow.
7. **Formal approvals + audit trail.** Generalise the spec approval + product timeline into stage-gates with a full revision history and who-changed-what.

### Tier 3 — strategic / future
8. **Sustainability & EU Digital Product Passport (DPP).** Model material composition + chain-of-custody now (you already track GRS); DPP is becoming mandatory for textiles in the EU and is a genuine differentiator + compliance need.
9. **DAM.** A central, versioned asset library (images, artwork, swatches, spec files) — consolidate what's scattered across product/spec/portal.
10. **3D / CAD integration** (CLO/Browzwear) — only if design moves to 3D; likely lower priority for towels/lifestyle vs apparel.
11. **Assortment / line-plan depth** — option counts, price architecture, channel assortment on top of Range Plan.

### Build vs buy
Given the planning moat and the tight Cin7/Airtable/Shopify/Supabase integration, **extending Horizon beats adopting a standalone PLM** for Tiers 1–2 — a bought PLM wouldn't know your demand/buy/cash engine and would create another integration seam. Watch Centric/Backbone/Surefront for ideas on *tech-pack, T&A and costing UX* specifically; consider a point tool only for **DPP/traceability** or **3D** if those become priorities.

---

## 5. Suggested first step
If we pursue this, start with **Tier-1 #1 (costing & margin engineering)** and **#2 (T&A calendar)** — they compound with the planning engine and the supplier portal you've already built, and turn Horizon from "planning + product admin" into a genuine planning-led PLM. Each is a scoped, phased build like the others this year.
