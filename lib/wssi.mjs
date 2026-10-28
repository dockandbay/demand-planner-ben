// v28.485 (Ben 26-Oct-26): DEMAND ▸ WSSI (weekly sales, stock and intake with open to buy). Replaces REPORTS ▸ Open-to-Buy.
// Read only. The server builds SKU-level facts for one financial year (Mar to Feb) plus last year, then rolls them up to
// market × channel (sales) and market × stock pool (stock) × category × seasonality × product status. The client sums the
// rows the filters keep and derives the ratios (ASP, margins, cover, variances). Logic doc: lib/ai-logic/wssi.md.
//
// Sources (all GBP):
//   sales actual   planner.sales_actuals (revenue already GBP)
//   sales forecast planner.forecast_outputs units × forecast ASP (same month last year at SKU, then sub-category, then the SKU's
//                  last 3 actual months, then full price; × price changes; × ASP reduction; capped at 1.2 × full price)
//   stock          planner.inventory_snapshots on the 1st of each month (opening = 1st of the month, closing = 1st of the next)
//   intake         actual months: stock movement per SKU (closing − opening + units sold from that pool; sets sold are
//                  exploded into their components). 3PL ↔ FBA moves inside a market are transfers; what is left is intake
//                  when positive and write-offs / other when negative. (PO receipt history only starts Dec-25, so POs
//                  cannot give last year's intake.) Forecast months: PRODUCTION / READY TO SHIP / SHIPPING POs by expected
//                  arrival (shipment dates, else landing override, else production end + 7 days + branch sea lead time;
//                  overdue ones land in the first forecast month)
//   current price  the SKU's actual ASP over the last 3 months in that market (consumer channels), else full price × 0.95
//   full price     <market>_rt ÷ FX ÷ VAT/GST (UK/EU 1.2, AU 1.1); wholesale (B2B) = half of that
//   cost           products.cost (supplier currency, USD) ÷ FX USD; else the category's average PO line cost
//   target stock   cover-weeks target (products.target_cover_weeks_<mkt>_<pool>_from_category, default 8) × next 3 months' weekly demand

export const WSSI_MARKETS = ['UK', 'US', 'EU', 'AU', 'CA'];
const POOL_OF_CH = { DTC: '3PL', B2B: '3PL', ZAL: '3PL', TIK: '3PL', FBA: 'FBA' };
const CONSUMER = { DTC: 1, FBA: 1, ZAL: 1, TIK: 1 };
const TAX_DIV = { UK: 1.2, EU: 1.2, AU: 1.1, US: 1, CA: 1 };
const RT_COL = { UK: 'uk_rt', US: 'us_rt', EU: 'eu_rt', AU: 'au_rt', CA: 'ca_rt' };
const FX_KEY = { US: 'USD', EU: 'EUR', AU: 'AUD', CA: 'CAD' };
const FX_DEF = { USD: 1.34, EUR: 1.15, AUD: 1.9, CAD: 1.85 };
const DEFAULT_COVER = 8;
// v28.546 (Kathryn's WSSI template, sheet 2): Horizon categories roll up to category groups; Non Core (point of sale, boxes, gift cards) is left
// out of the WSSI completely; anything not listed (incl. closed categories) is Other.
const CATEGORY_GROUP = { 'Towel - Beach': 'Beach Towels',
  'Hair Wrap': 'Beauty', 'Gift Box': 'Beauty', 'Eye Mask': 'Beauty', 'Makeup Remover': 'Beauty',
  'Poncho - Adults': 'Ponchos', 'Poncho - Kids': 'Ponchos',
  'Picnic Blanket': 'Picnic & Outdoor', 'Beach Pillow': 'Picnic & Outdoor', 'Bag - Cooling': 'Picnic & Outdoor',
  'Bag - Foldable': 'Bags', 'Bag - Dry XS': 'Bags', 'Bag - Dry MD': 'Bags', 'Bag - Beach': 'Bags', 'Bag - Toiletry': 'Bags',
  'Tea Towel': 'Home', 'Towel - Home': 'Home', 'Towel - Dog': 'Home', 'Kids Towel - Home': 'Home', 'Gift Box Home': 'Home', 'Bath Robe': 'Home' };
