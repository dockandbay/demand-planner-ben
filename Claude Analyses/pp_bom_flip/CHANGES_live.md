# PP BOM flip: Fulfil live change log

Every change made by `pp_bom_flip.py` (and `revert.py`). Source of truth: `ledger_live.jsonl`. Undo a run with `python3 -I revert.py --env live --run <run id> --apply --confirm-live` (dry run without `--apply`).

Total changes: 340 across 24 runs.

## Run psd-uk-ws-2026-10-22_232610

| Time | What | Record | Change | Undo |
|---|---|---|---|---|
| 23:26 2026-10-22 | LIVE UK wholesale planned ship date +3 business days (Ben 22-Oct: put live, revert in 10 min unless confirmed) | dx_function 44 | `code`: `planned_ship_date/live_functions/fn44_v74.py (v74)` -> `planned_ship_date/candidates/fn44_candidate.py` | set `code` back to `planned_ship_date/live_functions/fn44_v74.py (v74)` |

## Run psd-rollout-2026-10-22_233103

| Time | What | Record | Change | Undo |
|---|---|---|---|---|
| 23:31 2026-10-22 | LIVE US retail planned ship date (Ben 22-Oct go) | dx_function 1 | `code`: `planned_ship_date/live_functions/fn1_v1.py` -> `planned_ship_date/candidates/fn1_candidate.py` | set `code` back to `planned_ship_date/live_functions/fn1_v1.py` |
| 23:31 2026-10-22 | LIVE AU retail planned ship date (Ben 22-Oct go) | dx_function 3 | `code`: `planned_ship_date/live_functions/fn3_v76.py` -> `planned_ship_date/candidates/fn3_candidate.py` | set `code` back to `planned_ship_date/live_functions/fn3_v76.py` |
| 23:31 2026-10-22 | LIVE US wholesale planned ship date (Ben 22-Oct go) | dx_function 37 | `code`: `planned_ship_date/live_functions/fn37_v43.py` -> `planned_ship_date/candidates/fn37_candidate.py` | set `code` back to `planned_ship_date/live_functions/fn37_v43.py` |
| 23:31 2026-10-22 | LIVE EU wholesale planned ship date (Ben 22-Oct go) | dx_function 36 | `code`: `planned_ship_date/live_functions/fn36_v42.py` -> `planned_ship_date/candidates/fn36_candidate.py` | set `code` back to `planned_ship_date/live_functions/fn36_v42.py` |
| 23:31 2026-10-22 | LIVE new EU retail import function (planned ship date only), Ben 22-Oct | dx_function 49 | created | delete link |
| 23:31 2026-10-22 | attach EU retail function to dockandbay-eu (was none). Undo = set back to null | sale.channel 7 | `order_customization_function`: `None` -> `49` | set `order_customization_function` back to `None` |

## Run fn48-retry-2026-10-22_225557

| Time | What | Record | Change | Undo |
|---|---|---|---|---|
| 22:55 2026-10-22 | retry UK-909588 after exception resolved (fn48 outage) | sale.sale 300563 | retry_order_import:  | n/a |

## Run fn48-retry-2026-10-22_225113

| Time | What | Record | Change | Undo |
|---|---|---|---|---|
| 22:51 2026-10-22 | retry UK-909588 after fn48 fix | sale.sale 300563 | retry_order_import:  | n/a |

## Run fn48-resolve-all-2026-10-22_230211

| Time | What | Record | Change | Undo |
|---|---|---|---|---|
| 23:02 2026-10-22 | resolve planned-date exception 4172 on UK-909589 (fn48 outage, Ben 22-Oct) | sale.sale 300564 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4173 on UK-909590 (fn48 outage, Ben 22-Oct) | sale.sale 300567 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4175 on UK-909591 (fn48 outage, Ben 22-Oct) | sale.sale 300569 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4176 on UK-909592 (fn48 outage, Ben 22-Oct) | sale.sale 300570 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4177 on UK-909593 (fn48 outage, Ben 22-Oct) | sale.sale 300574 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4178 on UK-909595 (fn48 outage, Ben 22-Oct) | sale.sale 300579 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4179 on UK-909596 (fn48 outage, Ben 22-Oct) | sale.sale 300580 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4180 on UK-909597 (fn48 outage, Ben 22-Oct) | sale.sale 300581 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4181 on UK-909598 (fn48 outage, Ben 22-Oct) | sale.sale 300583 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4182 on UK-909599 (fn48 outage, Ben 22-Oct) | sale.sale 300584 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4183 on UK-909600 (fn48 outage, Ben 22-Oct) | sale.sale 300586 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4184 on UK-909601 (fn48 outage, Ben 22-Oct) | sale.sale 300587 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4185 on UK-909602 (fn48 outage, Ben 22-Oct) | sale.sale 300588 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4186 on UK-909594 (fn48 outage, Ben 22-Oct) | sale.sale 300577 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4187 on UK-909603 (fn48 outage, Ben 22-Oct) | sale.sale 300589 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4188 on UK-909604 (fn48 outage, Ben 22-Oct) | sale.sale 300590 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4189 on UK-909605 (fn48 outage, Ben 22-Oct) | sale.sale 300591 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4190 on UK-909607 (fn48 outage, Ben 22-Oct) | sale.sale 300594 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4191 on UK-909608 (fn48 outage, Ben 22-Oct) | sale.sale 300595 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4192 on UK-909609 (fn48 outage, Ben 22-Oct) | sale.sale 300596 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4193 on UK-909610 (fn48 outage, Ben 22-Oct) | sale.sale 300598 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4194 on UK-909611 (fn48 outage, Ben 22-Oct) | sale.sale 300599 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4195 on UK-909612 (fn48 outage, Ben 22-Oct) | sale.sale 300600 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4196 on UK-909614 (fn48 outage, Ben 22-Oct) | sale.sale 300602 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4197 on UK-909606 (fn48 outage, Ben 22-Oct) | sale.sale 300592 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4198 on UK-909617 (fn48 outage, Ben 22-Oct) | sale.sale 300606 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4199 on UK-909619 (fn48 outage, Ben 22-Oct) | sale.sale 300608 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4200 on UK-909620 (fn48 outage, Ben 22-Oct) | sale.sale 300609 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4201 on UK-909621 (fn48 outage, Ben 22-Oct) | sale.sale 300610 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4202 on UK-909622 (fn48 outage, Ben 22-Oct) | sale.sale 300611 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4204 on UK-909624 (fn48 outage, Ben 22-Oct) | sale.sale 300613 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4205 on UK-909627 (fn48 outage, Ben 22-Oct) | sale.sale 300619 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4206 on UK-909628 (fn48 outage, Ben 22-Oct) | sale.sale 300620 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4207 on UK-909629 (fn48 outage, Ben 22-Oct) | sale.sale 300621 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4208 on UK-909631 (fn48 outage, Ben 22-Oct) | sale.sale 300622 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4209 on UK-909630 (fn48 outage, Ben 22-Oct) | sale.sale 300623 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4210 on UK-909633 (fn48 outage, Ben 22-Oct) | sale.sale 300625 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4211 on UK-909634 (fn48 outage, Ben 22-Oct) | sale.sale 300626 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4212 on UK-909635 (fn48 outage, Ben 22-Oct) | sale.sale 300627 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4213 on UK-909613 (fn48 outage, Ben 22-Oct) | sale.sale 300601 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4214 on UK-909637 (fn48 outage, Ben 22-Oct) | sale.sale 300630 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4215 on UK-909615 (fn48 outage, Ben 22-Oct) | sale.sale 300604 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4216 on UK-909618 (fn48 outage, Ben 22-Oct) | sale.sale 300607 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4217 on UK-909616 (fn48 outage, Ben 22-Oct) | sale.sale 300605 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4218 on UK-909638 (fn48 outage, Ben 22-Oct) | sale.sale 300633 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4219 on UK-909639 (fn48 outage, Ben 22-Oct) | sale.sale 300634 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4220 on UK-909640 (fn48 outage, Ben 22-Oct) | sale.sale 300635 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4221 on UK-909641 (fn48 outage, Ben 22-Oct) | sale.sale 300636 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4222 on UK-909643 (fn48 outage, Ben 22-Oct) | sale.sale 300639 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4223 on UK-909625 (fn48 outage, Ben 22-Oct) | sale.sale 300617 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4224 on UK-909644 (fn48 outage, Ben 22-Oct) | sale.sale 300643 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4225 on UK-909626 (fn48 outage, Ben 22-Oct) | sale.sale 300618 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4226 on UK-909632 (fn48 outage, Ben 22-Oct) | sale.sale 300624 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4227 on UK-909636 (fn48 outage, Ben 22-Oct) | sale.sale 300628 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4229 on UK-909648 (fn48 outage, Ben 22-Oct) | sale.sale 300647 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4230 on UK-909650 (fn48 outage, Ben 22-Oct) | sale.sale 300650 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4231 on UK-909651 (fn48 outage, Ben 22-Oct) | sale.sale 300651 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4232 on UK-909652 (fn48 outage, Ben 22-Oct) | sale.sale 300652 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4233 on UK-909642 (fn48 outage, Ben 22-Oct) | sale.sale 300637 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4234 on UK-909655 (fn48 outage, Ben 22-Oct) | sale.sale 300659 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4235 on UK-909656 (fn48 outage, Ben 22-Oct) | sale.sale 300660 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4236 on UK-909657 (fn48 outage, Ben 22-Oct) | sale.sale 300661 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4237 on UK-909658 (fn48 outage, Ben 22-Oct) | sale.sale 300670 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4238 on UK-909659 (fn48 outage, Ben 22-Oct) | sale.sale 300672 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4239 on UK-909645 (fn48 outage, Ben 22-Oct) | sale.sale 300644 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4240 on UK-909647 (fn48 outage, Ben 22-Oct) | sale.sale 300646 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4241 on UK-909649 (fn48 outage, Ben 22-Oct) | sale.sale 300648 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4242 on UK-909653 (fn48 outage, Ben 22-Oct) | sale.sale 300653 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4243 on UK-909660 (fn48 outage, Ben 22-Oct) | sale.sale 300676 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4244 on UK-909661 (fn48 outage, Ben 22-Oct) | sale.sale 300677 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4245 on UK-909662 (fn48 outage, Ben 22-Oct) | sale.sale 300681 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4246 on UK-909654 (fn48 outage, Ben 22-Oct) | sale.sale 300658 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4247 on UK-909664 (fn48 outage, Ben 22-Oct) | sale.sale 300683 | resolve_exception:  | n/a |
| 23:02 2026-10-22 | resolve planned-date exception 4248 on UK-909663 (fn48 outage, Ben 22-Oct) | sale.sale 300684 | resolve_exception:  | n/a |

