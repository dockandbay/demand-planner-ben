# How we buy stock today vs the Service-Level model (SSM): a leadership summary

## In one line
Today we set stock cover by a rule of thumb (a fixed number of weeks). SSM sets it by two facts about each product: how unpredictable its demand is, and the availability we choose to promise. The result is the right buffer on every line: no more, no less.

## How we order today
Every product holds the same fixed weeks of cover (say 12 weeks), whether it sells like clockwork or in unpredictable bursts.

Anecdote: a steady navy beach towel and a spiky novelty print both get 12 weeks. The steady one ends up over-stocked with cash tied up on the shelf; the spiky one still runs out. One rule, two wrong answers.

## How SSM changes it
SSM sizes each product's buffer ("safety stock") from:
1. **How lumpy its demand is** (its volatility), measured from sales history; and
2. **The service level we choose by tier** (A products 99% availability, B 97%, C 93%).

Predictable lines get a leaner buffer; volatile lines get a bigger one. We only carry extra stock where it actually prevents a stockout.

Anecdote: we just loaded 2 years of stock history. On the old thin data, US warehouse demand looked very volatile, so the model wanted a 99% buffer. With the full history it is clearly steadier, so the model now recommends 95%. That means carry less, release cash, with negligible extra stockout risk. More data, sharper call.

## Seasonal ranges and the "produce in September" requirement (SS27)
Seasonal ranges (SS27 is about 85 products, roughly £293k of stock at cost) have to be produced in one shot, up front. The factory lead time is about 17 weeks, so there is no chance to re-order mid-season: we get one bite.

Our "Complex Rules" engine lets us set the instruction plainly: *for SS27, place the whole season's order in the September window*. That guarantees production starts in September, arrives around January, and is on the shelf comfortably before the February launch, with a few weeks of slack for the large volumes and any factory slippage.

The old default cut it to the wire: it ordered in October to land right on the launch date, with zero buffer. If a big order slipped, we missed the launch. The rule removes that risk by committing early on purpose.

SSM then sizes that one big September order: the full season's demand plus the tier-based safety buffer.

## Impact on stock buying
- Buy to a chosen availability target, not a blanket weeks-of-cover number.
- Seasonal becomes one deliberate up-front commitment in September, not a mid-season scramble.
- The mix shifts: less on predictable, over-stocked lines; more on genuinely volatile ones.

## Impact on cash flow
- **Seasonal money moves earlier, larger, and more concentrated.** The SS27 season (about £293k) is committed in September (deposit paid on order), lands in January, and sells from February. Cash goes out roughly 4 to 5 months before the revenue arrives. That is the deliberate price of never missing a launch.
- **The core range releases cash.** SSM trims over-cover on steady lines. Example: the US 3PL position is currently carrying about 2.4 years of cover, a large amount of working capital sitting idle that can be freed up.
- **Net effect:** seasonal is a bigger, earlier, planned outflow; the everyday range frees cash. They partly offset. The real win is that both are now deliberate and visible, rather than accidental.

## Impact on stock holding and inventory management
- Inventory is right-sized: buffers matched to real volatility and the availability we promise.
- Fewer stockouts on the products that matter (A tier); less dead and over-stock on predictable lines.
- Full visibility: the backtest shows, per market and warehouse, whether we are over-stocked or tight, and how much cash is held, so we can act on it.

## Benefits
- Higher availability where it counts (A products), so fewer lost sales.
- Cash released from over-stocked, predictable lines.
- Seasonal launches de-risked by the guaranteed September production start.
- Decisions are data-driven and auditable, not gut-feel.

## Risks
- **The seasonal up-front bet is large and early.** If a season's forecast is wrong, we are more exposed because we bought it all in September. Mitigation: we set the service level per tier and can dial the risk per range.
- **The model is only as good as its data.** It relies on sales and stock history; we now have 2 years, which is why the recommendations just got sharper.
- **One limitation we are fixing:** for products launching more than about 6 months out, the safety maths currently look at today's demand rather than demand around the launch, so the seasonal buffer for far-future launches is understated until we finish that enhancement.
- **Change management.** Moving off "12 weeks for everything" needs trust in the numbers. We are rolling it on one market at a time and measuring the buy-plan impact at each step.

## Where we are
- Built, and opt-in per market and warehouse (off by default, so nothing changes until we choose to switch it on).
- The seasonal up-front ordering rule (the September commitment) is already in the plan.
- 2 years of stock history now loaded, sharpening the recommendations.
- Next: switch it on for the clear-cut markets (UK and EU 3PL), release the US over-stock, and finish the launch-timing enhancement.
