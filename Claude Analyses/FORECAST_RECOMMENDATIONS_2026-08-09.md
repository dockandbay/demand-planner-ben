# HORIZON — Forecast Recommendations (next 4 months)

**Window:** Aug-26, Sep-26, Oct-26, Nov-26 · **Source:** sandbox · **Generated:** 2026-08-09

Built from the new recommendation rules: **category** trend via `aiRec` (median YoY of completed months, BI-lifted for stockouts, hedged to a confident minimum) and **SKU** via the leader-protected allocation. For each subcategory · country · channel we compare the **recommended** growth to the **plan's forecast growth** for Aug-26, Sep-26, Oct-26, Nov-26 (plan units ÷ last-year actuals for the same months).

- **Win (raise ↑)** = recommended *minimum* growth exceeds the plan by ≥15pts — under-forecast upside.
- **Cut (lower ↓)** = the plan is more bullish than even the trend's optimistic read (or ignores a declining trend) by ≥15pts — over-forecast risk.
- **+units / −units** = the recommended change over the 4-month window (the size of the move).
- **Volume tier** = avg last-year units/month over the window (High >1,500 · Med 401–1,500 · Low ≤400). Sorted by units within each.

## Executive summary

**Biggest wins (raise) — top 12 by recommended extra units, Aug-26, Sep-26, Oct-26, Nov-26:**

| # | Subcategory · Market · Channel | Trend | Rec. min | Plan | Gap | +units (4mo) | Vol |
|---|---|---|---|---|---|---|---|
| 1 | Towel - Beach SEASONAL · UK DTC | High growth | +50% | -8% | 58pts | **+8,698** | High (3,733/mo) |
| 2 | Hair Wrap SEASONAL · UK DTC | High growth | +75% | +28% | 47pts | **+5,898** | High (3,167/mo) |
| 3 | Towel - Beach CORE · US FBA | Low growth | +5% | -25% | 30pts | **+3,765** | High (3,165/mo) |
| 4 | Tea Towel · AU DTC | High growth | +75% | +0% | 75pts | **+3,358** | Med (1,117/mo) |
| 5 | Towel - Beach CORE · EU DTC | High growth | +25% | -45% | 70pts | **+2,743** | Med (983/mo) |
| 6 | Towel - Beach SEASONAL SUM · AU DTC | High growth | +75% | -15% | 90pts | **+2,132** | Med (593/mo) |
| 7 | Towel - Beach SEASONAL · UK FBA | High growth | +60% | -8% | 68pts | **+2,079** | Med (763/mo) |
| 8 | Towel - Beach SEASONAL · EU DTC | High growth | +60% | -38% | 98pts | **+1,559** | Low (396/mo) |
| 9 | Towel - Beach SEASONAL · UK B2B | High growth | +75% | +13% | 62pts | **+1,476** | Med (598/mo) |
| 10 | Tea Towel · UK FBA | High growth | +75% | -6% | 81pts | **+1,470** | Med (452/mo) |
| 11 | Hair Wrap SEASONAL · UK B2B | High growth | +75% | +8% | 67pts | **+1,377** | Med (515/mo) |
| 12 | Hair Wrap CORE · UK B2B | Med growth | +15% | -29% | 44pts | **+1,068** | Med (614/mo) |

**Biggest cuts (lower) — top 8 by over-forecast units:**

| # | Subcategory · Market · Channel | Trend | Rec. (stretch) | Plan | Over | −units (4mo) | Vol |
|---|---|---|---|---|---|---|---|
| 1 | Poncho - Adults CORE · UK DTC | High decline | -55% | -28% | 27pts | **−522** | Med (485/mo) |

---

## UK

### UK · DTC

**Raise ↑ (4)**

