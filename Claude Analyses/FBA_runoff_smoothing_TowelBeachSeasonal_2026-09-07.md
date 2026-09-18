# FBA run-off smoothing, Towel - Beach SEASONAL, UK + US FBA, Sep to Nov 2026 (proposal, 07-Sep-26)

**Why.** Discontinued seasonal SKUs with 3PL stock but little or no FBA stock were locked to 0 on their FBA rows by the
run-off rule (FBA pool only; fixed in v27.527, not yet live). Ben's smoothing sweep on 07-Sep saved every eligible SKU,
but the engine rescaled from those zeros, so the SKUs holding FBA stock took the whole sub-category gap and the low-FBA
SKUs got 0 or 1.

**Method (read-only SQL on live, planner schema).**
- Target per country x month = sub-category LY FBA actual (same month 2025, all SKUs) x (1 + growth from forecast_inputs).
- "Other" SKUs (not eligible) keep their current forecast: saved override if present, else LY same-month actual.
- Pool for eligible SKUs = target minus other. Eligible = in scope, available on that country's FBA, discontinue_date_final
  before today, 3PL stock > 0 (28 UK, 41 US SKUs; includes SETs).
- Pool split across eligible SKUs in proportion to their Jun to Aug 2026 FBA units (recent run-rate); per-SKU 3-month total
  capped at 3PL + FBA (+AWD for US) stock; SKUs with zero recent FBA sales get 0.

| Country | Month | LY sub-cat FBA | Growth | Target | Other SKUs | Pool for eligible | Eligible saved today |
|---|---|---|---|---|---|---|---|
| UK | Sep-26 | 716 | +50% | 1,074 | 682 | 392 | 393 |
| UK | Oct-26 | 383 | +50% | 575 | 483 | 92 | 92 |
| UK | Nov-26 | 824 | +100% | 1,648 | 1,282 | 366 | 366 |
| US | Sep-26 | 159 | +100% | 318 | 121 | 197 | 193 |
| US | Oct-26 | 192 | +50% | 288 | 187 | 101 | 81 |
| US | Nov-26 | 504 | +50% | 756 | 474 | 282 | 232 |

UK totals are unchanged by the redistribution (pool = what is saved today); US gains 4 / 20 / 50 units to reach target.

**Biggest moves (Sep / Oct / Nov):** UK XL-SWTESC 0/0/0 -> 27/6/25; UK XL-KARMA 1/0/0 -> 26/6/24; UK COLLAB-XL-UNO 0/0/0 -> 22/5/21;
UK COLLAB-LG-UNO 0/0/0 -> 19/5/18; UK KID-LG-SKATER 0 -> 9/2/9; UK XL-GRECSHR 81/19/54 -> 40/9/37; UK LG-GRECSHR 55/13/74 -> 30/7/28;
US XL-GRECSHR 0 -> 14/7/20; US KID-LG-CHECKOUT 0 -> 8/4/12; US LG-WTRSUG 25/11/29 -> 15/8/21.

**Write (only after Ben confirms):** upsert into planner.forecast_outputs (sku, warehouse uk_fba / us_fba, channel FBA, month,
units, source, updated_at) for the eligible SKU x month rows, computed by the same CTE at write time (INSERT ... SELECT), so
nothing is transcribed by hand. Source tag distinguishes the script from UI edits.

**Caveats.** (1) Until v27.527 is live the plan still shows these FBA rows locked to 0 for SKUs whose FBA stock is exhausted;
the saved values become visible when Diviyaj deploys. (2) Sets are treated as their own FBA SKUs (they hold FBA stock).
(3) Sep-26 actuals are not loaded yet (sales lag), so Sep is a full-month forecast. (4) Live DB writes normally go through Diviyaj.

## WRITTEN to live, 07-Sep-26 (Ben: "write it and ensure we can roll back")
- Backup first: `planner.forecast_outputs_bak_20260907_fba_smooth` (567 rows, whole sub-category FBA Sep to Nov UK/US).
- Upsert: 207 rows, source `script_fba_smooth_2026-09-07`. Result vs target: UK 1,072 / 574 / 1,649 vs 1,074 / 575 / 1,648; US 316 / 289 / 757 vs 318 / 288 / 756 (all within 1%).
- Rollback script: `deploy notes/rollbacks/ROLLBACK_2026-09-07_fba_smooth_towel_beach_seasonal.sql` (restores from the backup table; previous values also listed inline).
