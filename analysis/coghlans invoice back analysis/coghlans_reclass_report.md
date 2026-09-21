# Coghlans AU 3PL — Cross-Month Fulfilment-Cost Reclass

_Generated 2026-09-14. READ-ONLY. orders_for_match.json (Xero booking month = src_month) joined to planner.tpl_cin7_orders (Cin7 invoice_date → tgt_month) on exact reference. Lookup: AU-%, 249-%, 250-%, 503-% (Shopify + Amazon AU). tpl coverage now 2026-01-02 → AU max 2026-08-31 (Jan 2026 landed; Sep past 2026-08-31 stays partly unmeasurable)._

## Coverage

| Metric | Orders | Amount |
|---|--:|--:|
| Total (all invoices) | 8,315 | $126,497.29 |
| Matched (has Cin7 date) | 8,040 | $120,301.23 |
| Excluded transfers (FBA/TRF) | 120 | $3,307.35 |
| Genuinely missing (AU/AMZ/OTHER, no match) | 155 | $2,888.71 |

**By ref-type:**

| ref-type | matched # | matched $ | unmatched # | unmatched $ |
|---|--:|--:|--:|--:|
| AMZ | 345 | $4,600.65 | 9 | $102.43 |
| AU | 7695 | $115,700.58 | 132 | $2,076.07 |
| FBA | 0 | $0.00 | 111 | $2,996.82 |
| OTHER | 0 | $0.00 | 14 | $710.21 |
| TRF | 0 | $0.00 | 9 | $310.53 |

_FBA/TRF are stock transfers — excluded entirely, not reclassable._

**Genuinely-missing (AU/AMZ/OTHER) by src_month:**

| src_month | amount |
|---|--:|
| 2026-01 | $16.27 |
| 2026-03 | $560.97 |
| 2026-06 | $124.34 |
| 2026-09 | $2,187.13 |

## Mismatch matrix by cost_center (reclass movements)

| cost_center | src_month | tgt_month | orders | amount |
|---|---|---|--:|--:|
| COGS - AU - Amazon | 2026-04 | 2026-03 | 6 | $79.89 |
| COGS - AU - Amazon | 2026-05 | 2026-04 | 3 | $58.71 |
| COGS - AU - Amazon | 2026-09 | 2026-08 | 5 | $83.19 |
| COGS - AU - Shopify | 2026-04 | 2026-03 | 104 | $1,649.77 |
| COGS - AU - Shopify | 2026-05 | 2026-04 | 155 | $2,339.78 |
| COGS - AU - Shopify | 2026-09 | 2026-08 | 104 | $1,495.46 |
| **Total moved** |  |  | **377** | **$5,706.80** |

## Net monthly journal by cost_center (matched mismatches only)

### COGS - AU - Amazon

| month | + in | − out | net | DR/CR |
|---|--:|--:|--:|---|
| 2026-03 | $79.89 | $0.00 | $79.89 | DR (increase) |
| 2026-04 | $58.71 | $79.89 | $-21.18 | CR (decrease) |
| 2026-05 | $0.00 | $58.71 | $-58.71 | CR (decrease) |
| 2026-08 | $83.19 | $0.00 | $83.19 | DR (increase) |
| 2026-09 | $0.00 | $83.19 | $-83.19 | CR (decrease) |
| **Sum** |  |  | **$0.00** |  |

### COGS - AU - Shopify

| month | + in | − out | net | DR/CR |
|---|--:|--:|--:|---|
| 2026-03 | $1,649.77 | $0.00 | $1,649.77 | DR (increase) |
| 2026-04 | $2,339.78 | $1,649.77 | $690.01 | DR (increase) |
| 2026-05 | $0.00 | $2,339.78 | $-2,339.78 | CR (decrease) |
| 2026-08 | $1,495.46 | $0.00 | $1,495.46 | DR (increase) |
| 2026-09 | $0.00 | $1,495.46 | $-1,495.46 | CR (decrease) |
| **Sum** |  |  | **$-0.00** |  |

**Overall net across all cost centres = $0.00** (≈0.00). Each cost centre also nets ≈0.00.

## Unmeasurable / excluded

- Excluded transfers (FBA/TRF), non-reclassable: **$3,307.35** (120 orders).
- Genuinely-missing AU/AMZ/OTHER (no Cin7 match): **$2,888.71** (155 orders).
- Sep (DOK50366) still partly unmeasurable: $2,187.13 of missing sits in 2026-09, beyond AU max invoice_date 2026-08-31.
