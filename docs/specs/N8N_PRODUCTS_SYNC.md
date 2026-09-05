# n8n products sync — new fields to map (prompt for Diviyaj)

The demand planner now reads new columns on `planner.products`. They were **seeded once** from Airtable
`sku_child` (file `SKU_CHILD-WORKING`) into **sandbox + live** on 2026-07-18, but the **n8n products merge must
map them going forward** or they'll go stale / null on the next sync.

## Columns to add to the n8n products upsert (source: Airtable `sku_child`)

| products column | source (sku_child) | notes |
|---|---|---|
| `cost`     | `cost`     | general/default unit cost (FOB) |
| `cost_lx`  | `cost_lx`  | Lixin's price (supplier code **LX**) |
| `cost_xr`  | `cost_xr`  | XR Textile's price (supplier code **XR**) |
| `size_long`| `size_long`| human-readable size (was **missing on live** — 0/2737; now partially seeded) |

**Convention (important):** a supplier's price column is `cost_<lowercased suppliers.code>`. So when a new
supplier is added, add a matching `cost_<code>` column in Airtable/products and the planner's order-plan price
fallback picks it up automatically (`coalesce(line.cost_price, products.cost_<supplier code>, products.cost)`).
No app change needed for a new supplier beyond the column existing.

## ⚠ size_long quoting — verify the data flow

`size_long` contains the `"` inch mark (e.g. `Small (100x50")`). In the source CSV/Excel this is quoted and the
inner quote is **doubled** (`"Small (100x50"") "`). The one-off seed unquoted it correctly, but **n8n must do
the same** — if it imports the raw field it'll store literal doubled quotes / wrapping quotes. Please verify the
n8n CSV/Excel parsing handles quoted fields + doubled quotes so `size_long` lands clean.

## Migration

`migrations/119_product_supplier_costs.sql` adds the 4 columns (`ADD COLUMN IF NOT EXISTS`). Safe to run on live
(already applied via MCP on 2026-07-18); included for reconciliation.
