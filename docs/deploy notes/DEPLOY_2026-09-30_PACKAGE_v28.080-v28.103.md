# 🚚 Diviyaj deploy package — v28.080 → v28.103 (30-Sep-2026)

Single action checklist for the batch since prod (**prod is live on v28.079 @ ebfcf41e**). Pull
`phase-2.1-suppliers` @ **v28.103** and ship. Ben's product logic is unchanged unless a note below says so. All
Xero / Flexport / Fulfil **write** paths are admin + explicit-confirm gated and Ben validates them live.

---

## ⚠ 1. Migrations — apply to prod IN ORDER

| # | file | what |
|---|------|------|
| 316 | `316_v_po_finance_flexport_split_fix.sql` | Flexport freight split fix — null-pallet POs no longer take 100% of a shared shipment's freight (CREATE OR REPLACE VIEW, no data change). **Hotfix — was pending from the last package.** |
| 317 | `317_xero_bills.sql` | `planner.xero_bills` — local ACCPAY bill cache for the incremental Xero sync. |
| 318 | `318_distributor_offers.sql` | `planner.distributor_offers` — distributor discount matrix, seeded from the CSV (AU/UKWS/USWS/EUWS × FOB/EXW/3PL). |
| 319 | `319_client_price_tier.sql` | `planner.clients.price_tier` + `price_method` — computed client pricing (nullable, no backfill). |

## ⚠ 2. One-time data steps (after 317 + code are live)

1. **Populate the Xero bill cache** (once): `POST /api/supply/xero/bills-sync?full=1` (admin). ~3 min on prod's bill
   history. After this, the hourly cron keeps it fresh incrementally.
2. **Re-resolve PO links cleanly** (once): `POST /api/supply/po/links/resolve-all?full=1` (admin). This clears the old
   AUTO Xero links (created by the previous loose matcher that mis-linked Flexport freight bills) and re-matches with
   the strict "reference must START WITH the PO" rule. Purges the ~200+ bad links currently in prod.

## ⚠ 3. Cloud crons (secret-gated: header `x-webhook-secret: <N8N_WEBHOOK_SECRET>`)

- **NEW `POST /api/cron/xero-bills-sync`** every **1 hour** — incremental Xero bill sync (If-Modified-Since).
- `POST /api/cron/resolve-po-links` every **4–6 h** — now **incremental** (only POs without a link); the `?full=1`
  variant is the one-time cleanup in step 2.
- `POST /api/cron/flexport-import` (unchanged, every 4 h).

## ⚠ 4. Env — confirm on prod

- `FLEXPORT_API_TOKEN`, Xero `UK/AU` custom-connection creds (accounting.settings + accounting.transactions),
  `N8N_WEBHOOK_SECRET` — all already added; no new env vars in this batch.

---

## What's in the batch (by area)

**Performance (v28.081–091) — no product change**
- Shell served from a memo + **static content-hashed script split** (`/static/*.js`, immutable): first byte 7.1 s → 0.03 s,
  page load 14.8 s → <1 s warm, repeat visits transfer ~0 script bytes. Lazy SKU is now the default (`?lazysku=0` opts out).
- Broad **response caching** (section + a general `RESP_CACHE` + region-keyed Xero reads): ~40 heavy report endpoints
  0.6–8 s → 1–8 ms. **po-detail** batched (drawer 1–2.7 s → 0.35 s). ETag/304 on JSON GETs. DEMAND overlay pre-warmed
  (first sidebar click 13 s → ~4 s). Xero payments page loads instantly (exceptions load progressively).
- All request-driven, per-instance, Vercel-safe. `HZ_PROFILE=1` / `HZ_QLOG=<ms>` add diagnostics.

**CONFIG ▸ App health (v28.091)** — admin one-click endpoint sweep (admin + supplier & client portals via ephemeral
5-min sessions), ranks slow/errored endpoints, copyable report. `GET /api/config/health-check`.

**Xero bills cache + reconciliation (v28.094)** — resolver + Exceptions read bill amounts from `xero_bills` (no live
Xero per run). Strict PO↔bill matcher (reference must START WITH the PO). Incremental resolve. Exceptions: non-USD
bills no longer false-flag; every row has open-PO (drawer) + open-in-Xero + action. Flexport booking preview no longer
blocks on a 30 s harvest.

**Cin7 decommissioned for PO ERP (v28.095)** — the "Update ERP" drift action + order-plan pushes now target **Fulfil
only**; removed "Push to Cin7" + "not required in Cin7" + "Sync Cin7 Dates". (The Cin7 *sales-order/DTC import* feed is
untouched.)

**Polybag order logic (v28.096, v28.098)** — recommendation rounds to 50 with the tip at 35-in-block (no wasted pack
for a fraction), only recommends the shortfall vs what's on order, and polybag lines never flag COUNTRY RISK.

**PO grid / actions (v28.085, v28.098, v28.100)** — "Shipped · no Xero invoice" exception filter; **missing production
start / end** raises two red actions with inline markers + snooze on the Start/End cells.

**Client card + portal (v28.086, v28.097, v28.099–103)**
- Fixed the broken **MESSAGES** tab (`_cpMsg` was undefined). Faster Clients & Agents (parallel + memoised lookups).
- Client card **auto-saves** (no Save button); portal-user actions are stacked links incl. **copy magic link**
  (`POST /api/client/users/:id/magic`, mints without emailing).
- **Computed price tiers** (mig 318/319): currency dropdown; per-client tier (RT / WS / Distributor + FOB/EXW/3PL);
  the client **line sheet + orders** price off `products.<mkt>_rt` → ex-tax → WS (÷2) → distributor (×(1−discount)),
  falling back to the legacy `price_list` when no tier is set. Preview endpoint `GET /api/client/price-preview`.
- Rep-group **commission rate / Xero contact / account** editable inline in CLIENT ▸ Commissions.

## Not for prod
`FULFIL_LIVE_WRITES` stays OFF until company-routing is resolved (unchanged). Sandbox seed/test artifacts (test Xero
bills/payments, TEST rep groups/clients, any test Flexport booking) are Ben's to clean in the live tools.

## Reference notes (detail)
Per-version notes in this folder: `DEPLOY_2026-09-30_v28.08x…v28.103_*.md`.
