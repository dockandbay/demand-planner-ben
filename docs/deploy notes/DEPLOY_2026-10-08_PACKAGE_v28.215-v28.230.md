# Deploy package v28.215 to v28.230 (08-Oct-26)

**AT A GLANCE**
- **Branch and SHA:** `review-fixes-2026-10-05`, code HEAD `879e3def` (full `879e3def0a1e23edbb66729e3588db2d9704c67c`). This note is committed on top; deploy by the code SHA or the branch tip.
- **Live:** checked 08-Oct-26 via https://horizon.dockandbay.com/api/version, **v28.214**. Thanks for the last package.
- **Migrations: 4 (338 to 341).**
  - Checked on live today: none applied yet.
  - All additive and idempotent. The code runs before each is applied; the new feature's edits return 503 until then.
- **Env vars:** none new. Optional setting in the app: CLIENT ▸ Config ▸ Sales team emails.
- **Buy plan and forecast:** no change unless someone sets the new size split (v28.221). Blank = byte-identical.
- **Hosting:** `vercel.json` changed (v28.215). Please check it against yours.

## 1. Migrations (run in order, all `IF NOT EXISTS`)
| # | File | What |
|---|---|---|
| 338 | `338_demand_worksheets.sql` | `demand_worksheets` table: shared Cross Market worksheets (v28.216) |
| 339 | `339_po_fulfil_is_number.sql` | `purchase_orders.fulfil_is_number`, the Flexport booking link by Fulfil IS (v28.223) |
| 340 | `340_intake_deadlines.sql` | `intake_deadlines` (keyed by `sku, location`; `sku='*'` = location date) + `alert_snoozes` (v28.224 / v28.225). Run the CURRENT file; it was reshaped before ever reaching live |
| 341 | `341_client_order_review.sql` | `clients.order_review` + review columns on `client_orders` (carrier, internal note, pushed by / at, history, updated by / at) + status index (v28.227) |

## 2. Checks
- **v28.215 mirrors your live hotfixes** v28.183.1 (health-checks SQL comment) and v28.183.2 (Flexport 60s timeout), plus prod v28.150.2 (`ASPADJ_MEMO` not reset on render). Please confirm nothing else is in prod that isn't here.
- **`vercel.json`:** `includeFiles` collapsed to two pdfjs globs (159 chars; Vercel rejects over 256). Keep your version if it differs and tell Ben.
- **`PORTAL_URL` code default** is now `https://supplier.dockandbay.com/portal`. Prod sets the env var, so there's no live change.
- **Fulfil writes:**
  - Client order review push (v28.227) and Validate sales order push (v28.230) both use the existing `FULFIL_LIVE_WRITES` gate. Without it they return 423.
  - The client order push creates a **Draft** sale only.
- **Never set `HZ_FULFIL_WRITE_STUB*` in prod** (dev only; ignored on Vercel).
- **Default changes on the client portal (v28.227):**
  - With 341 applied, portal orders are **held for review** by default and no longer create a Fulfil draft on submit.
  - To keep today's behaviour until the team is ready, turn on CLIENT ▸ Config ▸ "Post portal orders to Fulfil automatically". Ben to decide.

## 3. What's in it
**DEMAND**
- v28.216: **Cross Market view** + worksheet mode, with shared saved worksheets (migration 338).
- v28.217: Plan **download builder** (xlsx / CSV, markets, channels, categories, measures).
- v28.218: Plan grid column sort and filter.
- v28.219: Plan grid YTD + To go totals.
- v28.220: Plan grid **Combine** topline across countries and channels (read only).
- v28.221: Contribution model **size split** per sub-category. Engine: `applySizeSplit`; blank = byte-identical. Also fixes a stale load that blocked Contribution model saves.
- v28.224 / v28.225 / v28.226: DEMAND ▸ Analysis ▸ **Intake deadlines** (migration 340).
  - Deadlines per branch location, with alert counters and snooze.
  - Zalando counts as 3PL.
  - FBA counts pending 3PL transfers.
- v28.228 / v28.229: Cross Market fixes (hidden bars; sub-category rows below discontinued).

**SUPPLY / REPORTS**
- v28.222: Stock Availability Description column + word search (SUG-0043).
- v28.223: Flexport booking named by the Fulfil IS number, with all POs as tags (SUG-0042, migration 339). Reads Fulfil live (read only).
- v28.230: **Validate sales order:** backorder lines now need a supplier like drop ship.
  - Each supplier gets a card, a picker and push.
  - The push also updates purchase requests in state `requested` that aren't on a PO yet.
  - Reported on SO58416 (John Lewis).

**CLIENT**
- v28.227: **Client portal orders held for review before Fulfil** (migration 341).
  - Auto-post toggle (default off) and a per-client override.
  - One email to the client, cc the sales team and the owner.
  - Review / edit view: carrier, service, per-line fulfilment and supplier.
  - Push creates a Fulfil draft; orders can be cancelled.
  - New routes: `GET/POST /api/client/portal-orders/:id`, `GET /api/client/portal-orders/:id/fulfil-options`, `POST /api/client/portal-orders/:id/push`, `POST /api/client/portal-orders/:id/cancel`. These are staff CLIENT-access routes, not portal routes.

**Platform**
- v28.215: hotfix mirrors and port conflicts (section 2).

## 4. After deploy
1. Hit `/api/version`: expect v28.230.
2. DEMAND ▸ Cross Market loads; save a worksheet (proves 338).
3. DEMAND ▸ Analysis ▸ Intake deadlines: set and clear a location date (proves 340).
4. CLIENT ▸ Orders: open a submitted portal order and run the push dry run (proves 341, no write).
5. Validate sales order ▸ SO58416: backorder lines show supplier cards (read only; no push needed).
