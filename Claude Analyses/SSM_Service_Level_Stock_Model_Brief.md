# Buying Smarter: The Service-Level Stock Model (SSM)

**A briefing for Marketing, Sales and Operations**
Prepared 17-Aug-26 · Owner: Ben (COO) · Status: Proposal for discussion (runs alongside current buying, nothing changes automatically)

---

## TL;DR

We have tested a smarter way to decide how much stock to buy, called the **Service-Level Stock Model (SSM)**. Instead of holding the same number of "weeks of cover" on every product, SSM sizes each product's safety stock to its own **demand volatility, supplier lead time and a chosen service-level target** (for example, "be in stock 97% of the time").

We back-tested it against **20 months of our own real sales and stock history** (Jan-25 to Aug-26, 21,208 product-month data points). The headline finding:

> Our current approach is not buying *too much* or *too little* overall. It is buying it in the **wrong places**. It over-stocks ~40% of lines and under-stocks ~44%.

Rebalancing to SSM would, on an indicative basis:

- **Free up ~£1.2M** of cash currently frozen in over-stocked steady sellers.
- **Redeploy ~£443k** into the volatile lines that keep selling out.
- **Net result: roughly £750k less working capital tied up AND better availability on the products that actually run dry.**

It also uncovered **21,320 units of "hidden" demand** across 339 products that we simply could not sell because they were out of stock.

---

## 1. How we buy today, and why it leaves money on the table

Today we buy to a **fixed weeks-of-cover target** (for example, hold about 12 weeks of stock). It is simple and it has served us well, but it treats every product the same:

- A **steady, predictable seller** (sells ~100 a week, every week) gets the same 12 weeks of cover as
- A **spiky, seasonal or hero product** (sells nothing for weeks, then 500 in a promo).

That is the problem. The steady product barely needs a buffer, so 12 weeks is wasteful and ties up cash. The spiky product can blow through 12 weeks in a single good week, so it sells out and we lose the sale. One fixed number cannot be right for both.

Real examples from our own data:

- **HAIRW-CLA-WHITE (white hair wrap, UK)** was out of stock in **18 of the last 20 months**. Demand was there; stock was not.
- Several **summer beach towels (TOWLB-SUM range)** repeatedly ran dry in peak season in the UK and EU.

Meanwhile hundreds of dependable everyday lines sat on months of surplus cover.

---

## 2. What the Service-Level Stock Model does, in plain English

SSM asks a better question. Not *"how many weeks should we hold?"* but *"how much buffer does **this specific product** need to stay in stock **as often as we want it to**?"*

It looks at three things per product, per market:

1. **How unpredictable is demand?** Steady demand needs a small buffer; lumpy demand needs a bigger one.
2. **How long does it take to restock?** Longer supplier lead times (ours run ~17 to 23 weeks from China) need a bigger buffer, because we are exposed for longer.
3. **How reliable is the lead time itself?** If deliveries slip, we need extra cover for that risk too.

We then pick a **service-level target** (the promise), for example:

- **99%** in stock for our hero and best-selling lines,
- **95%** for the core range,
- **90%** for the long tail.

SSM converts that promise into the exact stock buffer each product needs. High-value, predictable products end up holding *less*; volatile and hero products hold *more*. The stock goes where it earns its keep.

It also does one more clever thing. When a product was **out of stock** in the past, its sales history looks artificially low (you cannot sell what you do not have). SSM **"unconstrains"** that history, estimating what we *would* have sold, so we stop under-buying the very products that keep disappointing customers.

---

## 3. The back-tested results (our data, not a vendor's brochure)

We replayed the last 20 months as if SSM had been running, and compared it to what actually happened.

**Where we stand today**

- Our current stockout rate is **3.9%** (about 96% availability) — respectable.
- But we hold roughly **48% more stock than a 95% service-level policy would require** (average 363 units on hand versus a 246-unit target).

**The mis-allocation (1,751 product-market combinations analysed)**

