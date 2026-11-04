# ACCOUNTS > Reconcile > Money in: matching rules (v2)

Status 05-Nov-26: spec, not built. Source: Money in deep dive on live, 04-Nov-26 (70 open lines, 34 in scope; current matcher 0 of 34 right, these rules 29 of 34).
Builds on v28.607 (customer receipts auto-match) and keeps its limits: AU out, Shopify "Mark as paid" is all or nothing, key accounts / distributors / custom are invoiced and paid in Xero.

## Rules (run in this order, first hit wins)
1. **R3 Already recorded in Xero.** Unreconciled Xero payments and bank transactions for the line's account, from the earliest line date minus 7 days. Match on Stripe `pi_`/`ch_` id, then same account + amount within 5 days. Already reconciled in Xero = "reconciled since your last upload". Blocks any Shopify Reconcile on that line. Xero reads cached 15 min.
2. **R1 Own-account transfers.** Opposite amount on another of our accounts within 3 days AND text evidence (STRIPE, `po_`, PAYMENT RECEIVED, American Expr, TRANSFER). Unpaired Stripe payout = "Stripe payout, other side not uploaded".
3. **R2 Card refunds.** Same card account, earlier purchase within 90 days at the same merchant, purchase >= refund. Exact = high confidence, smaller = partial return (medium). Code to the purchase's account.
4. **R4 Order references.** Store-prefixed numbers with no separator needed (`USWS-19079PO`, `EUWS3244DOCK`, `EU WS-3325`), Fulfil SO numbers, `INVOICE #D1234` draft orders (follow to the final order). Look up in any state. Already paid = show "paid <date> by <who> via <gateway>", never a same-amount guess. Lines naming one order that add up to its total = split payment. Near-miss numbers only as "did you mean". "Already paid" needs the order number on the line.
5. **R6 Deposits / instalments.** Named payer resolved to a Fulfil customer (any channel; ignore Amazon / Dock & Bay names). Amount = share of order total within 0.01 (payment terms, else 30 / 40 / 50%) or the remaining balance.
6. Today's amount + name and sum checks (v28.607).
7. **R7 Payee rules** (learned payer -> customer / account, `accounts_payee_rules` direction 'in') and **R8 labels**. Name check ignores DOCK, BAY, CORP, DES, ID, TRANSFER, DEPOSIT, PAYMENT, INDN, CCD, SP, IP.
8. **R9** No amount-only guesses on non-customer text.

## Ben's decisions (05-Nov-26)
- **Partial payment on a Shopify order** (e.g. Herm Island 492.75 = 50% of UKWS-7040; 888.75 = 50% of Herm-Island-27-Custom): HORIZON tells the user it is a partial payment and that it must be recorded MANUALLY in Shopify (HORIZON never marks a part-paid order paid). HORIZON can create the Xero Receive Money to the store's clearing account (one click, confirm in the drawer).
- **Distributor / Xero-invoiced deposit** (e.g. Ntovas EUR 15,009.97 = 40% of SO55836): Xero PREPAYMENT on the customer's contact, applied to the final Xero invoice when it is raised. HORIZON also adds a note on the Fulfil sale order: "Partial payment received as deposit: <amount> <ccy> on <date> (Xero prepayment)". Both writes only on the user's confirm in the drawer.
- **Unidentified payers** (National Pen, Airwallex, PITT AE / Uber Eats, WPLATA OSS): left as they are for now. No suggestion shown.
- **ZPS** ("...ZPS/01") is Zalando and is handled by a Xero bank rule: hide it with the payouts (add `zps` to the payout filter).

## Still open
- Stripe payouts: hide with the other payouts (suggested) or show as one-click transfers?
- Rule order above: OK?
- Herm-Island-27-Custom: Xero invoice 56978 is GBP 540 but the order is GBP 1,777.50. Is the invoice wrong?
- Already-paid orders: target = store clearing account, contact "Shopify <store>" (as Rita did 05-Oct)? EU-49850 57.40 (pre cut-over): 9035 or 200D?
- USWS-19079: Xero invoice paid, Fulfil invoice 56453 open for the same order. Which stays?
