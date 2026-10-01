# Supplier pricing in HORIZON — how to pull cost per SKU / per price type

For Diviyaj. This describes the **Price Lists** data model (SUPPLY ▸ Purchase Orders ▸ Price Lists) and gives ready-to-run SQL to resolve the **effective cost price** for any SKU × supplier. All tables are in the `planner` schema. Read-only pull; nothing here writes.

Source of truth for the resolution logic is `plAdminData()` / `plXlsxBuffer()` in `server.mjs` (~line 2553–2642). The SQL below reproduces that exactly.

---

## 1. The model in one paragraph

Cost is held **per (supplier × scope)**, in **supplier currency**, with optional **quantity tiers** and optional **"effective from production N" versioning**. Scope is either:

- **`type`** — a base price for a whole **`products.price_type`** (every SKU of that type, from that supplier, inherits it), or
- **`sku`** — a SKU-specific **exception** that overrides the type base.

To price a SKU you take its **`sku` entry if one exists, else its `price_type` base entry**, for the chosen supplier — picking the version effective at the current production number, then reading the tier for your order quantity.

---

## 2. Tables & fields

### `planner.products.price_type` (added in migration 239)
The grouping key. Text. Synced from Airtable (like `cost` / launch / disc).

- ⚠ **Live n8n mapping still owed:** `price_type` is **not yet in the Airtable→Supabase field mapping**. On sandbox it's seeded from subcategory as placeholder test data. On live it will be null until the n8n mapping is added — the Price Lists feature can't group correctly until then.
- Special values: `'NA'` (case-insensitive) = **exclude the SKU from pricing entirely**; `'MANUAL'` or empty/null = **no type base**, the SKU is priced only by its own `scope='sku'` entries.

### `planner.price_list_entries` (migration 239) — one price header per (supplier × scope × version)
| column | type | meaning |
|---|---|---|
| `id` | bigserial PK | entry id (tiers FK to this) |
| `supplier` | text | `suppliers.name` |
| `scope` | text | `'type'` or `'sku'` |
| `price_type` | text | set for `scope='type'`; also stamped on `'sku'` rows for grouping |
| `sku` | text | set for `scope='sku'` |
| `currency` | text | supplier currency (`suppliers.default_currency`), default `'USD'` |
| `effective_from_production` | integer | NULL = current/always; else applies from this production number onward until superseded |
| `status` | text | `'active'` \| `'pending'` \| `'rejected'` \| `'superseded'` — **only `'active'` counts for pricing** (`'pending'` = supplier-portal submission awaiting admin approval) |
| `source` | text | `'admin'` \| `'supplier'` |
| `note`, `submitted_by`, `submitted_at`, `approved_by`, `approved_at`, `created_at`, `updated_at` | — | audit metadata |

### `planner.price_list_tiers` (migration 239) — quantity tiers for an entry
| column | type | meaning |
|---|---|---|
| `entry_id` | bigint FK → `price_list_entries(id)` ON DELETE CASCADE | parent entry |
| `min_qty` | integer | tier applies to order qty **≥ min_qty**; `min_qty=1` is the base tier |
| `unit_cost` | numeric | cost per unit at that tier |
| PK | `(entry_id, min_qty)` | |

**Base unit cost** = tier with the lowest `min_qty`. **Cost for order qty Q** = tier with the highest `min_qty ≤ Q`.

### `planner.price_type_meta` (migration 240) — optional per-type label
`price_type` (PK), `size` (editable display label), `updated_at`. Cosmetic only — not needed to price.

### `planner.price_list_excluded_skus` (migration 241) — hide list
`sku` (PK), `added_at`. User-managed copy/paste list of SKUs to omit from the feature.

---

## 3. Which SKUs are in scope

The feature considers a product SKU only when **all** of these hold (from `planner.products`):

- `variant_type = 'MASTER'` (SET bundles and variant children excluded)
- `upper(status) <> 'NON STOCKED'`
- `upper(coalesce(price_type,'')) <> 'NA'`
- `sku` not in `planner.price_list_excluded_skus`

Suppliers a SKU can be bought from = `main_supplier_final` + the comma list in `supplier_multiple_all`.

---

## 4. "Current production" (for version selection)

`effective_from_production` is compared against the **latest in-production number**:

```sql
SELECT COALESCE(MAX(regexp_replace(prod_no,'[^0-9]','','g')::int), 0) AS cur_prod
FROM planner.purchase_orders
WHERE lower(coalesce(status,'')) LIKE '%production%'
  AND regexp_replace(coalesce(prod_no,''),'[^0-9]','','g') <> '';
```

An entry applies if `effective_from_production IS NULL` **or** `<= cur_prod`. Among the applicable versions, the winner is the one with the **highest** `effective_from_production` (NULL = always, treated as lowest, so a real "from production N" supersedes it).

---

## 5. Resolution SQL (drop-in)

Set `:qty` to the order quantity you're pricing (use `1` for the base/headline cost). This returns one row per in-scope **SKU × supplier**, resolving SKU-exception-over-type-base, current production version, currency and the tier for that quantity.