const WSSI_EXCLUDED_CATEGORY = /^non core$/i;
export const catGroup = (c) => CATEGORY_GROUP[String(c || '').trim()] || 'Other';
export const WSSI_CGROUPS = ['Beach Towels', 'Beauty', 'Ponchos', 'Picnic & Outdoor', 'Bags', 'Home', 'Other'];
export const wssiExcludedCategory = (c) => WSSI_EXCLUDED_CATEGORY.test(String(c || '').trim());
// v28.546: landed cost per SKU from planner.cogs_values (Fulfil landed cost, else supplier cost / set BOM), by the warehouse of the market and pool
const COGS_COL = { UK: { '3PL': 'UK ILG', FBA: 'UK FBA' }, US: { '3PL': 'US Geneva', FBA: 'US FBA' }, EU: { '3PL': 'EU iFulfillment', FBA: 'EU FBA' }, AU: { '3PL': 'AU Coghlans', FBA: 'AU FBA' }, CA: {} };
const STOCK_COLS = ['opU', 'opC', 'opR', 'opF', 'clU', 'clC', 'clR', 'clF', 'inU', 'inC', 'inR', 'trU', 'trC', 'trR', 'woU', 'woC', 'woR', 'tgU', 'tgC', 'tgR', 'plU', 'plC', 'fwdU'];

// 'YYYY-MM' helpers
const mk = (y, m) => y + '-' + String(m).padStart(2, '0');
function addM(k, n) { let y = +k.slice(0, 4), m = +k.slice(5, 7) + n; while (m > 12) { m -= 12; y++; } while (m < 1) { m += 12; y--; } return mk(y, m); }
const daysIn = (k) => new Date(Date.UTC(+k.slice(0, 4), +k.slice(5, 7), 0)).getUTCDate();
const fyOf = (k) => (+k.slice(5, 7) >= 3 ? +k.slice(0, 4) : +k.slice(0, 4) - 1);
function poolOfWh(wh) { const w = String(wh || '').toLowerCase(); return (w.endsWith('_fba') || w.endsWith('_awd')) ? 'FBA' : '3PL'; }
const mktOfWh = (wh) => String(wh || '').split('_')[0].toUpperCase();