| Subcategory | Trend | Rec. min | Plan | Gap | +units | Vol/mo |
|---|---|---|---|---|---|---|
| Towel - Beach SEASONAL | High growth · BI↑ | +50% | -8% | 58pts | +8,698 | 3,733 (High) |
| Hair Wrap SEASONAL | High growth | +75% | +28% | 47pts | +5,898 | 3,167 (High) |
| Poncho - Adults SEASONAL | Med growth | +20% | -36% | 56pts | +1,001 | 448 (Med) |
| Bag - Toiletry | High growth | +70% | -18% | 88pts | +564 | 161 (Low) |

**Lower ↓ (1)**

| Subcategory | Trend | Rec. (stretch) | Plan | Over | −units | Vol/mo |
|---|---|---|---|---|---|---|
| Poncho - Adults CORE | High decline | -55% | -28% | 27pts | −522 | 485 (Med) |

<details><summary>SKU-level movers (top subcats)</summary>

- **Towel - Beach SEASONAL** — ↑ TOWLB-DES-XL-OCETRES +574 · ↓ TOWLB-DES-XL-RSPROAD -537, TOWLB-DES-LG-BLUSKY -528, TOWLB-DES-LG-PSTPIER -528, TOWLB-DES-LG-RSPROAD -528, TOWLB-DES-XL-BLUSKY -528
- **Hair Wrap SEASONAL** — ↑ HAIRW-SUE-HOTTROP +1,725, HAIRW-WAF-CHRYBMB +1,519, HAIRW-SUE-OCETRES +891, HAIRW-SUE-WYWH +270, HAIRW-SUE-MIAMI +250, HAIRW-WAF-BOHMDRM +38
- **Poncho - Adults SEASONAL** — ↑ PONCHA-SUM-MD-CSTCANDY +281, PONCHA-SUM-LG-CSTCANDY +204, PONCHA-DES-MD-WTRSUG +65, PONCHA-DES-LG-WTRSUG +41, PONCHA-SUM-LG-LAZRIV +35
- **Picnic Blanket** — ↑ PICNIC-DES-XL-BRGTSIDE +8,761, PICNIC-DES-LG-BRGTSIDE +6,829, PICNIC-SUM-XL-UNICN +1,846, PICNIC-CAB-LG-NAVY +1,052, PICNIC-SUM-LG-UNICN +629 · ↓ PICNIC-CAB-XL-NAVY -19,814
- **Bag - Dry XS** — ↑ BAGDRY-XS-MIAMI +924, BAGDRY-XS-NAVY +680, BAGDRY-XS-HOTTROP +179

</details>

### UK · FBA

**Raise ↑ (8)**

| Subcategory | Trend | Rec. min | Plan | Gap | +units | Vol/mo |
|---|---|---|---|---|---|---|
| Towel - Beach SEASONAL | High growth · BI↑ | +60% | -8% | 68pts | +2,079 | 763 (Med) |
| Tea Towel | High growth | +75% | -6% | 81pts | +1,470 | 452 (Med) |
| Hair Wrap SEASONAL | High growth | +75% | +8% | 67pts | +991 | 368 (Low) |
| Hair Wrap CORE | High growth | +50% | +2% | 48pts | +329 | 172 (Low) |
| Picnic Blanket | High growth | +30% | -16% | 46pts | +133 | 72 (Low) |
| Poncho - Adults CORE | Low growth | +5% | -18% | 23pts | +106 | 117 (Low) |
| Poncho - Adults SEASONAL | Med growth | +10% | -24% | 34pts | +90 | 67 (Low) |
| Towel - Home | Med growth | +10% | -27% | 37pts | +84 | 58 (Low) |

<details><summary>SKU-level movers (top subcats)</summary>