```sql
WITH cur AS (
  SELECT COALESCE(MAX(regexp_replace(prod_no,'[^0-9]','','g')::int), 0) AS cur_prod
  FROM planner.purchase_orders
  WHERE lower(coalesce(status,'')) LIKE '%production%'
    AND regexp_replace(coalesce(prod_no,''),'[^0-9]','','g') <> ''
),
-- one effective (active, current-production) entry per supplier × scope × key
eff AS (
  SELECT DISTINCT ON (e.supplier, e.scope, COALESCE(e.sku, e.price_type))
         e.id, e.supplier, e.scope, e.price_type, e.sku, e.currency, e.effective_from_production
  FROM planner.price_list_entries e
  CROSS JOIN cur
  WHERE e.status = 'active'
    AND (e.effective_from_production IS NULL OR e.effective_from_production <= cur.cur_prod)
  ORDER BY e.supplier, e.scope, COALESCE(e.sku, e.price_type),
           e.effective_from_production DESC NULLS LAST
),
-- in-scope SKUs expanded to their allowed suppliers
sku_supplier AS (
  SELECT p.sku, p.price_type, TRIM(s.supplier) AS supplier
  FROM planner.products p
  CROSS JOIN LATERAL unnest(
    string_to_array(
      concat_ws(',', NULLIF(p.main_supplier_final,''), NULLIF(p.supplier_multiple_all,'')), ',')
  ) AS s(supplier)
  WHERE COALESCE(p.sku,'') <> ''
    AND COALESCE(p.variant_type,'') = 'MASTER'
    AND upper(COALESCE(p.status,'')) <> 'NON STOCKED'
    AND upper(COALESCE(p.price_type,'')) <> 'NA'
    AND TRIM(s.supplier) <> ''
    AND p.sku NOT IN (SELECT sku FROM planner.price_list_excluded_skus)
)
SELECT
  ss.sku,
  ss.price_type,
  ss.supplier,
  CASE WHEN se.id IS NOT NULL THEN 'SKU price' ELSE 'inherited type price' END AS price_source,
  COALESCE(se.id, te.id)             AS entry_id,
  COALESCE(se.currency, te.currency) AS currency,
  COALESCE(se.effective_from_production, te.effective_from_production) AS from_production,
  base.unit_cost                     AS base_unit_cost,   -- min_qty tier
  tq.unit_cost                       AS unit_cost_for_qty -- tier for :qty
FROM sku_supplier ss
LEFT JOIN eff se ON se.scope = 'sku'
                AND se.sku = ss.sku
                AND se.supplier = ss.supplier
LEFT JOIN eff te ON te.scope = 'type'
                AND te.price_type = ss.price_type
                AND te.supplier = ss.supplier
                AND ss.price_type IS NOT NULL
                AND upper(ss.price_type) NOT IN ('MANUAL','NA') AND ss.price_type <> ''
LEFT JOIN LATERAL (
  SELECT unit_cost FROM planner.price_list_tiers t
  WHERE t.entry_id = COALESCE(se.id, te.id)
  ORDER BY t.min_qty ASC LIMIT 1
) base ON true
LEFT JOIN LATERAL (
  SELECT unit_cost FROM planner.price_list_tiers t
  WHERE t.entry_id = COALESCE(se.id, te.id) AND t.min_qty <= :qty
  ORDER BY t.min_qty DESC LIMIT 1
) tq ON true
WHERE COALESCE(se.id, te.id) IS NOT NULL   -- drop SKU×supplier combos with no price on file
ORDER BY ss.price_type, ss.sku, ss.supplier;
```

Rows where `price_source = 'inherited type price'` come from the `type` base; `'SKU price'` are exceptions. Combos with no entry at all are dropped by the final `WHERE` (change that if you want to see un-priced gaps).

### Just the type-level base prices
```sql
SELECT e.supplier, e.price_type, e.currency, e.effective_from_production, t.min_qty, t.unit_cost
FROM planner.price_list_entries e
JOIN planner.price_list_tiers t ON t.entry_id = e.id
WHERE e.scope = 'type' AND e.status = 'active'
ORDER BY e.price_type, e.supplier, e.effective_from_production NULLS FIRST, t.min_qty;
```

### Just the per-SKU exceptions
```sql
SELECT e.supplier, e.sku, e.price_type, e.currency, e.effective_from_production, t.min_qty, t.unit_cost
FROM planner.price_list_entries e
JOIN planner.price_list_tiers t ON t.entry_id = e.id
WHERE e.scope = 'sku' AND e.status = 'active'
ORDER BY e.sku, e.supplier, e.effective_from_production NULLS FIRST, t.min_qty;
```

---

## 6. Gotchas

- **Filter `status = 'active'`.** `'pending'` rows are unapproved supplier-portal submissions — never price off them.
- **Currency is per entry** and is the **supplier's** currency, not GBP. Costs are held in supplier currency (see the supplier-currency model); convert downstream if you need a common base.
- **Version selection is by production number, not date.** NULL `effective_from_production` = the always/current price; a numbered version supersedes it once `cur_prod` reaches that number.
- **`MANUAL` / empty `price_type`** SKUs have no type base — only their own `scope='sku'` entries price them. **`NA`** SKUs are out of the feature entirely.
- **`price_type` needs the live n8n Airtable mapping** before this is meaningful on production (owed on your side). Sandbox has placeholder seed values only.
- There's a convenience export mirroring all of this: `GET /api/supply/price-list/export.xlsx` (2 sheets: Price types · SKUs). Read endpoint: `GET /api/supply/price-list`.

---

*Migrations: 239 (`price_list_entries`, `price_list_tiers`, `products.price_type`), 240 (`price_type_meta`), 241 (`price_list_excluded_skus`). Applied on sandbox; reconcile against live before running per the single-writer rule.*
