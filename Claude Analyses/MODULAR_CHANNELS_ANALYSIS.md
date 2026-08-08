# Modular Channels — Design Analysis (pre-implementation)

**Author:** Claude (senior-engineer + merchandise-planning lens) · **Date:** 2026-08-08
**Goal (Ben):** From **CONFIG ▸ Admin**, *create a new sales channel and assign it to one or more countries*, and have it flow automatically through the **demand planner** (grid entry, LY actuals, forecast) and the **buy plan** — a modular approach to forecasting & channel management, so we never again hand-thread a channel through the code (as we just did for Zalando).

> This is analysis only. No implementation until the decisions in §8 are agreed.

---

## 1. Why this is non-trivial (current state)

Channels today are **hardcoded literals**, not data. The channel-enumeration audit (2026-08-08) found **~196 sites** across `artifact_v16.7.html` + `server.mjs`, in 8 categories:

1. **Literal lists** `['DTC','FBA','B2B']` — ~17 places (pills HTML, `CH_PILLS`, `CHS`, exec/summary `_CH`, `chOrder`, smoothing selector, buildLiveDemand…).
2. **Channel→key ternaries** `ch==='DTC'?'d':ch==='FBA'?'f':'b'` — ~9 copies (now `…:ch==='ZAL'?'z':'b'`), plus a lowercase variant and a `?'d':'b'` variant.
3. **`CF`** current-channel var — declared/set/read in ~7 places.
4. **Per-channel conditionals** — `ch==='B2B'?0.5:0.95`, "B2B is lumpy → skip", `if(av.indexOf('d')<0)`, etc.
5. **Availability letters** — per-SKU `av[country]='dfb'` string; `av.indexOf(chKey)` gates SKU→channel.
6. **Exec/Summary** — `{DTC:{},FBA:{},B2B:{}}` hardcoded aggregation objects.
7. **Save paths** — already channel-dynamic (`channel: CF`) ✅ (the one part that's modular today).
8. **Buy engine** — `project()` sums `dem.DTC+dem.B2B` (3PL) and `dem.FBA` (FBA) **explicitly**; ZAL was bolted on by hand.

**Conclusion:** channels are a *cross-cutting concern* touching UI, forecasting math, availability, reporting and the buy engine. Zalando took 5 versions of careful hand-wiring. A config-driven model pays for itself at channel #4+.

The good news: three foundations are already channel-agnostic — the **save endpoints**, `buildDATA()` (reads the `category_sales_summary` VIEW with no channel filter), and `forecast_inputs/outputs` (channel is free `text`). The DB is *mostly* ready; the coupling is in the **client logic** and the **buy engine**.

---

## 2. Target architecture (the shape)

Replace literals with a **channel registry** that is the single source of truth, injected to the client and read server-side.

### 2.0 Ben's refinements (2026-08-08)
- **Countries and channels are each their own tables** (master lists — 5 countries UK/AU/US/EU/CA and 4 channels DTC/FBA/B2B/ZAL today, both extensible), plus a **channel↔country assignment**.
- **The buy dimension is a single field: `stock_source` ∈ {`3PL`, `FBA`}** per channel — "where stock is drawn from." This *replaces* the 4-role model below: DTC→3PL, B2B→3PL, ZAL→3PL, FBA→FBA. The buy engine groups demand by `stock_source` (3PL-pool vs FBA-pool). ZAL's "net against uploaded ZFS stock" is an **extra optional attribute** (`ext_stock_source`) layered on a `stock_source=3PL` channel, not its own role.

### 2.1 Data model — `planner.channels`
| column | meaning |
|---|---|
| `code` (PK) | e.g. `DTC`,`FBA`,`B2B`,`ZAL` |
| `label` | display name |
| `key1` | single availability letter (`d/f/b/z`) — keep the letter model for minimal churn |
| `countries` | `text[]` — assigned markets (`{UK,US,EU,…}`) |
| `forecast_mode` | `ly-growth` \| `absolute` (Zalando = absolute today; will move to ly-growth once it has history) |
| `buy_role` | `direct-3pl` \| `transfer-fba` \| `external-net` \| `none` (see §4) |
| `warehouse` | which stock pool it draws (`3pl`/`fba`/external) |
| `cover_months` | buy cover target override (FBA=1, ZAL=2, DTC/B2B use the 3PL default) |
| `ext_stock_source` | for `external-net` (e.g. `zalando_stock`) |
| `sku_scope` | `country-avail` (default) \| `upload:<table>` \| `manual` — how SKUs enter the channel |
| `sort`, `active` | ordering + soft-delete |

*(Country assignment can be the `countries[]` array, or a child table `channel_countries` if we later want per-country overrides of cover/behaviour. Recommend the array first.)*

### 2.2 CONFIG ▸ Admin UI
A "Channels" panel: list + add/edit/deactivate. Fields = the columns above, with sensible defaults so the common case is just **code + label + countries + forecast_mode + buy_role**. Guardrails: `code` immutable once used; can't delete a channel with data (deactivate instead); warn before changing `buy_role` (buy-plan impact).

### 2.3 Runtime
- Server injects `CHANNELS` (the active registry) as a global, like `MKT_COLORS`/`ZAL_SKUS`.
- A tiny client helper module: `chList(country)` → channels for a market; `chKey(code)` → letter (lookup, replaces the 9 ternaries); `chMode(code)`, `chBuyRole(code)`, etc.

---

## 3. Refactor map (hardcode → config-driven)

| Today | Becomes |
|---|---|
| `['DTC','FBA','B2B']` pills (static HTML) | pills generated from `chList(CUR)` — country-filtered automatically (solves EU-only ZAL generically) |
| `chKey` ternaries ×9 | `chKey(ch)` lookup from `CHANNELS` |
| `buildLiveDemand` `CHS=[['DTC','d']…]` | derived from `CHANNELS` (per country) |
| exec/summary `{DTC,FBA,B2B}` | `Object.fromEntries(chList(co).map(c=>[c,{}]))` — **and ZAL finally appears in Summary totals** (open item from the reviews) |
| availability `'dfb'` letters | unchanged storage; letters come from `CHANNELS.key1` (or migrate to arrays later) |
| `calc` LY-vs-absolute | branch on `chMode(ch)` |
| per-channel quirks (`B2B lumpy`) | optional per-channel flags (`no_urgent`, `rt_factor`) in the registry |

The **save paths need no change** (already dynamic). `buildDATA` needs no change (VIEW is dynamic).

---

## 4. The hard part — buy-plan integration (`project()`)

The buy engine is buy-plan-critical and must stay **byte-identical for existing channels**. Generalise the hardcoded sums into **buy roles**:

- **`direct-3pl`** (DTC, B2B): demand consumes the 3PL pool + contributes to the 3PL cover target. → `Σ dem[c] for c in channels where buy_role='direct-3pl'`.
- **`transfer-fba`** (FBA): downstream branch fed by 3PL transfer; own cover target (`cover_months`); the 3PL buy funds it (`nextFbaNeed`). → generalise `dem.FBA` to `Σ transfer-fba channels`.
- **`external-net`** (ZAL): like direct-3pl **but** demand is netted against an external stock pool (`ext_stock_source`) and carries its own `cover_months`. This is exactly the Zalando logic already built — it becomes a *role*, not a special case.
- **`none`**: display/plan only, no buy impact.

So `project()` changes from `dem.DTC+dem.B2B` / `dem.FBA` to **role-grouped sums driven by `CHANNELS`**. Risk is concentrated here; §7 covers mitigation (the buy-plan snapshot harness already exists and works).

---

## 5. Forecasting modularity (demand side)

- **`forecast_mode`** per channel: `ly-growth` (base = LY actual × growth%, flat-LY default, smoothing available) or `absolute` (manual units). Today's `calc` ZAL branch becomes `if(chMode(ch)==='absolute')`.
- **Actuals**: any channel with rows in `sales_actuals` shows LY actuals automatically (already true — we just proved it for ZAL). The `sales_actuals.channel` CHECK constraint must be widened per new channel (or dropped in favour of an FK to `channels` — recommend FK so the registry governs it).
- **SKU scope** (`sku_scope`): `country-avail` (SKU sells in the country → in the channel, the DTC/FBA/B2B model), `upload:<table>` (ZAL's stock-upload-defines-scope model), or `manual` (a flag). This generalises the ZAL `ZAL_SKUS` mechanism.

---

## 6. Phasing (each phase shippable + independently verifiable)

1. **P1 — Registry + Config UI (no behaviour change).** Create `planner.channels`, seed the 4 existing channels (DTC/FBA/B2B/ZAL) to *exactly* mirror today's behaviour, build the Config▸Admin panel, inject `CHANNELS`. Nothing reads it yet → zero risk. *Verify: config CRUD; injected global matches literals.*
2. **P2 — Client enumerations read the registry.** Replace the pills, `chKey`, `CHS`, exec/summary lists with registry-driven helpers. Country-assignment gating falls out here (EU-only ZAL becomes generic). *Verify: jsdom render — every existing channel/country renders identically; add a throwaway test channel and see it appear.*
3. **P3 — `calc` forecast_mode + SKU scope from registry.** *Verify: DTC/FBA byte-identical; ZAL absolute still works.*
4. **P4 — Buy engine role-based demand (the critical phase).** Generalise `project()` sums. *Verify: buy-plan before/after snapshot across all SKUs/markets = byte-identical for DTC/FBA/B2B/ZAL.*
5. **P5 — Governance polish.** `sales_actuals` channel → FK to `channels`; guardrails; "add channel" wizard defaults.

Each phase retrofits the existing four channels first (dogfood), so "modular" is proven on known-good behaviour before any *new* channel is added.

---

## 7. Risks & mitigations

- **Buy-engine regression (highest).** Mitigate with the existing offline buy-plan snapshot harness (`temp/_zcmp.mjs` pattern — `BP.getBuyQtys` on/off) → require byte-identical for the 4 seeded channels before/after P4.
- **Grid render (can't eyeball 6MB page).** jsdom *can* drive `render()`/`calc`/`filteredSkus` (proven during the ZAL build) → automated render+regression checks per phase; Ben does the final visual pass.
- **Availability model scale.** The single-letter `key1` caps at ~a few channels before letters get awkward; fine for now, revisit if >~8 channels (move to arrays).
- **Migration.** Seeding the 4 existing channels must reproduce current behaviour exactly (incl. AU has-no-B2B, CA-FBA-only, B2B rt-factor 0.5, B2B no-urgent). These quirks become registry flags — enumerate them carefully.
- **Config foot-guns.** Changing `buy_role`/`countries` on a live channel shifts the buy plan — gate behind a confirm + surface "this changes the buy plan."

---

## 8. Decisions

**RESOLVED (Ben, 2026-08-08):**
- **Own tables** — `planner.countries` + `planner.channels` + a `channel_countries` assignment (all first-class, extensible).
- **Buy dimension = `stock_source` (3PL | FBA)** per channel — replaces the 4-role model. Demand grouped by stock pool. ZAL = 3PL + optional `ext_stock_source` netting.

**Still open:**
- **A. `sales_actuals.channel`** — widen the CHECK per channel (quick) vs FK to `channels` (governed) *(rec FK, in P5)*.
- **B. Is `stock_source` fixed per channel, or can it differ by country?** *(rec fixed per channel — simplest; no evidence a channel draws 3PL in one market and FBA in another.)*
- **C. Countries scope** — is `planner.countries` just the master list for channel assignment (deep country enumerations `MK`/`CTRS`/`CO_CCY`/market-colours stay as-is for now), or do you want **full country modularity** (add a country in config → flows everywhere)? *(rec: master-list + assignment now; full country-refactor as a separate later effort — it's a second cross-cutting sweep.)*
- **D. Per-channel forecast quirks** to preserve as flags: B2B rt-factor 0.5, B2B no-urgent, AU-no-B2B, CA-FBA-only. Confirm these are the complete set.

---

## 9. Effort & recommendation

- **P1+P2** (registry + config UI + client goes config-driven): the bulk of the "add a channel & see it in the plan" value. Moderate, low-risk (retrofit-and-verify).
- **P3** small. **P4** (buy engine) is the sensitive one — do it alone, snapshot-gated.
- **Recommendation:** proceed **P1 → P2** first (delivers the CONFIG▸Admin "create channel + assign countries → appears in demand plan" capability), verify with the 4 existing channels held byte-identical + a throwaway test channel, then schedule **P4** as a dedicated buy-engine phase. Retrofit ZAL as the first registry channel so the abstraction is proven, not theoretical.

**Net:** the DB is largely ready; the work is (a) a small registry + config UI, (b) swapping ~40 hardcoded enumeration sites for ~4 registry helpers, and (c) one careful buy-engine generalisation. Very achievable in phases, and it turns "3 days of hand-wiring per channel" (Zalando) into "a Config▸Admin form."