// Load raw rows for FY <fyStart> (Mar fyStart .. Feb fyStart+1) and the year before. `q` = (sql, params) => rows.
export async function wssiLoad(q, fyStart) {
  const from = mk(fyStart - 2, 12) + '-01';                 // 3 months before LY starts (trailing ASP for LY valuation)
  const to = mk(fyStart + 1, 6) + '-01';                    // FY end + 3 months (forward demand for targets)
  const [products, sales, fc, snaps, pos, pc, as, poCost, bom, cogs] = await Promise.all([
    q(`SELECT sku, coalesce(category,'') category, coalesce(subcategory,'') subcategory, coalesce(nullif(trim(core_seasonal),''),'Unassigned') season,
         coalesce(nullif(trim(status),''),'Unknown') status, cost::float8 cost, uk_rt::float8 uk_rt, us_rt::float8 us_rt, eu_rt::float8 eu_rt,
         au_rt::float8 au_rt, ca_rt::float8 ca_rt,
         target_cover_weeks_uk_3pl_from_category c_uk_3pl, target_cover_weeks_uk_fba_from_category c_uk_fba,
         target_cover_weeks_us_3pl_from_category c_us_3pl, target_cover_weeks_us_fba_from_category c_us_fba,
         target_cover_weeks_eu_3pl_from_category c_eu_3pl, target_cover_weeks_eu_fba_from_category c_eu_fba,
         target_cover_weeks_au_3pl_from_category c_au_3pl, target_cover_weeks_au_fba_from_category c_au_fba,
         target_cover_weeks_ca_fba_from_category c_ca_fba
       FROM planner.products`),
    q(`SELECT sku, upper(country) mkt, upper(channel) ch, to_char(month,'YYYY-MM') m, sum(units)::float8 u, sum(revenue)::float8 r
       FROM planner.sales_actuals WHERE month >= $1::date AND month < $2::date GROUP BY 1,2,3,4`, [from, to]),
    q(`SELECT sku, upper(split_part(warehouse,'_',1)) mkt, upper(channel) ch, to_char(month,'YYYY-MM') m, sum(units)::float8 u
       FROM planner.forecast_outputs WHERE month >= $1::date AND month < $2::date AND units <> 0 GROUP BY 1,2,3,4`, [from, to]),
    q(`SELECT sku, warehouse wh, to_char(snapshot_date,'YYYY-MM') m, sum(available)::float8 u
       FROM planner.inventory_snapshots WHERE extract(day from snapshot_date) = 1 AND snapshot_date >= $1::date AND snapshot_date <= $2::date
       GROUP BY 1,2,3`, [from, to]),
    q(`SELECT l.sku, upper(coalesce(nullif(po.country_code,''), b.country_code, '')) mkt,
         CASE WHEN coalesce(po.branch,'') ~* '(fba|awd)' THEN 'FBA' ELSE '3PL' END pool,
         to_char(coalesce(s.arrival_date, s.delivery_date, s.landing_date, po.delivery_date_overide, po.landing_date_overide,
           (coalesce(po.end_production_overide,
              CASE WHEN po.start_production IS NOT NULL AND su.production_days IS NOT NULL
                   THEN (po.start_production + (su.production_days||' days')::interval)::date END)
            + interval '7 days' + (coalesce(b.sea_lead_time_days,0)||' days')::interval)::date), 'YYYY-MM') m,
         sum(l.qty)::float8 u
       FROM planner.purchase_orders po
       JOIN planner.purchase_order_lines l ON l.po = po.po AND l.qty > 0
       LEFT JOIN planner.shipments s ON s.shipment_ref = po.shipment_ref
       LEFT JOIN planner.branches b ON b.name = po.branch
       LEFT JOIN planner.suppliers su ON su.id = po.supplier_id
       WHERE upper(coalesce(po.status,'')) IN ('PRODUCTION','READY TO SHIP','SHIPPING')
       GROUP BY 1,2,3,4`),
    q(`SELECT upper(country) country, coalesce(channel,'') channel, coalesce(subcategory,'') subcategory, effective_month, uplift_pct::float8 uplift_pct
       FROM planner.price_changes`).catch(() => []),
    q(`SELECT key, value FROM planner.app_settings WHERE key IN ('fx_rates','asp_adjust')`).catch(() => []),
    q(`SELECT p.category, avg(l.cost_price)::float8 c FROM planner.purchase_order_lines l JOIN planner.products p ON p.sku = l.sku
       WHERE l.cost_price > 0 AND p.category IS NOT NULL GROUP BY 1`).catch(() => []),
    q(`SELECT trim(output_sku) o, trim(input_sku) i, input_quantity::float8 q FROM planner.set_bom`).catch(() => []),
    q(`SELECT sku, col, value::float8 v, upper(coalesce(ccy,'')) ccy FROM planner.cogs_values WHERE value > 0`).catch(() => []),   // v28.546 landed cost
  ]);
  const setting = (k) => { const r = as.find(x => x.key === k); try { return r && r.value ? JSON.parse(r.value) : {}; } catch { return {}; } };
  return { products, sales, fc, snaps, pos, bom, priceChanges: pc, fx: setting('fx_rates'), aspAdjust: setting('asp_adjust'), poCost, cogs };
}