| Category | Share | What it means |
|---|---|---|
| Chronically **over**-stocked | **41%** | Cash frozen in stock that never sells out |
| **Under**-stocked / at risk | **44%** | Sells out too often, or runs below a safe level |
| Well balanced | 15% | About right |

**The prize (indicative, based on average unit cost of £5.42)**

- **~£1.2M** of cash can be released from over-stocked lines.
- **~£443k** should be reinvested in the at-risk lines.
- **Net ~£752k working capital freed**, while *improving* availability where it matters.
- **21,320 units** of previously-lost demand (339 products) becomes visible and buyable again.

In short: **more sales from fewer stockouts, and less cash tied up, at the same time.** That is the rare win-win, and it comes from moving stock from where it is wasted to where it is needed, not from buying more overall.

---

## 4. Risks, and how we manage them

We are presenting this honestly. It is not magic, and there are real risks.

| Risk | Reality | How we manage it |
|---|---|---|
| **The model is wrong for a product** | Statistics can misjudge a brand-new line, a viral spike, or a discontinued item. | SSM **runs alongside** the current plan first. Buyers review and can override every number. Nothing is bought automatically. |
| **We free up stock, then demand jumps** | Releasing cover on a "steady" line assumes it stays steady. | Service-level targets are a dial, not a switch. We can set a higher target (more buffer) on anything strategic. We start conservative. |
| **Lead-time shocks** (a delayed shipment) | Long China lead times mean a slip can still cause a stockout. | SSM explicitly builds in **lead-time variability** as a factor, so it already carries cover for this. We can raise it further per supplier. |
| **Data gaps** | The model needs clean sales and stock history. | Built and validated on 20 months of reconciled data. Sets, bundles and discontinued lines are correctly excluded. |
| **Change management** | A new method needs trust before teams rely on it. | Phased rollout (below). We prove it month by month before it drives a single purchase order. |

**Reward vs risk:** the downside is bounded (we can always override, and we roll out gradually); the upside is a structural, repeatable improvement in both cash and availability. The risk sits firmly on the reward side of the ledger.

---

## 5. What this means for each team

**Sales**

- Fewer "sorry, out of stock" moments on the lines customers actually want, especially seasonal peaks and hero SKUs.
- Better confidence quoting availability, because buffers are matched to real demand risk.

**Marketing**

- Fewer promotions and launches undermined by stockouts. The products we push will be the ones we can actually supply.
- A clearer view of true demand (unconstrained for past stockouts), so campaign planning is not misled by artificially low history.

**Operations**

- Less cash and warehouse space consumed by slow, over-stocked lines.
- Buffers that flex with lead-time risk, so late shipments are less likely to cause a shortage.
- A defensible, auditable logic behind every buy, instead of one blanket rule.

---

## 6. How this evolves our buying rules (the "Complex Rules" engine)

Today, our buy plan already has a **Complex Rules engine**: buyers set cover-week targets by group or condition (for example, "this category holds 14 weeks", "this market holds 10 weeks"). It replaced the old First-Buy logic and works well as a manual override layer.

SSM does not remove Complex Rules. It **upgrades what a rule can say.**

- **From:** "Hold **N weeks** of cover for this group." (a fixed quantity, set by a human guess)
- **To:** "Hold enough to hit a **service level of X%** for this group." (an outcome, with the model working out the quantity per product)

Practical examples of the new rules we could write:

- *Hero range → 99% service level* (never sell out the flagship).
- *Core range → 95%.*
- *Long tail / clearance → 90%* (accept the odd gap to free cash).
- *This supplier is unreliable → add a lead-time-risk uplift.*
- *Floors and caps still apply* — for example, "never hold more than 6 months" or "always keep at least one carton", so the model stays inside common-sense guardrails.

The result is the best of both worlds: the **judgement and control** of Complex Rules, powered by the **per-product precision** of the model. Buyers stop hand-setting cover weeks and instead set the **promise** they want to make to the customer, by group. The engine translates that promise into buys.

