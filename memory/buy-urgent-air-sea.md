---
name: buy-urgent-air-sea
description: "CONFIRMED spec (not yet built): split Buy 3PL Urgent into Urgent Air + Urgent Sea, and fire urgent below 2wk cover"
metadata:
  node_type: memory
  type: project
  originSessionId: b61cd153-343c-4220-a257-3a8b89483481
---

**Ben's confirmed design (2026-08-02) — NOT YET BUILT.** Split the single **Buy 3PL Urgent** column into two: **Buy 3PL Urgent — Air** and **Buy 3PL Urgent — Sea**, each with its own expedited lead time, so the planner can air-expedite the nearest gap and sea-expedite the next one.

**Lead times (all data exists):**
- Air lead = `suppliers.expedited_production_weeks` + branch **`branches.air_lead_time_days`** (→ weeks).
- Sea lead = `suppliers.expedited_production_weeks` + branch **`branches.sea_lead_time_days`**.
- (Normal Buy 3PL still uses `china_to_<mkt>_lead_time_weeks`.) `expedited_production_weeks` shipped as SUG-0008 / mig 161, default 6.

**Urgent trigger change (Ben's call):** fire urgent when projected 3PL cover drops **below ~2 weeks** — NOT only on a hard stockout. This is why TOWLB-CAB-LG-LTBLU-R/UK currently shows **no urgent**: big 3PL→FBA transfers (668/404/383) + heavy FBA demand drain 3PL to ~19 units in Oct/Nov, but confirmed inbound POs (200 Oct, 600 Nov) land just in time to keep it non-negative, so the stockout-only scan never fires. Each projected shortfall routes to Air if only air-expedite lands in time, else Sea.

**Build scope (multi-file, changes buy quantities → snapshot before/after per [[buy-plan-before-after]]):**
1. server.mjs: inject `expedited_production_weeks` (per SKU's supplier) + branch air/sea lead days into BP_DATA md.
2. artifact buy engine: rework the urgent scan (fire <2wk cover; size + split into air/sea buckets by which expedite lead lands in time).
3. UI: replace the "Buy 3PL Urgent" column with two — "Urgent Air" / "Urgent Sea" (header + row + COLS). Relates to [[expedite-recommendations]] (SUPPLY Actions already has air-freight/expedite recs).

Ben's example: TOWLB — Urgent Air good for October, Urgent Sea good for November.