- **Towel - Beach SEASONAL** — ↓ TOWLB-DES-LG-BLUSKY -140, TOWLB-DES-LG-RSPROAD -140, TOWLB-DES-LG-HOTTROP -131, TOWLB-DES-LG-IBZAGLW -131, TOWLB-DES-LG-OCETRES -131, TOWLB-DES-LG-PNKPARA -131
- **Tea Towel** — ↑ TEATWL-MD-RGRTTI +66 · ↓ TEATWL-MD-CHECKPLS -66, TEATWL-MD-HEADCHEF -66, TEATWL-MD-PEAPOD -66, TEATWL-MD-SOUSCHEF -66, TEATWL-MD-WINEDINE -66
- **Hair Wrap SEASONAL** — ↓ HAIRW-SUE-OCETRES -556, HAIRW-SUE-IBZAGLW -382, HAIRW-WAF-CHRYBMB -291, HAIRW-SUE-MIAMI -268, HAIRW-SUE-PNKPARA -221, HAIRW-SUE-BBGWLK -165
- **Towel - Beach SEASONAL SUM** — ↑ TOWLB-SUM-XL-OCEAN +90 · ↓ TOWLB-SUM-XL-COLAGN -126, TOWLB-SUM-LG-MIAMI -103, TOWLB-SUM-LG-CSTCANDY -91, TOWLB-SUM-LG-TUTFRU -84, TOWLB-SUM-LG-OCEAN -70

</details>

### UK · B2B

**Raise ↑ (11)**

| Subcategory | Trend | Rec. min | Plan | Gap | +units | Vol/mo |
|---|---|---|---|---|---|---|
| Towel - Beach SEASONAL | High growth | +75% | +13% | 62pts | +1,476 | 598 (Med) |
| Hair Wrap SEASONAL | High growth | +75% | +8% | 67pts | +1,377 | 515 (Med) |
| Hair Wrap CORE | Med growth | +15% | -29% | 44pts | +1,068 | 614 (Med) |
| Picnic Blanket | High growth | +60% | -81% | 141pts | +1,011 | 179 (Low) |
| Towel - Beach SEASONAL SUM | Med growth | +15% | -16% | 31pts | +524 | 429 (Med) |
| Tea Towel | High growth | +25% | -25% | 50pts | +254 | 128 (Low) |
| Gift Box | High growth | +75% | +7% | 68pts | +207 | 76 (Low) |
| Poncho - Kids SEASONAL | Low growth | +5% | -99% | 104pts | +186 | 45 (Low) |
| Bag - Foldable | High growth | +70% | +22% | 48pts | +168 | 88 (Low) |
| Towel - Home | High growth | +75% | +0% | 75pts | +156 | 52 (Low) |
| Bag - Toiletry | High growth | +75% | +3% | 72pts | +137 | 48 (Low) |

<details><summary>SKU-level movers (top subcats)</summary>

- **Towel - Beach SEASONAL** — ↑ TOWLB-DES-XL-GRECSHR +143, TOWLB-KID-LG-CHECKOUT +108 · ↓ TOWLB-DES-LG-RSPROAD -153, TOWLB-DES-LG-PSTPIER -141, TOWLB-DES-LG-BLUSKY -114, TOWLB-DES-XL-HOTTROP -105
- **Hair Wrap SEASONAL** — ↓ HAIRW-WAF-CHRYBMB -1,165, HAIRW-WAF-WTRSPRZ -923, HAIRW-SUE-PSTPIER -894, HAIRW-SUE-BLUSHBY -825, HAIRW-SUE-PALMPCH -825, HAIRW-WAF-SEASOIR -819
- **Hair Wrap CORE** — ↑ HAIRW-CAB-LTPNK-NB +364, HAIRW-SUM-UNICN-NB +35 · ↓ HAIRW-CAB-LTPPL-NB -647, HAIRW-CAB-NAVY-NB -54

</details>

---

## US

### US · DTC

**Raise ↑ (1)**

| Subcategory | Trend | Rec. min | Plan | Gap | +units | Vol/mo |
|---|---|---|---|---|---|---|
| Towel - Beach SEASONAL | High growth · BI↑ | +55% | +27% | 28pts | +369 | 332 (Low) |

<details><summary>SKU-level movers (top subcats)</summary>