This also makes rules far easier to reason about. "We are 97% available on the core range and 99% on heroes" is a statement the whole business understands; "we hold 12 weeks of cover" is not.

---

## 6b. Special case: seasonal products need their own rule

Not every product should be bought the same way, and **seasonal lines are the clearest example.** A summer beach towel or picnic blanket is not a steady seller with a bit of extra buffer. It is a different problem entirely, and it is where "extra cover" genuinely matters.

**Why seasonal is different:**

1. **The seasonality is the forecast, not the safety stock.** Demand goes from near-zero in winter to a big summer peak. That swing should live in the *forecast* (the expected curve), with safety stock only covering the uncertainty *around* the peak (will summer be up or down 20%?). Treating the whole seasonal swing as "volatility" would mis-size the buffer.

2. **We cannot restock mid-season.** Our supplier lead times (~17 to 23 weeks from China) are longer than the selling window. By the time a top-up landed, the season would be over. So a seasonal product is effectively a **one-shot, up-front commitment**: we buy the whole season before it starts, or we miss it.

3. **Missing a season is far worse than carrying leftover.** Under-buy and we lose the entire peak with no way to recover it. Over-buy and we carry non-perishable stock to next year at a modest cost. Because the downside is lopsided, seasonal lines **rightly justify a higher service level and extra cover.**

**This is exactly why we buy the SS27 season forecast up front, to July.** For Spring/Summer 2027 we commit the full forecast through the season end before the lead-time window closes, rather than trying (and failing) to chase demand mid-season. That "order the forecast up to July, up front" rule *is* the seasonal model in action.

**In the buy plan, this is a distinct rule mode:**

| | Steady-state products | Seasonal products |
|---|---|---|
| The question | "What buffer stays in stock X% of the time, topped up as we go?" | "What single up-front buy covers the whole season at X% confidence?" |
| How much to buy | Reorder to target as stock draws down | Cumulative season forecast, plus a larger forecast-risk uplift, committed once |
| Cover is driven by | Demand volatility and lead time | The seasonal forecast, with **extra** cover for peak uncertainty |
| When we buy | Continuously | By the cut-off (season start minus lead time) |
| Service-level target | ~95% core | **97.5 to 99%** (a missed season is costly) |

So the Complex Rules engine carries a **seasonal flag** per category or product. Flagged lines switch from continuous safety stock to a **pre-season commitment** with their own higher service level and an order-by date. The two modes coexist: everyday lines are topped up through the year; seasonal lines are bought ahead, in full, with deliberate extra cover.

*(Note: the headline back-test figures in section 3 use the steady-state model across the catalogue. Seasonal lines are better served by this pre-buy mode, and we will report their impact separately so we do not understate the cover they legitimately need.)*

---

## 6c. Who decides the service level: product tier (ABC / marketing tier)

The service-level target is the single most important dial in the model, and it should be set by **how important a product is to the business**, not chosen at random. That is what a **tier (ABC classification)** is for.

**Our catalogue is a textbook Pareto.** Looking at the last 12 months:

| Tier | Products | Share of range | Share of revenue |
|---|---|---|---|
| **A** | 189 | ~19% | **~80%** |
| **B** | 183 | ~19% | ~15% |
| **C** | 600 | ~62% | ~5% |

About a fifth of our products drive four-fifths of revenue. It makes no sense to give all of them the same availability target. Tiering lets us protect what matters and run the long tail leaner.

**Crucially, the tier is a marketing and commercial decision, not just a sales-volume ranking.** A pure revenue sort is the starting point, but marketing should be able to **promote a product above its current sales rank** when it is strategically important, for example:

- a **new launch** with little history yet but big plans behind it,
- a **brand-hero** or signature product that defines us even if it is not top-of-list on units,
- a product with a **campaign or collaboration** coming that we must not sell out of.

So the tier has two inputs: a **default ABC class from revenue** (computed automatically), and a **marketing override** where marketing sets the "player" level deliberately. Marketing owns the dial; the model does the rest.

