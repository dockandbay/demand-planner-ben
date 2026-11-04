# COGS channel allocation (UK + AU): monthly Xero journal + weekly Airtable report

Draft for Ben's review, 04-Nov-26. Nothing built yet.

## Why
Fulfil books every sale's cost of goods to ONE generic account, 9006 "Fulfil - Cost of Goods Sold Account" (on invoicing; 9011 Inventory Shipped Not Invoiced in between). Since 01-Oct-26 that reaches Xero, so Xero shows all COGS in one line instead of by channel. We already split September by hand (`fulfil-accounting-transition/working files/cogs_sep_analysis.py`, 14-Oct-26); this makes it automatic every month for UK (company 1, GBP) and AU (company 3, AUD).

## What it does
1. **Channel allocation report**: for a month, every Fulfil shipment to a customer, costed (qty x move cost price, company currency), grouped by sales channel / segment / delivery country, mapped to the channel COGS account.
2. **Month-end journal in Xero, per org**: dated the last day of the month, DRAFT only (the accountants post it, as with the Faire VAT journal):
   - Dr each channel COGS account (311.x UK; 311.8x / 401.x AU) with its share
   - Cr 9006 Fulfil - Cost of Goods Sold Account (exists in both orgs), same total
   - Reference `HORIZON COGS by channel YYYY-MM`, narration lists the source (Fulfil shipments, run date).
3. **Refresh on the 7th and 15th** of the following month (late invoices, returns, cost corrections):
   - draft still a DRAFT: rebuild it in place (same journal, new lines);
   - already POSTED by the accountants: never touched; a second DRAFT "top-up" journal for the difference only, and an email saying so.
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

## Schedule (n8n, Europe/London)
| When | What |
|---|---|
| Every Monday 07:00 | COGS per-SKU unit cost emailed to Airtable (same as the COGS page button) |
| 1st of the month 06:30 | Build last month, create the DRAFT journal UK + AU, email the Xero links |
| 7th 06:30 | Refresh last month (rebuild draft, or top-up draft if posted) |
| 15th 06:30 | Final refresh, same rules; after this the month is closed in HORIZON |

Each n8n flow only calls a HORIZON cron route (`/api/cron/cogs-channel`, secret-gated); the logic, Fulfil reads and Xero writes live in HORIZON so the same run can be done by hand from ACCOUNTS (Preview / Create draft / Refresh) with the same numbers.

## Where it shows in HORIZON
ACCOUNTS > COGS by channel: month picker, UK / AU, table by channel and account with qty / COGS / share, reconciliation line vs 9006, unmapped lines, zero-cost fills, journal status (none / draft / posted, with the Xero link) and run history.

## Rules it follows
- Nothing before 01-Oct-26 (Fulfil GL did not reach Xero before then); September stays the manual journal already done.
- Draft journals only; the accountants post (Ascendant UK, Pillar AU).
- Xero API calls share live's 1,000/day limit: a full run is about 4 calls per org.
- Read-only on Fulfil.

## Questions for Ben
1. **Credit account**: confirm the Xero account Fulfil's 9006 maps to in each org (UK and AU) is the one to credit.
2. ~~AU accounts~~ CONFIRMED by Ben 04-Nov-26 (read live from Xero AU): 311.8a Shopify, 311.8b Amazon, 401.5 Wholesale & Distributor, 401.6 Marketplace, 401.11e Custom / Co Brand, 401.10e Custom Local D2C, 311.8d Other; credit 9006. The 405.x "Cost of Sales" accounts are fees, not used. The September codes 401.3 / 401.4 / 401.9 do not exist in Xero AU.
2b. **UK accounts**: checked 04-Nov-26, every code in the table exists in Xero UK with that name, and 9006 too.
2c. ~~Co-brand / dropship~~ answered by Ben 04-Nov-26: custom / co-brand sales DO go to the Co-Brand/Custom COGS accounts (UK org: 311.9a UK, 311.9b US, 311.9c CA, 311.9d EU, 311.9e ROTW by where the sale is; AU org: 401.11e, and 401.10e for custom local D2C). NOTHING goes to the Dropship accounts (311.10a-d). How a sale is recognised as custom / co-brand (sale channel or segment, custom SKUs, the HORIZON custom order link) is settled from live Fulfil data at build time and shown to Ben before the first journal.
3. ~~Airtable~~ answered: the existing COGS "Email to Airtable", weekly via n8n (v28.696).
4. ~~Zero-cost lines~~ answered by Ben 04-Nov-26: keep the September treatment. Lines Fulfil shipped at cost 0 are costed from HORIZON products.cost (USD, converted at Fulfil's month rate) and flagged; that part is credited to 9008 Fulfil - Inventory Account (September used UK 601 / AU 625 because Fulfil's GL did not reach Xero then; from October the stock sits in 9008). The email lists those lines so the cost can be fixed in Fulfil.
5. **Email**: who gets the month-end and refresh emails (Ben + Sarah, and the accountants Harry / Pooja for UK, Alex for AU)?
6. ~~CA~~ answered by Ben 04-Nov-26: Canadian sales are Amazon Canada only (311.4b). 311.4a / 311.4c are not used; a UK order shipped to Canada stays on its channel's account. International distributors: 311.5c (311.5g if co-brand).