- **Towel - Beach SEASONAL** — ↑ TOWLB-DES-XL-BLUSKY +76 · ↓ TOWLB-COLLAB-LG-UNO -191, TOWLB-COLLAB-XL-UNO -160, TOWLB-DES-LG-OCETRES -60, TOWLB-DES-LG-PNKPARA -60, TOWLB-DES-XL-PNKPARA -55
- **Poncho - Kids CORE** — ↓ PONCHK-SUM-MD-UNICN-NS -56, PONCHK-CAB-MD-NAVY-NS -28, PONCHK-CAB-MD-BLUE-NS -24

</details>

### US · FBA

**Raise ↑ (3)**

| Subcategory | Trend | Rec. min | Plan | Gap | +units | Vol/mo |
|---|---|---|---|---|---|---|
| Towel - Beach CORE | Low growth | +5% | -25% | 30pts | +3,765 | 3,165 (High) |
| Tea Towel | High growth | +75% | -9% | 84pts | +90 | 27 (Low) |
| Bag - Foldable | High growth | +75% | +39% | 36pts | +88 | 61 (Low) |

<details><summary>SKU-level movers (top subcats)</summary>

- **Towel - Beach CORE** — ↑ TOWLB-CAB-LG-NAVY-R +3,697, TOWLB-CAB-XL-NAVY-R +1,705 · ↓ TOWLB-CAB-LG-BLUE-R -357, TOWLB-CAB-LG-LTPNK-R -280, TOWLB-CAB-XL-BLUE-R -216, TOWLB-CAB-LG-KHAKI-R -207
- **Bag - Foldable** — ↓ BAGF-SUM-MD-UNICN -667, BAGF-SUM-MD-CSTCANDY -629, BAGF-SUM-MD-MIAMI -573, BAGF-DES-MD-WAVYBBY -522, BAGF-DES-MD-IBZAGLW -417, BAGF-CAB-MD-LTPNK -287
- **Hair Wrap SEASONAL** — ↑ HAIRW-SUE-MIAMI +66 · ↓ HAIRW-WAF-CHRYBMB -186, HAIRW-SUE-OCETRES -182, HAIRW-SUE-PSTPIER -62, HAIRW-SUE-IBZAGLW -47, HAIRW-WAF-TIGPALM -45

</details>

### US · B2B

**Raise ↑ (5)**

| Subcategory | Trend | Rec. min | Plan | Gap | +units | Vol/mo |
|---|---|---|---|---|---|---|
| Bag - Foldable | Low growth | +5% | -79% | 84pts | +541 | 161 (Low) |
| Hair Wrap SEASONAL | High growth | +75% | +15% | 60pts | +379 | 158 (Low) |
| Towel - Beach SEASONAL | High growth | +20% | -15% | 35pts | +305 | 221 (Low) |
| Gift Box | High growth | +75% | -8% | 83pts | +258 | 78 (Low) |
| Tea Towel | High growth | +75% | -14% | 89pts | +245 | 69 (Low) |

<details><summary>SKU-level movers (top subcats)</summary>

- **Bag - Foldable** — ↑ BAGF-SUM-MD-CSTCANDY +106 · ↓ BAGF-CAB-MD-LTPNK -57, BAGF-SUM-MD-MIAMI -43, BAGF-DES-MD-WYWH -38, BAGF-DES-MD-IBZAGLW -35, BAGF-DES-MD-SPRCLUB -35
- **Hair Wrap SEASONAL** — ↑ HAIRW-SUE-MIAMI +138 · ↓ HAIRW-WAF-CHRYBMB -158, HAIRW-SUE-PSTPIER -82, HAIRW-WAF-BOHMDRM -68, HAIRW-WAF-TIGPALM -61, HAIRW-WAF-WTRSPRZ -59
- **Towel - Beach SEASONAL** — ↓ TOWLB-COLLAB-LG-UNO -268, TOWLB-DES-XL-RSPROAD -132, TOWLB-DES-XL-PSTPIER -126, TOWLB-DES-LG-RSPROAD -107, TOWLB-DES-LG-BLUSKY -106, TOWLB-DES-LG-OCETRES -100

</details>

---

## EU

### EU · DTC

**Raise ↑ (7)**