**Tier then sets the service level, and the seasonal flag sits on top of it:**

| Tier ("player") | Steady-state target | If also seasonal (pre-buy) |
|---|---|---|
| **A** (hero / top revenue / marketing-critical) | 98 to 99% | 99% + forecast-risk uplift |
| **B** (core range) | 95 to 97% | 97 to 98% |
| **C** (long tail / clearance) | 90 to 92% | ~95% |

Read together with the two rule modes: **tier decides *how hard* we protect a product, the seasonal flag decides *how* we buy it** (continuous top-up versus one up-front pre-season commitment). A seasonal A-player (a hero summer towel) gets both: a 99% target *and* the full pre-season buy. A C-tier everyday line runs lean, topped up as it sells.

For the teams, this is the headline: **Marketing sets the tier, the model guarantees the promise.** You tell us which products must never disappoint the customer; SSM works out the stock to keep that promise, at the lowest sensible cost everywhere else.

**Important: a tier is a prediction, not a fact, and seasonal products break it.** ABC ranks products by their *expected* or *past* importance. Realised sales do not always agree, and seasonal lines are the worst offenders: a beach towel earns little revenue across a full year (so ABC calls it a "C"), yet it sells like an "A" for three months. Our own history shows this clearly:

- Stockouts by tier over the back-test: **A players 0.8%**, B 1.7%, **C 10.2%** — and C tier accounts for **~80% of all stockouts**.
- That C-tier stockout mass is dominated by **seasonal categories mislabelled as low-priority.** In 2026, **beach towels were the single largest stockout category** (32 products out across 62 market-months), followed by hair wraps, tea towels and ponchos — all seasonal peaks.

The lesson: **do not let the ABC tier alone decide a seasonal product's cover.** A seasonal flag must impose a **service-level floor** (say 97%+) regardless of the product's annual ABC class, precisely because the classification systematically under-rates it. Tier protects the year-round best-sellers; the seasonal floor protects the products that only look small on an annual view. After each season we also **re-tier from actual sales**, so a line that punched above its class gets promoted next time.

*(Measurement note: the lost-sales figures above are lower bounds. Month-start stock snapshots miss stockouts that happen mid-month, which is the typical seasonal pattern (full on the 1st, sold out by mid-month). Adding **intra-month snapshots during peak season** (weekly, or at least mid-month) would capture the true stockout duration and lost sales, and sharpen seasonal buffers. The ideal end-state is an automated weekly stock feed.)*

---

## 7. Recommended rollout

We are **not** proposing to flip a switch. The plan is deliberately low-risk:

1. **Run in parallel (now).** SSM produces its recommendation next to the current buy plan. Buyers see both. Nothing changes.
2. **Score it live (next).** Each month we record what SSM recommended and check it against what actually happened, building a track record in the open.
3. **Adopt selectively.** Once trusted, apply it first where the case is strongest (the clearly over- and under-stocked lines), via Complex Rules service-level targets.
4. **Expand by choice.** Widen coverage as confidence grows, always with buyer override retained.

---

## 8. The one-paragraph version for a stakeholder

*We have proven, on 20 months of our own sales and stock data, that switching from a one-size-fits-all "weeks of cover" buying rule to a per-product, service-level-driven model would free roughly £750k of working capital while improving in-stock availability on the products that currently sell out. It works by putting stock where demand risk actually is, rather than spreading it evenly. It recovered over 21,000 units of demand we were losing to stockouts. It carries manageable, bounded risk because it runs alongside our current plan with full buyer override, and it plugs directly into our existing buy-plan rules, upgrading them from "hold N weeks" to "hit an X% service promise." We recommend running it in parallel now and adopting it selectively as it proves itself.*

---

*Figures are indicative, derived from a back-test over Jan-25 to Aug-26 using reconciled sales and monthly stock snapshots. They illustrate the scale of the opportunity, not a guaranteed outcome. Service-level targets, floors, caps and overrides remain fully under our control.*
