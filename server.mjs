// Rehost server — serves Ben's v16.7 artefact with LIVE Supabase data injected at request time.
// Mirrors build_v4.py's placeholder approach, but pulls from Supabase per load instead of baked-in.
// Phase 1: DATA (sales summary) injected live.
// Phase 2 (this step): the forecast read-write loop —
//   READ  : FC_CURRENT injected live from planner.forecast_inputs (drives FC_SEED -> IV).
//   WRITE : POST /api/save-forecasts upserts edited subcat inputs back to forecast_inputs.
import 'dotenv/config';
import express from 'express';
import { readFileSync } from 'fs';
import pg from 'pg';

// On Vercel (serverless) use Supabase's TRANSACTION pooler (port 6543) — built for many
// short-lived serverless connections — with a tiny per-instance pool. Session pooler (5432)
// caps at 15 clients and serverless instances exhaust it. Locally, keep 5432 + a larger pool.
let CONN = process.env.DATABASE_URL || '';
if (process.env.VERCEL) CONN = CONN.replace(':5432/', ':6543/');
const pool = new pg.Pool({
  connectionString: CONN,
  ssl: { rejectUnauthorized: false },
  max: process.env.VERCEL ? 4 : 10,
  allowExitOnIdle: true,
  idleTimeoutMillis: 10000,
});
import path from 'path';
function loadHTML() {
  const candidates = [
    new URL('./artifact_v16.7.html', import.meta.url),
    path.join(process.cwd(), 'artifact_v16.7.html'),
    path.join(process.cwd(), 'rehost', 'artifact_v16.7.html'),
  ];
  for (const c of candidates) { try { return readFileSync(c, 'utf8'); } catch { /* next */ } }
  throw new Error('artifact_v16.7.html not found');
}
const HTML = loadHTML();

// Replace the value of a top-level `let/const/var NAME = <literal>;` by balancing brackets.
function replaceGlobal(html, name, jsonText) {
  const m = html.match(new RegExp('(?:const|let|var)\\s+' + name + '\\s*=\\s*([\\[{])'));
  if (!m) throw new Error(`global ${name} not found`);
  const start = m.index + m[0].length - 1;
  const open = html[start], close = open === '[' ? ']' : '}';
  let depth = 0, i = start, inStr = false, esc = false, q = '';
  for (; i < html.length; i++) {
    const ch = html[i];
    if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === q) inStr = false; }
    else if (ch === '"' || ch === "'") { inStr = true; q = ch; }
    else if (ch === open) depth++;
    else if (ch === close) { depth--; if (depth === 0) { i++; break; } }
  }
  return html.slice(0, start) + jsonText + html.slice(i);
}

async function freshness() {
  const { rows } = await pool.query(`SELECT max(loaded_at) AS ts FROM planner.sales_actuals`);
  return rows[0].ts ? new Date(rows[0].ts).toISOString() : null;
}

async function buildDATA() {
  const { rows } = await pool.query(`
    SELECT category c, subcategory s, country co, channel ch,
           is_excluded_category x, to_char(month,'YYYY_MM') ym,
           units::int u, revenue::float r
    FROM planner.category_sales_summary
    WHERE subcategory IS NOT NULL`);
  const byKey = {};
  for (const row of rows) {
    const k = row.c + '|' + row.s + '|' + row.co + '|' + row.ch;
    if (!byKey[k]) byKey[k] = { c: row.c, s: row.s, co: row.co, ch: row.ch, x: row.x, m: {} };
    byKey[k].m[row.ym] = [row.u, row.r];
  }
  return Object.values(byKey);
}

// value_raw is the raw IV string the user typed: a growth decimal ("0.3"), an absolute
// (">=4"), or an apostrophe-prefixed literal ("'2"). FC_CURRENT bakes the *encoded number*
// that FC_SEED -> IV decodes back to that string (the .0001 sentinel marks small literals).
// This mirrors buildSavePayload()'s save-encoding exactly so the artefact round-trips unchanged.
function encodeRaw(raw) {
  if (raw == null) return null;
  const s = String(raw);
  if (s.charAt(0) === "'") {
    const n = parseInt(s.slice(1), 10);
    if (!isNaN(n)) return n >= 4 ? n : (n + 0.0001);
  }
  const f = parseFloat(s);
  return isNaN(f) ? null : f;
}

