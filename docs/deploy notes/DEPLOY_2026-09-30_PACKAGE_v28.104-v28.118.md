# 🚚 Diviyaj deploy package — v28.104 → v28.118 (30-Sep-2026)

Pull `phase-2.1-suppliers` @ **v28.118** and ship. This **stacks on the v28.080–v28.103 package**
(`DEPLOY_2026-09-30_PACKAGE_v28.080-v28.103.md`) — if that batch has not gone to prod yet (prod was last
noted at v28.079), apply both in order; the migration and cron lists below are the **full** set so you can work
from one checklist. All Xero / Flexport / Fulfil **write** paths stay admin + confirm gated.

---

## ⚠ 0. BREAKING / must-check before shipping

1. **`N8N_WEBHOOK_SECRET` is now REQUIRED.** v28.116 changed four webhook-secret checks to **fail closed** — if
   the env var is unset or blank, these routes now return **401** instead of running:
   `POST /api/cron/xero-bills-sync`, `/api/cron/resolve-po-links`, `/api/cron/flexport-import`,
   `/api/supply/fulfil/import-pos`, `/api/tracking/poll`. **Confirm the secret is set on prod** and that n8n sends
   `x-webhook-secret` on all of them, or the crons silently stop.
2. **Admin-check behaviour change (v28.116, security):** the 16 live-Xero/Flexport write handlers that used to
   *skip* their admin check on a DB error now **fail closed** (500 "permission check failed"). Expected; just don't
   read a transient 500 there as a regression.
3. **`/api/storage/sign-upload` moved behind the access gate** (was reachable with no key). The admin route now
   needs the planner-key cookie/header like every other admin route; the supplier-portal variant
   (`/api/portal/storage/sign-upload`) is unchanged (magic-link session). If any prod flow called the admin
   sign-upload without the key, it will now 401 — it never should have.

## ⚠ 1. Migrations — apply IN ORDER

| # | file | what | notes |
|---|------|------|-------|
| 316 | `316_v_po_finance_flexport_split_fix.sql` | Flexport freight split fix (view) | from prior package |
| 317 | `317_xero_bills.sql` | `planner.xero_bills` local ACCPAY cache | from prior package |
| 318 | `318_distributor_offers.sql` | distributor discount matrix | from prior package |
| 319 | `319_client_price_tier.sql` | `clients.price_tier` + `price_method` | from prior package |
| **320** | **`320_review_indexes.sql`** | **NEW** — perf indexes from the code review | idempotent; see below |

**320 detail** (all `IF NOT EXISTS`): `supplier_notes (po)`, partial `supplier_notes (po, author_kind) WHERE
read_at IS NULL`, `supplier_notes (supplier_id)`, `forecast_outputs (channel)`, `forecast_outputs (month)`,
`inventory_snapshots (snapshot_date)`. On the large tables (`supplier_notes`, `forecast_outputs`,
`inventory_snapshots`) **prefer `CREATE INDEX CONCURRENTLY`** (cannot run inside a txn) to avoid a write lock —
same guidance as `292_perf_indexes.sql`. These back the hottest read (PO grid rebuild scans `supplier_notes` per row).

## ⚠ 2. Env — confirm on prod

- **`N8N_WEBHOOK_SECRET`** — now load-bearing (see §0.1).
- **`CLIENT_PORTAL_HOST`** (default `client.dockandbay.com`) and **`ADMIN_HOST`** (default `horizon.dockandbay.com`)
  — optional; only set if the hosts differ from the defaults. An empty `CLIENT_PORTAL_HOST` disables host routing
  (for previews).
- No other new env vars. `FULFIL_LIVE_WRITES` stays **OFF**.

## ⚠ 3. DNS / Vercel — client portal subdomain (v28.104)

`client.dockandbay.com` serves the client portal; the admin shell + admin APIs are **not** reachable on that host
(admin `/api/*` → 404, everything else → redirect to the portal). To go live:
1. Add the domain `client.dockandbay.com` to the **existing HORIZON Vercel project** (same deployment as
   `horizon.dockandbay.com` — both hosts serve one app; the code branches on the Host header).
2. DNS: `CNAME client → cname.vercel-dns.com` (Ben is handling the DNS record; if on Cloudflare, set it **DNS-only**,
   grey cloud). Do this **after** the code is live, or the subdomain shows the admin key prompt.

## ⚠ 4. One-time data steps (from the prior package — run once if not already done)

1. `POST /api/supply/xero/bills-sync?full=1` (admin) — populate the Xero bill cache (~3 min).
2. `POST /api/supply/po/links/resolve-all?full=1` (admin) — purge the old mis-linked AUTO Xero links.

## ⚠ 5. Crons (secret-gated — see §0.1)

- `POST /api/cron/xero-bills-sync` — hourly (incremental).
- `POST /api/cron/resolve-po-links` — 4–6 h (incremental; `?full=1` is the one-time §4 cleanup).
- `POST /api/cron/flexport-import` — 4 h.

---

## What's in the batch (by area)

**Client portal on its own subdomain (v28.104).** Host router; magic links + client emails mint on
`client.dockandbay.com`, admin "Open in HORIZON" links resolve to `horizon.dockandbay.com`.

