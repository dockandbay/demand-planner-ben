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
4. **Weekly to Airtable**: month to date (and the previous month until its 15th refresh), one row per org x month x channel x account: qty, COGS (company currency), COGS in GBP, share %, and the Fulfil 9006 total it reconciles to.

## Source and method (same as September)
- Fulfil `stock.move` done, from a warehouse to a customer location, effective date in the month; COGS = quantity x cost_price (company currency).
- Sale order on the move: `channel`, `channel_segment`, delivery country.
- Customer returns (customer to warehouse): negative COGS on the same channel.
- Excluded: internal moves (3PL to FBA, transfers, China Port intake), supplier returns, stock counts.
- Zero-cost lines: costed from HORIZON `products.cost` (USD, converted at Fulfil's rate) and flagged, as in September. Credit for that part goes to Inventory, not 9006 (it was never in 9006). Open question 4.
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
| Shopify CA / Amazon.ca / CA wholesale | 311.4a / 311.4b / 311.4c |
| Shopify AU | 311.8a COGS - AU - Shopify |
| Amazon.com.au | 311.8b COGS - AU - Amazon |
| AU wholesale & distributors | 401.5 COGS - AU - Wholesale & Distributor |
| TikTok AU / other AU marketplaces | 401.6 COGS - AU - Marketplace |
| AU custom / co-brand orders | 401.11e COGS - Custom / Co Brand - AU |
| AU custom local, sold direct | 401.10e COGS - Custom Local - D2C - AU |
| Anything else in AU | 311.8d COGS - AU - Other |
| A channel not in this table | not guessed: listed as "unmapped", held out of the journal, flagged in the email |

The mapping lives in one HORIZON table so a new channel is added without code.

## Schedule (n8n, Europe/London)
| When | What |
|---|---|
| Every Monday 07:00 | Report month to date (+ previous month until its 15th) to Airtable |
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
2b. **UK accounts**: to be checked against Xero UK the same way before building.
3. **Airtable**: which base and table should the weekly rows go to (new table "COGS by channel", or an existing one)?
4. **Zero-cost lines**: keep the September treatment (cost from HORIZON, credit Inventory), or leave them out and only flag them?
5. **Email**: who gets the month-end and refresh emails (Ben + Sarah, and the accountants Harry / Pooja for UK, Alex for AU)?
6. **CA and international**: UK company sales to Canada and distributors use the 311.4x / 311.5c accounts as above, right?
