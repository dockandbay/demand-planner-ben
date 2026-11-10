# Note: Fulfil sale lines with no SKU (to explore later)

Ben 10-Nov-26: "write me up a note to explore this after". Read-only data warehouse check, live channels only, not cancelled.

## What they are
| Channel | Lines | Units | Amount | Zero-amount lines | Dates | Mostly |
|---|---|---|---|---|---|---|
| Amazon.de | 1,037 | 1,038 | EUR 2,055 | 654 | 01-Jul-26 to 20-Sep-26 | Amazon Shipping and Handling, Giftwrap; some real towels / totes |
| Amazon.com | 595 | 648 | USD 27,989 | 1 | 23-Jun-26 to 21-Sep-26 | Real products (beach towels, totes, dry bags) |
| Amazon.fr | 265 | 266 | EUR 436 | 234 | Jul to Sep-26 | Shipping and Handling, Giftwrap |
| Amazon.es / .it | 233 / 196 | 233 / 196 | EUR 192 / 99 | 210 / 183 | Jul to Sep-26 | Shipping and Handling only |
| Amazon.com.au | 106 | 110 | AUD 5,306 | 0 | Aug to Sep-26 | Real products |
| dockandbay-eu-ws | 91 | 91 | EUR 946 | 65 | Jun to Sep-26 | Collection, labels, POS refills, shipping |
| Amazon.co.uk, dockandbay-uk, -eu, others | about 60 | | small | | Jun to Sep-26 | Real products, gift boxes, POS |

## What it means
- Most no-SKU lines are not products (Amazon shipping and handling, giftwrap, POS, labels). The import drops them as non-merch.
- The real product lines are mainly **Amazon.com (595 lines, about USD 28k)** and **Amazon.com.au (106 lines, AUD 5.3k)**: lost units until mapped.
- **The listing SKU is almost never filled** on these lines (Amazon.de 0 of 1,037, Amazon.com 1 of 595), so a "listing SKU fallback" will not recover them. Only the Amazon product title is there.
- **Nothing after 21-Sep-26.** Looks like a channel onboarding gap (unmapped Amazon listings) that has since been fixed, not an ongoing leak.

## Options to explore
1. Ask Diviyaj: were these listings mapped later, and can Fulfil re-link the old lines to products (best: fixes the source).
2. In the import, map by Amazon title to a HORIZON SKU (a title -> SKU table built once from the products' Amazon titles / ASINs); unmatched lines show as `no_sku` anomalies.
3. Accept the loss: about 0.9% of Amazon.com units for Jun to Sep-26.

Recommendation: 1 first; 2 only if Fulfil cannot re-link.