## Run fn48-resolve-2026-10-22_225339

| Time | What | Record | Change | Undo |
|---|---|---|---|---|
| 22:53 2026-10-22 | resolve planned-date exception 4174 on UK-909588 (fn48 outage) | sale.sale 300563 | resolve_exception:  | n/a |

## Run fn48-fix-2026-10-22_225055

| Time | What | Record | Change | Undo |
|---|---|---|---|---|
| 22:50 2026-10-22 | Fix UK retail import outage: any() not in Fulfil runtime -> every UK order draft+exception since 22-Oct 04:00 UTC. Loop instead of any(); fail open (metadata note, no exception). Ben approved 22-Oct. | dx_function 48 | `code`: `function48_v77_live.py (version 77)` -> `function48_v78_fix.py` | set `code` back to `function48_v77_live.py (version 77)` |

## Run fix-so68870-2026-10-22_122103

| Time | What | Record | Change | Undo |
|---|---|---|---|---|
| 12:21 2026-10-22 | SO68870 add single product 259 @ 9.38 (replaces oversold PP line) | sale.line 608210 | created | delete link |
| 12:21 2026-10-22 | SO68870 add single product 260 @ 9.38 (replaces oversold PP line) | sale.line 608211 | created | delete link |
| 12:21 2026-10-22 | SO68870 add single product 261 @ 9.38 (replaces oversold PP line) | sale.line 608212 | created | delete link |
| 12:21 2026-10-22 | SO68870 add single product 258 @ 9.37 (replaces oversold PP line) | sale.line 608213 | created | delete link |
| 12:21 2026-10-22 | SO68870 add single product 264 @ 9.37 (replaces oversold PP line) | sale.line 608214 | created | delete link |
| 12:21 2026-10-22 | SO68870 processed to create shipment for singles | sale.sale 300187 | note:  | n/a |
| 12:21 2026-10-22 | SO68870 cancel oversold PP-TEATWL-MD-5SET-CULDEL line (after singles added) | sale.line 607345 | cancel_line:  | n/a |

## Run faire-release-2026-10-22_161223

| Time | What | Record | Change | Undo |
|---|---|---|---|---|
| 16:12 2026-10-22 | Rule 68 Wholesale Hold Rule: stop holding Faire US + Faire UK (Ben 22-Oct-26: Faire releases on arrival). Undo = recreate these 2 conditions (type or, channel is 37 / 36) on rule 68 | fulfil.automation.rule.condition [367, 383] | deleted | recreate link [{"rule": 68, "type": "or", "parameter": "channel", "operator": "is", "value_channel": 37, "id": 367, "condition_blurb": {"title": "Channel is Faire US"}}, {"rule": 68, "type": "or", "parameter": "channel", "operator": "is", "value_channel": 36, "id": 383, "condition_blurb": {"title": "Channel is Faire UK"}}] |
| 16:12 2026-10-22 | release Faire US shipment CS61176 (SO68066), ship-by 22-Oct (Ben 22-Oct-26) | stock.shipment.out 61176 | `on_hold`: `True` -> `False` | set `on_hold` back to `True` |

## Run au-sumsuga-bom-2026-10-21_144922

| Time | What | Record | Change | Undo |
|---|---|---|---|---|
| 14:49 2026-10-21 | singles BOM for AU-TOWLB-DES-XL-6SET-SUMSUGA (recipe from Horizon set_bom) | production.bom 505 | created | archive BOM (active = false) |
| 14:49 2026-10-21 | link singles BOM to AU-TOWLB-DES-XL-6SET-SUMSUGA | product.product-production.bom 504 | created | delete link |

## Run add-au-pp-cost-2026-10-21_144832

| Time | What | Record | Change | Undo |
|---|---|---|---|---|
| 14:48 2026-10-21 | previous revalue attempt returned HTTP 500, cost unchanged (0) | product.product 2253 | note:  | n/a |
| 14:48 2026-10-21 | revaluation retry (plain values), counterpart 9013 [AU]; undo = revalue back to 0 | product.product 2253 | revalue:  | n/a |

## Run add-au-pp-cost-2026-10-21_144811

| Time | What | Record | Change | Undo |
|---|---|---|---|---|
| 14:48 2026-10-21 | revaluation, counterpart 9013 [AU]; undo = revalue back to 0 | product.product 2253 | revalue:  | n/a |

## Run add-au-pp-2026-10-21_132127

| Time | What | Record | Change | Undo |
|---|---|---|---|---|
| 13:21 2026-10-21 | set warehouse AUCOGHLANS on count 794 (needed for cost) | stock.inventory 794 | `warehouse`: `None` -> `28` | set `warehouse` back to `None` |
| 13:21 2026-10-21 | count 794 confirm -> state done | stock.inventory 794 | note:  | n/a |

## Run add-au-pp-2026-10-21_132054

| Time | What | Record | Change | Undo |
|---|---|---|---|---|
| 13:20 2026-10-21 | create template PP-TOWLB-DES-XL-6SETA (Ben 21-Oct-26) | product.template 1095 | created | delete link |
| 13:20 2026-10-21 | create product PP-TOWLB-DES-XL-6SETA 3.0 kg | product.product 2253 | created | delete link |
| 13:20 2026-10-21 | stock count +1 PP-TOWLB-DES-XL-6SETA at AU Coghlans | stock.inventory 794 | created | delete link |

## Run 2026-10-26_080809

| Time | What | Record | Change | Undo |
|---|---|---|---|---|
| 08:08 2026-10-26 | UK-TOWLB-CAB-XL-4SETK: singles first (PP avail 0, threshold 1), BOM 474 | product.product-production.bom 473 | `sequence`: `10` -> `20` | set `sequence` back to `10` |
| 08:08 2026-10-26 | UK-TOWLB-CAB-XL-4SETK: singles first (PP avail 0, threshold 1), BOM 271 | product.product-production.bom 271 | `sequence`: `20` -> `10` | set `sequence` back to `20` |

## Run 2026-10-26_050812

| Time | What | Record | Change | Undo |
|---|---|---|---|---|
| 05:08 2026-10-26 | UK-TOWLB-CAB-XL-4SETH: singles first (PP avail 0, threshold 1), BOM 494 | product.product-production.bom 493 | `sequence`: `10` -> `20` | set `sequence` back to `10` |
| 05:08 2026-10-26 | UK-TOWLB-CAB-XL-4SETH: singles first (PP avail 0, threshold 1), BOM 270 | product.product-production.bom 270 | `sequence`: `20` -> `10` | set `sequence` back to `20` |

## Run 2026-10-25_040809

| Time | What | Record | Change | Undo |
|---|---|---|---|---|
| 04:08 2026-10-25 | UK-TOWLB-CAB-XL-6SETK: singles first (PP avail 0, threshold 1), BOM 502 | product.product-production.bom 501 | `sequence`: `10` -> `20` | set `sequence` back to `10` |
| 04:08 2026-10-25 | UK-TOWLB-CAB-XL-6SETK: singles first (PP avail 0, threshold 1), BOM 281 | product.product-production.bom 281 | `sequence`: `20` -> `10` | set `sequence` back to `20` |

## Run 2026-10-23_102632

