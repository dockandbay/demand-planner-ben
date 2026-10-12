# Customisation program: parked 11-Oct-26, open items

Status: **parked by Ben on 11-Oct-26, to resume later.** Still scoping. Nothing has been built in HORIZON, Shopify or Fulfil.

## Where things live
- **Scope Studio v26:** https://claude.ai/artifact/MVCzUZdRrWr15RJoDkrVw9
  - private to Ben; share it from the page's Share menu;
  - 13 pages: page 1 is the one-page Summary, page 6 is the AI design mockup;
  - shared votes, input and targets are kept in the artifact's database.
- **Earlier prototypes:** review hub https://claude.ai/artifact/QhefhEtQbjM1XgMtv27Zuu (it links the cost model, routing, design tool, identity/labels and portal).
- **Memory:** `customisation-program.md` holds the full decision log.

## Decided (through 11-Oct-26)
- **Target:** one total of £3m a year (personalisation + white label + logo) by Oct-28, from £828k today (x3.6).
- **Systems:**
  - Customiser (separate Vercel service, the Shopify design tool);
  - Fulfil is the order of record;
  - HORIZON supplier portal for all partners;
  - a custom schema in the production DB (Diviyaj to confirm).
- **Making:**
  - POs to suppliers every Tuesday, 1 week to make, 1 week by air: about 3 weeks to the customer;
  - margin QR scanned at a single stitch-and-pack station.
- **Pricing:**
  - one all-in price per towel on a volume curve, with no separate logo charge;
  - low minimums on beach and tea towels only;
  - white label fee 300 in the customer's currency, refundable on order.
- **Brand:** Dock & Bay on the back and care tag; white label on the care tag only.
- **Safety:** Claude reviews every upload; one human approval for each logo and white label design.
- **Logos (11-Oct):** PRINTED by default (no extra cost); EMBROIDERY is a paid add-on (China charges us US$0.50 a towel).
- **Duty (11-Oct):** not part of the route comparison, because it's paid on the towels either way. AU duty is 0%.
- **Weights (11-Oct):** packed Large 0.4 kg, XL 0.5 kg.
- **EU:** personalisation is not offered.

## China hub proposal (Ben, 11-Oct-26)
China makes in weekly batches, sends a DHL carton per market to the 3PL (Coghlans AU, ILG UK, Geneva US), and the 3PL posts locally.

**DHL rates (Ben):** include clearance, brokerage and delivery.

| Weight | Price |
|---|---|
| 1 kg | $30 |
| 3 kg | $60 |
| 20 kg+ | $12/kg |
| 100 kg+ | $9/kg |

4 to 19 kg costs are interpolated until real quotes arrive.

**Comparison per towel**

| Route | Today (local) | China + DHL | Verdict |
|---|---|---|---|
| AU, all (~11/week, 64% in Nov to Dec) | $25 | ~$7.40 | Switch: about $10k a year |
| UK logos (7,273/year) | Pinnacle up to £10 | ~£3.20 | Switch: up to about £49k a year |
| US logos (5,614/year) | TBC | ~$5.40 | Depends on the US local logo cost |
| UK names | ILG £3 | ~£3.20 | Stay local |
| US names | $3.50 | ~$5.40 | Stay local |
| Printed designs, occasions, small white label | China anyway | hub | Hub in all markets |

Business logo orders can go by DHL straight to the customer: about $5.40 a towel for 100, about $4.05 for 250.

## Open items
**Ben**
1. Approve the routing:
   - AU everything from China via a weekly DHL carton to Coghlans, removing the AU embroidery node (Alfa);
   - UK logos to China, with business orders by DHL direct to the customer;
   - US logos: decide once the US local logo cost is known;
   - printed designs, occasions and small white label through the hub.
2. Pinnacle's average cost per logo towel, and the US local logo cost.
3. Embroidery add-on price per market (suggested £2 / $2.50 / A$4).
4. AU label printing: Coghlans (recommended, addresses stay local) or China (cheaper, privacy notice needed).
5. AU Christmas cut-off (~1 Dec), or a second weekly batch in Nov and Dec. China holiday cut-offs (CNY, Golden Week 1 to 7 Oct).
6. Mistake policy for a wrong name or logo: refund, or a priority remake in the next batch.
7. Pinnacle is also our biggest logo reseller (£46k over 18 months). Handle the move of our own production with care.
8. MyDHL API access: put DHL_EXPRESS_USER, DHL_EXPRESS_PASS and DHL_EXPRESS_ACCOUNT (the import account) in `.env`. The current DHL_API_KEY is tracking only.
9. The custom terms draft (in chat on 11-Oct) goes to a lawyer for UK, AU and US review: whether the consumer indemnity can be enforced, and the AI copyright wording.
10. Studio summary page, approval boxes:
    - confirm items 1 to 6;
    - decide items 7 to 9: logo to towel with no limit; AI artwork credits (3 free, 10 for an email, then the cart; daily cap of about $50 with a gallery fallback); the image provider test.
11. Confirm the first 8 recipes in the AI design mockup.
12. Share the studio with the team.

**Diviyaj**
13. OK a new paid image-generation service, and confirm the custom schema in the production DB.

**Claude, when resumed**
14. Update the studio:
    - routing, cost model and decisions;
    - summary "How it runs" and pricing boxes;
    - a new "China hub and DHL" page;
    - the custom terms and tick box on Brand and safety.
15. Once credentials exist, a MyDHL quote tool (read only): China to AU, UK and US, 1 to 150 kg.
16. AI image provider test (3 to 4 providers, 20 prompts, tileable patterns), once an API key is available.
17. Test prints of AI and printed-logo designs on suede, with the supplier.

## Still open from 08-Oct (unchanged)
- Can Fulfil host the routing rules?
- Full print cost and supplier.
- Design team time per logo.
- Should personalised sales be their own demand channel?
- Who can release a towel that won't scan?
- AU white label price (ask Andy).
- Sea freight and EU duty for white label.
- TikTok order personalisation field check.
- Re-engagement list send from January 2027.

## Lead list (Ben, 13-Oct-26)
- Full contact list of customisation and white label enquiries: `~/Downloads/Custom_Inquiry_-_Shopify2026-10-12_18_22_01.xlsx` (Jotform "Custom Inquiry" export from Shopify). Personal data: keep it out of git and out of any published page.
- 825 enquiries, 757 unique emails, 778 with a company, Oct-21 to 09-Oct-26 (2022 156, 2023 179, 2024 175, 2025 187, 2026 122).
- Countries: US 470, UK 184, AU 68, CA 45, NZ 7, DE 6.
- Customisation type: Standard Logo 590, Logo and Text 123, White Label / Custom Design 67, Plain Text 27, None 18.
- Columns include desired delivery date, event yes/no, product link, size, quantities, pouches, polybags, care tags, hang tags: usable to seed the re-engagement list (from January 2027) and to size demand by type.
