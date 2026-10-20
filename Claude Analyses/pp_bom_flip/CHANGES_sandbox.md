# PP BOM flip: Fulfil sandbox change log

Every change made by `pp_bom_flip.py` (and `revert.py`). Source of truth: `ledger_sandbox.jsonl`. Undo a run with `python3 -I revert.py --env sandbox --run <run id> --apply` (dry run without `--apply`).

Total changes: 4 across 2 runs.

## Run revert-2026-10-21_073239

| Time | What | Record | Change | Undo |
|---|---|---|---|---|
| 07:32 2026-10-21 | revert 2026-10-21_073231: UK-TOWLB-CAB-LG-6SETI: PP first (PP avail 10, threshold 3), BOM 258 | product.product-production.bom 258 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:32 2026-10-21 | revert 2026-10-21_073231: UK-TOWLB-CAB-LG-6SETI: PP first (PP avail 10, threshold 3), BOM 370 | product.product-production.bom 369 | `sequence`: `10` -> `20` | set `sequence` back to `10` |

## Run 2026-10-21_073231

| Time | What | Record | Change | Undo |
|---|---|---|---|---|
| 07:32 2026-10-21 | UK-TOWLB-CAB-LG-6SETI: PP first (PP avail 10, threshold 3), BOM 370 | product.product-production.bom 369 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:32 2026-10-21 | UK-TOWLB-CAB-LG-6SETI: PP first (PP avail 10, threshold 3), BOM 258 | product.product-production.bom 258 | `sequence`: `10` -> `20` | set `sequence` back to `10` |

