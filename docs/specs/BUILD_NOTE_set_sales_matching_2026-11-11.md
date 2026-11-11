# BUILD FIX: set sales missing from HORIZON sales actuals since Fulfil go-live (11-Nov-26)

For the HORIZON build thread. Raised by Kathryn 10-Nov-26 ("Decision needed: Prepack or BOM for Getaway Glow sets, plus missing set sales in Horizon"); root cause confirmed read-only 11-Nov-26.

## Symptom
- Set units in planner.sales_actuals (all source = sheet_sync) collapse after each market's Fulfil go-live (AU 08-Sep-26, UK 29-Sep-26):
  UK all "%SET%" SKUs 3,379 (Jul) / 2,442 (Aug) / 1,661 (Sep) / 68 (Oct); AU 213 / 345 / 78 / 1.
- No market-prefixed set code (AU- / UK- / US- / EU-) appears anywhere in sales_actuals.
- planner.sales_actuals_fulfil (the new Fulfil import, v28.761) has 0 rows.

## Root cause
In Fulfil a set order is stored as:
- one **parent line** for the kit, on the market-prefixed code (e.g. AU-TOWLB-CAB-LG-4SETG, parent = null), and
- one **child line per component** (sale.line.parent = the kit line), e.g. TOWLB-CAB-LG-NAVY-R / GREEN-R / BLUE-R / PINK-R.

The sales feed keeps the child lines and drops the parent (its prefixed code matches no HORIZON SKU). So set sales are not lost, they are **counted as single-product sales**:
- AU, TOWLB-CAB-LG-NAVY-R, Oct-26: Fulfil = 70 sold as singles (dockandbay-au 45, Amazon.com.au 25) + 61 as set components (47 + 14). HORIZON = AU DTC 88 + AU FBA 43 = 131 = singles + components.
- AU-TOWLB-CAB-LG-4SETG Oct-26: 6 kit lines in Fulfil (SO56340, SO67000, SO67536, SO71079, SO72035, SO72218), 0 in HORIZON; their 24 component units sit in HORIZON as singles.
Effect: set demand / set forecasts / prepack plans understated; single-SKU demand overstated by the same component units; component totals roughly right.

## Fix
1. **Map kit codes:** a Fulfil sale line whose product code is market-prefixed (^(AU|UK|US|EU|CA)-) and is a kit (has a BOM / has child lines) maps to the plain HORIZON set SKU (strip the prefix; e.g. AU-TOWLB-CAB-LG-4SETG -> TOWLB-CAB-LG-4SETG). Check the stripped code exists in planner.products (or set_bom); unmatched -> flag, never drop silently.
   Getaway Glow: keep GIFT-BOX-HOME-<design>-SET (D2C kit) and GIFT-BOX-HOME-<design> (prepack, B2B) as separate SKUs; HORIZON already plans D2C on the -SET kits (Ben 11-Nov-26). Count the -SET parent line as the -SET sale and skip its child lines, like any kit.
2. **Count the parent, skip the children:** the set sale = the parent kit line's quantity and revenue; **exclude every line with parent set** (its components), so nothing is counted twice. Revenue sits on the parent; child lines usually carry 0 or split price: check, and keep revenue on the set.
3. **Apply in both feeds:** the current sheet_sync feed (wherever the sheet is built from Fulfil) and the new Fulfil import (sales_actuals_fulfil, v28.761) before it goes live.
4. **Backfill** from each market's go-live: AU 08-Sep-26, UK / EU / US 29-Sep-26 (confirm EU and US dates), to today; replace the affected months so singles drop by the component units and sets gain the kit units.
5. **Check (test):** for Oct-26, per market, HORIZON set units = Fulfil parent kit lines; HORIZON single units = Fulfil lines with parent null only. Spot-check AU TOWLB-CAB-LG-NAVY-R Oct (singles 70, set components 61 -> HORIZON singles should be 70, AU-TOWLB-CAB-LG-4SETG etc. carry the sets) and TOWLB-CAB-LG-4SETG / 4SETM AU (Fulfil Aug 8 / Sep 9 / Oct 6 and Aug 2 / Sep 9 / Oct 7).
6. **Buy-plan before / after** snapshot (memory: buy-plan-before-after) for set SKUs and their components, AU and UK.

## Also found
- AU B2B is missing from HORIZON for Oct-26: Fulfil "International Distributor (AU entity)" sold 240 TOWLB-CAB-LG-NAVY-R (Until Distribution, PO1940, invoice 2676, 21-Oct-26); sales_actuals has no AU B2B row for it. Check the AU B2B / distributor channel mapping in the feed (fulfil_channel_map).

## Context (not for this build)
Getaway Glow (Ben 11-Nov-26): D2C sells the -SET kits (Bohemian Daydream, Cherry Bomb, Seashell Soiree), B2B sells the prepacks, Cactus Mountain is prepack only. EU cannot build the kits (missing components) so EU D2C stays on prepacks. US Dillards surplus prepacks go to UK D2C when they arrive (about early December).