| Subcategory | Trend | Rec. min | Plan | Gap | +units | Vol/mo |
|---|---|---|---|---|---|---|
| Towel - Beach CORE | High growth | +25% | -45% | 70pts | +2,743 | 983 (Med) |
| Towel - Beach SEASONAL | High growth | +60% | -38% | 98pts | +1,559 | 396 (Low) |
| Hair Wrap SEASONAL | High growth | +75% | -4% | 79pts | +749 | 236 (Low) |
| Bag - Foldable | High growth | +20% | -38% | 58pts | +340 | 146 (Low) |
| Tea Towel | High growth | +75% | -16% | 91pts | +329 | 91 (Low) |
| Poncho - Adults CORE | High growth | +70% | -22% | 92pts | +119 | 33 (Low) |
| Poncho - Adults SEASONAL | Med growth | +20% | -39% | 59pts | +93 | 40 (Low) |

<details><summary>SKU-level movers (top subcats)</summary>

- **Towel - Beach CORE** — ↑ TOWLB-CAB-LG-NAVY-R +821, TOWLB-CAB-XL-NAVY-R +692 · ↓ TOWLB-CAB-XL-LTBGE-R -97, TOWLB-SUM-LG-UNICN-R -79, TOWLB-SUM-XL-UNICN-R -62, TOWLB-CAB-LG-LTGRY-R -61
- **Towel - Beach SEASONAL** — ↓ TOWLB-DES-LG-BLUSKY -180, TOWLB-DES-LG-HOTTROP -166, TOWLB-DES-LG-PSTPIER -165, TOWLB-DES-LG-RSPROAD -165, TOWLB-DES-XL-BLUSKY -162, TOWLB-DES-LG-OCETRES -161
- **Hair Wrap SEASONAL** — ↓ HAIRW-WAF-CHRYBMB -352, HAIRW-SUE-PNKPARA -100, HAIRW-SUE-WYWH -82, HAIRW-SUE-OCETRES -77, HAIRW-SUE-BLUSHBY -69, HAIRW-SUE-PALMPCH -69

</details>

### EU · FBA

_No material recommendation changes — the plan is tracking the trend (0 subcats have no clear trend / too few months)._

### EU · B2B

**Raise ↑ (4)**

| Subcategory | Trend | Rec. min | Plan | Gap | +units | Vol/mo |
|---|---|---|---|---|---|---|
| Tea Towel | High growth | +50% | -60% | 110pts | +1,052 | 240 (Low) |
| Towel - Beach SEASONAL SUM | High growth | +25% | -54% | 79pts | +477 | 151 (Low) |
| Cooling | High growth | +75% | -100% | 175pts | +214 | 31 (Low) |
| Towel - Home | High growth | +65% | -36% | 101pts | +184 | 45 (Low) |

<details><summary>SKU-level movers (top subcats)</summary>

- **Tea Towel** — ↓ TEATWL-MD-BIGDILL -114, TEATWL-MD-MTCHCRSH -112, TEATWL-MD-STRWPOP -112, TEATWL-MD-XTRSAUC -112, TEATWL-MD-CHECKPLS -109, TEATWL-MD-HEADCHEF -109
- **Towel - Beach SEASONAL SUM** — ↑ TOWLB-SUM-XL-CSTCANDY +33, TOWLB-SUM-XL-OCEAN +31, TOWLB-SUM-XL-TUTFRU +31 · ↓ TOWLB-SUM-LG-MIAMI -20
- **Cooling** — ↑ COOL-DES-MIDNMOV +35

</details>

### EU · ZAL

_No material recommendation changes — the plan is tracking the trend (0 subcats have no clear trend / too few months)._

---

## AU

### AU · DTC

**Raise ↑ (3)**

| Subcategory | Trend | Rec. min | Plan | Gap | +units | Vol/mo |
|---|---|---|---|---|---|---|
| Tea Towel | High growth | +75% | +0% | 75pts | +3,358 | 1,117 (Med) |
| Towel - Beach SEASONAL SUM | High growth | +75% | -15% | 90pts | +2,132 | 593 (Med) |
| Poncho - Adults SEASONAL | High growth | +60% | -6% | 66pts | +191 | 72 (Low) |

