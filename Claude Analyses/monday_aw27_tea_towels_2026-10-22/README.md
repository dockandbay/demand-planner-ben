# AW27 tea towels: monday.com → HORIZON PRODUCT (sandbox import, 22-Oct-26)

Source: monday board 8740719024 "Supplier - Lixin", group AW27, item "Tea Towels" (20 designs = subitems), read-only via the monday connector.
Target: SANDBOX only (the script refuses to run against the live database). Ben approved the matching on 22-Oct-26; requests start as Draft.

## Matching (monday design → HORIZON item)
| monday | HORIZON |
|---|---|
| Retro Super Market Foods Blue / Foods Pink / Check / Basket | AW27-TEATO-PANTRYPARTY (Pantry Party) |
| Duo Blue/Green Stripe | TEATWL-MD-KIWCOOL (Kiwi Cooler) |
| Duo Pink/Yellow Stripe | TEATWL-MD-RASPRIPLE (Raspberry Ripple) |
| Garden Prep Tomatoes Red / Blue | TEATWL-MD-HOTVIN (Hot Off The Vine) |
| Hot Stuff | AW27-TEATO-TOOHOTTOHANDLE (Too Hot To Handle) |
| Matcha Bowl Green / Green-Purple | TEATWL-MD-MATCLB (Morning Matcha Club) |
| Sunday Brunch | TEATWL-MD-BRNCHC (Brunch Club) |
| Asparagus Treetop / Juniper Green | TEATWL-MD-GUDGRW (Good To Grow) |
| Duo Blue/Green Check | NEW AW27-TEATO-DUOBLUGRNCHK |
| Duo Pink/Yellow Check | NEW AW27-TEATO-DUOPNKYELCHK |
| Neon Check Red / Pink | NEW AW27-TEATO-NEONCHKRED / -NEONCHKPINK |
| Green/Pink Stripe, Green/Blue Stripe | NEW AW27-TEATO-GRNPNKSTRIPE / -GRNBLUSTRIPE |
| (HORIZON only) | AW27-TEATO-CHRISTMAS (copied with its Lixin request) |

## What is created (per item)
- The item (the 9 live ones copied with the same refs and fields; 6 new). Component "Core Product" (Lixin).
- One Lixin development request `<ref>-LX`, send_status draft, stage sample_in_review when any design is In Review else sample_development, dev_start = first monday creation date, recipients UK (UK,AU where the brief says UK and AUS).
- One sample version per design with a monday 1st-sample date (version order = date, then name), received on that date when monday says In Review. Asparagus ×2 have no monday date but the thread shows they came in the 12-Oct DHL parcel (55 5591 5875) and Libby confirmed 20-Oct: recorded as sample 12-Oct, received 20-Oct.
- Every monday update and reply on the timeline: "[monday · DESIGN] text (monday #id)", original author (Sofia / Libby internal, Jack supplier) and time, already read.

Result 22-Oct-26 (sandbox): 15 items, 15 components, 15 requests, 16 sample versions, 40 notes. Re-run adds nothing (keys: item/request ref, "(monday #id)").

Run: `NODE_PATH=$PWD/node_modules node "Claude Analyses/monday_aw27_tea_towels_2026-10-22/tt_import.cjs" "Claude Analyses/monday_aw27_tea_towels_2026-10-22/tt_data.json" [--dry]`
Live: not run. Pointing it at live needs Ben's go-ahead (and the live items already exist, so only requests / samples / notes would be added).
