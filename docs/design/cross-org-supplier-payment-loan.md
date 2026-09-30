# Cross-org supplier payments via the intercompany loan account

**Status:** spec for build (Ben, 30-Sep-2026). Not yet built. Triggered by the Lixin batch
(SUPPLIER-PAYMENT-LX-2026-09-28) which mixed 6 UK-org POs + 1 AU-org PO and broke because a run
posts to a single Xero org.

## The idea

A supplier-payment run pays from ONE Xero org (the **paying org**), but the POs it pays can live in
either org. When the paying org and a PO's home org differ, the money moves through each org's
**intercompany loan account (code 901)** instead of pretending the bill was paid from the wrong org's bank.

## Inputs

- **Paying org** — a dropdown on the run, **default UK** (light red), switchable to **AU** (light green),
  colours per the org config. This is the only new user input. It decides:
  1. which Xero org the SUPPLIER-PAYMENT bill is created in, and
  2. which real USD bank funds it.
- **Run lines** — each PO with its **home org** (AU only when country/branch is AU/Coghlans, else UK — the
  existing `_poXeroRegion`), amount, type (deposit / completion / balance), and its linked bill in its home org.

## Per-line classification

For each line compare `home_org` vs `paying_org`:
- **Same-org line** — `home_org == paying_org`. Behaves exactly as today.
- **Cross-org line** — `home_org != paying_org`. Uses the loan mechanism below — **completion / balance / final only**.

**Deposits are never cross-org (Ben).** A starting deposit, and its P58+ credit-note draw-down, always settle in
the PO's **home org**. The loan route does not apply to them. Therefore a deposit line is only valid when
`home_org == paying_org`; if a run's paying org differs from a deposit line's home org, that deposit line is
**blocked** (not settled via loan) with: "Deposits settle in the PO's home org — run this deposit from the
&lt;home org&gt; org." Completion/balance lines in the same run are unaffected. (Open: whether deposits should be
split into their own runs entirely — see below.)

## What posts

### A. The SUPPLIER-PAYMENT bill — created in the PAYING org, paid from its USD bank

One ACCPAY bill, USD, in the paying org. One line per PO:

| Line kind | Bill line account | Tracking |
|-----------|-------------------|----------|
| Same-org  | existing coding — `stock_deposits` 602 (deposit) / `supplier_payments` 602.1 (completion/balance) / legacy prod account | Production (deposits) as today |
| Cross-org | **`loan` 901** (paying org's intercompany loan account) | none — it's a settlement, not stock |

The paying org's real USD bank pays this bill's total (same as today).

### B. A payment against each PO's own bill — posted in the PO's HOME org

| Line kind | Where the payment posts | Paid from | Validated against |
|-----------|-------------------------|-----------|-------------------|
| Same-org  | the PO's bill in the paying org | paying org's USD bank | that org's `AmountDue` |
| Cross-org | the PO's bill **in its home org** | **`loan` 901** in the home org (payment-enabled account) | home org's `AmountDue` |

A cross-org payment moves no real cash and needs no bank or FX rate in the home org — it settles the
supplier bill straight off the loan account.

## Worked example — Lixin, paying org = UK

- 6 UK POs → same-org → coded 602 / 602.1, paid from the UK USD bank against their UK bills.
- 1 AU PO (PO-57AULX1, $13,850.73) → cross-org:
  - **UK** supplier-payment bill: a $13,850.73 line coded to **901 UK loan** (`5076ed75-82b7-4317-81ba-c686a82d7c76`). The UK USD bank funds it. UK now records "AU owes UK $13,850.73".
  - **AU**: PO-57AULX1's AU bill marked **paid $13,850.73 from 901 AU loan** (`e2f3dc79-f268-49aa-8a42-674917d15a98`). AU records "AU owes UK $13,850.73".
  - Both 901 accounts move by the same amount on opposite sides → the intercompany balance stays in sync.

Reverse (paying org = AU, a UK PO): AU supplier-payment bill line → 901 AU loan; the UK PO's bill marked
paid from 901 UK loan.

## Config / mapping needed

- **Registry `loan` role per org** — already exists in `XERO_ACCT_ROLES` (`{ key: 'loan', label: 'Loan
  (intercompany)' }`). Populate `cfg.accounts.uk.loan` and `cfg.accounts.au.loan`:
  - UK: code **901**, AccountID `5076ed75-82b7-4317-81ba-c686a82d7c76`
  - AU: code **901**, AccountID `e2f3dc79-f268-49aa-8a42-674917d15a98`
- Each **901 loan account is payment-enabled** in its org (confirmed, Ben) — a Payment can post against a bill from it.
- **901 currency is base currency** (confirmed, Ben): **UK 901 = GBP, AU 901 = AUD**. The supplier bills are USD,
  so each cross-org movement carries FX: Xero posts to/from the base-currency 901 at **that org's own daily USD
  rate**. The two legs therefore agree on the **USD amount** but book different GBP vs AUD values — this is normal
  for an intercompany loan; **reconcile the loan on the USD figures** (put the USD amount in the line
  description/reference on both sides so they tie out). Each org uses its own daily rate — we do not force one shared rate.

## Preview + checks (per-line, not per-run)

- Show each line's **home-org pill** (UK red / AU green) and a **"via loan 901"** tag on cross-org lines.
- Validate each PO's amount against its **home-org** bill `AmountDue` (bulk-fetch per org, not one region).
- Blockers:
  - cross-org line with **no linked bill** in its home org (e.g. PO-57AULX1 today has no AU bill) → cannot settle;
  - `loan` 901 not mapped or not payment-enabled in an org that a cross-org line needs;
  - no USD bank in the paying org.

## Resolved (Ben)

- **Deposits never cross-org.** Starting deposits and P58+ credit-note draw-downs always settle in the PO's home
  org; loan route is completion/balance only. Cross-org deposit lines are blocked, not settled.
- **901 payment-enabled** in both orgs. ✓
- **901 is base currency** (UK GBP, AU AUD); each org posts the settlement at its own daily USD rate; reconcile on USD.

## Still open for Ben

1. **Separate deposit runs?** "Payments for deposits maybe should not be mixed." Options: (a) allow deposits +
   completions in one run as long as every deposit line is same-org (blocking cross-org deposits, per above), or
   (b) make deposits their own run type entirely, never alongside completion/balance. Which?
2. **Loan line tracking.** Assume **no** Production tracking on the 901 loan line of the supplier-payment bill
   (it's a settlement, not stock). Confirm.

## Code touch-points (for the build, not this doc)

- `computeXeroRunPlan` (server.mjs ~4735): add `paying_org` from the run; compute per-line `home_org`; classify
  same/cross; pick bill-line account (existing vs `loan`); fetch `AmountDue` per home org; build per-line
  `settle_from` (bank vs loan) and `settle_org`.
- `xero-post` (~4836): create the bill in the paying org; per line, post the payment in its `settle_org` from
  its `settle_from` (bank AccountID or the home-org loan AccountID).
- Preview UI (inject.html ~10704): org dropdown (default UK red / AU green), home-org pills, "via loan 901" tag,
  per-org payment checks.
