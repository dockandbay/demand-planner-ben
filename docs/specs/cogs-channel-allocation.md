# COGS and SALES channel allocation (UK + AU): monthly Xero journals + weekly Airtable report

Draft for Ben's review, 04-Nov-26. Nothing built yet.

## Why
Fulfil books every sale's cost of goods to ONE generic account, 9006 "Fulfil - Cost of Goods Sold Account" (on invoicing; 9011 Inventory Shipped Not Invoiced in between). Since 01-Oct-26 that reaches Xero, so Xero shows all COGS in one line instead of by channel. We already split September by hand (`fulfil-accounting-transition/working files/cogs_sep_analysis.py`, 14-Oct-26); this makes it automatic every month for UK (company 1, GBP) and AU (company 3, AUD).

## What it does
1. **Channel allocation report**: for a month, every Fulfil shipment to a customer, costed (qty x move cost price, company currency), grouped by sales channel / segment / delivery country, mapped to the channel COGS account.
2. **Month-end journal in Xero, per org**: dated the last day of the month. UK: DRAFT (Pooja / Harry post it, as with the Faire VAT journal). AU: POSTED as approved, Alex emailed (Ben 04-Nov-26):
   - Dr each channel COGS account (311.x UK; 311.8x / 401.x AU) with its share
   - Cr 9006 Fulfil - Cost of Goods Sold Account (exists in both orgs), same total
   - Reference `HORIZON COGS by channel YYYY-MM`, narration lists the source (Fulfil shipments, run date).
3. **Refresh on the 7th and 15th** of the following month (late invoices, returns, cost corrections):
   - draft still a DRAFT: rebuild it in place (same journal, new lines);
   - already POSTED: never touched; a "top-up" journal for the difference only (UK draft, AU posted). No email on refreshes.
4. **Weekly to Airtable** (Ben 04-Nov-26): this is the existing COGS page "Email to Airtable" (per-SKU unit cost, cogs-up-IMPORT.csv), run automatically by n8n every Monday. Built in v28.696 as `/api/cron/cogs-airtable`; it does not depend on the journal work.

