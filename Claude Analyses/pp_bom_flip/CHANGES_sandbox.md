# PP BOM flip: Fulfil sandbox change log

Every change made by `pp_bom_flip.py` (and `revert.py`). Source of truth: `ledger_sandbox.jsonl`. Undo a run with `python3 -I revert.py --env sandbox --run <run id> --apply` (dry run without `--apply`).

Total changes: 6 across 4 runs.

## Run revert-2026-10-21_073239

| Time | What | Record | Change | Undo |
|---|---|---|---|---|
| 07:32 2026-10-21 | revert 2026-10-21_073231: UK-TOWLB-CAB-LG-6SETI: PP first (PP avail 10, threshold 3), BOM 258 | product.product-production.bom 258 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:32 2026-10-21 | revert 2026-10-21_073231: UK-TOWLB-CAB-LG-6SETI: PP first (PP avail 10, threshold 3), BOM 370 | product.product-production.bom 369 | `sequence`: `10` -> `20` | set `sequence` back to `10` |

## Run psd-selftest-end

| Time | What | Record | Change | Undo |
|---|---|---|---|---|
| 23:32 2026-10-22 | SANDBOX self-test finished (UK-909669 passed), restore original | dx_function 1 | `code`: `selftest` -> `sandbox_fn1_original.py` | set `code` back to `selftest` |

## Run psd-selftest-2026-10-22_231054

| Time | What | Record | Change | Undo |
|---|---|---|---|---|
| 23:10 2026-10-22 | SANDBOX planned-ship-date runtime self-test (all configs); auto-revert watcher | dx_function 1 | `code`: `planned_ship_date/sandbox_fn1_original.py` -> `planned_ship_date/sandbox_fn1_selftest.py` | set `code` back to `planned_ship_date/sandbox_fn1_original.py` |

## Run 2026-10-21_073231

| Time | What | Record | Change | Undo |
|---|---|---|---|---|
| 07:32 2026-10-21 | UK-TOWLB-CAB-LG-6SETI: PP first (PP avail 10, threshold 3), BOM 370 | product.product-production.bom 369 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:32 2026-10-21 | UK-TOWLB-CAB-LG-6SETI: PP first (PP avail 10, threshold 3), BOM 258 | product.product-production.bom 258 | `sequence`: `10` -> `20` | set `sequence` back to `10` |

