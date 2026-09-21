# Commission Pot 2026/2027 - Cin7 cross-check

**Date:** 16-Sep-26
**Source file:** `~/Downloads/2026 _ 2027 Commission Pot.xlsx` (sheets Q1, Q2)
**Checked against:** Cin7 Omni live (`api.cin7.com/api/v1/SalesOrders`), read-only
**By:** Claude (for Ben)

---

## Scope of the check

- **Q2:** confirm every order in column E is processed (dispatched/invoiced) in Cin7.
- **Q1:** flag any order that has been cancelled (voided) or does not exist in Cin7.
- **Both:** sweep for duplicates and other data risks that could distort the commission pot.

**Rows checked:** Q1 rows 2-35 (34 deals), Q2 rows 2-34 (33 deals). Q2 rows 47+ are a Dillard's DC address list, not orders, and were excluded.

**Method:** column E gives the order reference(s); the column F Cin7 link gives the internal OrderId. Each row was matched to Cin7 by OrderId and by reference. Order stage, status, void flag, dispatch/invoice dates and total were pulled live.

---

## Q2 - are they all processed?

Nearly all are **Dispatched and invoiced**. Exceptions (approved but not yet shipped):

| Row | Deal | Ref | Cin7 stage | Note |
|-----|------|-----|-----------|------|
| r33 | Miami Beach Edition custom | USWS-19282 | **New** | £1,362 - sitting in New, chase to process |
| r16 | Waitrose Tea Towels | WAIT12005-7 | New - Future Ship Date | £43,500 - future-dated by design |
| r9  | Goldstar EU C6688 | GOLD27702-10 | New - Future Ship Date | £28,970 - future-dated by design |
| r4-6 | Dillard's Spa & Sleep rollout | *"MULTIPLE - SEE LIST"* | n/a | **No order ref in sheet - cannot verify** |

Everything else in Q2 rows 2-34 is Dispatched/invoiced.

---

## Q1 - anything cancelled or non-existent?

- **Do not exist:** none. Every reference resolved to a live Cin7 record.
- **Cancelled (void):** none of the primary orders. The only void found is a same-reference duplicate on **r30 JLEW11511-79** (void draft id 1756599); its live order (id 1722900) stands but is still *New - Future Ship Date*, not shipped.
- **Still in "New" (approved, not dispatched)** - not cancelled, just unprocessed:
  - r16 NEXT23106-11 - £103,826
  - r26 NEXT23106-14 - £53,483
  - r30 JLEW11511-79 - £16,727 (future ship)
- **Cannot verify (Dillard's placeholders, no ref in column E):** r15, r20, r21, r22, r23, r24, r34 (all say *"working on these"* / *"x20+ sales orders"*).

### Void-duplicate pattern (informational, not a problem)
Several references return two Cin7 orders: the live Dispatched one (which the sheet link points to) plus a voided "New" duplicate. This is a re-raised order; the live order is intact. Occurs on Q2 r7, r12, r13, r14, r16, r19, r24 and Q1 r30.

---

## Duplicates and other risks

### Confirmed issues

1. **Exact duplicate across quarters.** `UKWS-6617` / OrderId `1701036` (Nadel Amazon biz reorder) appears in **Q1 r3** and **Q2 r29** - the same Cin7 order, dispatched & invoiced 03-Jun-26, £3,750. Double-counted. HubSpot close date 13-May-26 puts it in Q1; the Q2 r29 entry is the one to remove/zero.

2. **Mis-linked order - Q2 r2 Hillier ("x2 reorders").** Column E names `HNUR28530-2-1` and `HNUR28530-3-1`, but the Cin7 link points to a third order `HNUR28530-4-1`. The row therefore pulls in an order it does not name (Cin7 £2,128 vs sheet £1,168, ratio 0.55). Either the link is wrong or a third order is being counted.

3. **Duplicate sheet amount - Q2 r22 & r23 (Goldstar) both £30,976.** Cin7 shows £23,291 (r22) and £14,557 (r23) - two different orders carrying an identical typed value. Looks like a copy-paste; at least one amount is wrong.

### Worth verifying

4. **Q1 r19 Dillard's AW26.** Sheet £96,770 vs matched Cin7 £63,566 (1.52x, not explained by VAT or FX). The 12 linked `DILLARDS-` orders do not add up to the sheet figure - likely more Dillard's orders exist that are not captured, or the sheet total is over-stated.

5. **Q2 r20 NEXT23106-18.** Cin7 £18,692 vs sheet £11,130 (0.60x). Cin7 materially higher than the commission figure; confirm the order did not grow after the sheet was filled.

6. **Near-duplicate - JL r27 (JLEW11511-78, £16,667) vs r30 (JLEW11511-79, £16,727).** Consecutive references, almost identical value, same customer. They are distinct Cin7 orders, but r30 is still "New / future-ship" with a voided twin - confirm it is a genuine second buy and not a re-raise of r27.

### Checked and benign (no action)

- **~17% gap on most rows** = sheet is NET (ex-VAT), Cin7 total is gross (inc-VAT). sheet / 1.20 = Cin7. Expected.
- **~1.33x on Goldstar / Nordstrom / Miami / hibob-custom** = USD/EUR orders vs GBP conversion. Expected.
- **Company-name mismatches** all resolve to the same entity or its agent:
  - John Lewis Ltd = "John Lewis & Partners"
  - Tischideen und Ambiente = "Tischideen & Ambiente"
  - Morleys group orders sit under **Elys of Wimbledon** / **Pearsons of Enfield** (same retail group)
  - hibob drop-ship order under "Graphic Power / Nick Power"
  - Thomas John Handelsagentur = agent for Kastner & Öhler / The British Shop
  No mis-attribution.
- No reference resolves to two live orders; no referenced order is missing from Cin7.

---

## Recommended actions

| Priority | Action |
|----------|--------|
| High | Remove/zero the Q2 r29 Nadel entry (UKWS-6617) - already counted in Q1. |
| High | Fix the Q2 r2 Hillier link (-4-1 vs the -2-1/-3-1 named in column E). |
| High | Correct the duplicated £30,976 on Q2 r22/r23 (Goldstar). |
| Medium | Reconcile Q1 r19 Dillard's - locate the missing orders or fix the total. |
| Medium | Confirm Q2 r20 NEXT and the JL r27/r30 pair are genuinely separate. |
| Low | Chase Q2 r33 Miami (still "New") through to dispatch; supply Cin7 refs for the 10 Dillard's placeholder rows so they can be checked. |

*All checks were read-only. Nothing was written to Cin7 or the workbook.*
