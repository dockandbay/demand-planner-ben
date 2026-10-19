# Brief for Diviyaj: CUSTOM-LOGO orders to G10 / ROUTE via n8n polling (20-Oct-26)

## What is needed
Every US order that contains the **CUSTOM-LOGO** product and ships from **US Geneva STD (warehouse 24)** must reach G10 with:
1. **Carrier service ROUTE** on the customer shipment (carrier G10 = 6, service ROUTE = 656; same ids on live and sandbox). Today these shipments carry the default service (652 or 702).
2. **Personalisation = CustomLogo** on each towel line of the sales order (sale line option, option 1). This is the field G10 reads to know the towel needs the logo. If a line already has a Personalisation value (for example a customer name), keep it.

## Why Fulfil alone cannot do it (tested on sandbox 19-Oct-26)
- **Shipment functions cannot change the shipment.** A function on the customer shipment "Waiting" trigger runs, but its writes (carrier service, sale line options) are not applied. The probe function ran, but none of its changes were applied.
- **The built-in "Change Carrier on Shipment" rule** can set G10 / ROUTE, but it cannot match "the order contains product CUSTOM-LOGO". It would need an import function on every channel to tag the order (comment "CustomLogo") first. Wholesale and manually created orders do not go through import functions, so they would be missed.
- **No rule can add the Personalisation option** to sale lines.
- So the Fulfil-only route needs three moving parts and still misses manual orders. One n8n poll covers every channel the same way.

## Why polling is safe on timing (live, read only, 20-Oct-26)
- US web shipments at Geneva are created **on hold** (hold reason 2) and released about **1 hour** later. Example: CS61280 created 15:42, sent to G10 16:48.
- Wholesale shipments (USWS) sit on hold (reason 36) until released by hand.
- A poll every **5 minutes** fixes the shipment well inside that window. G10 only receives it after release (`tpl_status` goes to `sent`).

## The n8n workflow (Fulfil REST API, X-API-KEY)
Every 5 minutes:
1. **Find** customer shipments with:
   - warehouse = 24
   - state in (waiting, assigned)
   - `tpl_status` not `sent`
   - created in the last 3 days
2. **Check the order:** read each shipment's sales order and lines. Continue only if a line has product code **CUSTOM-LOGO**.
3. **Sale lines:** for each towel line (not the CUSTOM-LOGO service line itself) with no Personalisation option, create `sale.line.option` Personalisation = `CustomLogo`. Leave lines that already have a value.
4. **Shipment:** if `carrier_service` is not 656, update the shipment to carrier 6, carrier_service 656.
5. **Comment** on the shipment: "CUSTOM-LOGO: G10 ROUTE + Personalisation set by n8n".
6. **Verify:** call `get_3pl_shipment_payload` and check it shows ROUTE and the Personalisation value.
7. **Idempotent:** skip anything already correct, so re-runs do nothing.
8. **Late catch:** if a CUSTOM-LOGO shipment is already `sent` and not on ROUTE, do not change it. Alert ops (email or Slack) to fix it with G10 by hand.

The workflow never unholds or releases anything; the normal release carries on.

## What I need from you
- The n8n workflow, built and tested on the **Fulfil sandbox** first (dockandbay-sandbox).
- **Three sandbox test orders:**
  - one with CUSTOM-LOGO
  - one with CUSTOM-LOGO where a towel line already has a customer name (it must keep the name)
  - one without CUSTOM-LOGO (it must be untouched)
- A live Fulfil API key that can update customer shipments and create sale line options.
- **Ben confirms before it is switched on for live.**
- **Live cleanup:** the old probe rule #93 and function #47 are still active on live. Please remove them, since they were only a test.

## Context
- Sandbox test records: test customer 97151 "ZZ TEST CUSTOM-LOGO", CUSTOM-LOGO service variant 1908, test orders SO57601 to SO57606.
- Full background: `~/Documents/CLAUDE/customiser/PARKED_2026-10-19.md` (Fulfil: CUSTOM-LOGO section).