<details><summary>SKU-level movers (top subcats)</summary>

- **Tea Towel** — ↑ TEATWL-MD-TRPPNCH +244, TEATWL-MD-SQCLEAN +183, TEATWL-MD-RGRTTI +112 · ↓ TEATWL-MD-CHECKPLS -63, TEATWL-MD-HEADCHEF -63, TEATWL-MD-PEAPOD -63
- **Towel - Beach SEASONAL SUM** — ↑ TOWLB-SUM-XL-CSTCANDY +1,091 · ↓ TOWLB-SUM-LG-MIAMI -233, TOWLB-SUM-LG-COLAGN -200, TOWLB-SUM-XL-COLAGN -159, TOWLB-SUM-XL-MIAMI -136, TOWLB-SUM-LG-CSTCANDY -132
- **Poncho - Adults SEASONAL** — ↑ PONCHA-SUM-LG-CSTCANDY +67 · ↓ PONCHA-DES-LG-WAVYBBY -32, PONCHA-DES-LG-IBZAGLW -29, PONCHA-DES-LG-WTRSUG -23
- **Poncho - Adults CORE** — ↑ PONCHA-CAB-LG-NAVY-NS +91, PONCHA-CAB-XL-NAVY +70, PONCHA-CAB-MD-NAVY-NS +31, PONCHA-SUM-XL-UNICN +28
- **Picnic Blanket** — ↑ PICNIC-SUM-XL-UNICN +36, PICNIC-SUM-LG-UNICN +32 · ↓ PICNIC-DES-XL-BRGTSIDE -21

</details>

### AU · FBA

**Raise ↑ (1)**

| Subcategory | Trend | Rec. min | Plan | Gap | +units | Vol/mo |
|---|---|---|---|---|---|---|
| Bag - Foldable | High growth | +75% | -4% | 79pts | +111 | 35 (Low) |

<details><summary>SKU-level movers (top subcats)</summary>

- **Bag - Foldable** — ↓ BAGF-DES-MD-WAVYBBY -28, BAGF-DES-MD-WYWH -28, BAGF-SUM-MD-MIAMI -28, BAGF-DES-MD-WTRSUG -25, BAGF-DES-MD-IBZAGLW -22, BAGF-DES-MD-SPRCLUB -22

</details>

### AU · B2B

_No material recommendation changes — the plan is tracking the trend (0 subcats have no clear trend / too few months)._

---

## CA

### CA · DTC

_No material recommendation changes — the plan is tracking the trend (0 subcats have no clear trend / too few months)._

### CA · FBA

_No material recommendation changes — the plan is tracking the trend (1 subcats have no clear trend / too few months)._

### CA · B2B

_No material recommendation changes — the plan is tracking the trend (0 subcats have no clear trend / too few months)._

---

## Method & caveats
- Recommended growth = `aiRec` **confident minimum** (median YoY hedged toward flat); "stretch" = its optimistic bound. Plan growth = plan forecast ÷ last-year actuals over Aug-26, Sep-26, Oct-26, Nov-26.
- Only subcats with ≥100 LY units over the window are shown (noise floor). "Mixed"/no-basis subcats are excluded from recommendations.
- SKU movers use the **leader-protected allocation vs the current cascade** (the change smoothing-with-leader would make) — directional, for drill-down; the category figures are the headline.
- **Cuts** shown for **Med/High volume only** — on a small last-year base a large plan-vs-trend % is unreliable (e.g. a near-zero LY month), so low-volume "over-forecasts" are omitted rather than recommend cutting against a base too small to trust.
- **Sandbox data** — actuals/forecasts differ from live; treat magnitudes as indicative and re-run on live for final numbers. Small-base seasonal subcats can show very high % (that's why units + volume tier are shown alongside).