async function buildFC_CURRENT() {
  const { rows } = await pool.query(`
    SELECT subcategory s, country co, channel ch, to_char(month,'YYYY_MM') ym, value_raw
    FROM planner.forecast_inputs`);
  const out = {};
  for (const row of rows) {
    const v = encodeRaw(row.value_raw);
    if (v == null) continue;
    const k = row.s + '|' + row.co + '|' + row.ch;
    if (!out[k]) out[k] = {};
    out[k][row.ym] = v;
  }
  return out;
}

// SKU-level forecast: rebuild FC_OUTPUTS {"sku|warehouse|channel":{ym:units}} from
// planner.forecast_outputs (the editable SKU plan). Mirrors the baked global's shape.
async function buildFC_OUTPUTS() {
  const { rows } = await pool.query(`
    SELECT sku, warehouse wh, channel ch, to_char(month,'YYYY_MM') ym, units::int u
    FROM planner.forecast_outputs`);
  const out = {};
  for (const row of rows) {
    const k = row.sku + '|' + row.wh + '|' + row.ch;
    if (!out[k]) out[k] = {};
    out[k][row.ym] = row.u;
  }
  return out;
}

// _SKU_RAW: the keystone SKU global. Three parts (matches the baked shape exactly):
//   p {sku:{n,s,c,ti,cs,av,disc,lch,inv,oo}} - master (planning-scope SKUs)
//   s {"sku|COUNTRY|CHANNEL":{ym:units}}      - sales history (all SKUs)
//   i {"sku|warehouse":[{ref,qty,eta,type}]}  - open inbound shipments
// av (channel-availability string e.g. "dfb") derived from v_product_availability;
// oo (on-order) derived from outstanding inbound — both fill gaps the baked snapshot lacked.
async function buildSKURAW() {
  const [prods, pcs, inv, avail, oo, sales, inbound] = await Promise.all([
    pool.query(`SELECT sku, product_name n, subcategory s, category c, market_tier ti, core_seasonal cs
                FROM planner.products WHERE in_planning_scope`),
    pool.query(`SELECT sku, lower(country) co,
                       to_char(launch_date_retail,'YYYY-MM-DD') lch,
                       to_char(discontinue_date,'YYYY-MM-DD') disc
                FROM planner.product_countries`),
    pool.query(`SELECT sku, warehouse wh, available::int qty FROM planner.product_inventory`),
    pool.query(`SELECT sku, lower(country) co,
                       string_agg(CASE channel WHEN 'DTC' THEN 'd' WHEN 'FBA' THEN 'f' WHEN 'B2B' THEN 'b' END,
                                  '' ORDER BY CASE channel WHEN 'DTC' THEN 1 WHEN 'FBA' THEN 2 ELSE 3 END)
                         FILTER (WHERE is_available) av
                FROM planner.v_product_availability GROUP BY sku, country`),
    pool.query(`SELECT sku, destination_warehouse wh, sum(quantity - coalesce(received_quantity,0))::int oo
                FROM planner.inbound_shipments WHERE coalesce(received_quantity,0) < quantity
                GROUP BY sku, destination_warehouse`),
    pool.query(`SELECT sku, country co, channel ch, to_char(month,'YYYY_MM') ym, units::int u
                FROM planner.sales_actuals`),
    pool.query(`SELECT sku, destination_warehouse wh, reference ref, quantity::int qty,
                       to_char(estimated_delivery_date,'YYYY-MM-DD') eta, source_type type
                FROM planner.inbound_shipments WHERE coalesce(received_quantity,0) < quantity
                ORDER BY estimated_delivery_date`),
  ]);
  const p = {};
  for (const r of prods.rows)
    p[r.sku] = { n: r.n, s: r.s, c: r.c, ti: r.ti, cs: r.cs === 'Seasonal' ? 'S' : 'C',
                 av: {}, disc: {}, lch: {}, inv: {}, oo: {} };
  for (const r of avail.rows) if (p[r.sku] && r.av) p[r.sku].av[r.co] = r.av;
  for (const r of pcs.rows) if (p[r.sku]) { if (r.lch) p[r.sku].lch[r.co] = r.lch; if (r.disc) p[r.sku].disc[r.co] = r.disc; }
  for (const r of inv.rows) if (p[r.sku]) p[r.sku].inv[r.wh] = r.qty;
  for (const r of oo.rows) if (p[r.sku] && r.oo > 0) p[r.sku].oo[r.wh] = r.oo;

  const s = {};
  for (const r of sales.rows) {
    const k = r.sku + '|' + r.co + '|' + r.ch;
    (s[k] || (s[k] = {}))[r.ym] = r.u;
  }
  const i = {};
  for (const r of inbound.rows) {
    const k = r.sku + '|' + r.wh;
    (i[k] || (i[k] = [])).push({ ref: r.ref || '', qty: r.qty || 0, eta: r.eta || null, type: r.type || 'supplier_china' });
  }
  return { p, s, i };
}