| Time | What | Record | Change | Undo |
|---|---|---|---|---|
| 10:26 2026-10-23 | UK-TEATWL-MD-3SET-KTCHDISC: singles first (PP avail 0, threshold 1), BOM 481 | product.product-production.bom 480 | `sequence`: `10` -> `20` | set `sequence` back to `10` |
| 10:26 2026-10-23 | UK-TEATWL-MD-3SET-KTCHDISC: singles first (PP avail 0, threshold 1), BOM 234 | product.product-production.bom 234 | `sequence`: `20` -> `10` | set `sequence` back to `20` |

## Run 2026-10-22_074807

| Time | What | Record | Change | Undo |
|---|---|---|---|---|
| 07:48 2026-10-22 | UK-TEATWL-MD-5SET-CULDEL: singles first (PP avail -1, threshold 1), BOM 482 | product.product-production.bom 481 | `sequence`: `10` -> `20` | set `sequence` back to `10` |
| 07:48 2026-10-22 | UK-TEATWL-MD-5SET-CULDEL: singles first (PP avail -1, threshold 1), BOM 237 | product.product-production.bom 237 | `sequence`: `20` -> `10` | set `sequence` back to `20` |

## Run 2026-10-21_144958

| Time | What | Record | Change | Undo |
|---|---|---|---|---|
| 14:50 2026-10-21 | UK-TOWLB-CAB-LG-4SETH: singles first (PP avail 0, threshold 1), BOM 486 | product.product-production.bom 485 | `sequence`: `10` -> `20` | set `sequence` back to `10` |
| 14:50 2026-10-21 | UK-TOWLB-CAB-LG-4SETH: singles first (PP avail 0, threshold 1), BOM 249 | product.product-production.bom 249 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 14:50 2026-10-21 | US-TOWLB-CAB-XL-4SETG: singles first (PP avail 0, threshold 1), BOM 492 | product.product-production.bom 491 | `sequence`: `10` -> `20` | set `sequence` back to `10` |
| 14:50 2026-10-21 | US-TOWLB-CAB-XL-4SETG: singles first (PP avail 0, threshold 1), BOM 322 | product.product-production.bom 322 | `sequence`: `20` -> `10` | set `sequence` back to `20` |

## Run 2026-10-21_144924

| Time | What | Record | Change | Undo |
|---|---|---|---|---|
| 14:49 2026-10-21 | 1 x PP BOM for AU-TOWLB-DES-XL-6SET-SUMSUGA | production.bom 506 | created | archive BOM (active = false) |
| 14:49 2026-10-21 | link PP BOM to AU-TOWLB-DES-XL-6SET-SUMSUGA | product.product-production.bom 505 | created | delete link |
| 14:49 2026-10-21 | AU-TOWLB-DES-XL-6SET-SUMSUGA: PP first (PP avail 1, threshold 1), BOM 506 | product.product-production.bom 505 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 14:49 2026-10-21 | AU-TOWLB-DES-XL-6SET-SUMSUGA: PP first (PP avail 1, threshold 1), BOM 505 | product.product-production.bom 504 | `sequence`: `10` -> `20` | set `sequence` back to `10` |

## Run 2026-10-21_074325

