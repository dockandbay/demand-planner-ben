# Commissions: customer and agent checks (Exceptions)

Ben 05-Nov-26. Built v28.711. Covers three requests made the same day.

## 1. No agent: full order detail + search
Each "No agent" exception shows:
- Delivery: name, address, city, state, postcode, country (Fulfil sale ship-to; Xero contact address for Xero-only orders; Faire order address for Faire).
- Order source: Shopify (store), Faire (Marketplace or Faire Direct), MarketTime, Brandwise, Xero invoice, other (Fulfil channel + reference prefix).
- The customer's earlier orders (last 24 months, Fulfil + Xero + paid history): date, order, source, amount, agent (or none).
- A search box over customer, order, invoice, PO, city, state, country, agent.

**Rule (Ben):** no commission for a wholesale customer ordering organically on Shopify, UNLESS they ordered through a rep group before. So a Shopify wholesale order with no agent shows "earlier order with <agent> on <date>: assign to <agent>?" (one click = order override), or "no earlier agent order: organic, no commission" (dismiss).

## 2. Agent changed ("multiple rep groups")
For orders in the month (and the customers who ordered in the last 90 days): compare the agent of this order with the agent of the customer's earlier orders (24 months).
- Flag when the agent differs: earlier agent A (last order date), this order agent B, or this order on Faire / Shopify / no agent.
- Shown in Exceptions as "Agent changed", for visibility (nothing is moved automatically). The Adjust / order override tools fix it if wrong.

## 3. Faire commission claim (for Madison)
Faire external API per order: `source` (FAIRE_DIRECT = 0% / MARKETPLACE), `payout_costs.commission_bps` and `commission`, retailer company and address.
- When a Faire order has commission > 0 AND that retailer was earlier linked to a rep group (an earlier order with an agent in Fulfil or Xero, a Fulfil agent code, an agent's Xero contact group, or the commission customer list), flag **"Ask Faire for 0% commission"**:
  - Exception row: Faire order, retailer, commission charged (amount and %), earlier agent and the evidence (order, date).
  - A to-do for Madison (madison@dockandbay.com) in HORIZON, once per Faire order: "Claim 0% commission from Faire for order <id> (<retailer>): earlier customer of <agent>".
- Matching a Faire retailer to our customer: the Fulfil Faire order (reference = Faire display id) gives the Fulfil customer; else company name, then postcode + city.

## Schedule
All three refresh with the commission engine (Build / refresh) and the Sunday weekly flow. Faire reads: about 1 call per 50 orders in the month (read only).

## Ben's answers (05-Nov-26)
1. A HORIZON to-do for Madison is enough (no email). Every exception (all types) has Dismiss / Reopen, with an Open only / All filter.
2. Recent = the last 90 days.
3. A suggested agent is a one-click confirm (order override); never assigned automatically.