// Category metadata: {category:{a:active, g:grouping}}
async function buildCATS_META() {
  const { rows } = await pool.query(`SELECT category, is_active, grouping FROM planner.categories`);
  const o = {};
  for (const r of rows) o[r.category] = { a: r.is_active, g: r.grouping };
  return o;
}

// Subcategory metadata: {subcategory:{a:active, s:seasonal, c:category}}
async function buildSUBS_META() {
  const { rows } = await pool.query(`SELECT subcategory, is_active, is_seasonal, category FROM planner.subcategories`);
  const o = {};
  for (const r of rows) o[r.subcategory] = { a: r.is_active, s: r.is_seasonal, c: r.category };
  return o;
}

// BI free-text forecast rules (active only): [{id,subcat,countries,channels,month,year,text}]
async function buildBI_RULES() {
  const { rows } = await pool.query(
    `SELECT id, airtable_id, subcategory, countries, channels, rule_text, month, year
     FROM planner.bi_rules WHERE active ORDER BY id`);
  return rows.map(r => ({
    id: r.airtable_id || String(r.id), subcat: r.subcategory,
    countries: r.countries || ['ALL'], channels: r.channels || ['ALL'],
    month: r.month ?? null, year: r.year ?? null, text: r.rule_text,
  }));
}

// Parse a baked top-level object/array global out of the HTML once (read-only, at boot).
function extractBaked(name) {
  const m = HTML.match(new RegExp('(?:const|let|var)\\s+' + name + '\\s*=\\s*([\\[{])'));
  if (!m) return null;
  const open = m[1], close = open === '[' ? ']' : '}';
  let i = m.index + m[0].length - 1, depth = 0, inStr = false, esc = false, q = '', start = i;
  for (; i < HTML.length; i++) {
    const c = HTML[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === q) inStr = false; }
    else if (c === '"' || c === "'") { inStr = true; q = c; }
    else if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) { i++; break; } }
  }
  try { return JSON.parse(HTML.slice(start, i)); } catch { return null; }
}
// `fm` (a per-SKU buy parameter) isn't cleanly stored in Supabase — carry the baked values.
const BAKED_FM = (() => {
  const pc = extractBaked('PROD_CONST') || {};
  const o = {};
  for (const sku of Object.keys(pc)) if (pc[sku] && pc[sku].fm) o[sku] = pc[sku].fm;
  return o;
})();

