# Querying the LIVE database (debugging HORIZON)

How to connect to the **live** Supabase and run read-only queries — e.g. to work out why a SKU
doesn't show in the live forecast. Written for Ben; safe to share with Diviyaj.

> **Golden rule:** reads on live are fine, **never write to live** without Diviyaj's sign-off.
> The steps below default to *read-only* so a mistake can't mutate production.

---

## Which database is which

| Env | Supabase project ref | Used by |
|-----|----------------------|---------|
| **Sandbox** (Ben's copy) | `mgqrcupazffvpzpeuxzt` | the local dev app — this is what `.env` `DATABASE_URL` points at |
| **Live / production** | `oolwklahstnvocaugryg` | the deployed HORIZON app; Diviyaj owns all writes |

Your local app talks to the **sandbox**. To query **live** you add its connection string separately
(as `LIVE_DATABASE_URL`) — it never replaces the sandbox one.

---

## Two ways to query live

### Option A — let Claude query it (add `LIVE_DATABASE_URL`)

Best when you want Claude to diagnose end-to-end.

**1. Get the live connection string**
Supabase dashboard → project **`oolwklahstnvocaugryg`** → **Settings → Database → Connection string** →
choose **"Session pooler"** (port `5432`, IPv4 — the direct `db.<ref>.supabase.co` host is IPv6-only, same
reason the sandbox uses the pooler).

**2. (Recommended) make it read-only** so writes are *impossible*, not just avoided.
Run once in the **live** SQL Editor (this creates a role — Diviyaj's territory, so clear it with him first):

```sql
CREATE ROLE horizon_ro LOGIN PASSWORD 'pick-a-strong-password';
GRANT USAGE ON SCHEMA planner, public TO horizon_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA planner, public TO horizon_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA planner GRANT SELECT ON TABLES TO horizon_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public  GRANT SELECT ON TABLES TO horizon_ro;
```

Then in the pooler string swap the user `postgres.oolwklahstnvocaugryg` →
`horizon_ro.oolwklahstnvocaugryg` and use the new password.
*(If you'd rather skip the role, use the normal `postgres` string and Claude will only ever `SELECT`.)*

**3. Add it to `.env`** (already git-ignored — never commit it):

```
LIVE_DATABASE_URL=postgresql://horizon_ro.oolwklahstnvocaugryg:PASSWORD@aws-...pooler.supabase.com:5432/postgres
```

**4. Tell Claude "go".** Claude runs read-only queries against `LIVE_DATABASE_URL` (and can build a
`query_live.cjs` helper that hard-refuses anything that isn't a `SELECT`, as an extra guard).

### Option B — you query it yourself (zero setup)

For one-off checks. Supabase dashboard → project `oolwklahstnvocaugryg` → **SQL Editor** → paste a query.
It's read-only by habit and needs no local secrets. Ask Claude to write the SQL; you run it here.

---

## Debugging: "why doesn't this SKU show in the live forecast?"

The forecast picks its SKUs from **`planner.products WHERE in_planning_scope`**, joined to availability
(**`planner.v_product_availability`**) and launch/discontinue dates (**`planner.product_countries`**).
So a SKU is missing for one of a handful of reasons. This one query (swap the SKU, and the country if not
UK) tells you which:

```sql
SELECT p.sku, p.in_planning_scope, p.subcategory, p.category, p.market_tier,
  (SELECT string_agg(channel,',') FILTER (WHERE is_available)
     FROM planner.v_product_availability va
     WHERE va.sku = p.sku AND lower(va.country) = 'uk') AS uk_channels,
  pc.launch_date_retail, pc.discontinue_date
FROM planner.products p
LEFT JOIN planner.product_countries pc ON pc.sku = p.sku AND lower(pc.country) = 'uk'
WHERE p.sku = 'YOUR-SKU-HERE';
```

Reading the result:

| What you see | What it means |
|---|---|
| **0 rows** | SKU isn't in `planner.products` — not synced from Airtable (or filtered out of planning scope). |
| `in_planning_scope = false` | Deliberately excluded from planning. |
| `uk_channels` blank/null | Not marked available for that market/channel → the SKU filter drops it. |
| `launch_date_retail` in the future | Pre-launch — forecasts 0 until the launch month. |
| `discontinue_date` in the past (+ no stock) | Discontinued — runs down remaining stock, then 0. |

### Handy follow-up queries

Is the SKU in the products master at all?
```sql
SELECT sku, in_planning_scope, subcategory, category
FROM planner.products WHERE sku ILIKE '%PART-OF-SKU%';
```

Availability across all markets/channels:
```sql
SELECT lower(country) country, channel, is_available
FROM planner.v_product_availability
WHERE sku = 'YOUR-SKU-HERE'
ORDER BY 1,2;
```

Does it have any sales history feeding the forecast base?
```sql
SELECT country, channel, to_char(month,'YYYY-MM') ym, units
FROM planner.sales_actuals
WHERE sku = 'YOUR-SKU-HERE'
ORDER BY month DESC LIMIT 24;
```

---

## Safety recap

- Live = `oolwklahstnvocaugryg`. Reads fine; **no writes** without Diviyaj.
- `.env` (incl. `LIVE_DATABASE_URL`) is git-ignored — never commit connection strings.
- Prefer the **read-only role** so accidental writes are impossible.
- Schema changes and prod writes go through Diviyaj via migration files, as usual.
