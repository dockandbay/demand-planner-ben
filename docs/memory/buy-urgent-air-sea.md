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

**PROGRESS (v26.411): DATA FOUNDATION BUILT + verified.** server.mjs `buildPROD_CONST` adds `exped` per SKU (supplier `expedited_production_weeks`, default 6); new `buildBRANCH_FREIGHT()` + injected global `BRANCH_FREIGHT` = {uk:{air:7,sea:60},us:{air:7,sea:28},eu:{air:7,sea:70},au:{air:7,sea:28},ca:{air:7,sea:42}} (days). artifact reads `pc.exped`→`pd.exped`, has `var BRANCH_FREIGHT={}`. All 723 SKUs have exped. NO behaviour change yet.

**REMAINING (engine + UI): the urgent scan is at artifact ~2535–2600.** Key finding — the trigger ALREADY fires at `<URGENT_THRESHOLD_WKS` cover (currently 3wk) via `dangerStart=stockTrace.findIndex(t=>t.closing/t.weekly<THRESH)`, BUT sizing only accumulates when `stockAfter<0` (line ~2586), so a SKU held at ~0 by just-in-time arrivals (TOWLB) sizes to 0 → no urgent. So the build:
1. Set `URGENT_THRESHOLD_WKS=2` (Ben) and SIZE the urgent to RESTORE cover to the threshold at the danger point (not only cover negatives) — reuse the existing buffer add.
2. Compute two expedite leads (weeks): `seaLead = pd.exped + BRANCH_FREIGHT[co].sea/7`, `airLead = pd.exped + BRANCH_FREIGHT[co].air/7`. Route each shortfall: **Sea if seaLead lands before the stockout month, else Air**, else true stockout.
3. Split `buyUrgent`/`bQu` into `bQuSea`+`bQuAir`; getBuyQtys returns `b3uSea`/`b3uAir`; replace the single "Buy 3PL Urgent" column (header ~1696, row ~1853, COLS) with **Urgent Sea + Urgent Air**. Snapshot before/after ([[buy-plan-before-after]]): BEFORE b3u total=140,558; HAIRW b3u=1,260.