## Source and method (same as September)
- Fulfil `stock.move` done, from a warehouse to a customer location, effective date in the month; COGS = quantity x cost_price (company currency).
- Sale order on the move: `channel`, `channel_segment`, delivery country.
- Customer returns (customer to warehouse): negative COGS on the same channel.
- Excluded: internal moves (3PL to FBA, transfers, China Port intake), supplier returns, stock counts.
- Zero-cost lines: costed from HORIZON `products.cost` (USD, converted at Fulfil's rate) and flagged, as in September. Credit for that part goes to 9008 Fulfil - Inventory Account, not 9006 (it was never in 9006).
- Reconciliation: the report total must match the movement on Fulfil 9006 for the month within 0.5% (September tied to 0.41 GBP). If it does not, the journal is still drafted but the email and Airtable row carry a "does not reconcile" flag with both totals.

## Channel to account (Ben's September mapping)
| Fulfil channel / segment | Xero account |
|---|---|
| Shopify UK (web, draft orders) | 311.1a COGS - UK - Shopify |
| Shopify UK segment tiktok | 311.1d COGS - UK - Marketplace |
| Amazon.co.uk | 311.1b COGS - UK - Amazon |
| UK wholesale (dockandbay-uk-ws) | 311.1c COGS - UK - Wholesale |
| Faire UK | 311.1e COGS - UK - Faire |
| Shopify US | 311.2a COGS - US - Shopify |
| Amazon.com | 311.2b COGS - US - Amazon |
| US wholesale (incl. 5039991 Shopify B2B) | 311.2c COGS - US - Wholesale; shipped outside the US: 311.5c International Distributors |
| Faire US | 311.2e COGS - US - Faire |
| Shopify EU | 311.3a COGS - EU - Shopify; segment Zalando: 311.5d COGS - EU - Zalando |
| EU wholesale | FR 311.3b, DE 311.3d, others 311.3c |
| Amazon.de / .fr / .it / .es | 311.3e / 311.3g / 311.3f / 311.3h |
| Amazon.ca | 311.4b COGS - CA - Amazon (the only Canadian sales channel; an order shipped from the UK to a Canadian address stays on its own channel's account) |
| Shopify AU | 311.8a COGS - AU - Shopify |
| Amazon.com.au | 311.8b COGS - AU - Amazon |
| AU wholesale & distributors | 401.5 COGS - AU - Wholesale & Distributor |
| TikTok AU / other AU marketplaces | 401.6 COGS - AU - Marketplace |
| AU custom / co-brand orders | 401.11e COGS - Custom / Co Brand - AU |
| AU custom local, sold direct | 401.10e COGS - Custom Local - D2C - AU |
| Anything else in AU | 311.8d COGS - AU - Other |
| Custom / co-brand sale (any channel) | UK org: 311.9a UK / 311.9b US / 311.9c CA / 311.9d EU / 311.9e ROTW; AU org: 401.11e (401.10e custom local D2C) |
| Dropship | not used |
| A channel not in this table | not guessed: listed as "unmapped", held out of the journal, flagged in the email |

The mapping lives in one HORIZON table so a new channel is added without code.

## SALES journal (Ben 05-Nov-26: "the exact same split but to the mapped SALES channels ... created and sent at the same time as the cogs journal, in the same email")
Fulfil books every sale's revenue to generic accounts that reach Xero as single lines (both companies): **9002 Fulfil - Revenue Account**, 9003 Contra Revenue (returns / credit notes), 9004 Shipping Revenue, 9005 Sales Discount.
- Same source and split as COGS: the month's posted Fulfil customer invoices and credit notes by sale channel / segment / delivery country, the same custom / co-brand rule and the same "unmapped = held out and flagged" rule.
- Journal per org, same date, reference `HORIZON SALES by channel YYYY-MM`: Dr 9002 (and Dr 9003 for credit notes) / Cr each channel's sales account (net product revenue, ex tax).
- Same status rules as COGS (UK draft for Pooja and Harry; AU posted as approved), same 7th / 15th refreshes and top-ups, same journal log on the COGS page (each run shows both journals).
- Reconciliation: the report total must match the month's movement on 9002 (+ 9003) within 0.5%, else flagged.
- **One email** at month end per org carrying both journals (COGS and SALES), their totals, Xero links and any flags.

### Channel to SALES account (Ben's mapping file "3PL INVOICE ACCOUNTING - MAPPING", validated against the COGS table above, 05-Nov-26)
| COGS account | SALES account |
|---|---|
| 311.1a UK Shopify | 200a Sales - UK - Shopify |
| 311.1b UK Amazon | 201a Sales - UK - Amazon |
| 311.1c UK Wholesale | 210.5a Sales - UK - Wholesale |
| 311.1d UK Marketplace (TikTok) | 202a Sales - UK - Marketplace |
| 311.1e UK Faire | 212a Sales - UK - Faire |
| 311.2a US Shopify | 200b Sales - US - Shopify |
| 311.2b US Amazon | 201b Sales - US - Amazon |
| 311.2c US Wholesale | 210.5b Sales - US - Wholesale |
| 311.2d US Marketplace | 202b Sales - US - Marketplace |
| 311.2e US Faire | 212b Sales - US - Faire |
| 311.2f US Walmart | 202.3b Sales - US - Walmart (Walmart was missing from the COGS table: added) |
| 311.3a EU Shopify | 200d Sales - EU - Shopify |
| 311.5d EU Zalando | 202.3c Sales - EU - Zalando |
| 311.3b FR / 311.3d DE / 311.3c other EU Wholesale | 210.5f / 210.5e / 210.5d |
| 311.3e DE / 311.3g FR / 311.3f IT / 311.3h ES Amazon | 201e / 201f / 201g / 201h |
| 311.4b CA Amazon | 201c Sales - CA - Amazon |
| 311.5c International Distributors | 210.7z Sales - International Distributors |
| 311.5g International Distributors (Co Brand) | 210.7y Sales - International Distributors (Co Brand) |
| 311.9a UK / 311.9b US / 311.9c CA / 311.9d EU / 311.9e ROTW Co-Brand/Custom | 210.6a / 210.6b / 210.6c / 210.6d / 210.6e |
| Dropship 311.10a-d | 203a / 203b / 203d / 202e (not used: nothing goes to dropship) |

**AU org (read from live Xero AU 05-Nov-26):** Shopify AU 311.8a -> 200e Sales - Shopify - AU; Amazon AU 311.8b -> 201e Sales - Amazon - AU; Wholesale & Distributor 401.5 -> 210e Sales - Wholesale - AU; Marketplace / TikTok AU 401.6 -> **212e Sales - Marketplace - AU** (Ben: TikTok AU = marketplace); Custom / Co-Brand 401.11e -> **200f Sales - Custom/Co Brand - AU** (exists, nothing to create); Custom Local D2C 401.10e -> no sales account yet (open); anything else 311.8d -> no "Sales - AU - Other" (nearest 200z Sales - Shopify - ROW; open).

Validation result: every UK-org pair in the file matches the COGS table. The file is marked NOT IN USE and its **AU** section is out of date: it uses COGS 401.3 / 401.4 / 401.9, which do not exist in Xero AU (Ben confirmed 311.8a / 311.8b / 311.8d on 04-Nov-26). Its AU sales accounts (200e Shopify, 201e Amazon, 210e Wholesale & Distributor, 200z Other/ROW) are to be read back from Xero AU at build time, and it has **no AU sales account** for Marketplace (TikTok AU, COGS 401.6) or Custom / Co-Brand (COGS 401.11e / 401.10e): see question 7.

## Schedule (n8n, Europe/London)
| When | What |
|---|---|
| Every Monday 07:00 | COGS per-SKU unit cost emailed to Airtable (same as the COGS page button) |
| 1st of the month 06:30 | Build last month, create the COGS and SALES journals UK + AU, ONE email per org with both |
| 7th 06:30 | Refresh last month (rebuild draft, or top-up draft if posted) |
| 15th 06:30 | Final refresh, same rules; after this the month is closed in HORIZON |

Each n8n flow only calls a HORIZON cron route (`/api/cron/cogs-channel`, secret-gated); the logic, Fulfil reads and Xero writes live in HORIZON so the same run can be done by hand from ACCOUNTS (Preview / Create draft / Refresh) with the same numbers.

## Journal log on the COGS page (Ben 04-Nov-26)
BUY & MOVE > Inventory > COGS gets a "Journal log": every journal HORIZON creates, grouped by month and org, so each month-end journal sits with its refreshes:
- Group header: e.g. "October 2026 · UK" with the month's final COGS total, status (draft / posted) and whether it reconciles to 9006.
- Rows inside: Month end (1st), Refresh 7th, Refresh 15th; each with run date and who / which flow ran it, what it did (created draft / rebuilt draft / posted / top-up / no change), journal total and the change vs the previous run, status in Xero (draft / posted, read back), and the Xero link.
- A row expands to its journal lines (account, debit, credit) and the flagged zero-cost and unmapped lines.
- Kept for ever (one table, runs never deleted); newest month first.

## Where it shows in HORIZON
ACCOUNTS > COGS by channel: month picker, UK / AU, table by channel and account with qty / COGS / share, reconciliation line vs 9006, unmapped lines, zero-cost fills, journal status (none / draft / posted, with the Xero link) and run history.

## Rules it follows
- Nothing before 01-Oct-26 (Fulfil GL did not reach Xero before then); September stays the manual journal already done.
- UK: draft only, Ascendant post. AU: HORIZON posts (approved) and emails Pillar (Ben's explicit instruction 04-Nov-26).
- Xero API calls share live's 1,000/day limit: a full run is about 4 calls per org.
- Read-only on Fulfil.

## Questions for Ben
1. **Credit account**: confirm the Xero account Fulfil's 9006 maps to in each org (UK and AU) is the one to credit.
2. ~~AU accounts~~ CONFIRMED by Ben 04-Nov-26 (read live from Xero AU): 311.8a Shopify, 311.8b Amazon, 401.5 Wholesale & Distributor, 401.6 Marketplace, 401.11e Custom / Co Brand, 401.10e Custom Local D2C, 311.8d Other; credit 9006. The 405.x "Cost of Sales" accounts are fees, not used. The September codes 401.3 / 401.4 / 401.9 do not exist in Xero AU.
2b. **UK accounts**: checked 04-Nov-26, every code in the table exists in Xero UK with that name, and 9006 too.
2c. ~~Co-brand / dropship~~ answered by Ben 04-Nov-26: custom / co-brand sales DO go to the Co-Brand/Custom COGS accounts (UK org: 311.9a UK, 311.9b US, 311.9c CA, 311.9d EU, 311.9e ROTW by where the sale is; AU org: 401.11e, and 401.10e for custom local D2C). NOTHING goes to the Dropship accounts (311.10a-d). How a sale is recognised as custom / co-brand (sale channel or segment, custom SKUs, the HORIZON custom order link) is settled from live Fulfil data at build time and shown to Ben before the first journal.
3. ~~Airtable~~ answered: the existing COGS "Email to Airtable", weekly via n8n (v28.696).
4. ~~Zero-cost lines~~ answered by Ben 04-Nov-26: keep the September treatment. Lines Fulfil shipped at cost 0 are costed from HORIZON products.cost (USD, converted at Fulfil's month rate) and flagged; that part is credited to 9008 Fulfil - Inventory Account (September used UK 601 / AU 625 because Fulfil's GL did not reach Xero then; from October the stock sits in 9008). The email lists those lines so the cost can be fixed in Fulfil.
5. ~~Email~~ answered by Ben 04-Nov-26:
   - UK: journal created as a DRAFT; month-end email to Pooja and Harry (Ascendant), who post it.
   - AU: journal created POSTED (approved) in Xero AU by HORIZON; Alex (Pillar) is emailed that it is posted.
   - 7th / 15th refreshes: UK draft rebuilt (or a top-up draft if already posted); AU gets a posted top-up journal for the difference only (a posted journal is never edited). NO emails on refreshes (Ben 04-Nov-26); the result shows in HORIZON ACCOUNTS > COGS by channel.
6. ~~CA~~ answered by Ben 04-Nov-26: Canadian sales are Amazon Canada only (311.4b). 311.4a / 311.4c are not used; a UK order shipped to Canada stays on its channel's account. International distributors: 311.5c (311.5g if co-brand).
7. ~~AU Marketplace / Custom~~ answered 05-Nov-26: TikTok AU -> 212e, Custom / Co-Brand -> 200f (both exist in Xero AU). Still open: Custom Local D2C sales (200f, or a new "Sales - Custom Local - D2C - AU"?), AU "Other" sales (200z, or a new "Sales - AU - Other"?), and shipping revenue (9004) / discounts (9005): leave in their Fulfil accounts, or split by channel too?
