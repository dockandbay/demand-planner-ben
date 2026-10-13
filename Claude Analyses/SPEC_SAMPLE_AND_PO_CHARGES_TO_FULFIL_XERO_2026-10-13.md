# Spec: sample and PO charges to Fulfil or Xero (Ben 13-Oct-26, "for later")

Status: captured, not built. Mockups first before UI work (standing rule).

## Goal
Supplier charges (samples, PO extras) and our own "Other payments" become the right accounting document automatically:
- **Linked to an order** -> a **supplier invoice in Fulfil**, then a **landed cost allocation** to the related shipment.
- **No order** -> a **bill in Xero** directly, coded to the right spend account.

## Where charges come from
1. **SAMPLES > sample request > CHARGES** (e.g. `#/supply/samples/SR-8/charges`): the supplier adds charges in the portal; we can also add them (and they can come from Other payments).
2. **PO charges from the supplier portal**: today a supplier can add a charge on a PO (seen on PO-57AUBL1 in the sandbox) but in admin it only surfaces on the **SHIPMENT**. It must also show on the **PO**: new **CHARGES** section under PO > PLAN > SHIPMENTS, with the same actions as below.

## Path A: the charge belongs to an order (Fulfil)
1. **Link to a Fulfil PO**: search and select (same picker as "Link Fulfil PO", v28.199).
2. **Create a supplier invoice in Fulfil** for the amount, to the **UK or AU company** (same company rule as the sales order / PO).
   - Product: **LANDED-FREIGHT**.
   - Account: **9001 - Fulfil - Payable [UK]** in the UK company, **9001 - Fulfil - Payable [AU]** in the AU company (different records in each chart of accounts; look up by company).
   - Supplier: the supplier charging us (e.g. Lixin, XR Textile), Fulfil party.
3. **Landed cost allocation** to the related **supplier shipment (SS)** or **internal shipment (IS)** if one exists.

## Path B: no order (Xero)
Create the **supplier bill in Xero** (supplier = who is charging us, e.g. Lixin, XR) and choose the spend account:

| Choice | Xero UK account |
|---|---|
| samples_marketing | 1000.44 - SPEND - MARKETING (OTHER) (EXCL AD SPEND) |
| samples_product | 1000.52 - SPEND - PRODUCT |
| samples_photography | 1000.61 - Spend - Photo, Video & Media Creation (Shoots) |
| samples_sales | 1000.47 - SPEND - WHOLESALE (CONSULTING / OTHER) |

Xero AU has only **1000.24 - SPEND - PHOTO, VIDEO & MEDIA CREATION (OTHER COSTS)**.

## Open questions (to settle before building)
1. ~~AU samples~~ ANSWERED (Ben 13-Oct-26): the only reason to send a sample to AU is 1000.24 (Photo, video & media creation, other costs). Any other AU charge belongs to an AU order (Path A, Fulfil).
2. Org for a sample charge with no PO: decided by the supplier's currency / the sample's market, or picked each time?
3. Tax on these bills (supplier abroad, usually no GST / VAT; zero rated?).
4. Fulfil supplier invoice: draft, or posted? Payment then via Payments Report as today?
5. Landed cost: allocation method (by value / quantity / weight) and which cost to allocate when an SS and an IS both exist.
6. Approval: who may push (ACCOUNTS / admin, as v28.305)?
7. Currency: the supplier's currency (USD) on both Fulfil and Xero, converted by the system rate?

## Build notes (from what exists)
- Fulfil writes go through `fulfilFetch` (live writes need FULFIL_LIVE_WRITES + Ben's go); PO picker = `/api/supply/fulfil/po-search`.
- Xero bills: `xeroFetch(org, '/api.xro/2.0/Invoices', POST)`, contact by `xeroContactLookup` (never auto-create), as ACCOUNTS bills.
- Supplier portal charges: `planner.additional_costs` (PO / shipment), sample charges on sample requests.
