# HORIZON build: CLIENT > B2B forecast

Instructions for Claude Code in the HORIZON repo (`horizon-demand-and-supply-planner`). Written 31-Oct-26 by Ben with Claude.

Paste this whole file into a HORIZON Claude Code session, or save it as `docs/specs/b2b-forecast.md` and say "build docs/specs/b2b-forecast.md".

---

## 1. What we are building and why

Today the wholesale direct-to-client order forecast lives in a Google Sheet, **"B2B - Direct to Client Forecast"**
(https://docs.google.com/spreadsheets/d/1fKZWolg8F7WiaCoRRALNFI5NTy0K85T0ftYyjDmX2Xc, tab `B2B_DIRECT_FORECAST`).
Andy's budget workbook (`ONGOING - Budget 2026_27`) pulls it in with IMPORTRANGE and uses it for:

- **Cash receipts** by month (payment dates and percentages),
- **P&L wholesale revenue** by month (ship date),
- **Production cash out** for orders not yet confirmed.

Move it into HORIZON under **CLIENT** so that:

1. Sales (Mikey, Liam and the wholesale team) maintain one record per client order, linked to the HORIZON client.
2. Confirmed orders link to the Fulfil sales order, so status (shipped, invoiced, cancelled) updates itself.
3. HORIZON works out the cash and P&L phasing with the same rules as the workbook (section 5), with the FX bug fixed.
4. **Chief** (the founders' app, separate Supabase) reads the result through one read-only endpoint (section 8). Chief never writes to HORIZON.
5. Until Chief replaces the workbook, the workbook keeps working, through a CSV endpoint laid out exactly like today's sheet (section 9).

Follow `CLAUDE.md` in this repo: build on a branch, schema as a migration file, no production wiring, deploy note in `CHANGES.md`. Diviyaj pulls it into production.

---

## 2. Where it goes in the app

- Top tab **CLIENT**, new L3 item **B2B forecast** (next to Clients & agents and Commissions; L3 lives in `#client-root #client-l3`, see `supply/inject.html`).
- Also a **B2B forecast** tab on the client detail page (CLIENT > Clients & agents > Edit), showing that client's rows only.
- Routes under `/api/client/b2b-forecast...`, so they sit behind the existing `cpAdminGate` and CLIENT permission.
- Permissions (CONFIG > Permissions): new grant **`b2b-forecast`** with levels view / edit. Edit: Ben, Andy, Mikey, Liam, Madison (Ben to confirm the list). View: anyone with CLIENT.

---

## 3. Data model (migration `407_b2b_forecast.sql`, or the next free number)

Check the latest number in `migrations/` first (406 was `406_workflows.sql` at the time of writing).

```sql
create table if not exists planner.b2b_forecast_orders (
  id              bigserial primary key,
  client_id       integer references planner.clients(id),      -- null allowed for forecast buckets such as "UK Jan Key Accounts"
  client_label    text not null,                                -- what the sheet calls it today ("Dillard's SS27 Beach")
  reference       text,                                         -- PO / note / order number
  order_type      text not null check (order_type in
                   ('UK Wholesale','US Wholesale','EU Wholesale','International Distributor','AU Distributor')),
  entity          text not null default 'UK' check (entity in ('UK','AU')),   -- AU Distributor rows are AU entity
  value_source    numeric(14,2) not null,                       -- order value NET, ex tax, in the order currency
  currency        text not null check (currency in ('GBP','USD','EUR','AUD','CAD')),
  confirmed       boolean not null default false,
  status          text not null default 'forecast' check (status in
                   ('forecast','confirmed','shipped','invoiced','paid','cancelled')),
  order_date      date,
  payment_terms   text,
  ship_date       date,
  fulfil_order_refs text[] default '{}',                        -- Fulfil sales order numbers once raised (SO... / customer refs)
  owner_email     text,                                         -- salesperson who owns the row
  cogs_pct        numeric(5,4),                                 -- null = use the type default (section 5.4)
  notes           text,
  created_by text, created_at timestamptz default now(),
  updated_by text, updated_at timestamptz default now()
);

create table if not exists planner.b2b_forecast_payments (
  id         bigserial primary key,
  order_id   bigint not null references planner.b2b_forecast_orders(id) on delete cascade,
  seq        smallint not null,          -- 1, 2, 3 ... (the sheet allows 2; allow more)
  due_date   date,                       -- null is allowed but is flagged (section 6)
  pct        numeric(6,3) not null,      -- 30 = 30%
  unique (order_id, seq)
);

create table if not exists planner.b2b_forecast_changes (       -- audit: Chief shows forecast drift from this
  id bigserial primary key, order_id bigint, field text, old_value text, new_value text,
  changed_by text, changed_at timestamptz default now()
);
```

Write a row to `b2b_forecast_changes` on every create, edit or delete (value, currency, dates, payments, confirmed, status).

---

## 4. One-off import from the sheet

Add a button on the new page, **Import from sheet** (admin only), plus a script `scripts/import-b2b-forecast.mjs`. It reads `B2B_DIRECT_FORECAST!C2:O500`, the same range the workbook imports. Map the columns like this:

| Sheet column | Field |
| --- | --- |
| C Client | `client_label`; match `clients.name` case-insensitively to set `client_id` (leave null if no match, list the misses) |
| D Reference / Note / Order Number | `reference`; if it looks like an order number (e.g. `JLEW11511-79`, `NEXT23106-14`, `CCRU28821-1`), also put it in `fulfil_order_refs` |
| E TYPE | `order_type`; `AU Distributor` sets `entity = 'AU'` |
| F Order Value (NET, EX TAX) | `value_source` |
| G Currency | `currency` |
| H Order Confirmed | `confirmed`; `status = confirmed` if TRUE else `forecast` |
| I Order Date | `order_date` |
| J Payment Terms | `payment_terms` |
| K Ship Date | `ship_date` |
| L Payment 1 Date, M Payment 1 % | payment seq 1 |
| N Payment 2 Date, O Payment 2 % | payment seq 2 (skip if both blank) |

Skip the header, the three example rows above "EXAMPLES ABOVE - Fill below", and blank rows. Dates arrive in mixed formats ("20 April 27", "11/20/25", "01-Feb-36"). Parse them all, and flag any that fail or look wrong (year before 2024 or after 2028) instead of guessing.

After import, show a summary: rows in, rows skipped, unmatched clients and flagged dates.

---

## 5. Calculations (must match the workbook's rules, with the FX fix)

### 5.1 GBP value

`value_gbp = value_source / rate(currency, d)`, where rates are **local currency per 1 GBP**.

- `d` = `ship_date`, or `order_date` if there's no ship date (same as the workbook).
- Rate source: use HORIZON's existing `app_settings.fx_rates` (`{"<fyStart>": {USD, EUR, AUD}}`, local per GBP) for the financial year containing `d`, then `app_settings.usd_gbp_rate` for USD. Store the rate used on each calculation so a number can always be traced.
- **Never fall back to a hard-coded rate silently.** If no rate is found, show the row as "no FX rate" and leave it out of totals.
- GBP is 1. AUD rows for the AU entity stay in AUD for AU cash (section 5.2) and are converted only for group totals.

**Bug in the workbook (do not copy):** its column D looks up the EXCHANGE tab with the wrong columns. Every USD row is divided by **1.883** and every EUR row by **1.873**, which are GBP>CAD values. Some rows fall back to a hard-coded **1.32**. In FY26/27 that understates USD receipts by about £253k and EUR receipts by about £79k. (Workings use USD 0.744 GBP and EUR 0.86 GBP per unit; EUR is an assumption.) HORIZON must use real rates, and the import summary should show the old against the new GBP value per row so Andy can see the change.

### 5.2 Cash receipts (replaces workbook cash tab rows 20, 23, 27, 29 and AU row 9)

For each payment: `receipt = value_gbp × pct / 100`, in the month of `due_date`.

| order_type | Workbook cash row | VAT |
| --- | --- | --- |
| UK Wholesale | 20 "Sales - Wholesale - UK (20%) - Direct Orders" | **× 1.2** (UK VAT gross-up, as the workbook does from Oct 25) |
| EU Wholesale | 23 "Sales - Wholesale - Europe - Direct Orders" | none |
| International Distributor | 27 "Sales - Wholesale - Distributors - Direct" | none |
| US Wholesale | 29 "Sales - Wholesale - USA - Direct Orders" | none |
| AU Distributor | AU budget row 9 (AU entity, AUD) | none |

Exclude `status = 'cancelled'`. Include both confirmed and forecast rows, and tag each receipt `confirmed` true or false so Chief can show them apart.

Once an order is `paid` in Fulfil or Xero, it drops out of the forecast, because actual receipts take over in Chief. Until that link exists, keep it in.

### 5.3 P&L revenue (replaces the `sumifs` on ship date in the ONGOING BUDGET UK/AU tabs)

`value_gbp` (net, no VAT) in the month of `ship_date`, by `order_type`.

### 5.4 Production cash out for unconfirmed orders (replaces cash row 43 "Production Forecast WHS - Direct & Uncommitted")

Only rows with `confirmed = false` and status not cancelled (confirmed orders are covered by real POs in HORIZON):

- `production_cost = value_gbp × cogs_pct`, where `cogs_pct` defaults to **0.45** for every type (the workbook's `directCOGStable`) and can be overridden per row.
- **30%** of `production_cost` in the `order_date` month, **70%** in the `ship_date` month.

(The workbook halves AUD values as a rough AUD to GBP conversion before applying 45%. Use the real AUD rate instead.)

---

## 6. Checks shown on every row (a "Checks" column plus a count in the L3 badge)

| Check | Severity |
| --- | --- |
| Payment percentages do not add up to 100 | red |
| A payment has a % but no date (it is missing from cash) | red |
| No FX rate for the currency and date | red |
| Date failed to parse or looks wrong (e.g. ship 01-Feb-36) | red |
| Unconfirmed, but a payment date has passed | amber |
| Fulfil shows the order shipped but the row is unconfirmed | amber (one click: mark confirmed) |
| Ship date has passed and Fulfil shows not shipped | amber ("move dates?") |
| Terms mention a deposit but there is only one payment | amber |
| Payment date before the order date | amber |
| Order type does not match the client's market or currency | amber |

Real examples in the sheet today: Trailfinders (70% payment with no date), NEXT23106-11 (unconfirmed but shipped 22-Sep), Carnival CCRU28821-1 (ship date 15-Oct passed, not shipped at 22-Oct), AU Distro Jan (terms say 25% deposit, one 100% payment), Distro December / Jan / Feb (deposit dates of 01-Sep and 15-Sep passed while unconfirmed), Sweet Pineapple (ship date 01-Feb-36).

---

## 7. Fulfil link (read only)

- Nightly, and on "Refresh" on the page: for each `fulfil_order_refs` entry, read the order from `fulfil_sales` (or the Fulfil live read used by Connect). Set `status` to shipped, invoiced or cancelled, and fill in the shipped value.
- When an order ships for less than the row value, flag "shipped £X of £Y". The unshipped balance stays as a forecast until someone closes it.
- Rows with no Fulfil ref and status confirmed for more than 14 days after `ship_date`: amber "link the Fulfil order".
- **No writes to Fulfil.**

Optional, if quick: a "Suggest" list of new Fulfil wholesale orders over £5k with no B2B row, so sales can add or link them.

---

## 8. Feed for Chief (read only)

Add a view, and one GET endpoint protected by a dedicated token (env var `CHIEF_FEED_TOKEN`; reference it by name only, never commit it):

```sql
create or replace view planner.v_b2b_cash_forecast as
  -- one row per month x order_type x entity x confirmed x kind
  -- kind in ('receipt','pnl_revenue','production_cost')
  select month, order_type, entity, confirmed, kind,
         amount_gbp,           -- receipts include UK VAT gross-up; pnl_revenue is net
         amount_local,         -- AUD for AU entity rows
         order_count,
         computed_at
  from ...;
```

`GET /api/feed/chief/b2b-forecast?from=YYYY-MM&to=YYYY-MM`, header `Authorization: Bearer <CHIEF_FEED_TOKEN>`. Returns:

```json
{
  "computed_at": "2026-10-31T06:30:00Z",
  "fx": { "USD": 1.344, "EUR": 1.163, "AUD": 2.08, "source": "app_settings.fx_rates FY26" },
  "rows": [ { "month": "2026-12", "order_type": "US Wholesale", "entity": "UK", "confirmed": true, "kind": "receipt", "amount_gbp": 183768, "amount_local": null, "order_count": 1 } ],
  "orders": [ { "id": 12, "client": "Carnival Cruise", "reference": "CCRU28821-1", "order_type": "US Wholesale", "status": "confirmed", "value_gbp": 183768, "ship_date": "2026-10-15", "payments": [ { "due_date": "2026-12-15", "pct": 100 } ], "checks": ["Ship date has passed, not shipped in Fulfil"], "owner_email": "liam@dockandbay.com" } ],
  "changes_since": "2026-10-24"
}
```

- `orders` is included so Chief can show the drill-down. `changes_since` returns the audit rows since that date, which Chief uses for "what moved this week".
- This endpoint must not expose anything else: no client contacts, no prices, no other tables.
- Exempt it from the browser session gate the same way other feed or cron routes are, and rate limit it.

---

## 9. Keep the workbook working until Chief replaces it

Add `GET /api/feed/b2b-forecast.csv?token=...`, with the columns exactly as `B2B_DIRECT_FORECAST!C:O` today (Client, Reference, TYPE, Order Value, Currency, Order Confirmed, Order Date, Payment Terms, Ship Date, Payment 1 Date, Payment 1 %, Payment 2 Date, Payment 2 %). Dates go out as `YYYY-MM-DD` and percentages as decimals (0.3). Export only orders with no more than 2 payments; flag any with more.

Andy then swaps one formula in the workbook's `B2B_DIRECT_FORECAST` tab from `IMPORTRANGE(...)` to `IMPORTDATA("<csv url>")`. Nothing else in the workbook changes.

After go-live, the Google Sheet becomes read-only with a note at the top: "Moved to HORIZON > CLIENT > B2B forecast on <date>".

---

## 10. The page (UI)

- Grid like the sheet: Client, Reference, Type, Value (source), Currency, Value GBP, Confirmed, Status, Order date, Ship date, Payments (chips such as "30% 06-Oct-26 · 70% no date"), Terms, Owner, Checks.
- Inline edit for anyone with edit rights. Add payments with a "+" in the payments cell.
- Filters: type, entity, confirmed / forecast, status, owner, quarter, "has checks".
- Totals strip: receipts by month for the next 12 months (stacked confirmed / forecast), and a P&L-by-ship-month toggle.
- Dates shown `dd-mmm-yy`, money with thousands separators, using HORIZON's existing CLIENT table styles (`.cph-tw`).
- Row history drawer from `b2b_forecast_changes`.

---

## 11. Logic doc and MCP

- Add `lib/ai-logic/b2b-forecast.md` (or a section in `supply-finance.md`) with the rules in sections 5 and 6, citing the functions, so `app_logic` can explain them.
- MCP (read): add `b2b_forecast(client?, from?, to?)`, which returns the orders and monthly receipts. **No MCP writes in this version.**

---

## 12. Acceptance tests (add to `tests/`)

1. **Carnival CCRU28821-1:** USD 247,000, N30, payment 15-Dec-26 100%. At USD 1.344 per GBP, receipt in **Dec 26 = £183,780** (± rounding), US Wholesale, confirmed. (Mikey's Q2 commission sheet values it at £183,128 net, so the rates are close.)
2. **John Lewis SS27:** GBP 376,000, payment 20-Apr-27 100%. Receipt in **Apr 27 = £451,200** (× 1.2 VAT), UK Wholesale. P&L revenue in **Feb 27 = £376,000**.
3. **Trailfinders:** GBP 106,992, 30% on 06-Oct-26 and 70% with no date. Oct 26 receipt **£38,517** (106,992 × 0.3 × 1.2), plus a red check for the undated 70%.
4. **Promo Distro Jan:** USD 271,400, unconfirmed, order 15-Sep-26, ship 15-Jan-27. Production cost = value_gbp × 0.45, with 30% in **Sep 26** and 70% in **Jan 27**. Amber check: deposit date passed while unconfirmed.
5. **AU Distro Jan:** AUD 109,051, entity AU. Receipt stays in AUD for the AU entity, and the deposit check fires.
6. FX: no USD or EUR row ever uses 1.883, 1.873 or 1.32. A missing rate removes the row from totals and raises a red check.
7. Import of the live sheet: the row count matches the sheet (excluding the examples), and every unmatched client is listed.

---

## 13. Out of scope for this version

- No writes to Fulfil, Xero or Chief.
- No change to `key_account_forecasts` (SKU quantities for stock planning). A later version can link a B2B order to its SKU lines.
- No commission logic. Internal sales commissions (Mikey and Liam) live in Chief, not HORIZON.

---

## 14. Deploy note for Diviyaj (`CHANGES.md`)

- New migration: `407_b2b_forecast.sql` (or the number used).
- New env var: `CHIEF_FEED_TOKEN` (Ben gives the value to Chief, and it is stored there as a Vercel Sensitive variable).
- New routes: `/api/client/b2b-forecast*`, `/api/feed/chief/b2b-forecast`, `/api/feed/b2b-forecast.csv`.
- New permission grant: `b2b-forecast`.
- One-off: run the import once on production after deploy, then Ben checks the summary.

---

## 15. Questions for Ben before or while building

1. Edit list for the `b2b-forecast` grant: Ben, Andy, Mikey, Liam, Madison. Anyone else?
2. Should forecast buckets ("UK Jan Key Accounts", "Distro Feb") stay as rows, or become a separate "forecast bucket" type that sales replace with real orders as they land?
3. The sheet note says "do not include forecasts for key accounts ordering from warehouse". Keep that rule (those go through `key_account_forecasts` and normal sales)?
4. EUR and AUD rates: use `app_settings.fx_rates` for now, or wait for the Xero rate feed?
