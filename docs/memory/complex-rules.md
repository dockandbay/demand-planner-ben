---
name: complex-rules
description: "CONFIRMED design (building): Buy-tab 'Complex Rules' engine replacing First Buy — cover-target overrides by SKU/category/tier × window, per country"
metadata:
  node_type: memory
  type: project
  originSessionId: b61cd153-343c-4220-a257-3a8b89483481
---

**Complex Rules** — a buy-plan rules engine on the BUY tab, replacing First Buy. Confirmed by Ben 2026-08-02.

**A rule =** scope (who) + window (when) + coverage (how much), grouped by **country**:
- Scope (optional, AND'd): SKU / Category / Marketing tier (A/B/C) / Season.
- Window: from a **date** (or **"always on"**), optionally a Season.
- Coverage: **XX months of cover** OR a **fixed month range** (e.g. Jan 2027 → Aug 2027).

**Decisions (Ben):**
1. **Effect = OVERRIDE THE COVER TARGET** — for matched SKUs during the window, set the 3PL target cover to XX months (or ensure the date-range is covered); the normal buy engine sizes to hit it. (Not a forced fixed buy.)
2. **Precedence = HIGHEST COVERAGE WINS** — across all matching rules, apply the one demanding the most cover / longest window.
3. **Storage = new table `planner.buy_complex_rules`**, managed via a **"Complex Rules (N)" button next to Settings on the BUY tab** (N = count). Add/edit/delete, grouped by country.
4. **First Buy = REMOVE ENTIRELY** — the "First Buy — new launches" settings row, the FB grid badge, AND the first-buy boost/lead engine logic (fbTierBoost, fbm/fbl, the launch first-buy path). Changes launch buy quantities → snapshot before/after ([[buy-plan-before-after]]).

**Build phases:**
- Phase 1 (foundation, no buy-qty change): migration 170 (author → Ben runs on live; apply to sandbox), server CRUD endpoints + inject `COMPLEX_RULES` global (like PROD_CONST), BUY-tab "Complex Rules (N)" button + CRUD panel grouped by country.
- Phase 2 (engine, changes buy qty): apply matching rules to the 3PL cover target (t3) per SKU/market/month during the window; highest-coverage wins. Before/after snapshot.
- Phase 3 (remove First Buy): strip settings row + FB badge + engine logic. Before/after snapshot.

Relates to [[buy-plan-calc]], [[buy-plan-data-model]] (t3/tf/cover come from planner.products via PROD_CONST).