// Pure build. raw = wssiLoad() output; today = 'YYYY-MM-DD'.
export function wssiBuild(raw, fyStart, today) {
  const curM = today.slice(0, 7);
  const lyStart = mk(fyStart - 1, 3), fyEnd = mk(fyStart + 1, 2);
  const tl = []; for (let k = mk(fyStart - 2, 12); k <= addM(fyEnd, 3); k = addM(k, 1)) tl.push(k);   // full timeline
  const out24 = []; for (let k = lyStart; k <= fyEnd; k = addM(k, 1)) out24.push(k);
  const weeks = (k) => daysIn(k) / 7;

  // actuals run to the last COMPLETED month whose closing snapshot (1st of the next month) exists
  const snapMonths = new Set(raw.snaps.map(r => r.m));
  let actualTo = null;
  for (let k = addM(curM, -1); k >= tl[0]; k = addM(k, -1)) { if (snapMonths.has(addM(k, 1))) { actualTo = k; break; } }
  if (!actualTo) actualTo = addM(curM, -1);
  const isAct = (k) => k <= actualTo;

  // FX (local per GBP) by financial year; falls back to the latest year set
  const fxYears = Object.keys(raw.fx || {}).sort();
  const fxFor = (k, ccy) => { const y = String(fyOf(k)); const o = (raw.fx && (raw.fx[y] || raw.fx[fxYears[fxYears.length - 1]])) || {}; return Number(o[ccy]) || FX_DEF[ccy]; };
  const toGbp = (amt, mkt, k) => mkt === 'UK' ? amt : amt / fxFor(k, FX_KEY[mkt] || 'USD');

  // products
  const P = {}; const catCost = {}; (raw.poCost || []).forEach(r => { catCost[r.category] = Number(r.c) || 0; });
  const EXCL = new Set();
  for (const p of raw.products) { if (WSSI_EXCLUDED_CATEGORY.test(String(p.category || '').trim())) { EXCL.add(p.sku); continue; } P[p.sku] = Object.assign({}, p, { cgroup: catGroup(p.category) }); }
  if (EXCL.size) { const keep = r => !EXCL.has(r.sku); raw = Object.assign({}, raw, { sales: raw.sales.filter(keep), fc: raw.fc.filter(keep), snaps: raw.snaps.filter(keep), pos: raw.pos.filter(keep) }); }
  const prod = (sku) => P[sku] || { sku, category: '', cgroup: 'Other', subcategory: '', season: 'Unassigned', status: 'Unknown', cost: null };
  const COGS = {}; for (const r of (raw.cogs || [])) COGS[r.sku + '|' + r.col] = r;
  // v28.546: landed cost for the market and pool when the COGS feed has it (converted to GBP), else products.cost (USD, FOB) / the category's PO cost
  const costGbp = (sku, k, mkt, pool) => { const col = mkt && pool && COGS_COL[mkt] && COGS_COL[mkt][pool], c = col && COGS[sku + '|' + col];
    if (c && c.v > 0) return c.ccy === 'GBP' || !c.ccy ? c.v : c.v / fxFor(k, c.ccy);
    const p = prod(sku); const usd = Number(p.cost) > 0 ? Number(p.cost) : (catCost[p.category] || 0); return usd / fxFor(k, 'USD'); };
  const fullGbp = (sku, mkt, k) => { const p = prod(sku); const rt = Number(p[RT_COL[mkt]]); if (!(rt > 0)) return 0; return toGbp(rt, mkt, k) / (TAX_DIV[mkt] || 1); };
  const coverWks = (sku, mkt, pool) => { const v = parseFloat(prod(sku)['c_' + mkt.toLowerCase() + '_' + pool.toLowerCase()]); return v > 0 ? v : DEFAULT_COVER; };

  // sales actuals: per sku|mkt|ch → {m:[u,r]}; consumer per sku|mkt → {m:[u,r]}; subcat|mkt|ch → {m:[u,r]}
  const SA = {}, SC = {}, SUB = {};
  const add2 = (o, key, m, u, r) => { const a = (o[key] || (o[key] = {})); const v = a[m] || (a[m] = [0, 0]); v[0] += u; v[1] += r; };
  for (const r of raw.sales) {
    if (!WSSI_MARKETS.includes(r.mkt)) continue;
    const u = Number(r.u) || 0, rev = Number(r.r) || 0;
    add2(SA, r.sku + '|' + r.mkt + '|' + r.ch, r.m, u, rev);
    if (CONSUMER[r.ch]) add2(SC, r.sku + '|' + r.mkt, r.m, u, rev);
    add2(SUB, prod(r.sku).subcategory + '|' + r.mkt + '|' + r.ch, r.m, u, rev);
  }
  const aspOf = (o, key, m) => { const v = o[key] && o[key][m]; return v && v[0] > 0 && v[1] > 0 ? v[1] / v[0] : 0; };

  // current selling price per sku|mkt at month k: actual ASP over k-2..k (consumer channels); held at actualTo for later months
  const curMemo = {};
  const curPrice = (sku, mkt, k) => {
    const kk = k > actualTo ? actualTo : k, key = sku + '|' + mkt + '|' + kk;
    if (curMemo[key] != null) return curMemo[key];
    let u = 0, r = 0; const a = SC[sku + '|' + mkt] || {};
    for (let i = 0; i < 3; i++) { const v = a[addM(kk, -i)]; if (v && v[1] > 0) { u += v[0]; r += v[1]; } }
    const full = fullGbp(sku, mkt, kk);
    let p = u > 0 ? r / u : full * 0.95;
    if (full > 0 && p > full * 1.2) p = full * 1.2;   // a broken month (revenue on ~0 units) cannot inflate stock value
    return (curMemo[key] = p > 0 ? p : 0);
  };

  // forecast ASP (mirrors DEMAND getASP at SKU level)
  const pcs = raw.priceChanges || [];
  const uplift = (mkt, ch, sub, k) => { let f = 1; for (const p of pcs) { if (String(p.country) !== mkt) continue; if (p.channel && p.channel !== ch) continue; if (p.subcategory && p.subcategory !== sub) continue; if (String(p.effective_month || '').slice(0, 7) > k) continue; f *= 1 + (Number(p.uplift_pct) || 0) / 100; } return f; };
  const aspRed = (mkt, ch) => { const o = raw.aspAdjust && raw.aspAdjust[mkt + '|' + ch]; const v = Math.max(0, Math.min(95, Number(o && o.red) || 0)); return 1 - v / 100; };
  const fcAsp = (sku, mkt, ch, k) => {
    const sub = prod(sku).subcategory, full = fullGbp(sku, mkt, k) * (ch === 'B2B' ? 0.5 : 0.95);
    let base = 0;
    for (let y = 1; y <= 2 && !base; y++) base = aspOf(SA, sku + '|' + mkt + '|' + ch, addM(k, -12 * y));
    for (let y = 1; y <= 2 && !base; y++) base = aspOf(SUB, sub + '|' + mkt + '|' + ch, addM(k, -12 * y));
    if (!base) { let u = 0, r = 0; const a = SA[sku + '|' + mkt + '|' + ch] || {}; for (let i = 0; i < 3; i++) { const v = a[addM(actualTo, -i)]; if (v && v[1] > 0) { u += v[0]; r += v[1]; } } base = u > 0 ? r / u : 0; }
    if (!base) base = full;
    let v = base * uplift(mkt, ch, sub, k) * aspRed(mkt, ch);
    if (full > 0 && v > full * 1.2) v = full * 1.2;
    return v;
  };

  // forecast units per sku|mkt|ch → {m:u}
  const FC = {};
  for (const r of raw.fc) { if (!WSSI_MARKETS.includes(r.mkt)) continue; const key = r.sku + '|' + r.mkt + '|' + r.ch; (FC[key] || (FC[key] = {}))[r.m] = (FC[key][r.m] || 0) + (Number(r.u) || 0); }

  // ── sales facts: month × mkt × ch × sku → units, revenue, cost of sales, full-price revenue ──
  const salesAgg = {};   // key mi|mkt|ch|cat|sea|st → [u, r, cos, full]
  // Stock-side demand: units sold from each pool. A set with a BOM and no stock of its own is built on the fly, so its
  // sales draw on the components (× BOM quantity), not on the set SKU.
  const BOM = {}; (raw.bom || []).forEach(r => { (BOM[r.o] || (BOM[r.o] = [])).push({ sku: r.i, q: Number(r.q) || 1 }); });
  const stockedSku = new Set(raw.snaps.filter(r => Number(r.u) > 0).map(r => r.sku));
  const poolUnits = {};  // sku|mkt|pool → {m:u}  (actual or forecast, every channel drawing on that pool)
  const addPool1 = (sku, mkt, pool, m, u) => { const key = sku + '|' + mkt + '|' + pool; const o = poolUnits[key] || (poolUnits[key] = {}); o[m] = (o[m] || 0) + u; };
  const addPool = (sku, mkt, ch, m, u) => { const pool = POOL_OF_CH[ch];
    if (BOM[sku] && !stockedSku.has(sku)) BOM[sku].forEach(c => addPool1(c.sku, mkt, pool, m, u * c.q)); else addPool1(sku, mkt, pool, m, u); };
  const keysSkuMktCh = new Set([...Object.keys(SA), ...Object.keys(FC)]);
  const idx24 = {}; out24.forEach((k, i) => { idx24[k] = i; });
  for (const key of keysSkuMktCh) {
    const [sku, mkt, ch] = key.split('|'); if (!POOL_OF_CH[ch]) continue;
    const p = prod(sku);
    for (const k of tl) {
      let u = 0, r = 0;
      if (isAct(k)) { const v = SA[key] && SA[key][k]; if (v) { u = v[0]; r = v[1]; } }
      else { u = (FC[key] && FC[key][k]) || 0; if (u) r = u * fcAsp(sku, mkt, ch, k); }
      if (!u && !r) continue;
      addPool(sku, mkt, ch, k, u);
      const i = idx24[k]; if (i == null) continue;
      const ak = i + '|' + mkt + '|' + ch + '|' + p.cgroup + '|' + p.season + '|' + p.status;
      const a = salesAgg[ak] || (salesAgg[ak] = [0, 0, 0, 0]);
      a[0] += u; a[1] += r; a[2] += u * costGbp(sku, k, mkt, POOL_OF_CH[ch]); a[3] += u * fullGbp(sku, mkt, k) * (ch === 'B2B' ? 0.5 : 1);
    }
  }

  // ── stock: snapshots per sku|mkt|pool → {m:u} (month-start) ──
  const SN = {};
  const snapDates = new Set();
  for (const r of raw.snaps) { const mkt = mktOfWh(r.wh); if (!WSSI_MARKETS.includes(mkt)) continue; snapDates.add(r.m); const key = r.sku + '|' + mkt + '|' + poolOfWh(r.wh); (SN[key] || (SN[key] = {}))[r.m] = (SN[key][r.m] || 0) + (Number(r.u) || 0); }
  // confirmed POs per sku|mkt|pool → {m:u}; overdue arrivals land in the first forecast month
  const PO = {}; const firstFc = addM(actualTo, 1);
  for (const r of raw.pos) {
    if (!WSSI_MARKETS.includes(r.mkt) || !r.m) continue;
    const key = r.sku + '|' + r.mkt + '|' + r.pool, o = PO[key] || (PO[key] = {}), m = r.m < firstFc ? firstFc : r.m;
    o[m] = (o[m] || 0) + (Number(r.u) || 0);
  }
  // stockAgg row = STOCK_COLS below
  const stockAgg = {};
  const skuMkts = new Set([...Object.keys(SN), ...Object.keys(PO), ...Object.keys(poolUnits)].map(k => k.split('|').slice(0, 2).join('|')));
  const POOLS = ['3PL', 'FBA'];
  for (const sm of skuMkts) {
    const [sku, mkt] = sm.split('|'); const p = prod(sku);
    const sn = {}, po = {}, pu = {}, prev = {};
    POOLS.forEach(pl => { const key = sm + '|' + pl; sn[pl] = SN[key] || {}; po[pl] = PO[key] || {}; pu[pl] = poolUnits[key] || {}; prev[pl] = null; });
    for (const k of tl) {
      const next = addM(k, 1), act = isAct(k), f = {};
      POOLS.forEach(pl => {
        const sold = pu[pl][k] || 0; let op, cl, inU = 0, trU = 0, woU = 0;
        if (act) {
          op = snapDates.has(k) ? (sn[pl][k] || 0) : (prev[pl] || 0);
          cl = snapDates.has(next) ? (sn[pl][next] || 0) : op;
          inU = cl - op + sold;            // net movement; split below
        } else {
          op = prev[pl] || 0; inU = po[pl][k] || 0;
          cl = Math.max(0, op + inU - sold);   // projected; never below zero (forecast beyond stock is lost sales)
        }
        prev[pl] = cl; f[pl] = { op, cl, inU, trU, woU, sold };
      });
      let trCost = null;   // v28.558 (Katherine): both sides of a transfer at the sending pool's cost, so transfers £ cost nets to zero
      if (act) {   // a fall in one pool against a rise in the other inside the market = a transfer; the rest is intake / other
        const a = f['3PL'], b = f.FBA;
        if (a.inU < 0 && b.inU > 0) { const t = Math.min(-a.inU, b.inU); a.trU = -t; b.trU = t; a.inU += t; b.inU -= t; }
        else if (b.inU < 0 && a.inU > 0) { const t = Math.min(-b.inU, a.inU); b.trU = -t; a.trU = t; b.inU += t; a.inU -= t; }
        POOLS.forEach(pl => { const x = f[pl]; if (x.inU < 0) { x.woU = x.inU; x.inU = 0; } });
        const src = a.trU < 0 ? '3PL' : (b.trU < 0 ? 'FBA' : null); if (src) trCost = costGbp(sku, k, mkt, src);
      }
      const i = idx24[k]; if (i == null) continue;
      POOLS.forEach(pl => {
        const x = f[pl], fwdU = (pu[pl][addM(k, 1)] || 0) + (pu[pl][addM(k, 2)] || 0) + (pu[pl][addM(k, 3)] || 0);
        const fwdW = weeks(addM(k, 1)) + weeks(addM(k, 2)) + weeks(addM(k, 3));
        const tgU = coverWks(sku, mkt, pl) * fwdU / fwdW;
        if (!x.op && !x.cl && !x.inU && !x.trU && !x.woU && !x.sold && !tgU) return;
        const c = costGbp(sku, k, mkt, pl), cp = curPrice(sku, mkt, k), fp = fullGbp(sku, mkt, k) || cp;
        const ak = i + '|' + mkt + '|' + pl + '|' + p.cgroup + '|' + p.season + '|' + p.status;
        const a = stockAgg[ak] || (stockAgg[ak] = new Array(STOCK_COLS.length).fill(0));
        const put = (j, u) => { a[j] += u; a[j + 1] += u * c; a[j + 2] += u * cp; };
        put(0, x.op); a[3] += x.op * fp; put(4, x.cl); a[7] += x.cl * fp;
        put(8, x.inU); a[11] += x.trU; a[12] += x.trU * (trCost != null ? trCost : c); a[13] += x.trU * cp; put(14, x.woU); put(17, tgU);
        a[20] += x.sold; a[21] += x.sold * c; a[22] += fwdU;
      });
    }
  }

  // dictionary-encode the dimensions
  const dict = { mkt: [], ch: [], pool: ['3PL', 'FBA'], cat: [], sea: [], st: [] }, ix = {};
  const enc = (d, v) => { const m = ix[d] || (ix[d] = {}); if (m[v] == null) { m[v] = dict[d].length; dict[d].push(v); } return m[v]; };
  ['3PL', 'FBA'].forEach(v => { (ix.pool || (ix.pool = {}))[v] = dict.pool.indexOf(v); });
  const r2 = (x) => Math.round(x * 100) / 100;
  const sales = Object.entries(salesAgg).map(([k, a]) => { const [i, mkt, ch, cat, sea, st] = k.split('|'); return [+i, enc('mkt', mkt), enc('ch', ch), enc('cat', cat), enc('sea', sea), enc('st', st), ...a.map(r2)]; });
  const stock = Object.entries(stockAgg).map(([k, a]) => { const [i, mkt, pool, cat, sea, st] = k.split('|'); return [+i, enc('mkt', mkt), ix.pool[pool], enc('cat', cat), enc('sea', sea), enc('st', st), ...a.map(r2)]; });
  return {
    fy: fyStart, months: out24, weeks: out24.map(weeks), actual_to: actualTo, ly_months: 12, dict,
    sales_cols: ['u', 'r', 'cos', 'full'],
    stock_cols: STOCK_COLS,
    fwd_weeks: out24.map(k => weeks(addM(k, 1)) + weeks(addM(k, 2)) + weeks(addM(k, 3))),
    sales, stock,
  };
}
