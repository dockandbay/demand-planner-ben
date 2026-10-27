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

## Design PDFs (22-Oct-26, sandbox)
`tt_files.cjs` copies each design PDF from monday (asset → 1-hour signed link from the monday connector's get_assets, put in column 7 of the TSV at run time; links are not kept in the repo) into Supabase Storage (bucket horizon-uploads, `product/<yyyy-mm>/<uuid>-<name>`) and `planner.portal_attachments` (category 'product', po = product ref, uploaded_by "monday import (<who>)", uploaded_at = monday upload time), and links it as the attachment of the timeline note it was posted with.
Result: 18 PDFs uploaded (0.2 to 39 MB), 18 notes linked. The two Garden Prep Tomatoes PDFs (217 MB each) exceed the 50 MB storage limit, so Hot Off The Vine got a timeline note pointing to them on monday instead. `tt_assets_manifest.tsv` lists the assets (no links). Checked: /api/product/doc/<id> serves the PDF.

## Fix 23-Oct-26 (Ben: duplicated / wrong comments, same-date versions)
- Pantry Party's swatch is the pink retro groceries print, so only RETRO SUPER MARKET FOODS PINK + FOODS BLUE (its colourway) belong to it. RETRO SUPER MARKET CHECK and BASKET are now their own items: AW27-TEATO-RETROCHECK and AW27-TEATO-RETROBASKET (each with a Draft Lixin request and its own PDF).
- Sample versions: one per sample date per item, colourways listed together (Pantry Party, Hot Off The Vine, Morning Matcha Club, Good To Grow each had 2 to 4 same-date versions; now 1).
- Timeline: a message posted on two colourways of one item (same author, same text apart from the PDF name) is one note naming both designs and listing both PDFs.
- `tt_fix_2026-10-23.cjs` (sandbox only) cleared the old samples / notes of those 4 items and moved the 2 PDFs; then tt_import.cjs + tt_files.cjs were re-run. Sandbox now: 17 items, 17 requests, 12 sample versions. For live, only the fixed tt_import.cjs + tt_files.cjs are needed (no fix script).

## LIVE 27-Oct-26 (Ben: "you can push monday data into live after the next commit", after v28.520)
- The live write connection string was refused (password) and the LIVE_DATABASE_URL role may not insert into PRODUCT tables, so the import ran through the Supabase connection as SQL made by `tt_live_sql.cjs` from tt_data.json (same logic as tt_import.cjs; every row looked up by ref and guarded, so a re-run adds nothing), in 4 chunks, each one all-or-nothing DO block. The generated SQL is not kept in git (it holds the monday message text); regenerate with `node tt_live_sql.cjs tt_data.json > tt_live.sql`.
- Checked first: the sandbox already holds all of it, and the SQL run there inside a rolled-back transaction added 0 rows.
- Live before → after: items 9 → 17, Lixin requests 1 → 17 (all Draft), sample versions 0 → 12, monday notes 0 → 32, components 3 → 19. No duplicate sample dates, no duplicate notes, all notes read.
- The monday board was re-read 27-Oct-26: no 2nd+ sample dates and no changes since tt_data.json (23-Oct).
- NOT done on live: the design PDFs (tt_files.cjs). It needs live Supabase storage (URL + service role key of the live project), not in .env. Once added, run tt_files.cjs against live; it uploads the PDFs and links them to these notes.
- tt_import.cjs now also accepts `--live` with TT_LIVE_OK=1 (refuses otherwise).