| Time | What | Record | Change | Undo |
|---|---|---|---|---|
| 07:43 2026-10-21 | PP-TEATWL-MD-3SET-KTCHDISC own BOM off (setup for UK-TEATWL-MD-3SET-KTCHDISC) | production.bom 2 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:43 2026-10-21 | 1 x PP BOM for UK-TEATWL-MD-3SET-KTCHDISC | production.bom 481 | created | archive BOM (active = false) |
| 07:43 2026-10-21 | link PP BOM to UK-TEATWL-MD-3SET-KTCHDISC | product.product-production.bom 480 | created | delete link |
| 07:43 2026-10-21 | UK-TEATWL-MD-3SET-KTCHDISC: PP first (PP avail 1, threshold 1), BOM 481 | product.product-production.bom 480 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:43 2026-10-21 | UK-TEATWL-MD-3SET-KTCHDISC: PP first (PP avail 1, threshold 1), BOM 234 | product.product-production.bom 234 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:43 2026-10-21 | PP-TEATWL-MD-5SET-CULDEL own BOM off (setup for UK-TEATWL-MD-5SET-CULDEL) | production.bom 5 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:43 2026-10-21 | 1 x PP BOM for UK-TEATWL-MD-5SET-CULDEL | production.bom 482 | created | archive BOM (active = false) |
| 07:43 2026-10-21 | link PP BOM to UK-TEATWL-MD-5SET-CULDEL | product.product-production.bom 481 | created | delete link |
| 07:43 2026-10-21 | UK-TEATWL-MD-5SET-CULDEL: PP first (PP avail 1, threshold 1), BOM 482 | product.product-production.bom 481 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:43 2026-10-21 | UK-TEATWL-MD-5SET-CULDEL: PP first (PP avail 1, threshold 1), BOM 237 | product.product-production.bom 237 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:43 2026-10-21 | PP-TOWLB-CAB-LG-4SET-BLUE own BOM off (setup for UK-TOWLB-CAB-LG-4SET-BLUE) | production.bom 10 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:43 2026-10-21 | 1 x PP BOM for UK-TOWLB-CAB-LG-4SET-BLUE | production.bom 483 | created | archive BOM (active = false) |
| 07:43 2026-10-21 | link PP BOM to UK-TOWLB-CAB-LG-4SET-BLUE | product.product-production.bom 482 | created | delete link |
| 07:43 2026-10-21 | UK-TOWLB-CAB-LG-4SET-BLUE: PP first (PP avail 1, threshold 1), BOM 483 | product.product-production.bom 482 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:43 2026-10-21 | UK-TOWLB-CAB-LG-4SET-BLUE: PP first (PP avail 1, threshold 1), BOM 242 | product.product-production.bom 242 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:43 2026-10-21 | 1 x PP BOM for US-TOWLB-CAB-LG-4SETF-R | production.bom 484 | created | archive BOM (active = false) |
| 07:43 2026-10-21 | link PP BOM to US-TOWLB-CAB-LG-4SETF-R | product.product-production.bom 483 | created | delete link |
| 07:43 2026-10-21 | US-TOWLB-CAB-LG-4SETF-R: PP first (PP avail 2, threshold 1), BOM 484 | product.product-production.bom 483 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:43 2026-10-21 | US-TOWLB-CAB-LG-4SETF-R: PP first (PP avail 2, threshold 1), BOM 300 | product.product-production.bom 300 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:43 2026-10-21 | PP-TOWLB-CAB-LG-4SETG own BOM off (setup for US-TOWLB-CAB-LG-4SETG) | production.bom 16 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:43 2026-10-21 | 1 x PP BOM for US-TOWLB-CAB-LG-4SETG | production.bom 485 | created | archive BOM (active = false) |
| 07:43 2026-10-21 | link PP BOM to US-TOWLB-CAB-LG-4SETG | product.product-production.bom 484 | created | delete link |
| 07:43 2026-10-21 | US-TOWLB-CAB-LG-4SETG: PP first (PP avail 2, threshold 1), BOM 485 | product.product-production.bom 484 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:43 2026-10-21 | US-TOWLB-CAB-LG-4SETG: PP first (PP avail 2, threshold 1), BOM 338 | product.product-production.bom 338 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:43 2026-10-21 | 1 x PP BOM for UK-TOWLB-CAB-LG-4SETH | production.bom 486 | created | archive BOM (active = false) |
| 07:44 2026-10-21 | link PP BOM to UK-TOWLB-CAB-LG-4SETH | product.product-production.bom 485 | created | delete link |
| 07:44 2026-10-21 | UK-TOWLB-CAB-LG-4SETH: PP first (PP avail 1, threshold 1), BOM 486 | product.product-production.bom 485 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:44 2026-10-21 | UK-TOWLB-CAB-LG-4SETH: PP first (PP avail 1, threshold 1), BOM 249 | product.product-production.bom 249 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:44 2026-10-21 | PP-TOWLB-CAB-LG-4SETM own BOM off (setup for US-TOWLB-CAB-LG-4SETM) | production.bom 20 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:44 2026-10-21 | 1 x PP BOM for US-TOWLB-CAB-LG-4SETM | production.bom 487 | created | archive BOM (active = false) |
| 07:44 2026-10-21 | link PP BOM to US-TOWLB-CAB-LG-4SETM | product.product-production.bom 486 | created | delete link |
| 07:44 2026-10-21 | US-TOWLB-CAB-LG-4SETM: PP first (PP avail 2, threshold 1), BOM 487 | product.product-production.bom 486 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:44 2026-10-21 | US-TOWLB-CAB-LG-4SETM: PP first (PP avail 2, threshold 1), BOM 305 | product.product-production.bom 305 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:44 2026-10-21 | 1 x PP BOM for EU-TOWLB-CAB-LG-4SETO | production.bom 488 | created | archive BOM (active = false) |
| 07:44 2026-10-21 | link PP BOM to EU-TOWLB-CAB-LG-4SETO | product.product-production.bom 487 | created | delete link |
| 07:44 2026-10-21 | EU-TOWLB-CAB-LG-4SETO: PP first (PP avail 1, threshold 1), BOM 488 | product.product-production.bom 487 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:44 2026-10-21 | EU-TOWLB-CAB-LG-4SETO: PP first (PP avail 1, threshold 1), BOM 131 | product.product-production.bom 131 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:44 2026-10-21 | 1 x PP BOM for US-TOWLB-CAB-LG-6SETM | production.bom 489 | created | archive BOM (active = false) |
| 07:44 2026-10-21 | link PP BOM to US-TOWLB-CAB-LG-6SETM | product.product-production.bom 488 | created | delete link |
| 07:44 2026-10-21 | US-TOWLB-CAB-LG-6SETM: PP first (PP avail 2, threshold 1), BOM 489 | product.product-production.bom 488 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:44 2026-10-21 | US-TOWLB-CAB-LG-6SETM: PP first (PP avail 2, threshold 1), BOM 315 | product.product-production.bom 315 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:44 2026-10-21 | 1 x PP BOM for EU-TOWLB-CAB-XL-4SETA-R | production.bom 490 | created | archive BOM (active = false) |
| 07:44 2026-10-21 | link PP BOM to EU-TOWLB-CAB-XL-4SETA-R | product.product-production.bom 489 | created | delete link |
| 07:44 2026-10-21 | EU-TOWLB-CAB-XL-4SETA-R: PP first (PP avail 2, threshold 1), BOM 490 | product.product-production.bom 489 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:44 2026-10-21 | EU-TOWLB-CAB-XL-4SETA-R: PP first (PP avail 2, threshold 1), BOM 143 | product.product-production.bom 143 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:44 2026-10-21 | 1 x PP BOM for US-TOWLB-CAB-XL-4SETF-R | production.bom 491 | created | archive BOM (active = false) |
| 07:44 2026-10-21 | link PP BOM to US-TOWLB-CAB-XL-4SETF-R | product.product-production.bom 490 | created | delete link |
| 07:44 2026-10-21 | US-TOWLB-CAB-XL-4SETF-R: PP first (PP avail 1, threshold 1), BOM 491 | product.product-production.bom 490 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:44 2026-10-21 | US-TOWLB-CAB-XL-4SETF-R: PP first (PP avail 1, threshold 1), BOM 321 | product.product-production.bom 321 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:44 2026-10-21 | 1 x PP BOM for US-TOWLB-CAB-XL-4SETG | production.bom 492 | created | archive BOM (active = false) |
| 07:44 2026-10-21 | link PP BOM to US-TOWLB-CAB-XL-4SETG | product.product-production.bom 491 | created | delete link |
| 07:44 2026-10-21 | US-TOWLB-CAB-XL-4SETG: PP first (PP avail 1, threshold 1), BOM 492 | product.product-production.bom 491 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:44 2026-10-21 | US-TOWLB-CAB-XL-4SETG: PP first (PP avail 1, threshold 1), BOM 322 | product.product-production.bom 322 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:44 2026-10-21 | 1 x PP BOM for EU-TOWLB-CAB-XL-4SETG | production.bom 493 | created | archive BOM (active = false) |
| 07:44 2026-10-21 | link PP BOM to EU-TOWLB-CAB-XL-4SETG | product.product-production.bom 492 | created | delete link |
| 07:44 2026-10-21 | EU-TOWLB-CAB-XL-4SETG: PP first (PP avail 1, threshold 1), BOM 493 | product.product-production.bom 492 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:44 2026-10-21 | EU-TOWLB-CAB-XL-4SETG: PP first (PP avail 1, threshold 1), BOM 146 | product.product-production.bom 146 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:44 2026-10-21 | PP-TOWLB-CAB-XL-4SETH own BOM off (setup for UK-TOWLB-CAB-XL-4SETH) | production.bom 38 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:44 2026-10-21 | 1 x PP BOM for UK-TOWLB-CAB-XL-4SETH | production.bom 494 | created | archive BOM (active = false) |
| 07:44 2026-10-21 | link PP BOM to UK-TOWLB-CAB-XL-4SETH | product.product-production.bom 493 | created | delete link |
| 07:44 2026-10-21 | UK-TOWLB-CAB-XL-4SETH: PP first (PP avail 1, threshold 1), BOM 494 | product.product-production.bom 493 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:44 2026-10-21 | UK-TOWLB-CAB-XL-4SETH: PP first (PP avail 1, threshold 1), BOM 270 | product.product-production.bom 270 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:44 2026-10-21 | 1 x PP BOM for EU-TOWLB-CAB-XL-4SETH | production.bom 495 | created | archive BOM (active = false) |
| 07:44 2026-10-21 | link PP BOM to EU-TOWLB-CAB-XL-4SETH | product.product-production.bom 494 | created | delete link |
| 07:44 2026-10-21 | EU-TOWLB-CAB-XL-4SETH: PP first (PP avail 2, threshold 1), BOM 495 | product.product-production.bom 494 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:44 2026-10-21 | EU-TOWLB-CAB-XL-4SETH: PP first (PP avail 2, threshold 1), BOM 147 | product.product-production.bom 147 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:44 2026-10-21 | PP-TOWLB-CAB-XL-4SETL own BOM off (setup for US-TOWLB-CAB-XL-4SETL) | production.bom 40 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:44 2026-10-21 | 1 x PP BOM for US-TOWLB-CAB-XL-4SETL | production.bom 496 | created | archive BOM (active = false) |
| 07:44 2026-10-21 | link PP BOM to US-TOWLB-CAB-XL-4SETL | product.product-production.bom 495 | created | delete link |
| 07:44 2026-10-21 | US-TOWLB-CAB-XL-4SETL: PP first (PP avail 1, threshold 1), BOM 496 | product.product-production.bom 495 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:44 2026-10-21 | US-TOWLB-CAB-XL-4SETL: PP first (PP avail 1, threshold 1), BOM 324 | product.product-production.bom 324 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:44 2026-10-21 | 1 x PP BOM for EU-TOWLB-CAB-XL-4SETL | production.bom 497 | created | archive BOM (active = false) |
| 07:44 2026-10-21 | link PP BOM to EU-TOWLB-CAB-XL-4SETL | product.product-production.bom 496 | created | delete link |
| 07:44 2026-10-21 | EU-TOWLB-CAB-XL-4SETL: PP first (PP avail 1, threshold 1), BOM 497 | product.product-production.bom 496 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:44 2026-10-21 | EU-TOWLB-CAB-XL-4SETL: PP first (PP avail 1, threshold 1), BOM 149 | product.product-production.bom 149 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:44 2026-10-21 | PP-TOWLB-CAB-XL-4SETO own BOM off (setup for EU-TOWLB-CAB-XL-4SETO) | production.bom 43 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:44 2026-10-21 | 1 x PP BOM for EU-TOWLB-CAB-XL-4SETO | production.bom 498 | created | archive BOM (active = false) |
| 07:44 2026-10-21 | link PP BOM to EU-TOWLB-CAB-XL-4SETO | product.product-production.bom 497 | created | delete link |
| 07:44 2026-10-21 | EU-TOWLB-CAB-XL-4SETO: PP first (PP avail 1, threshold 1), BOM 498 | product.product-production.bom 497 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:44 2026-10-21 | EU-TOWLB-CAB-XL-4SETO: PP first (PP avail 1, threshold 1), BOM 152 | product.product-production.bom 152 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:44 2026-10-21 | 1 x PP BOM for EU-TOWLB-CAB-XL-6SET-PINK | production.bom 499 | created | archive BOM (active = false) |
| 07:44 2026-10-21 | link PP BOM to EU-TOWLB-CAB-XL-6SET-PINK | product.product-production.bom 498 | created | delete link |
| 07:44 2026-10-21 | EU-TOWLB-CAB-XL-6SET-PINK: PP first (PP avail 1, threshold 1), BOM 499 | product.product-production.bom 498 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:44 2026-10-21 | EU-TOWLB-CAB-XL-6SET-PINK: PP first (PP avail 1, threshold 1), BOM 154 | product.product-production.bom 154 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:44 2026-10-21 | 1 x PP BOM for EU-TOWLB-CAB-XL-6SETI | production.bom 500 | created | archive BOM (active = false) |
| 07:44 2026-10-21 | link PP BOM to EU-TOWLB-CAB-XL-6SETI | product.product-production.bom 499 | created | delete link |
| 07:44 2026-10-21 | EU-TOWLB-CAB-XL-6SETI: PP first (PP avail 1, threshold 1), BOM 500 | product.product-production.bom 499 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:44 2026-10-21 | EU-TOWLB-CAB-XL-6SETI: PP first (PP avail 1, threshold 1), BOM 156 | product.product-production.bom 156 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:44 2026-10-21 | PP-TOWLB-CAB-XL-6SETJ own BOM off (setup for EU-TOWLB-CAB-XL-6SETJ) | production.bom 48 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:44 2026-10-21 | 1 x PP BOM for EU-TOWLB-CAB-XL-6SETJ | production.bom 501 | created | archive BOM (active = false) |
| 07:44 2026-10-21 | link PP BOM to EU-TOWLB-CAB-XL-6SETJ | product.product-production.bom 500 | created | delete link |
| 07:44 2026-10-21 | EU-TOWLB-CAB-XL-6SETJ: PP first (PP avail 1, threshold 1), BOM 501 | product.product-production.bom 500 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:44 2026-10-21 | EU-TOWLB-CAB-XL-6SETJ: PP first (PP avail 1, threshold 1), BOM 157 | product.product-production.bom 157 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:44 2026-10-21 | PP-TOWLB-CAB-XL-6SETK own BOM off (setup for UK-TOWLB-CAB-XL-6SETK) | production.bom 49 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:44 2026-10-21 | 1 x PP BOM for UK-TOWLB-CAB-XL-6SETK | production.bom 502 | created | archive BOM (active = false) |
| 07:44 2026-10-21 | link PP BOM to UK-TOWLB-CAB-XL-6SETK | product.product-production.bom 501 | created | delete link |
| 07:44 2026-10-21 | UK-TOWLB-CAB-XL-6SETK: PP first (PP avail 1, threshold 1), BOM 502 | product.product-production.bom 501 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:44 2026-10-21 | UK-TOWLB-CAB-XL-6SETK: PP first (PP avail 1, threshold 1), BOM 281 | product.product-production.bom 281 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:44 2026-10-21 | 1 x PP BOM for EU-TOWLB-CAB-XL-6SETK | production.bom 503 | created | archive BOM (active = false) |
| 07:44 2026-10-21 | link PP BOM to EU-TOWLB-CAB-XL-6SETK | product.product-production.bom 502 | created | delete link |
| 07:44 2026-10-21 | EU-TOWLB-CAB-XL-6SETK: PP first (PP avail 2, threshold 1), BOM 503 | product.product-production.bom 502 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:44 2026-10-21 | EU-TOWLB-CAB-XL-6SETK: PP first (PP avail 2, threshold 1), BOM 158 | product.product-production.bom 158 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:44 2026-10-21 | PP-TOWLB-CAB-XL-6SETM own BOM off (setup for EU-TOWLB-CAB-XL-6SETM) | production.bom 51 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:44 2026-10-21 | 1 x PP BOM for EU-TOWLB-CAB-XL-6SETM | production.bom 504 | created | archive BOM (active = false) |
| 07:44 2026-10-21 | link PP BOM to EU-TOWLB-CAB-XL-6SETM | product.product-production.bom 503 | created | delete link |
| 07:45 2026-10-21 | EU-TOWLB-CAB-XL-6SETM: PP first (PP avail 1, threshold 1), BOM 504 | product.product-production.bom 503 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:45 2026-10-21 | EU-TOWLB-CAB-XL-6SETM: PP first (PP avail 1, threshold 1), BOM 160 | product.product-production.bom 160 | `sequence`: `None` -> `20` | set `sequence` back to `None` |