**Supplier payments — cross-org intercompany loan (v28.105–106).** A payment run now takes an explicit **paying
org** (dropdown, default UK). Completion/balance lines whose PO lives in the other Xero org settle via the
**intercompany loan account 625/901** on both sides at each org's daily USD rate; same-org lines unchanged.
Deposits never cross orgs (flagged red, blocked). PayPal is no longer auto-picked as the pay-from bank; the
inaccurate "not reconciled" notice is gone; a bold "must be paid from a bank linked to XERO &lt;org&gt;" warning shows
when a run has deposits. Uses the existing `planner.distributor_offers` config and the `loan` account role (resolved
from the finance registry, else Code 901 in the org). No new migration.

**AU bill migration tool (v28.107, v28.109–110).** PAYMENTS ▸ Xero payments ▸ "AU bill migration": recreates an
AU PO's bill that sits in Xero UK as an identical **DRAFT** bill in Xero AU coded to **625**, auto-creating the
supplier contact in AU if missing. Read-only dry-run; per-PO + "migrate all"; does not touch the UK bill or the PO
link (void + re-point are deliberate later steps). All amounts admin + confirm gated.

**Product & sampling (v28.108, v28.111–115).** Sidebar action-counter on L2/L3 rail items; product status is a
clean 3-state (In development / Approved / **Stop development**); sample rows show estimated-delivery + received
dates; new "Samples arriving soon" grouped view; PRODUCT grid layout (filters/sort/swatch) saved per user; the
"new development request" form is **inline** in the product Edit view with supplier-add + past-address autocomplete
(stored in `product_dev_requests.recipient_addresses` — column already existed); all four **timelines** (PO,
product, shipment, samples) are now conversation threads with **Messages / Record-of-change tabs**.

**Tables left-aligned (v28.110)** in the payment modals (standing UI rule).

---

## 🔒 Security & correctness fixes (v28.116 server / v28.117–118 client)

These came out of the 30-Sep full code review (see the pipeline section). The ones that matter to you:

- **S6** — `/api/forecast/snapshot` now releases its pooled client (was the one `pool.connect()` site with no
  release; on the Vercel pool of 4 it could exhaust the pool and hang all later queries). **Highest-value fix.**
- **S1** — unauthenticated upload route moved behind the gate (§0.3).
- **S3** — 16 fail-open admin checks now fail closed (§0.2).
- **S4** — `/api/client/orders` removed from the response cache (a cache hit bypassed `cpAdminGate`).
- **S5** — webhook-secret checks fail closed (§0.1).
- **S8** — a swallowed credit-note DB write is now surfaced (`record_failed`) so a failure can't cause a duplicate
  credit note.
- **S9** — single-flight guard on the Fulfil import (overlapping runs could prune each other's rows).
- **S12** — NaN-safe numeric parsing on money/qty body fields (NaN reached numeric columns and poisoned sums).
- **S13/S14/S15/S31/S40** — Xero query-language escaping, portal QC-doc scoping, admin check on Xero disconnect
  and live-Fulfil date writes, TTLs on two Fulfil id memos.
- **Client (v28.117–118):** an `esc()` XSS gap closed (single quotes now escaped; inline handlers escaped), lazy
  swatch loading, a runaway 12 s poll guarded and slowed to 60 s, several search inputs debounced, and
  `/api/app-settings` reads routed through the client SWR cache (busted on save). Client-only — no server impact.

---

## 🛠 Improvement pipeline (context — not all in this batch)

The 30-Sep review produced a ranked plan of **77 verified findings** (P0/P1/P2, each with a file:line and fix):
**review plan → https://claude.ai/artifact/X7Phne3R9TathTA2hSXwe6**. This package ships the **low-risk P0/quick-win
subset**. What's worth your attention beyond it:

- **P0 still open — needs your call (prod auth):**
  - **S2 — header-spoofed identity.** `authUser()` derives the user from `x-forwarded-email`/`x-user-email`
    headers; the gate's own comment notes prod passes client headers through, so a planner-key holder could send
    `x-user-email: ben@…` and become admin on live writes. You reportedly ported a **signed-cookie login** upstream
    — **please confirm what prod actually does**; if the signed cookie is authoritative on prod, this is mitigated
    there and we should mirror it here. Not shipped in this batch.
  - **S7 — Xero payment amounts trusted from the request body** (NaN→0, negatives pass the overpay guard). Fix is
    to re-derive amount + account server-side from the PO/deposit row. Design change; not shipped.
- **P1 performance (next):** the biggest cheap win is **migration 320's indexes** (in this package). Then server
  batching of the N+1 import/commission paths, a Xero 429 backoff, and client render/poll cleanups. See the artifact.
- **P2 structural (planned):** collapse the 4 duplicated timeline renderers into one component, split the 2.7 MB
  single client script along its section banners (your `_externaliseScripts` already supports it), a shared
  fetch/error layer, and a minify step in `shellBundle`. No action needed from you now — logged for the roadmap.
- Also on your side: `ssl: { rejectUnauthorized:false }` on the DB pool (S35) and the hard-coded prod/sandbox
  project-ref switch (S36) are prod-infra items flagged for you in the artifact.

## Not for prod
`FULFIL_LIVE_WRITES` stays OFF. Sandbox seed/test artifacts (test Xero bills/payments, TEST rep groups/clients,
any test Flexport booking, migrated AU bills created while testing) are Ben's to clean in the live tools.
