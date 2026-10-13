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

## Other payments link (Ben 13-Oct-26)
Creating the Xero bill or the Fulfil supplier invoice also creates (or updates) the matching **Other payment** in HORIZON with the **same reference**: they are the same payment, and the same reference is required on both so the payment run, the bill and the bank line tie together.

## Open questions (to settle before building)
1. ~~AU samples~~ ANSWERED (Ben 13-Oct-26): the only reason to send a sample to AU is 1000.24 (Photo, video & media creation, other costs). Any other AU charge belongs to an AU order (Path A, Fulfil).
2. ~~Org~~ ANSWERED (Ben 13-Oct-26): no-PO sample charges go to Xero UK by purpose (Product Development -> 1000.52 product team), even when shipped to AU. Only a Photography sample goes to Xero AU 1000.24.
2b. ANSWERED (Ben 13-Oct-26): ONE Other payment per Fulfil supplier invoice and per Xero bill; all Xero lines for one org combine into one bill (a line per account). Multiple documents from one supplier invoice get suffixes -A, -B, -C.
2c. ANSWERED (Ben 13-Oct-26): a line sharing a carrier tracking number with a PO-linked line follows that PO automatically.
2d. ANSWERED (Ben 13-Oct-26): no invoice number in the file -> reference built from supplier + carrier + month (e.g. XR-FEDEX-2026-02).
3. ~~Tax~~ ANSWERED (Ben 13-Oct-26): no tax on these bills / invoices.
4. ~~Draft or posted~~ ANSWERED (Ben 13-Oct-26): Fulfil supplier invoice is created as DRAFT.
5. ~~Landed cost~~ ANSWERED (Ben 13-Oct-26): spread BY VALUE across the PO shipment.
6. ~~Approval~~ ANSWERED (Ben 13-Oct-26): anyone with SUPPLY edit may create and push (Xero bill or Fulfil supplier invoice) straight away. The "bill only after an unreconciled bank line" rule applies to ACCOUNTS > Reconcile only.
7. ~~Currency~~ ANSWERED (Ben 13-Oct-26): the supplier's currency (USD for XR / Lixin), on both Fulfil and Xero.

## Build notes (from what exists)
- Fulfil writes go through `fulfilFetch` (live writes need FULFIL_LIVE_WRITES + Ben's go); PO picker = `/api/supply/fulfil/po-search`.
- Xero bills: `xeroFetch(org, '/api.xro/2.0/Invoices', POST)`, contact by `xeroContactLookup` (never auto-create), as ACCOUNTS bills.
- Supplier portal charges: `planner.additional_costs` (PO / shipment), sample charges on sample requests.

## Build findings (13-Oct-26, live reads)
- The example POs (PO-53USXR9-FEB, PO-54UKXR1-AIR, PO-54AUXR2-AIR, PO-1761191, PO-56USLX3-AIR, PO-DILLARDS-332-LX-HW) are COMPLETE pre-Fulfil POs with no Fulfil link. HORIZON PO -> Fulfil PO is resolved via po_links / fulfil_purchase_orders; none found -> line flagged "not in Fulfil".
- Ben (13-Oct-26, "maybe these 2 accounts"): a PO charge whose PO is not in Fulfil goes to a Xero bill on **302 Shipping Freight Fees (Import Only)** (freight) or **313 Import Duty** (duty / taxes). Both codes exist and are ACTIVE in Xero UK and AU; org follows the PO country (AU -> AU, else UK).
- Live Fulfil supplier invoices: header account 9001 Fulfil - Payable (UK id 1003 / AU id 1004), lines on 9039 Inventory Landed Cost Accruals; products LANDED-FREIGHT, LANDED-IMPORT-DUTY, LANDED-IMPORT-TAX-UK/AU/EU; account.landed_cost allocation_method 'value', moves_selection_method 'all', shipments (stock.shipment.in) / internal_shipments.
- Same Fulfil PO -> ONE invoice with a line per charge (Ben, Dillard's HW-A/B/C).
