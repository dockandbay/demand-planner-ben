# HORIZON review: codebase health + UI uplift plan (2026-09-05)

Author: Ben (with Claude). Branch `phase-2.1-suppliers` @ v27.466. Companion to HANDOVER_PRODUCT_and_SETS_2026-09-05.md.

## 1. Shape of the codebase (measured)

| File | Size | Notes |
|---|---|---|
| artifact_v16.7.html | 1.8 MB, 17.9k lines | DEMAND/BUY/FBA/REPORTS. 1 script, 11 style blocks, 22 IIFEs, ~970 top-level declarations, 97 window globals |
| supply/inject.html | 2.0 MB, 14.2k lines | SUPPLY + PRODUCT + CONFIG UI, injected before </body> |
| server.mjs | 1.4 MB, 16.5k lines | 534 endpoints (271 supply, 76 product, 74 portal), 1,428 queries, 278 functions |
| supply/portal-view.js | 389 KB, 2.6k lines | supplier portal renderer (shared with admin preview) |
| supply/portal.html | 32 KB | portal shell + login + price-list overlay |
| tests/ | 1 file | jsdom portal in-place regression |

## 2. What is good (keep)
- Centralised write guard: one middleware maps method+path to a capability (demand/supply/product/config) and checks app_permissions. Sandbox bypass is explicit.
- SQL is parameterised. The 61 template interpolations are all internal fragments (column lists, allowlisted scope/table names, CTE strings); none carry request input.
- Pool tuning, transaction-pooler switch, KV data cache and sandbox banner are well documented in code.
- Portal renderer is a single source of truth for live portal and admin preview.
- Palette is already Tailwind slate + semantic colours (#0f172a, #94a3b8, #cbd5e1, #dc2626, #16a34a, #b45309, #7c3aed). Tokenising it is mostly mechanical.

## 3. Weaknesses (ranked by value / risk)

1. No design tokens. Zero `:root` custom properties in the artifact, 270 distinct hex colours, 3,396 inline `style=` attributes, 12 font sizes from 7px to 18px, 334 `!important`. This is the single biggest barrier to a nicer, consistent UI.
2. Error handling by hand. 494 `res.status(500)` blocks and no Express error middleware. Express 5 already forwards async rejections, so one handler plus a thin wrapper would replace most of them with byte-identical behaviour.
3. Helper duplication. `esc()` defined 13 times in the artifact; `fd/money/fmt` re-implemented in every front-end file; portal.html has its own `esc` + `api`.
4. String-built DOM. 399 innerHTML writes + 393 inline onclick strings. Safe today via esc(), but hard to audit and no CSP.
5. Test coverage. One jsdom test. The buy-plan snapshot harness (memory `buy-plan-snapshot-harness`) exists as a recipe, not a committed script.
6. Portal hardening. No rate limit on `/api/portal/request-link` (sends email). No security headers. 25 MB JSON limit is global rather than per upload route.
7. Repo hygiene. ~20 loose spec/handover .md files, zips, `cf.log` / `server.log` / `tunnel.log`, `zalando_data.json`, `cin7-calls.jsonl` at root. Logs appear tracked (cf.log shows as modified).
8. Portal price-list tab is bolted on from portal.html via a 250 ms polling interval waiting for the tab bar. Should live in portal-view.

## 4. Codebase improvement plan (no behaviour change unless stated)

| # | Item | Risk | Effort |
|---|---|---|---|
| C1 | Repo hygiene: move loose docs to `docs/` + `deploy notes/`, gitignore logs and scratch data | none | S |
| C2 | Central error middleware + `wrap(fn)`; migrate endpoints in batches, byte-identical responses | low | M |
| C3 | Shared `supply/hz-util.js` (esc, fd, money, units, shortUser, carrier links); replace duplicates file by file | low | M |
| C4 | Design tokens: `:root` sheet (colour, type scale, spacing, radius, shadow, z-index) mapped from the existing palette; codemod hex literals to `var()` | low (visual only, no logic) | M |
| C5 | Rate-limit request-link + basic security headers | low | S |
| C6 | Commit buy-plan snapshot as `npm run bp:snapshot` (before/after diff) | none | S |
| C7 | Portal price-list tab into portal-view; remove polling hack | low | S |
| C8 | Split server.mjs into routers by prefix (supply/product/portal/demand/config). Coordinate with Diviyaj: file layout change | medium | L |

## 5. UI uplift plan (mockups first, Ben approves each phase)

Blocked until the Claude Design projects are imported (needs `/design-login`):
- Horizon Supply: project 0c713ff8-60df-4ae4-99ce-0569047ca658, file `Horizon Supply.dc.html` + `support.js`
- Horizon Zalando (reference look): project 93ea3747-8a77-46ed-a644-1e9fdecbec0b, file `Horizon Zalando.dc.html`

Phases (each = version bump, screenshots for sign-off, buy plan untouched):
- U0 Tokens (C4) extracted from the design file so every later phase is a token swap, not a rewrite.
- U1 App shell: top nav, L2 tabs, typography scale, page padding, status bar. One look across DEMAND/SUPPLY/PRODUCT/CONFIG.
- U2 Primitives: tables (.tw), pills, buttons, inputs, badges, drawers, popups. Replace ad-hoc inline styles with classes.
- U3 SUPPLY views to the design (Purchase Orders grid + PO drawer first, then Shipments, Cash Flow, Actions).
- U4 PRODUCT views (grid, detail tabs, Samples) on the same primitives.
- U5 Supplier portal (see 6).

## 6. Supplier portal: candidate improvements
- Nav: 10 flat tabs (POs, Productions, Shipment plan, Payments, Deposits, Samples, Product, Quality, Specs, Timeline). Group into Orders / Production & Shipping / Money / Product, with an Inbox/Home that lists "needs your action" first.
- Consistent status colour system shared with the admin app (tokens).
- Empty states, loading skeletons, clearer primary action per row.
- Mobile: tab bar scrolls; card layout for PO rows under 640px.
- Keep the standing rule: everything left-aligned.
- Price-list tab wired natively (C7).

## 7. Deploy reminders (unchanged)
Two packages await Diviyaj (v27.432-450, v27.451-466). The v27.466 FBA-latch fix is critical; diff against Ben's backup before deploy.

## 8. Design import (done 2026-09-05)

One Claude Design project (both URLs are copies). Screens: Supply (= SUPPLY > BI & Reports > Actions board), Purchase Orders, Demand Plan v2, Buy, Buy Move, FBA, Inventory, Transfer, Reports, BI Reports, DTC Mismatch, Zalando, login. Assets: Gotham fonts, logo-mark.png. `support.js` is the design canvas runtime, not app code.

### Tokens (from the design :root)
| Token | Value | Replaces in app |
|---|---|---|
| --nav | #0d1626 | #0f172a nav bar, #374151 view-tabs-row |
| --nav-dim | #93a1b8 | #cbd5e1 nav text |
| --bg | #f4f6f9 | #fff page background |
| --card | #ffffff | panels |
| --ink | #101828 | #1a1a1a, #0f172a text |
| --muted | #5b6b83 | #64748b, #475569 |
| --faint | #8b98ad | #94a3b8 |
| --line / --line2 | #e5e9f0 / #eef1f6 | #e2e8f0, #e5e7eb, #d0d0d0, #f1f5f9 |
| --hover | #f7f9fc | #f8fafc, #f5f5f5 |
| --blue / --blue-soft / --blue-ink | #2361d8 / #eaf1fd / #1a4fb5 | #1d4ed8, #dbeafe, #1e40af |
| --pos / --pos-bg | #118a4e / #e8f6ee | #16a34a, #166534 / #dcfce7 |
| --neg / --neg-bg / --neg-cell | #d23227 / #fdeeec / #fbdcd8 | #dc2626, #b91c1c / #fee2e2 |
| --amber / --amber-bg | #b45309 / #fdf3d7 | #b45309 / #fef3c7 |
| --prod / --prod-bg | #f5b83d / #fdeec8 | PRODUCTION status |
| --shadow | 0 1px 2px rgba(16,24,40,.04), 0 6px 22px -12px rgba(16,24,40,.10) | ad-hoc shadows |
| radius | 8 (buttons), 9-10 (inputs, segmented), 12 (KPI), 14 (boards/tables), 999 (pills) | 4-7px today |
| type | Hanken Grotesk 400-800; body 12-12.5, labels 10.5 uppercase .05em, KPI 19-21 800, tabular-nums | system-ui 12px, sizes 7-18 |

### Shell (design)
Header 52px navy: logo mark + HORIZON; tabs DEMAND / SUPPLY / BUY & MOVE / REPORTS / SCENARIO / PRODUCT / CONFIG (active = white on rgba(255,255,255,.09) radius 8); right: Recent, Inbox (badge), Suggestions, avatar.
Sub-tab row white, underline 2.5px navy, count pills. L3 row: PO tabs underline blue; Actions uses folder tabs. Version badge amber pill. "Refresh cache" text link.

### Codemod safety
Hex literals also appear in canvas fillStyle (inject 5, portal-view 6) and SVG fill attributes (inject 15) for labels/PDFs/charts. Tokens go into `<style>` blocks first (safe: CSS var() everywhere), then inline styles per view by hand. Never touch PDF/label/canvas code.

### Font hosting
Google Fonts is blocked in mainland China; suppliers use the portal from there. Self-host Hanken Grotesk woff2 (OFL licence) under supply/assets alongside Gotham, system-ui fallback.