## Run 2026-10-21_073551

| Time | What | Record | Change | Undo |
|---|---|---|---|---|
| 07:36 2026-10-21 | PP-TEATWL-MD-3SET-STRAWFZ own BOM off (setup for UK-TEATWL-MD-3SET-STRAWFZ) | production.bom 3 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:36 2026-10-21 | 1 x PP BOM for UK-TEATWL-MD-3SET-STRAWFZ | production.bom 441 | created | archive BOM (active = false) |
| 07:36 2026-10-21 | link PP BOM to UK-TEATWL-MD-3SET-STRAWFZ | product.product-production.bom 440 | created | delete link |
| 07:36 2026-10-21 | UK-TEATWL-MD-3SET-STRAWFZ: PP first (PP avail 13, threshold 3), BOM 441 | product.product-production.bom 440 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:36 2026-10-21 | UK-TEATWL-MD-3SET-STRAWFZ: PP first (PP avail 13, threshold 3), BOM 235 | product.product-production.bom 235 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:36 2026-10-21 | PP-TEATWL-MD-5SET-PICKY own BOM off (setup for UK-TEATWL-MD-5SET-PICKY) | production.bom 7 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:36 2026-10-21 | 1 x PP BOM for UK-TEATWL-MD-5SET-PICKY | production.bom 442 | created | archive BOM (active = false) |
| 07:36 2026-10-21 | link PP BOM to UK-TEATWL-MD-5SET-PICKY | product.product-production.bom 441 | created | delete link |
| 07:36 2026-10-21 | UK-TEATWL-MD-5SET-PICKY: PP first (PP avail 108, threshold 3), BOM 442 | product.product-production.bom 441 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:36 2026-10-21 | UK-TEATWL-MD-5SET-PICKY: PP first (PP avail 108, threshold 3), BOM 239 | product.product-production.bom 239 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:36 2026-10-21 | PP-TEATWL-MD-6SET-AFTPTY own BOM off (setup for UK-TEATWL-MD-6SET-AFTPTY) | production.bom 8 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:36 2026-10-21 | 1 x PP BOM for UK-TEATWL-MD-6SET-AFTPTY | production.bom 443 | created | archive BOM (active = false) |
| 07:36 2026-10-21 | link PP BOM to UK-TEATWL-MD-6SET-AFTPTY | product.product-production.bom 442 | created | delete link |
| 07:36 2026-10-21 | UK-TEATWL-MD-6SET-AFTPTY: PP first (PP avail 48, threshold 3), BOM 443 | product.product-production.bom 442 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:36 2026-10-21 | UK-TEATWL-MD-6SET-AFTPTY: PP first (PP avail 48, threshold 3), BOM 240 | product.product-production.bom 240 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:36 2026-10-21 | PP-TEATWL-MD-6SET-FRTCTL own BOM off (setup for UK-TEATWL-MD-6SET-FRTCTL) | production.bom 9 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:36 2026-10-21 | 1 x PP BOM for UK-TEATWL-MD-6SET-FRTCTL | production.bom 444 | created | archive BOM (active = false) |
| 07:36 2026-10-21 | link PP BOM to UK-TEATWL-MD-6SET-FRTCTL | product.product-production.bom 443 | created | delete link |
| 07:36 2026-10-21 | UK-TEATWL-MD-6SET-FRTCTL: PP first (PP avail 113, threshold 3), BOM 444 | product.product-production.bom 443 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:36 2026-10-21 | UK-TEATWL-MD-6SET-FRTCTL: PP first (PP avail 113, threshold 3), BOM 241 | product.product-production.bom 241 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:36 2026-10-21 | PP-TOWLB-CAB-LG-4SET-PINK own BOM off (setup for US-TOWLB-CAB-LG-4SET-PINK) | production.bom 12 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:36 2026-10-21 | 1 x PP BOM for US-TOWLB-CAB-LG-4SET-PINK | production.bom 445 | created | archive BOM (active = false) |
| 07:36 2026-10-21 | link PP BOM to US-TOWLB-CAB-LG-4SET-PINK | product.product-production.bom 444 | created | delete link |
| 07:36 2026-10-21 | US-TOWLB-CAB-LG-4SET-PINK: PP first (PP avail 43, threshold 3), BOM 445 | product.product-production.bom 444 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:36 2026-10-21 | US-TOWLB-CAB-LG-4SET-PINK: PP first (PP avail 43, threshold 3), BOM 298 | product.product-production.bom 298 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:36 2026-10-21 | PP-TOWLB-CAB-LG-4SETA-R own BOM off (setup for EU-TOWLB-CAB-LG-4SETA-R) | production.bom 13 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:36 2026-10-21 | 1 x PP BOM for EU-TOWLB-CAB-LG-4SETA-R | production.bom 446 | created | archive BOM (active = false) |
| 07:36 2026-10-21 | link PP BOM to EU-TOWLB-CAB-LG-4SETA-R | product.product-production.bom 445 | created | delete link |
| 07:36 2026-10-21 | EU-TOWLB-CAB-LG-4SETA-R: PP first (PP avail 5, threshold 3), BOM 446 | product.product-production.bom 445 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:36 2026-10-21 | EU-TOWLB-CAB-LG-4SETA-R: PP first (PP avail 5, threshold 3), BOM 122 | product.product-production.bom 122 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:36 2026-10-21 | PP-TOWLB-CAB-LG-4SETE-R own BOM off (setup for UK-TOWLB-CAB-LG-4SETE-R) | production.bom 14 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:36 2026-10-21 | 1 x PP BOM for UK-TOWLB-CAB-LG-4SETE-R | production.bom 447 | created | archive BOM (active = false) |
| 07:36 2026-10-21 | link PP BOM to UK-TOWLB-CAB-LG-4SETE-R | product.product-production.bom 446 | created | delete link |
| 07:36 2026-10-21 | UK-TOWLB-CAB-LG-4SETE-R: PP first (PP avail 31, threshold 3), BOM 447 | product.product-production.bom 446 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:36 2026-10-21 | UK-TOWLB-CAB-LG-4SETE-R: PP first (PP avail 31, threshold 3), BOM 246 | product.product-production.bom 246 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:36 2026-10-21 | PP-TOWLB-CAB-LG-4SETF-R own BOM off (setup for UK-TOWLB-CAB-LG-4SETF-R) | production.bom 15 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:36 2026-10-21 | 1 x PP BOM for UK-TOWLB-CAB-LG-4SETF-R | production.bom 448 | created | archive BOM (active = false) |
| 07:36 2026-10-21 | link PP BOM to UK-TOWLB-CAB-LG-4SETF-R | product.product-production.bom 447 | created | delete link |
| 07:36 2026-10-21 | UK-TOWLB-CAB-LG-4SETF-R: PP first (PP avail 153, threshold 3), BOM 448 | product.product-production.bom 447 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:36 2026-10-21 | UK-TOWLB-CAB-LG-4SETF-R: PP first (PP avail 153, threshold 3), BOM 247 | product.product-production.bom 247 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:36 2026-10-21 | 1 x PP BOM for EU-TOWLB-CAB-LG-4SETF-R | production.bom 449 | created | archive BOM (active = false) |
| 07:36 2026-10-21 | link PP BOM to EU-TOWLB-CAB-LG-4SETF-R | product.product-production.bom 448 | created | delete link |
| 07:36 2026-10-21 | EU-TOWLB-CAB-LG-4SETF-R: PP first (PP avail 16, threshold 3), BOM 449 | product.product-production.bom 448 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:36 2026-10-21 | EU-TOWLB-CAB-LG-4SETF-R: PP first (PP avail 16, threshold 3), BOM 124 | product.product-production.bom 124 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:36 2026-10-21 | PP-TOWLB-CAB-LG-4SETH own BOM off (setup for EU-TOWLB-CAB-LG-4SETH) | production.bom 17 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:36 2026-10-21 | 1 x PP BOM for EU-TOWLB-CAB-LG-4SETH | production.bom 450 | created | archive BOM (active = false) |
| 07:36 2026-10-21 | link PP BOM to EU-TOWLB-CAB-LG-4SETH | product.product-production.bom 449 | created | delete link |
| 07:36 2026-10-21 | EU-TOWLB-CAB-LG-4SETH: PP first (PP avail 5, threshold 3), BOM 450 | product.product-production.bom 449 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:36 2026-10-21 | EU-TOWLB-CAB-LG-4SETH: PP first (PP avail 5, threshold 3), BOM 126 | product.product-production.bom 126 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:36 2026-10-21 | PP-TOWLB-CAB-LG-4SETL own BOM off (setup for UK-TOWLB-CAB-LG-4SETL) | production.bom 19 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:36 2026-10-21 | 1 x PP BOM for UK-TOWLB-CAB-LG-4SETL | production.bom 451 | created | archive BOM (active = false) |
| 07:36 2026-10-21 | link PP BOM to UK-TOWLB-CAB-LG-4SETL | product.product-production.bom 450 | created | delete link |
| 07:36 2026-10-21 | UK-TOWLB-CAB-LG-4SETL: PP first (PP avail 57, threshold 3), BOM 451 | product.product-production.bom 450 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:36 2026-10-21 | UK-TOWLB-CAB-LG-4SETL: PP first (PP avail 57, threshold 3), BOM 251 | product.product-production.bom 251 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:36 2026-10-21 | PP-TOWLB-CAB-LG-4SETN own BOM off (setup for UK-TOWLB-CAB-LG-4SETN) | production.bom 21 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:36 2026-10-21 | 1 x PP BOM for UK-TOWLB-CAB-LG-4SETN | production.bom 452 | created | archive BOM (active = false) |
| 07:36 2026-10-21 | link PP BOM to UK-TOWLB-CAB-LG-4SETN | product.product-production.bom 451 | created | delete link |
| 07:36 2026-10-21 | UK-TOWLB-CAB-LG-4SETN: PP first (PP avail 19, threshold 3), BOM 452 | product.product-production.bom 451 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:36 2026-10-21 | UK-TOWLB-CAB-LG-4SETN: PP first (PP avail 19, threshold 3), BOM 253 | product.product-production.bom 253 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:36 2026-10-21 | PP-TOWLB-CAB-LG-4SETO own BOM off (setup for UK-TOWLB-CAB-LG-4SETO) | production.bom 22 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:36 2026-10-21 | 1 x PP BOM for UK-TOWLB-CAB-LG-4SETO | production.bom 453 | created | archive BOM (active = false) |
| 07:36 2026-10-21 | link PP BOM to UK-TOWLB-CAB-LG-4SETO | product.product-production.bom 452 | created | delete link |
| 07:36 2026-10-21 | UK-TOWLB-CAB-LG-4SETO: PP first (PP avail 94, threshold 3), BOM 453 | product.product-production.bom 452 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:36 2026-10-21 | UK-TOWLB-CAB-LG-4SETO: PP first (PP avail 94, threshold 3), BOM 254 | product.product-production.bom 254 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:36 2026-10-21 | PP-TOWLB-CAB-LG-6SET-BLUE own BOM off (setup for UK-TOWLB-CAB-LG-6SET-BLUE) | production.bom 23 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:36 2026-10-21 | 1 x PP BOM for UK-TOWLB-CAB-LG-6SET-BLUE | production.bom 454 | created | archive BOM (active = false) |
| 07:36 2026-10-21 | link PP BOM to UK-TOWLB-CAB-LG-6SET-BLUE | product.product-production.bom 453 | created | delete link |
| 07:36 2026-10-21 | UK-TOWLB-CAB-LG-6SET-BLUE: PP first (PP avail 38, threshold 3), BOM 454 | product.product-production.bom 453 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:36 2026-10-21 | UK-TOWLB-CAB-LG-6SET-BLUE: PP first (PP avail 38, threshold 3), BOM 255 | product.product-production.bom 255 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:36 2026-10-21 | PP-TOWLB-CAB-LG-6SET-PINK own BOM off (setup for UK-TOWLB-CAB-LG-6SET-PINK) | production.bom 24 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:36 2026-10-21 | 1 x PP BOM for UK-TOWLB-CAB-LG-6SET-PINK | production.bom 455 | created | archive BOM (active = false) |
| 07:36 2026-10-21 | link PP BOM to UK-TOWLB-CAB-LG-6SET-PINK | product.product-production.bom 454 | created | delete link |
| 07:36 2026-10-21 | UK-TOWLB-CAB-LG-6SET-PINK: PP first (PP avail 127, threshold 3), BOM 455 | product.product-production.bom 454 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:36 2026-10-21 | UK-TOWLB-CAB-LG-6SET-PINK: PP first (PP avail 127, threshold 3), BOM 256 | product.product-production.bom 256 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:37 2026-10-21 | 1 x PP BOM for US-TOWLB-CAB-LG-6SET-PINK | production.bom 456 | created | archive BOM (active = false) |
| 07:37 2026-10-21 | link PP BOM to US-TOWLB-CAB-LG-6SET-PINK | product.product-production.bom 455 | created | delete link |
| 07:37 2026-10-21 | US-TOWLB-CAB-LG-6SET-PINK: PP first (PP avail 9, threshold 3), BOM 456 | product.product-production.bom 455 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:37 2026-10-21 | US-TOWLB-CAB-LG-6SET-PINK: PP first (PP avail 9, threshold 3), BOM 309 | product.product-production.bom 309 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:37 2026-10-21 | 1 x PP BOM for US-TOWLB-CAB-LG-6SETI | production.bom 457 | created | archive BOM (active = false) |
| 07:37 2026-10-21 | link PP BOM to US-TOWLB-CAB-LG-6SETI | product.product-production.bom 456 | created | delete link |
| 07:37 2026-10-21 | US-TOWLB-CAB-LG-6SETI: PP first (PP avail 10, threshold 3), BOM 457 | product.product-production.bom 456 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:37 2026-10-21 | US-TOWLB-CAB-LG-6SETI: PP first (PP avail 10, threshold 3), BOM 311 | product.product-production.bom 311 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:37 2026-10-21 | 1 x PP BOM for EU-TOWLB-CAB-LG-6SETI | production.bom 458 | created | archive BOM (active = false) |
| 07:37 2026-10-21 | link PP BOM to EU-TOWLB-CAB-LG-6SETI | product.product-production.bom 457 | created | delete link |
| 07:37 2026-10-21 | EU-TOWLB-CAB-LG-6SETI: PP first (PP avail 39, threshold 3), BOM 458 | product.product-production.bom 457 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:37 2026-10-21 | EU-TOWLB-CAB-LG-6SETI: PP first (PP avail 39, threshold 3), BOM 135 | product.product-production.bom 135 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:37 2026-10-21 | PP-TOWLB-CAB-LG-6SETJ own BOM off (setup for EU-TOWLB-CAB-LG-6SETJ) | production.bom 27 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:37 2026-10-21 | 1 x PP BOM for EU-TOWLB-CAB-LG-6SETJ | production.bom 459 | created | archive BOM (active = false) |
| 07:37 2026-10-21 | link PP BOM to EU-TOWLB-CAB-LG-6SETJ | product.product-production.bom 458 | created | delete link |
| 07:37 2026-10-21 | EU-TOWLB-CAB-LG-6SETJ: PP first (PP avail 7, threshold 3), BOM 459 | product.product-production.bom 458 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:37 2026-10-21 | EU-TOWLB-CAB-LG-6SETJ: PP first (PP avail 7, threshold 3), BOM 136 | product.product-production.bom 136 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:37 2026-10-21 | PP-TOWLB-CAB-LG-6SETK own BOM off (setup for EU-TOWLB-CAB-LG-6SETK) | production.bom 28 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:37 2026-10-21 | 1 x PP BOM for EU-TOWLB-CAB-LG-6SETK | production.bom 460 | created | archive BOM (active = false) |
| 07:37 2026-10-21 | link PP BOM to EU-TOWLB-CAB-LG-6SETK | product.product-production.bom 459 | created | delete link |
| 07:37 2026-10-21 | EU-TOWLB-CAB-LG-6SETK: PP first (PP avail 3, threshold 3), BOM 460 | product.product-production.bom 459 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:37 2026-10-21 | EU-TOWLB-CAB-LG-6SETK: PP first (PP avail 3, threshold 3), BOM 137 | product.product-production.bom 137 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:37 2026-10-21 | PP-TOWLB-CAB-LG-6SETL own BOM off (setup for EU-TOWLB-CAB-LG-6SETL) | production.bom 29 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:37 2026-10-21 | 1 x PP BOM for EU-TOWLB-CAB-LG-6SETL | production.bom 461 | created | archive BOM (active = false) |
| 07:37 2026-10-21 | link PP BOM to EU-TOWLB-CAB-LG-6SETL | product.product-production.bom 460 | created | delete link |
| 07:37 2026-10-21 | EU-TOWLB-CAB-LG-6SETL: PP first (PP avail 6, threshold 3), BOM 461 | product.product-production.bom 460 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:37 2026-10-21 | EU-TOWLB-CAB-LG-6SETL: PP first (PP avail 6, threshold 3), BOM 138 | product.product-production.bom 138 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:37 2026-10-21 | PP-TOWLB-CAB-LG-6SETM own BOM off (setup for UK-TOWLB-CAB-LG-6SETM) | production.bom 30 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:37 2026-10-21 | 1 x PP BOM for UK-TOWLB-CAB-LG-6SETM | production.bom 462 | created | archive BOM (active = false) |
| 07:37 2026-10-21 | link PP BOM to UK-TOWLB-CAB-LG-6SETM | product.product-production.bom 461 | created | delete link |
| 07:37 2026-10-21 | UK-TOWLB-CAB-LG-6SETM: PP first (PP avail 23, threshold 3), BOM 462 | product.product-production.bom 461 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:37 2026-10-21 | UK-TOWLB-CAB-LG-6SETM: PP first (PP avail 23, threshold 3), BOM 262 | product.product-production.bom 262 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:37 2026-10-21 | 1 x PP BOM for EU-TOWLB-CAB-LG-6SETM | production.bom 463 | created | archive BOM (active = false) |
| 07:37 2026-10-21 | link PP BOM to EU-TOWLB-CAB-LG-6SETM | product.product-production.bom 462 | created | delete link |
| 07:37 2026-10-21 | EU-TOWLB-CAB-LG-6SETM: PP first (PP avail 21, threshold 3), BOM 463 | product.product-production.bom 462 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:37 2026-10-21 | EU-TOWLB-CAB-LG-6SETM: PP first (PP avail 21, threshold 3), BOM 139 | product.product-production.bom 139 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:37 2026-10-21 | PP-TOWLB-CAB-XL-4SET-ORANGE own BOM off (setup for UK-TOWLB-CAB-XL-4SET-ORANGE) | production.bom 32 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:37 2026-10-21 | 1 x PP BOM for UK-TOWLB-CAB-XL-4SET-ORANGE | production.bom 464 | created | archive BOM (active = false) |
| 07:37 2026-10-21 | link PP BOM to UK-TOWLB-CAB-XL-4SET-ORANGE | product.product-production.bom 463 | created | delete link |
| 07:37 2026-10-21 | UK-TOWLB-CAB-XL-4SET-ORANGE: PP first (PP avail 21, threshold 3), BOM 464 | product.product-production.bom 463 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:37 2026-10-21 | UK-TOWLB-CAB-XL-4SET-ORANGE: PP first (PP avail 21, threshold 3), BOM 264 | product.product-production.bom 264 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:37 2026-10-21 | 1 x PP BOM for US-TOWLB-CAB-XL-4SET-ORANGE | production.bom 465 | created | archive BOM (active = false) |
| 07:37 2026-10-21 | link PP BOM to US-TOWLB-CAB-XL-4SET-ORANGE | product.product-production.bom 464 | created | delete link |
| 07:37 2026-10-21 | US-TOWLB-CAB-XL-4SET-ORANGE: PP first (PP avail 18, threshold 3), BOM 465 | product.product-production.bom 464 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:37 2026-10-21 | US-TOWLB-CAB-XL-4SET-ORANGE: PP first (PP avail 18, threshold 3), BOM 317 | product.product-production.bom 317 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:37 2026-10-21 | PP-TOWLB-CAB-XL-4SET-PINK own BOM off (setup for US-TOWLB-CAB-XL-4SET-PINK) | production.bom 33 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:37 2026-10-21 | 1 x PP BOM for US-TOWLB-CAB-XL-4SET-PINK | production.bom 466 | created | archive BOM (active = false) |
| 07:37 2026-10-21 | link PP BOM to US-TOWLB-CAB-XL-4SET-PINK | product.product-production.bom 465 | created | delete link |
| 07:37 2026-10-21 | US-TOWLB-CAB-XL-4SET-PINK: PP first (PP avail 27, threshold 3), BOM 466 | product.product-production.bom 465 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:37 2026-10-21 | US-TOWLB-CAB-XL-4SET-PINK: PP first (PP avail 27, threshold 3), BOM 318 | product.product-production.bom 318 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:37 2026-10-21 | PP-TOWLB-CAB-XL-4SETA-R own BOM off (setup for UK-TOWLB-CAB-XL-4SETA-R) | production.bom 34 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:37 2026-10-21 | 1 x PP BOM for UK-TOWLB-CAB-XL-4SETA-R | production.bom 467 | created | archive BOM (active = false) |
| 07:37 2026-10-21 | link PP BOM to UK-TOWLB-CAB-XL-4SETA-R | product.product-production.bom 466 | created | delete link |
| 07:37 2026-10-21 | UK-TOWLB-CAB-XL-4SETA-R: PP first (PP avail 17, threshold 3), BOM 467 | product.product-production.bom 466 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:37 2026-10-21 | UK-TOWLB-CAB-XL-4SETA-R: PP first (PP avail 17, threshold 3), BOM 266 | product.product-production.bom 266 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:37 2026-10-21 | 1 x PP BOM for US-TOWLB-CAB-XL-4SETA-R | production.bom 468 | created | archive BOM (active = false) |
| 07:37 2026-10-21 | link PP BOM to US-TOWLB-CAB-XL-4SETA-R | product.product-production.bom 467 | created | delete link |
| 07:37 2026-10-21 | US-TOWLB-CAB-XL-4SETA-R: PP first (PP avail 5, threshold 3), BOM 468 | product.product-production.bom 467 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:37 2026-10-21 | US-TOWLB-CAB-XL-4SETA-R: PP first (PP avail 5, threshold 3), BOM 319 | product.product-production.bom 319 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:37 2026-10-21 | PP-TOWLB-CAB-XL-4SETE-R own BOM off (setup for UK-TOWLB-CAB-XL-4SETE-R) | production.bom 35 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:37 2026-10-21 | 1 x PP BOM for UK-TOWLB-CAB-XL-4SETE-R | production.bom 469 | created | archive BOM (active = false) |
| 07:37 2026-10-21 | link PP BOM to UK-TOWLB-CAB-XL-4SETE-R | product.product-production.bom 468 | created | delete link |
| 07:37 2026-10-21 | UK-TOWLB-CAB-XL-4SETE-R: PP first (PP avail 81, threshold 3), BOM 469 | product.product-production.bom 468 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:37 2026-10-21 | UK-TOWLB-CAB-XL-4SETE-R: PP first (PP avail 81, threshold 3), BOM 267 | product.product-production.bom 267 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:37 2026-10-21 | 1 x PP BOM for EU-TOWLB-CAB-XL-4SETE-R | production.bom 470 | created | archive BOM (active = false) |
| 07:37 2026-10-21 | link PP BOM to EU-TOWLB-CAB-XL-4SETE-R | product.product-production.bom 469 | created | delete link |
| 07:37 2026-10-21 | EU-TOWLB-CAB-XL-4SETE-R: PP first (PP avail 10, threshold 3), BOM 470 | product.product-production.bom 469 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:37 2026-10-21 | EU-TOWLB-CAB-XL-4SETE-R: PP first (PP avail 10, threshold 3), BOM 144 | product.product-production.bom 144 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:37 2026-10-21 | PP-TOWLB-CAB-XL-4SETF-R own BOM off (setup for UK-TOWLB-CAB-XL-4SETF-R) | production.bom 36 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:37 2026-10-21 | 1 x PP BOM for UK-TOWLB-CAB-XL-4SETF-R | production.bom 471 | created | archive BOM (active = false) |
| 07:37 2026-10-21 | link PP BOM to UK-TOWLB-CAB-XL-4SETF-R | product.product-production.bom 470 | created | delete link |
| 07:37 2026-10-21 | UK-TOWLB-CAB-XL-4SETF-R: PP first (PP avail 27, threshold 3), BOM 471 | product.product-production.bom 470 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:37 2026-10-21 | UK-TOWLB-CAB-XL-4SETF-R: PP first (PP avail 27, threshold 3), BOM 268 | product.product-production.bom 268 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:37 2026-10-21 | 1 x PP BOM for EU-TOWLB-CAB-XL-4SETF-R | production.bom 472 | created | archive BOM (active = false) |
| 07:37 2026-10-21 | link PP BOM to EU-TOWLB-CAB-XL-4SETF-R | product.product-production.bom 471 | created | delete link |
| 07:37 2026-10-21 | EU-TOWLB-CAB-XL-4SETF-R: PP first (PP avail 5, threshold 3), BOM 472 | product.product-production.bom 471 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:37 2026-10-21 | EU-TOWLB-CAB-XL-4SETF-R: PP first (PP avail 5, threshold 3), BOM 145 | product.product-production.bom 145 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:37 2026-10-21 | PP-TOWLB-CAB-XL-4SETG own BOM off (setup for UK-TOWLB-CAB-XL-4SETG) | production.bom 37 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:38 2026-10-21 | 1 x PP BOM for UK-TOWLB-CAB-XL-4SETG | production.bom 473 | created | archive BOM (active = false) |
| 07:38 2026-10-21 | link PP BOM to UK-TOWLB-CAB-XL-4SETG | product.product-production.bom 472 | created | delete link |
| 07:38 2026-10-21 | UK-TOWLB-CAB-XL-4SETG: PP first (PP avail 10, threshold 4), BOM 473 | product.product-production.bom 472 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:38 2026-10-21 | UK-TOWLB-CAB-XL-4SETG: PP first (PP avail 10, threshold 4), BOM 269 | product.product-production.bom 269 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:38 2026-10-21 | PP-TOWLB-CAB-XL-4SETK own BOM off (setup for UK-TOWLB-CAB-XL-4SETK) | production.bom 39 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:38 2026-10-21 | 1 x PP BOM for UK-TOWLB-CAB-XL-4SETK | production.bom 474 | created | archive BOM (active = false) |
| 07:38 2026-10-21 | link PP BOM to UK-TOWLB-CAB-XL-4SETK | product.product-production.bom 473 | created | delete link |
| 07:38 2026-10-21 | UK-TOWLB-CAB-XL-4SETK: PP first (PP avail 7, threshold 4), BOM 474 | product.product-production.bom 473 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:38 2026-10-21 | UK-TOWLB-CAB-XL-4SETK: PP first (PP avail 7, threshold 4), BOM 271 | product.product-production.bom 271 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:38 2026-10-21 | PP-TOWLB-CAB-XL-4SETN own BOM off (setup for US-TOWLB-CAB-XL-4SETN) | production.bom 42 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:38 2026-10-21 | 1 x PP BOM for US-TOWLB-CAB-XL-4SETN | production.bom 475 | created | archive BOM (active = false) |
| 07:38 2026-10-21 | link PP BOM to US-TOWLB-CAB-XL-4SETN | product.product-production.bom 474 | created | delete link |
| 07:38 2026-10-21 | US-TOWLB-CAB-XL-4SETN: PP first (PP avail 7, threshold 3), BOM 475 | product.product-production.bom 474 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:38 2026-10-21 | US-TOWLB-CAB-XL-4SETN: PP first (PP avail 7, threshold 3), BOM 326 | product.product-production.bom 326 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:38 2026-10-21 | PP-TOWLB-CAB-XL-6SET-PINK own BOM off (setup for US-TOWLB-CAB-XL-6SET-PINK) | production.bom 45 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:38 2026-10-21 | 1 x PP BOM for US-TOWLB-CAB-XL-6SET-PINK | production.bom 476 | created | archive BOM (active = false) |
| 07:38 2026-10-21 | link PP BOM to US-TOWLB-CAB-XL-6SET-PINK | product.product-production.bom 475 | created | delete link |
| 07:38 2026-10-21 | US-TOWLB-CAB-XL-6SET-PINK: PP first (PP avail 3, threshold 3), BOM 476 | product.product-production.bom 475 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:38 2026-10-21 | US-TOWLB-CAB-XL-6SET-PINK: PP first (PP avail 3, threshold 3), BOM 328 | product.product-production.bom 328 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:38 2026-10-21 | PP-TOWLB-CAB-XL-6SETI own BOM off (setup for US-TOWLB-CAB-XL-6SETI) | production.bom 47 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:38 2026-10-21 | 1 x PP BOM for US-TOWLB-CAB-XL-6SETI | production.bom 477 | created | archive BOM (active = false) |
| 07:38 2026-10-21 | link PP BOM to US-TOWLB-CAB-XL-6SETI | product.product-production.bom 476 | created | delete link |
| 07:38 2026-10-21 | US-TOWLB-CAB-XL-6SETI: PP first (PP avail 3, threshold 3), BOM 477 | product.product-production.bom 476 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:38 2026-10-21 | US-TOWLB-CAB-XL-6SETI: PP first (PP avail 3, threshold 3), BOM 330 | product.product-production.bom 330 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:38 2026-10-21 | PP-TOWLB-CAB-XL-6SETL own BOM off (setup for EU-TOWLB-CAB-XL-6SETL) | production.bom 50 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:38 2026-10-21 | 1 x PP BOM for EU-TOWLB-CAB-XL-6SETL | production.bom 478 | created | archive BOM (active = false) |
| 07:38 2026-10-21 | link PP BOM to EU-TOWLB-CAB-XL-6SETL | product.product-production.bom 477 | created | delete link |
| 07:38 2026-10-21 | EU-TOWLB-CAB-XL-6SETL: PP first (PP avail 3, threshold 3), BOM 478 | product.product-production.bom 477 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:38 2026-10-21 | EU-TOWLB-CAB-XL-6SETL: PP first (PP avail 3, threshold 3), BOM 159 | product.product-production.bom 159 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:38 2026-10-21 | 1 x PP BOM for UK-TOWLB-DES-XL-4SET-SUNBLVD | production.bom 479 | created | archive BOM (active = false) |
| 07:38 2026-10-21 | link PP BOM to UK-TOWLB-DES-XL-4SET-SUNBLVD | product.product-production.bom 478 | created | delete link |
| 07:38 2026-10-21 | UK-TOWLB-DES-XL-4SET-SUNBLVD: PP first (PP avail 20, threshold 3), BOM 479 | product.product-production.bom 478 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:38 2026-10-21 | UK-TOWLB-DES-XL-4SET-SUNBLVD: PP first (PP avail 20, threshold 3), BOM 284 | product.product-production.bom 284 | `sequence`: `None` -> `20` | set `sequence` back to `None` |
| 07:38 2026-10-21 | 1 x PP BOM for US-TOWLB-SUM-LG-6SET-RAINSHRS | production.bom 480 | created | archive BOM (active = false) |
| 07:38 2026-10-21 | link PP BOM to US-TOWLB-SUM-LG-6SET-RAINSHRS | product.product-production.bom 479 | created | delete link |
| 07:38 2026-10-21 | US-TOWLB-SUM-LG-6SET-RAINSHRS: PP first (PP avail 5, threshold 3), BOM 480 | product.product-production.bom 479 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:38 2026-10-21 | US-TOWLB-SUM-LG-6SET-RAINSHRS: PP first (PP avail 5, threshold 3), BOM 335 | product.product-production.bom 335 | `sequence`: `None` -> `20` | set `sequence` back to `None` |

## Run 2026-10-21_072000

| Time | What | Record | Change | Undo |
|---|---|---|---|---|
| 07:20 2026-10-21 | PP-TOWLB-CAB-LG-6SETI own BOM off (setup for UK-TOWLB-CAB-LG-6SETI) [backfilled] | production.bom 26 | `active`: `True` -> `False` | set `active` back to `True` |
| 07:20 2026-10-21 | 1 x PP BOM for UK-TOWLB-CAB-LG-6SETI [backfilled] | production.bom 440 | created | archive BOM (active = false) |
| 07:20 2026-10-21 | link PP BOM to UK-TOWLB-CAB-LG-6SETI [backfilled] | product.product-production.bom 439 | created | delete link |
| 07:20 2026-10-21 | UK-TOWLB-CAB-LG-6SETI: PP first (PP avail 187, threshold 3), BOM 440 [backfilled] | product.product-production.bom 439 | `sequence`: `20` -> `10` | set `sequence` back to `20` |
| 07:20 2026-10-21 | UK-TOWLB-CAB-LG-6SETI: PP first (PP avail 187, threshold 3), BOM 258 [backfilled] | product.product-production.bom 258 | `sequence`: `None` -> `20` | set `sequence` back to `None` |