// PROD_CONST: per-SKU buy constants for the BUY view. {sku:{cp,moq,supp,lt,t3,tf,fm,l3}}
//   cp/moq/supp -> products; lt -> 3PL->FBA transfer weeks; l3[co] -> china_to_{co} (resolved
//   total lead time); t3[co]/tf[co] -> target cover for {co}_3pl / {co}_fba (category default,
//   per-SKU override wins); fm[co] -> baked (not in Supabase). Live so lead/cover/moq stay current.
async function buildPROD_CONST() {
  const [prods, cover, ovr] = await Promise.all([
    pool.query(`SELECT sku, case_pack_size cp, moq, supplier supp, category,
                       transfer_3pl_to_fba_lead_time_weeks lt,
                       china_to_uk_lead_time_weeks uk, china_to_us_lead_time_weeks us,
                       china_to_eu_lead_time_weeks eu, china_to_au_lead_time_weeks au,
                       china_to_ca_lead_time_weeks ca
                FROM planner.products WHERE in_planning_scope`),
    pool.query(`SELECT category, warehouse, target_cover_weeks::float w FROM planner.category_target_cover`),
    pool.query(`SELECT sku, warehouse, target_cover_weeks::float w FROM planner.product_target_cover_override`),
  ]);
  const catCover = {};
  for (const r of cover.rows) (catCover[r.category] || (catCover[r.category] = {}))[r.warehouse] = r.w;
  const skuOvr = {};
  for (const r of ovr.rows) (skuOvr[r.sku] || (skuOvr[r.sku] = {}))[r.warehouse] = r.w;
  const out = {};
  for (const p of prods.rows) {
    const cc = catCover[p.category] || {}, ov = skuOvr[p.sku] || {};
    const coverFor = wh => ov[wh] ?? cc[wh] ?? null;
    const t3 = {}, tf = {}, l3 = {};
    for (const co of ['uk', 'us', 'eu', 'au', 'ca']) {
      if (p[co] != null) l3[co] = Math.round(Number(p[co]));
      const c3 = coverFor(co + '_3pl'); if (c3 != null) t3[co] = c3;
      const cf = coverFor(co + '_fba'); if (cf != null) tf[co] = cf;
    }
    out[p.sku] = {
      cp: p.cp ?? null,
      moq: p.moq ?? 1,
      supp: p.supp ?? null,
      lt: p.lt != null ? Number(p.lt) : 2,
      t3, tf, fm: BAKED_FM[p.sku] || {}, l3,
    };
  }
  return out;
}

const app = express();
app.use(express.json({ limit: '4mb' }));

// Access gate — only active when PLANNER_KEY is set (production). Localhost (no env var)
// stays open and identical to what you see now. Key accepted via ?key= (stored in a cookie)
// or x-planner-key header. Anything else gets a minimal key prompt.
const GATE = process.env.PLANNER_KEY;
function cookieVal(req, name) {
  const m = (req.headers.cookie || '').match(new RegExp('(?:^|; )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : null;
}
app.use((req, res, next) => {
  if (!GATE) return next();                       // open locally
  if (req.path.startsWith('/api/')) {             // APIs: header or cookie
    if (req.get('x-planner-key') === GATE || cookieVal(req, 'pk') === GATE) return next();
    return res.status(401).json({ error: 'unauthorised' });
  }
  const supplied = req.query.key || cookieVal(req, 'pk');
  if (supplied === GATE) {
    if (req.query.key) res.setHeader('Set-Cookie', `pk=${encodeURIComponent(GATE)}; Path=/; Max-Age=2592000; SameSite=Lax`);
    return next();
  }
  res.set('content-type', 'text/html').send(`<!doctype html><meta charset=utf8><title>Dock & Bay — Demand Planner</title><style>body{font-family:system-ui;background:#0f172a;color:#e2e8f0;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}form{background:#1e293b;padding:36px 40px;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.4);text-align:center}h1{font-size:15px;letter-spacing:.18em;text-transform:uppercase;color:#94a3b8;margin:0 0 4px}h2{font-size:20px;margin:0 0 22px}input{padding:10px 12px;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#fff;width:200px;text-align:center}button{margin-left:8px;padding:10px 18px;border:0;border-radius:8px;background:#2563eb;color:#fff;font-weight:600;cursor:pointer}</style><form method=get><h1>Dock &amp; Bay</h1><h2>Demand Planner</h2><input name=key type=password placeholder="Access key" autofocus><button>Enter</button></form>`);
});

app.get('/', async (_req, res) => {
  try {
    // Fetch every live global in parallel, then splice sequentially (string ops on one buffer).
    const [DATA, FC_CURRENT, FC_OUTPUTS, SKU_RAW, CATS, SUBS, BI, PROD_CONST, ts] = await Promise.all([
      buildDATA(), buildFC_CURRENT(), buildFC_OUTPUTS(), buildSKURAW(),
      buildCATS_META(), buildSUBS_META(), buildBI_RULES(), buildPROD_CONST(), freshness(),
    ]);
    let html = HTML;
    html = replaceGlobal(html, 'DATA', JSON.stringify(DATA));
    html = replaceGlobal(html, 'FC_CURRENT', JSON.stringify(FC_CURRENT));
    html = replaceGlobal(html, 'FC_OUTPUTS', JSON.stringify(FC_OUTPUTS));
    html = replaceGlobal(html, '_SKU_RAW', JSON.stringify(SKU_RAW));
    html = replaceGlobal(html, 'CATS_META', JSON.stringify(CATS));
    html = replaceGlobal(html, 'SUBS_META', JSON.stringify(SUBS));
    html = replaceGlobal(html, 'BI_RULES', JSON.stringify(BI));
    html = replaceGlobal(html, 'PROD_CONST', JSON.stringify(PROD_CONST));
    // Neutralise the stale baked input overlay so live forecast_inputs is authoritative.
    // (FC_SEED already seeds IV from live FC_CURRENT.)
    html = replaceGlobal(html, 'SAVED_INPUTS', '{}');
    if (ts) html = html.replace(/EXTRACT_TS\s*=\s*'[^']*'/, `EXTRACT_TS='${ts}'`);
    // Route the artefact's Claude calls through our key-attached proxy (same-origin, no CORS).
    html = html.split('https://api.anthropic.com/v1/messages').join('/api/ai');
    // The artefact hardcodes a retired Sonnet model (claude-sonnet-4-20250514) -> 404.
    // Swap to the current Sonnet so the AI features (insights, narrative, BI rules) work.
    html = html.split('claude-sonnet-4-20250514').join('claude-sonnet-4-6');
    // UI fit (our deployment only — artefact HTML untouched): the baked `.tw` table uses a
    // fixed `max-height: calc(100vh - 184px)`, which leaves a gap on big screens and hides the
    // bottom scrollbar on small ones. Size it dynamically so its bottom sits just off the
    // window bottom on any size, and re-fit on resize / view switch.
    const FIT = `<script>(function(){var GAP=10;function fit(){document.querySelectorAll('.tw').forEach(function(tw){if(tw.offsetParent===null)return;var top=tw.getBoundingClientRect().top;var h=window.innerHeight-top-GAP;if(h>200)tw.style.maxHeight=h+'px';});}window.addEventListener('resize',fit);setTimeout(fit,300);setTimeout(fit,1200);document.addEventListener('click',function(){setTimeout(fit,60);});})();</script>`;
    html = html.replace('</body>', FIT + '</body>');
    res.set('content-type', 'text/html').send(html);
  } catch (e) {
    res.status(500).send('inject failed: ' + e.message);
  }
});

// WRITE — persist edited subcat forecast inputs back to planner.forecast_inputs.
// Body: { changes:[{subcategory,country,channel,month("YYYY_MM"),value(raw IV string|null)}], who }
// value null/'' => clear (DELETE). Otherwise upsert value_raw verbatim (faithful to what the user typed).
app.post('/api/save-forecasts', async (req, res) => {
  const { changes, who } = req.body || {};
  if (!Array.isArray(changes)) return res.status(400).json({ error: 'changes[] required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let upserts = 0, deletes = 0;
    for (const c of changes) {
      if (!c.subcategory || !c.country || !c.channel || !c.month) continue;
      const month = c.month.replace('_', '-') + '-01';
      if (c.value === null || c.value === undefined || c.value === '') {
        await client.query(
          `DELETE FROM planner.forecast_inputs
           WHERE subcategory=$1 AND country=$2 AND channel=$3 AND month=$4`,
          [c.subcategory, c.country, c.channel, month]);
        deletes++;
      } else {
        await client.query(
          `INSERT INTO planner.forecast_inputs (subcategory, country, channel, month, value_raw, source, updated_at)
           VALUES ($1,$2,$3,$4,$5,'review_ui',now())
           ON CONFLICT (subcategory, country, channel, month)
           DO UPDATE SET value_raw=EXCLUDED.value_raw, source='review_ui', updated_at=now()`,
          [c.subcategory, c.country, c.channel, month, String(c.value)]);
        upserts++;
      }
    }
    await client.query(
      `INSERT INTO planner.etl_runs (job, status, rows_affected, message)
       VALUES ('ui_save_forecasts','success',$1,$2)`,
      [upserts + deletes, `${upserts} upsert / ${deletes} clear by ${who || 'unknown'}`]);
    await client.query('COMMIT');
    res.json({ saved: upserts + deletes, upserts, deletes });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// WRITE — persist edited SKU forecasts to planner.forecast_outputs.
// Body: { changes:[{sku,warehouse,channel,month("YYYY_MM"),units(int)}], who }
// The artefact writes 0 for cleared SKU cells (not null), so units is always an integer; upsert verbatim.
app.post('/api/save-sku-forecasts', async (req, res) => {
  const { changes, who } = req.body || {};
  if (!Array.isArray(changes)) return res.status(400).json({ error: 'changes[] required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let n = 0;
    for (const c of changes) {
      if (!c.sku || !c.warehouse || !c.channel || !c.month) continue;
      const month = c.month.replace('_', '-') + '-01';
      const units = Math.round(Number(c.units) || 0);
      await client.query(
        `INSERT INTO planner.forecast_outputs (sku, warehouse, channel, month, units, source, updated_at)
         VALUES ($1,$2,$3,$4,$5,'review_ui',now())
         ON CONFLICT (sku, warehouse, channel, month)
         DO UPDATE SET units=EXCLUDED.units, source='review_ui', updated_at=now()`,
        [c.sku, c.warehouse, c.channel, month, units]);
      n++;
    }
    await client.query(
      `INSERT INTO planner.etl_runs (job, status, rows_affected, message)
       VALUES ('ui_save_sku_forecasts','success',$1,$2)`,
      [n, `${n} SKU cells by ${who || 'unknown'}`]);
    await client.query('COMMIT');
    res.json({ saved: n });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

app.get('/api/health', async (_req, res) => {
  try {
    const [DATA, FC, FO, SKU, CATS, SUBS, BI, PC] = await Promise.all([
      buildDATA(), buildFC_CURRENT(), buildFC_OUTPUTS(), buildSKURAW(),
      buildCATS_META(), buildSUBS_META(), buildBI_RULES(), buildPROD_CONST(),
    ]);
    res.json({
      data_combos: DATA.length,
      fc_combos: Object.keys(FC).length,
      sku_combos: Object.keys(FO).length,
      skuraw: { p: Object.keys(SKU.p).length, s: Object.keys(SKU.s).length, i: Object.keys(SKU.i).length },
      cats: Object.keys(CATS).length, subs: Object.keys(SUBS).length, bi_rules: BI.length,
      prod_const: Object.keys(PC).length, sample_pc: PC[Object.keys(PC)[0]],
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI proxy — the artefact's Claude calls hit api.anthropic.com keyless (only works inside
// Claude). We rewrite those calls to /api/ai (see GET /), and this endpoint forwards them to
// Anthropic with the API key attached server-side. Key never reaches the browser.
app.post('/api/ai', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: { message: 'AI not configured (no API key set)' } });
  try {
    const headers = {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    };
    if (req.body && req.body.mcp_servers) headers['anthropic-beta'] = 'mcp-client-2025-04-04';
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers, body: JSON.stringify(req.body),
    });
    const text = await r.text();
    res.status(r.status).set('content-type', 'application/json').send(text);
  } catch (e) {
    res.status(500).json({ error: { message: 'AI proxy error: ' + e.message } });
  }
});

// Local dev: listen. On Vercel (serverless) the platform imports `app` instead.
if (!process.env.VERCEL) {
  app.listen(8124, () => console.log('rehost (live DATA + FC_CURRENT + save) on :8124'));
}
export default app;
