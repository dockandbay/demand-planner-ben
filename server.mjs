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
if (process.env.VERCEL || process.env.USE_TXN_POOLER) CONN = CONN.replace(':5432/', ':6543/');   // USE_TXN_POOLER: local dev escape hatch when the session pooler (cap 15) is exhausted
const pool = new pg.Pool({
  connectionString: CONN,
  ssl: { rejectUnauthorized: false },
  // Session-mode Supabase pooler caps the whole session at ~15 server connections. Keep `max` well under
  // that so a stranded generation (after a restart/crash) plus the live process can't blow the cap.
  max: process.env.VERCEL ? 4 : 6,
  allowExitOnIdle: true,
  idleTimeoutMillis: 8000,
});
// ── Resilience guards ─────────────────────────────────────────────────────────
// A dropped idle DB connection makes the pool emit 'error'; with no listener Node treats it as
// fatal and exits (the repeated EADDRNOTAVAIL crashes in dev). Log it and let the pool recycle the
// client — the next query opens a fresh connection.
pool.on('error', (err) => { console.error('[pg pool] idle client error (ignored):', err && err.message); });
// Last-resort process guards so a single malformed request or stray async rejection can't take the
// whole server down (we saw an ERR_OUT_OF_RANGE kill it once). This harness holds no critical
// in-memory state — it's a stateless proxy to Postgres — so logging and staying up beats crashing.
process.on('unhandledRejection', (reason) => { console.error('[unhandledRejection]', reason && (reason.stack || reason.message || reason)); });
process.on('uncaughtException', (err) => { console.error('[uncaughtException]', err && (err.stack || err.message || err)); });
// Graceful shutdown: close the pool so a restart RELEASES its DB connections immediately instead of
// stranding them on the session-mode pooler (the cause of "max clients reached … pool_size: 15" after
// repeated restarts). Without this, killed processes leave connections lingering until the pooler times out.
let _shuttingDown = false;
async function shutdown() { if (_shuttingDown) return; _shuttingDown = true;
  try { await pool.end(); } catch (e) {} process.exit(0); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
import path from 'path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
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
// SUPPLY tab (Production Planner) UI — injected before </body>. Optional; empty if file absent.
function loadInject() { try { return readFileSync(new URL('./supply/inject.html', import.meta.url), 'utf8'); } catch { return ''; } }
const SUPPLY_INJECT = loadInject();
// Dev convenience: re-read the artefact + supply inject on each page load so edits show on a refresh WITHOUT
// restarting the server (the boot-time consts above are kept for server-side global parsing + prod speed).
// Prod (NODE_ENV=production, e.g. Vercel) keeps using the cached copies.
const DEV = process.env.NODE_ENV !== 'production';
// App version — bump on every change so we can revert (Ben's rule). Shown in the SUPPLY panel.
const APP_VERSION = 'v25.273';

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
    // On-order = confirmed inbound (inbound_shipments) + open/planning POs not yet in that feed, deduped by PO
    // reference so a PO isn't double-counted once it syncs through to inbound. PO → warehouse: country_code (or
    // the branch's country) + fba/3pl from the branch name.
    pool.query(`SELECT sku, wh, sum(oo)::int oo FROM (
                  SELECT sku, destination_warehouse wh, (quantity - coalesce(received_quantity,0)) oo
                    FROM planner.inbound_shipments WHERE coalesce(received_quantity,0) < quantity
                  UNION ALL
                  SELECT l.sku,
                    lower(coalesce(nullif(po.country_code,''), b.country_code)) || '_' ||
                      (CASE WHEN po.branch ILIKE '%fba%' THEN 'fba' ELSE '3pl' END) wh,
                    l.qty oo
                    FROM planner.purchase_order_lines l
                    JOIN planner.purchase_orders po ON po.po = l.po
                    LEFT JOIN planner.branches b ON b.name = po.branch
                    WHERE coalesce(l.qty,0) > 0
                      AND coalesce(po.status,'') NOT ILIKE '%complete%'
                      AND coalesce(nullif(po.country_code,''), b.country_code) IN ('UK','US','EU','AU','CA')
                      AND NOT EXISTS (SELECT 1 FROM planner.inbound_shipments i WHERE i.reference = po.po)
                ) z WHERE wh IS NOT NULL GROUP BY sku, wh`),
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
                 csf: r.cs || '', // full core/seasonal classification (Core | Seasonal | Non-Core) for the BUY filter
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

// FBA carton dims for the FBA Transfer Upload (box L/W/H/weight per region) + units-per-box.
async function buildFBADIMS() {
  // Carton dims/weights for the FBA Transfer download. Source = planner.products (live-updated from Airtable
  // SKU_CHILD via n8n) — the source of truth. Order per unit: [length, width, height, weight]. cm / kg.
  const { rows } = await pool.query(`SELECT sku, carton_qty cp,
    uk_carton_length,uk_carton_width,uk_carton_height,uk_carton_weight,
    us_carton_length,us_carton_width,us_carton_height,us_carton_weight
    FROM planner.products WHERE coalesce(uk_carton_length, us_carton_length) IS NOT NULL`);
  const o = {};
  for (const r of rows) o[r.sku] = { cp: r.cp,
    u: [r.uk_carton_length, r.uk_carton_width, r.uk_carton_height, r.uk_carton_weight],
    s: [r.us_carton_length, r.us_carton_width, r.us_carton_height, r.us_carton_weight] };
  return o;
}

const app = express();
app.use(express.json({ limit: '12mb' }));   // 12mb: portal invoice uploads arrive as base64 JSON

// gzip large JSON responses (built-in zlib — no dependency). The PO grid payload is ~3.6MB of JSON;
// gzip cuts it ~10x over the wire. Only kicks in when the client accepts gzip and the body is worth it.
app.use((req, res, next) => {
  const accepts = /\bgzip\b/.test(req.headers['accept-encoding'] || '');
  const origJson = res.json.bind(res);
  res.json = (obj) => {
    let str; try { str = JSON.stringify(obj); } catch (e) { return origJson(obj); }
    if (!accepts || str.length < 1400) return origJson(obj);   // small bodies: not worth the CPU
    zlib.gzip(str, (err, buf) => {
      if (err) { res.setHeader('Content-Type', 'application/json; charset=utf-8'); return res.end(str); }
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Vary', 'Accept-Encoding');
      res.end(buf);
    });
    return res;
  };
  next();
});

// Access gate — only active when PLANNER_KEY is set (production). Localhost (no env var)
// stays open and identical to what you see now. Key accepted via ?key= (stored in a cookie)
// or x-planner-key header. Anything else gets a minimal key prompt.
const GATE = process.env.PLANNER_KEY;
function cookieVal(req, name) {
  const m = (req.headers.cookie || '').match(new RegExp('(?:^|; )' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : null;
}
app.use((req, res, next) => {
  // Supplier portal has its own magic-link/session auth — it must NOT require the planner key.
  if (req.path === '/portal' || req.path === '/portal-view.js' || req.path.startsWith('/api/portal/')) return next();
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
    const [DATA, FC_CURRENT, FC_OUTPUTS, SKU_RAW, CATS, SUBS, BI, PROD_CONST, ts, FBADIMS] = await Promise.all([
      buildDATA(), buildFC_CURRENT(), buildFC_OUTPUTS(), buildSKURAW(),
      buildCATS_META(), buildSUBS_META(), buildBI_RULES(), buildPROD_CONST(), freshness(), buildFBADIMS(),
    ]);
    let html = DEV ? loadHTML() : HTML;
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
    // Show the real app version (the artefact bakes its filename version 'v16.7'); only the VERSION const, not data.
    html = html.replace(/const VERSION\s*=\s*'[^']*'/, `const VERSION='${APP_VERSION}'`);
    // Route the artefact's Claude calls through our key-attached proxy (same-origin, no CORS).
    html = html.split('https://api.anthropic.com/v1/messages').join('/api/ai');
    // The artefact hardcodes a retired Sonnet model (claude-sonnet-4-20250514) -> 404.
    // Swap to the current Sonnet so the AI features (insights, narrative, BI rules) work.
    html = html.split('claude-sonnet-4-20250514').join('claude-sonnet-4-6');
    // Rename top-nav PLAN -> DEMAND (spec B3.1). Artefact untouched; relabelled at serve time.
    html = html.replace('data-view="planning">PLAN</button>', 'data-view="planning">DEMAND</button>');
    // UI fit (our deployment only — artefact HTML untouched): the baked `.tw` table uses a
    // fixed `max-height: calc(100vh - 184px)`, which leaves a gap on big screens and hides the
    // bottom scrollbar on small ones. Size it dynamically so its bottom sits just off the
    // window bottom on any size, and re-fit on resize / view switch.
    const FIT = `<script>(function(){var GAP=10;function fit(){document.querySelectorAll('.tw').forEach(function(tw){if(tw.offsetParent===null)return;var top=tw.getBoundingClientRect().top;var h=window.innerHeight-top-GAP;if(h>200)tw.style.maxHeight=h+'px';});}window.addEventListener('resize',fit);setTimeout(fit,300);setTimeout(fit,1200);document.addEventListener('click',function(){setTimeout(fit,60);});})();</script>`;
    // IMPORTANT: use a function replacement — the injected code contains `$'` sequences which
    // String.replace would otherwise interpret as special patterns ("text after the match"),
    // corrupting the script. A replacer function disables all `$` substitution.
    const FBADIMS_JS = '<script>window.FBA_DIMS=' + JSON.stringify(FBADIMS) + ';</script>';
    const injectTail = FBADIMS_JS + FIT + (DEV ? loadInject() : SUPPLY_INJECT).split('__APP_VERSION__').join(APP_VERSION) + '</body>';
    html = html.replace('</body>', () => injectTail);
    res.set('content-type', 'text/html').set('Cache-Control', 'no-store').send(html);
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

// ── CASH FLOW: re-shape the PO calc rows (+ shipments, deposit register, likely-date overrides) into a flat
// list of dated payment line items. Four sources: supplier-goods milestones (deposit/completion/balance),
// referenced-deposit pools (replace the PO deposit when a start deposit carries a deposit_ref), freight
// (delivery +14d), and import duty/tax (landing; USA landing +7d). Freight & duty/tax are sized on the
// assigned SHIPMENT when there is one, else the individual PO. See CHANGES v20.149.
const num = (x) => { const n = Number(x); return Number.isFinite(n) ? n : 0; };
const addDays = (ds, n) => { if (!ds) return null; const d = new Date(ds + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const isUSA = (c) => (c || '').toUpperCase().startsWith('US');

// cheapest combination of sea containers to cover `pallets` (rounds up — e.g. 19 pallets → one 40ft if that
// beats 19×LCL). Mirrors the client seaEst DP. tiers = [{cap,cost,sz}]. Returns rounded USD or null.
function seaEstSrv(tiers, pallets) {
  if (!Array.isArray(tiers) || !tiers.length || !(pallets > 0)) return null;
  const ts = tiers.filter(t => num(t.cap) > 0 && t.cost != null);
  if (!ts.length) return null;
  const N = Math.ceil(pallets), INF = Infinity, dp = new Array(N + 1).fill(INF);
  dp[0] = 0;
  for (let i = 1; i <= N; i++) for (const t of ts) {
    const prev = Math.max(0, i - num(t.cap));
    if (dp[prev] + num(t.cost) < dp[i]) dp[i] = dp[prev] + num(t.cost);
  }
  let best = dp[N];
  for (const t of ts) if (num(t.cap) >= N) best = Math.min(best, num(t.cost));  // one oversized box
  return best === INF ? null : Math.round(best);
}

// freight cost for a shipment row: Flexport quote ▸ manual ▸ FOB $0 ▸ air (weight×rate) ▸ sea (cheapest combo).
function shipFreightSrv(s) {
  if (s.flex_cost != null) return { cost: Math.round(num(s.flex_cost)), src: 'Flexport' };
  if (s.cost_manual != null) return { cost: Math.round(num(s.cost_manual)), src: 'manual' };
  if (s.mode_eff === 'fob') return { cost: 0, src: 'FOB' };
  if (s.mode_eff === 'air') return { cost: Math.round(num(s.weight_kg) * (num(s.air_rate) || 15)), src: 'air est' };
  const est = seaEstSrv(s.sea_tiers, num(s.pallets));
  return est == null ? { cost: null, src: 'no rate' } : { cost: est, src: 'sea est' };
}

async function cashflowResponse(pos, q) {
  const today = (await pool.query(`SELECT to_char(current_date,'YYYY-MM-DD') d`)).rows[0].d;
  // likely-payment-date overrides (manual; may not exist before migration 042)
  const likely = {};
  try { (await pool.query(`SELECT line_key, to_char(likely_date,'YYYY-MM-DD') d FROM planner.payment_likely_dates`))
    .rows.forEach(r => { likely[r.line_key] = r.d; }); } catch (e) { /* table not yet created */ }
  // referenced-deposit pools (one cash line per reference; replaces the PO's own deposit line)
  const depPools = await q(`
    SELECT reference, round(sum(coalesce(amount,0)),2) amount, max(supplier_name) supplier, max(country) country,
      to_char(max(date_paid),'YYYY-MM-DD') date_paid, bool_and(date_paid IS NOT NULL) all_paid,
      to_char(min(date_due),'YYYY-MM-DD') date_due, to_char(min(date_likely_pay),'YYYY-MM-DD') date_likely_pay
    FROM planner.deposits WHERE is_deposit AND coalesce(reference,'') <> '' GROUP BY reference`);
  // "Other payments" — sundry register rows (is_deposit=false): freight/fees/etc. entered directly.
  const otherPays = await q(`
    SELECT id, coalesce(reference,'') reference, coalesce(description,'') description, supplier_name, country,
      round(coalesce(amount,0),2) amount, to_char(date_due,'YYYY-MM-DD') date_due,
      to_char(date_likely_pay,'YYYY-MM-DD') date_likely_pay, to_char(date_paid,'YYYY-MM-DD') date_paid
    FROM planner.deposits WHERE coalesce(is_deposit,false)=false`);
  // shipment freight inputs (cost only; dates come from the member POs' eff_delivery which is the shipment date)
  const shipRows = await q(`
    WITH agg AS (
      SELECT po.shipment_ref,
        round(sum(coalesce((SELECT sum(l.qty::numeric/NULLIF(sl.pallet_qty,0))
           FROM planner.purchase_order_lines l LEFT JOIN planner.sku_labels sl ON sl.sku=l.sku WHERE l.po=po.po),0))::numeric,1) pallets,
        round(sum(coalesce((SELECT sum(l.qty*p.prod_weight_uk)
           FROM planner.purchase_order_lines l JOIN planner.products p ON p.sku=l.sku WHERE l.po=po.po),0))::numeric) weight_kg,
        max(upper(coalesce(nullif(po.country_code,''), pb.country_code, ''))) market
      FROM planner.purchase_orders po LEFT JOIN planner.branches pb ON pb.name=po.branch
      WHERE po.shipment_ref IS NOT NULL GROUP BY po.shipment_ref
    )
    SELECT sh.shipment_ref,
      coalesce(lower(sh.mode), CASE WHEN fx.mode ILIKE 'air%' THEN 'air' ELSE 'sea' END) mode_eff,
      coalesce(a.pallets,0) pallets, coalesce(a.weight_kg,0) weight_kg, a.market,
      fx.total_freight_cost flex_cost, sh.cost_manual cost_manual,
      (SELECT json_agg(json_build_object('cap', fr.pallets, 'cost', fr.cost, 'sz', fr.container_size)) FROM planner.freight_rates fr
        WHERE upper(fr.destination)=coalesce(nullif(a.market,''),'UK') AND coalesce(fr.pallets,0)>0 AND fr.cost IS NOT NULL) sea_tiers,
      (SELECT ar.rate_per_kg FROM planner.air_freight_rates ar WHERE coalesce(a.weight_kg,0) >= ar.min_kg AND coalesce(a.weight_kg,0) < ar.max_kg ORDER BY ar.min_kg LIMIT 1) air_rate
    FROM planner.shipments sh
    LEFT JOIN agg a ON a.shipment_ref=sh.shipment_ref
    LEFT JOIN LATERAL (SELECT f.* FROM planner.flexport_shipments f
      WHERE f.flex_id=sh.carrier_ref OR f.shipment_name=sh.shipment_ref
      ORDER BY (f.flex_id=sh.carrier_ref) DESC NULLS LAST LIMIT 1) fx ON true`);
  const shipFreight = {};
  shipRows.forEach(s => { shipFreight[s.shipment_ref] = shipFreightSrv(s); });

  const lines = [];
  const add = (o) => {
    if (!(num(o.amount) > 0.009)) return;                       // never emit a $0 (or negative) line
    const due = o.due || null;
    // "likely" date: the line's own likely date (e.g. a deposit's date_likely_pay) ▸ a manual per-line override
    const lk = o.likely || likely[o.key] || null;
    let date = o.paid_date || due, kind = o.paid_date ? 'paid' : 'due';
    const overdue = !o.paid_date && due && due < today;
    // cash flow is timed on the DUE date, unless a likely date is applied → then the likely date (whenever set, not just overdue)
    if (!o.paid_date && lk) { date = lk; kind = 'likely'; }
    lines.push({
      key: o.key, type: o.type, ref: o.ref, supplier: o.supplier || '', country: o.country || '',
      amount: Math.round(num(o.amount)), paid: !!o.paid_date, estimate: !!o.estimate, basis: o.basis || 'po',
      src: o.src || '', due, paid_date: o.paid_date || null, date, date_kind: kind,
      month: date ? date.slice(0, 7) : '—', overdue, likely_date: lk,
    });
  };

  const complete = (p) => (p.progress === 'complete');
  // group shipment-assigned POs for freight/duty/tax sizing
  const byShip = {};
  pos.forEach(p => { if (p.shipment) (byShip[p.shipment] = byShip[p.shipment] || []).push(p); });

  for (const p of pos) {
    const hasRef = (p.deposit_ref || '') !== '';
    // outstanding on this PO = value used (+credit) − everything assigned/paid. When it's fully paid (owes ≤ 0),
    // its unpaid milestone TERMS are phantom — a paid-in-full PO must not show a milestone as due/overdue.
    const poDue = Math.round((num(p.value_used) + num(p.credit_amount)
      - num(p.start_assigned) - num(p.completion_assigned) - num(p.balance_1_amount) - num(p.balance_2_amount)) * 100) / 100;
    const owes = poDue > 0.02;   // still money outstanding on the PO (0.02 absorbs rounding)
    // 1. start deposit — ONLY when no deposit_ref (the referenced pool covers it instead). Skip an UNPAID term when nothing's owed.
    if (!hasRef && (p.start_date || owes)) add({ key: 'dep:' + p.po, type: 'Deposit', ref: p.po, supplier: p.supplier_name, country: p.country,
      amount: p.start_assigned != null ? p.start_assigned : p.start_calc, due: p.start_due, paid_date: p.start_date });
    // 2. completion
    if (p.completion_date || owes) add({ key: 'comp:' + p.po, type: 'Completion', ref: p.po, supplier: p.supplier_name, country: p.country,
      amount: p.completion, due: p.completion_due, paid_date: p.completion_date });
    // 3. balance (and optional 2nd balance)
    if (p.balance_1_date || owes) add({ key: 'bal:' + p.po, type: 'Balance', ref: p.po, supplier: p.supplier_name, country: p.country,
      amount: p.balance_1_amount != null ? p.balance_1_amount : p.balance_owing, due: p.balance_due, paid_date: p.balance_1_date });
    if (p.balance_2_amount != null && (p.balance_2_date || owes)) add({ key: 'bal2:' + p.po, type: 'Balance', ref: p.po, supplier: p.supplier_name,
      country: p.country, amount: p.balance_2_amount, due: p.balance_due, paid_date: p.balance_2_date });
  }
  // 4. referenced-deposit pools — one line per reference
  for (const d of depPools) {
    const linked = pos.filter(p => p.deposit_ref === d.reference);
    const earliest = linked.map(p => p.start_due).filter(Boolean).sort()[0] || null;
    // due = the deposit's own due date (register) ▸ earliest linked-PO start due; likely = the deposit's likely-pay date
    add({ key: 'deppool:' + d.reference, type: 'Deposit', ref: d.reference, supplier: d.supplier, country: d.country,
      amount: d.amount, due: d.date_due || earliest, likely: d.date_likely_pay || null,
      paid_date: d.all_paid ? d.date_paid : null, basis: 'register' });
  }
  // 5. freight + duty + tax — by shipment where assigned, else per PO. Skip complete POs (settled).
  const seenShip = {};
  for (const p of pos) {
    if (complete(p)) continue;
    const land = p.delivery;                                    // eff_delivery = the goods-land date
    // once the goods have landed the shipment is no longer "shipping": duty is cleared at the border and freight
    // is invoiced/settled around arrival, so the estimates are no longer a future cash need — drop them. (They
    // only remain while the shipment is still in transit, i.e. the landing date is today or in the future.)
    if (land && land < today) continue;
    if (p.shipment) {
      if (seenShip[p.shipment]) continue;                       // one set of lines per shipment
      seenShip[p.shipment] = true;
      const members = byShip[p.shipment] || [p];
      const fr = shipFreight[p.shipment] || { cost: null, src: '' };
      const duty = members.reduce((s, m) => s + num(m.est_duty), 0);
      const tax = members.reduce((s, m) => s + num(m.est_tax), 0);
      const dutyDue = isUSA(p.country) ? addDays(land, 7) : land;
      add({ key: 'freight:ship:' + p.shipment, type: 'Freight', ref: p.shipment, supplier: '', country: p.country,
        amount: fr.cost, due: addDays(land, 14), estimate: true, basis: 'shipment', src: fr.src });
      add({ key: 'duty:ship:' + p.shipment, type: 'Import duty', ref: p.shipment, country: p.country,
        amount: duty, due: dutyDue, estimate: true, basis: 'shipment' });
      add({ key: 'tax:ship:' + p.shipment, type: 'Import tax', ref: p.shipment, country: p.country,
        amount: tax, due: dutyDue, estimate: true, basis: 'shipment' });
    } else {
      // FOB pickup: no import-warehouse destination + no shipment → no freight/import posts to cash flow (goods
      // value still flows via the payment-plan lines above). Mirrors the PLAN landed-cost view (isFOBdest).
      if (!/^(UK|US|EU|AU|CA)/i.test(p.country || '')) continue;
      const dutyDue = isUSA(p.country) ? addDays(land, 7) : land;
      // freight = Flexport quote ▸ cheapest sea container combo for the PO's pallets (assume sea), same as the PLAN
      const poFr = p.flex_quote != null ? Math.round(num(p.flex_quote)) : seaEstSrv(p.sea_tiers, num(p.pallets));
      add({ key: 'freight:po:' + p.po, type: 'Freight', ref: p.po, supplier: p.supplier_name, country: p.country,
        amount: poFr, due: addDays(land, 14), estimate: true, basis: 'po', src: p.flex_quote != null ? 'Flexport' : 'sea est' });
      add({ key: 'duty:po:' + p.po, type: 'Import duty', ref: p.po, supplier: p.supplier_name, country: p.country,
        amount: p.est_duty, due: dutyDue, estimate: true, basis: 'po' });
      add({ key: 'tax:po:' + p.po, type: 'Import tax', ref: p.po, supplier: p.supplier_name, country: p.country,
        amount: p.est_tax, due: dutyDue, estimate: true, basis: 'po' });
    }
  }
  // 6. other payments (sundry register rows) — due date ▸ likely date ▸ paid, same as any other line
  for (const o of otherPays) {
    add({ key: 'other:' + o.id, type: 'Other', ref: o.reference || o.description || ('#' + o.id),
      supplier: o.supplier_name || '', country: o.country || '', amount: o.amount,
      due: o.date_due, likely: o.date_likely_pay, paid_date: o.date_paid, basis: 'other' });
  }
  lines.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || a.type.localeCompare(b.type));
  return { today, lines };
}

// Expedite recommendations for SUPPLY ▸ Actions: when a SKU on an open, not-yet-shipped PO will stock out
// before the PO lands (by sea), recommend the fastest fix — switch to AIR if air would land before the stockout,
// else EXPEDITE PRODUCTION (completion is the bottleneck). One action per PO, citing its worst-at-risk SKU.
// Pending supplier-portal submissions (completion_date / invoice_value) become SUPPLY ▸ Actions cards with
// one-click apply. Tracking/carrier already auto-applied in Phase 3, so they're not here.
async function submissionActions() {
  const rows = (await pool.query(`
    SELECT ss.id, ss.po, ss.kind, ss.value, ss.attachment_id, coalesce(s.name,'') supplier
    FROM planner.supplier_submissions ss LEFT JOIN planner.suppliers s ON s.id=ss.supplier_id
    WHERE ss.status='pending' AND ss.kind IN ('completion_date','invoice_value')`)).rows;
  return rows.map(r => ({
    severity: 'amber',
    type: r.kind === 'completion_date' ? 'Supplier completion date' : 'Supplier invoice',
    ref: r.po,
    detail: (r.supplier ? r.supplier + ' ' : 'Supplier ') + (r.kind === 'completion_date'
      ? 'proposed completion date ' + r.value + ' — apply to the PO’s production-end override?'
      : 'submitted invoice value $' + r.value + ' — apply as the PO invoice total?'),
    fix: 'applysub', target: 'po',
    field: r.kind === 'completion_date' ? 'end_production_overide' : 'supplier_invoice_total',
    target_key: String(r.id), attachment_id: r.attachment_id,
  }));
}
// SUPPLY ▸ Manufacturing data: finished-bundle demand (open finished POs) vs open Manufacturing-branch
// component supply, via the BOM. Shared by the `manufacturing` endpoint and the mismatch action generator.
async function manufacturingData() {
  const bom = (await pool.query(`SELECT parent_sku, component_sku, qty::numeric qty FROM planner.manufacturing_bom ORDER BY parent_sku, component_sku`)).rows;
  const parents = [...new Set(bom.map(b => b.parent_sku))];
  const comps = [...new Set(bom.map(b => b.component_sku))];
  const demRows = parents.length ? (await pool.query(`SELECT l.sku, l.po, l.qty::numeric qty, coalesce(p.branch,'') branch, coalesce(p.status,'') status,
      to_char(coalesce(p.end_production_overide, p.start_production + (coalesce(sup.production_days,0)||' days')::interval)::date,'YYYY-MM-DD') prod_end
    FROM planner.purchase_order_lines l JOIN planner.purchase_orders p ON p.po=l.po
    LEFT JOIN planner.suppliers sup ON sup.id=p.supplier_id
    WHERE l.sku = ANY($1) AND coalesce(p.branch,'') NOT ILIKE '%manufactur%'
      AND coalesce(p.status,'') NOT ILIKE '%complete%' AND coalesce(p.status,'') NOT ILIKE '%deliver%' AND coalesce(p.status,'') NOT ILIKE '%ship%'`, [parents])).rows : [];
  const supRows = comps.length ? (await pool.query(`SELECT l.sku, l.po, l.qty::numeric qty, coalesce(p.status,'') status
    FROM planner.purchase_order_lines l JOIN planner.purchase_orders p ON p.po=l.po
    WHERE l.sku = ANY($1) AND coalesce(p.branch,'') ILIKE '%manufactur%'
      AND coalesce(p.status,'') NOT ILIKE '%complete%' AND coalesce(p.status,'') NOT ILIKE '%deliver%' AND coalesce(p.status,'') NOT ILIKE '%ship%'`, [comps])).rows : [];
  const accepted = {}; (await pool.query(`SELECT component_sku, accepted FROM planner.manufacturing_accept`)).rows.forEach(r => { accepted[r.component_sku] = !!r.accepted; });
  const demandBy = {}, finishedPosBy = {}, supplyBy = {}, mfgPosBy = {};
  demRows.forEach(r => { demandBy[r.sku] = (demandBy[r.sku] || 0) + Number(r.qty); (finishedPosBy[r.sku] = finishedPosBy[r.sku] || []).push({ po: r.po, qty: Number(r.qty), branch: r.branch, status: r.status, prod_end: r.prod_end || '' }); });
  supRows.forEach(r => { supplyBy[r.sku] = (supplyBy[r.sku] || 0) + Number(r.qty); (mfgPosBy[r.sku] = mfgPosBy[r.sku] || []).push({ po: r.po, qty: Number(r.qty), status: r.status }); });
  const bundles = parents.map(parent => {
    const demand = demandBy[parent] || 0;
    const components = bom.filter(b => b.parent_sku === parent).map(b => {
      const required = demand * Number(b.qty), supplied = supplyBy[b.component_sku] || 0;
      return { component_sku: b.component_sku, per: Number(b.qty), required, supplied, diff: supplied - required, mfgPos: mfgPosBy[b.component_sku] || [], accepted: !!accepted[b.component_sku] };
    });
    return { parent_sku: parent, demand, finishedPos: finishedPosBy[parent] || [], components };
  });
  return { bom, bundles };
}
// One action card per bundle SKU that has an UNACCEPTED component mismatch (short or over vs demand).
async function manufacturingActions() {
  const { bundles } = await manufacturingData();
  const out = [];
  bundles.forEach(bn => {
    const open = (bn.components || []).filter(c => c.diff !== 0 && !c.accepted);
    if (!open.length) return;
    const shorts = open.filter(c => c.diff < 0), overs = open.filter(c => c.diff > 0);
    const parts = open.slice(0, 4).map(c => c.component_sku + ' ' + (c.diff < 0 ? 'short ' + Math.abs(c.diff).toLocaleString() : 'over ' + c.diff.toLocaleString()));
    const more = open.length > 4 ? ' +' + (open.length - 4) + ' more' : '';
    out.push({ severity: shorts.length ? 'high' : 'amber', type: 'Manufacturing mismatch', ref: bn.parent_sku,
      detail: 'Manufacturing components don’t match demand (' + bn.demand.toLocaleString() + '): ' + parts.join(', ') + more + '. Review & accept in the Manufacturing tab.',
      fix: 'gotomfg', target: '', field: '', target_key: bn.parent_sku });
  });
  return out;
}
async function expediteActions() {
  const rows = (await pool.query(`
    WITH pod AS (
      SELECT po.po, coalesce(po.supplier_name,'') supplier,
        upper(coalesce(nullif(po.country_code,''), b.country_code, '')) market,
        coalesce(po.production_status,'') ps,
        coalesce(po.end_production_overide, po.start_production + (coalesce(sup.production_days,0)||' days')::interval)::date prod_end,
        coalesce(sh.departure_date,
          (coalesce(po.end_production_overide, po.start_production + (coalesce(sup.production_days,0)||' days')::interval)::date + interval '7 days')::date) ship_d,
        b.sea_lead_time_days sea_lead, b.air_lead_time_days air_lead,
        coalesce(sh.arrival_date, sh.delivery_date, sh.landing_date, po.landing_date_overide) known_arr
      FROM planner.purchase_orders po
      LEFT JOIN planner.suppliers sup ON sup.id=po.supplier_id
      LEFT JOIN planner.branches  b   ON b.name=po.branch
      LEFT JOIN planner.shipments sh  ON sh.shipment_ref=po.shipment_ref
      WHERE coalesce(po.status,'') NOT ILIKE '%complete%'
        AND coalesce(po.production_status,'') <> 'shipped')          -- not yet shipped → mode/timing still changeable
    SELECT pod.po, pod.supplier, pod.market, pod.ps, pod.sea_lead, pod.air_lead,
      to_char(pod.prod_end,'YYYY-MM-DD') prod_end, to_char(pod.ship_d,'YYYY-MM-DD') ship_d,
      to_char(pod.known_arr,'YYYY-MM-DD') known_arr,
      l.sku, l.qty::int qty,
      coalesce(oh.oh,0)::numeric on_hand, coalesce(fc.fwk,0)::numeric fc_wk, coalesce(c.c,0)::numeric cost
    FROM pod
    JOIN planner.purchase_order_lines l ON l.po=pod.po AND l.qty>0
    LEFT JOIN (SELECT sku, upper(split_part(warehouse,'_',1)) mk, sum(available)::numeric oh
               FROM planner.product_inventory GROUP BY 1,2) oh ON oh.sku=l.sku AND oh.mk=pod.market
    LEFT JOIN (SELECT sku, upper(split_part(warehouse,'_',1)) mk, sum(units)::numeric/13.0 fwk
               FROM planner.forecast_outputs WHERE month>=date_trunc('month',CURRENT_DATE)
                 AND month<date_trunc('month',CURRENT_DATE)+interval '3 months' GROUP BY 1,2) fc ON fc.sku=l.sku AND fc.mk=pod.market
    LEFT JOIN (SELECT sku, avg(cost_price) c FROM planner.purchase_order_lines WHERE cost_price>0 GROUP BY 1) c ON c.sku=l.sku
    WHERE pod.market IN ('UK','US','EU','AU','CA')`)).rows;
  const today = (await pool.query(`SELECT current_date d`)).rows[0].d;
  const T = new Date(today).getTime(), DAY = 86400000;
  const byPo = {};
  for (const r of rows) {
    const wk = Number(r.fc_wk); if (wk <= 0.01) continue;                 // no forward demand → not at risk
    const stockoutT = T + (Number(r.on_hand) / wk) * 7 * DAY;
    // forward-looking arrivals: earliest realistic ship is no earlier than today
    const effShip = Math.max(T, r.ship_d ? new Date(r.ship_d).getTime() : T);
    const seaT = r.known_arr ? new Date(r.known_arr).getTime() : effShip + (Number(r.sea_lead) || 0) * DAY;
    const airT = effShip + (Number(r.air_lead) || 7) * DAY;
    if (seaT <= stockoutT) continue;                                      // sea lands in time → fine
    const gapDays = Math.round((seaT - stockoutT) / DAY);                 // days short by sea
    const airHelps = airT < seaT && airT <= stockoutT + 3 * DAY;
    const cand = { sku: r.sku, gapDays, units: r.qty, value: Math.round(r.qty * (Number(r.cost) || 0)),
      stockout: new Date(stockoutT).toISOString().slice(0, 10), sea_arr: new Date(seaT).toISOString().slice(0, 10), air_arr: new Date(airT).toISOString().slice(0, 10), prod_end: r.prod_end,
      on_hand: Math.round(Number(r.on_hand)), wk: Math.round(wk * 10) / 10, ps: r.ps, airHelps, supplier: r.supplier, market: r.market };
    const g = byPo[r.po] || (byPo[r.po] = { po: r.po, worst: cand, units: 0, value: 0 });
    g.units += r.qty; g.value += cand.value;
    if (cand.gapDays > g.worst.gapDays) g.worst = cand;                   // biggest shortfall = representative
  }
  const out = [];
  for (const po of Object.keys(byPo)) {
    const g = byPo[po], w = g.worst, sev = (w.value >= 5000 || w.gapDays >= 21) ? 'high' : 'amber';
    if (w.airHelps) {
      out.push({ severity: sev, type: 'Consider air freight', ref: po,
        detail: w.sku + ' (' + w.market + ') stocks out ~' + w.stockout + ' · sea arrives ' + w.sea_arr + ' (' + w.gapDays + 'd short) — air would land ~' + w.air_arr + '. ' + w.units.toLocaleString() + 'u · £' + w.value.toLocaleString() + ' at risk.',
        fix: 'gotopo', target: 'po', field: '', target_key: po });
    } else if (w.prod_end && new Date(w.prod_end).getTime() > T) {        // production still ahead → can pull it forward (air won't bridge)
      out.push({ severity: sev, type: 'Expedite production', ref: po,
        detail: w.sku + ' (' + w.market + ') stocks out ~' + w.stockout + ' · completes ' + w.prod_end + ', lands ' + w.sea_arr + ' (' + w.gapDays + 'd short, air won\'t bridge it) — pull production forward. ' + w.units.toLocaleString() + 'u · £' + w.value.toLocaleString() + ' at risk.',
        fix: 'gotopo', target: 'po', field: '', target_key: po });
    }   // else: production already done/overdue & air won't help — left to the Production/Ship check-ins
  }
  return out;
}

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

// Same-origin image proxy — lets the barcode-label PNG export embed a remote swatch without tainting the
// canvas. Read-only fetch of a public image URL; must be registered before the generic :section route.
app.get('/api/supply/img', async (req, res) => {
  try {
    const u = String(req.query.url || '');
    if (!/^https?:\/\//i.test(u)) return res.status(400).end();
    const r = await fetch(u);
    if (!r.ok) return res.status(502).end();
    res.setHeader('content-type', r.headers.get('content-type') || 'image/jpeg');
    res.setHeader('cache-control', 'public, max-age=86400');
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch (e) { res.status(500).end(); }
});

// Static brand asset for the carton/inner labels — the Global Recycled Standard logo (same-origin so it can be
// embedded into the rasterised label PNG without tainting the canvas).
app.get('/api/supply/asset/:name', (req, res) => {
  const files = { grs: ['grs-logo.png', 'image/png'], db: ['db-logo.png', 'image/png'],
    'gotham-book': ['gotham-book.ttf', 'font/ttf'], 'gotham-bold': ['gotham-bold.ttf', 'font/ttf'] };
  const a = files[req.params.name]; if (!a) return res.status(404).end();
  try { res.setHeader('content-type', a[1]); res.setHeader('cache-control', 'public, max-age=86400');
    res.end(readFileSync(new URL('./supply/assets/' + a[0], import.meta.url))); }
  catch (e) { res.status(404).end(); }
});

// Label rows for the supplier-portal barcode downloads — for one PO's SKUs (?po=) or a whole production's SKUs
// scoped to a supplier via supplier_multiple_all (?prod=&supplier=). MASTER variants only, barcode present.
app.get('/api/supply/label-data', async (req, res) => {
  try {
    const { po, prod, supplier, skus, batch } = req.query;
    let where, params;
    if (skus) { where = 'sl.sku = ANY($1)'; params = [String(skus).split(',').map(s => s.trim()).filter(Boolean)]; }
    else if (po) { where = 'sl.sku IN (SELECT sku FROM planner.purchase_order_lines WHERE po=$1)'; params = [po]; }
    else if (prod) {
      where = "sl.sku IN (SELECT DISTINCT l.sku FROM planner.purchase_order_lines l JOIN planner.purchase_orders po ON po.po=l.po WHERE po.prod_no=$1)";
      params = [prod];
      if (supplier) { where += " AND coalesce(p.supplier_multiple_all,'') ILIKE '%'||$2||'%'"; params.push(supplier); }
    } else if (batch) {
      where = "sl.sku IN (SELECT DISTINCT l.sku FROM planner.purchase_order_lines l JOIN planner.purchase_orders po ON po.po=l.po WHERE po.batch_id=$1)";
      params = [batch];
      if (supplier) { where += " AND coalesce(p.supplier_multiple_all,'') ILIKE '%'||$2||'%'"; params.push(supplier); }
    } else return res.status(400).json({ error: 'po, prod or batch required' });
    const rows = (await pool.query(`
      SELECT sl.sku, sl.barcode_sku_name, sl.barcode_carton_name, sl.barcode_inner_name,
        sl.size, coalesce(p.size_short, sl.size_short, '') size_short, sl.category, sl.carton_qty,
        sl.product_barcode, sl.carton_barcode, sl.inner_barcode, sl.grs_material, sl.swatch_url,
        sl.uk_carton_l, sl.uk_carton_w, sl.uk_carton_h, sl.uk_carton_wt,
        coalesce(p.supplier_multiple_all,'') supplier_multiple, p.uk_rt, p.us_rt, p.eu_rt, coalesce(p.product_name,'') product_name
      FROM planner.sku_labels sl LEFT JOIN planner.products p ON p.sku=sl.sku
      WHERE ${where}
        AND coalesce(sl.variant_type,'') NOT ILIKE 'set'
        AND coalesce(sl.product_barcode, sl.carton_barcode, sl.inner_barcode) IS NOT NULL
      ORDER BY sl.sku`, params)).rows;
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Supplier-submitted actual cost prices (portal order plan). Read all (small table); filtered client-side by PO.
app.get('/api/supply/portal-line-costs', async (req, res) => {
  try { res.json((await pool.query(`SELECT po, sku, actual_cost, amended_qty, coalesce(is_added,false) is_added, final_cost,
    (actual_cost IS NOT NULL OR amended_qty IS NOT NULL OR is_added=true) AND (confirmed_at IS NULL OR confirmed_at < submitted_at) unconfirmed
    FROM planner.portal_line_costs`)).rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
// Crossdock shipped quantities (supplier-entered, per PO × crossdock SKU). Reflects on the PO + master shipment.
app.get('/api/supply/crossdock-shipments', async (req, res) => {
  try { res.json((await pool.query('SELECT po, sku, qty FROM planner.crossdock_shipments')).rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/supply/crossdock-qty', async (req, res) => {
  const b = req.body || {};
  if (!b.po || !b.sku) return res.status(400).json({ error: 'po and sku required' });
  try {
    const qty = (b.qty === '' || b.qty == null) ? null : Number(b.qty);
    await pool.query(`INSERT INTO planner.crossdock_shipments (po, sku, qty, submitted_by, submitted_at)
      VALUES ($1,$2,$3,$4, now()) ON CONFLICT (po, sku) DO UPDATE SET qty=excluded.qty, submitted_by=excluded.submitted_by, submitted_at=now()`,
      [b.po, b.sku, qty, b.submitted_by || null]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Supplier-entered additional cost lines (description / qty / price) per PO — sum into the total invoice cost.
app.get('/api/supply/additional-costs', async (req, res) => {
  try { res.json((await pool.query(`SELECT id, po, coalesce(description,'') description, qty, price FROM planner.portal_additional_costs ORDER BY id`)).rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/supply/additional-cost', async (req, res) => {
  const b = req.body || {};
  const num = v => (v === '' || v == null) ? null : Number(v);
  try {
    if (b.id) {
      await pool.query(`UPDATE planner.portal_additional_costs SET description=$2, qty=$3, price=$4, submitted_by=$5, submitted_at=now() WHERE id=$1`,
        [b.id, b.description || '', num(b.qty), num(b.price), b.submitted_by || null]);
      res.json({ ok: true, id: b.id });
    } else {
      if (!b.po) return res.status(400).json({ error: 'po required' });
      const r = await pool.query(`INSERT INTO planner.portal_additional_costs (po, description, qty, price, submitted_by) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [b.po, b.description || '', num(b.qty), num(b.price), b.submitted_by || null]);
      res.json({ ok: true, id: r.rows[0].id });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/supply/additional-cost-remove', async (req, res) => {
  if (!req.body || !req.body.id) return res.status(400).json({ error: 'id required' });
  try { await pool.query('DELETE FROM planner.portal_additional_costs WHERE id=$1', [req.body.id]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
// Crossdock rollup for one shipment: every crossdock SKU across the POs on the shipment, with qty + source PO/supplier/client.
app.get('/api/supply/shipment-crossdock/:ref', async (req, res) => {
  try { res.json(await qp(`
    SELECT po.po, trim(s.sku) sku, cs.qty,
           coalesce(po.supplier_name,'') supplier_name, coalesce(po.client,'') client,
           coalesce(po.sales_order_ref,'') sales_order_ref, coalesce(po.dispatch_order_ref,'') dispatch_order_ref
    FROM planner.purchase_orders po
    CROSS JOIN LATERAL unnest(string_to_array(coalesce(po.crossdock_skus,''), ',')) AS s(sku)
    LEFT JOIN planner.crossdock_shipments cs ON cs.po=po.po AND cs.sku=trim(s.sku)
    WHERE po.shipment_ref=$1 AND trim(s.sku)<>'' ORDER BY po.po, sku`, [req.params.ref])); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── SAMPLES — detail / address autocomplete / timeline (specific routes BEFORE the :section catch-all)
app.get('/api/supply/sample-detail/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const s = (await pool.query(`SELECT id, ref, supplier_id, coalesce(supplier_name,'') supplier_name,
      coalesce(recipient_company,'') recipient_company, coalesce(first_name,'') first_name, coalesce(last_name,'') last_name,
      coalesce(address_line1,'') address_line1, coalesce(address_line2,'') address_line2, coalesce(city,'') city,
      coalesce(region,'') region, coalesce(postcode,'') postcode, coalesce(country,'') country, coalesce(phone,'') phone,
      to_char(completion_date_required,'YYYY-MM-DD') completion_required, coalesce(purpose,'{}') purpose, coalesce(notes,'') notes,
      status, to_char(accepted_at,'YYYY-MM-DD') accepted_at, to_char(supplier_expected_completion,'YYYY-MM-DD') supplier_expected,
      coalesce(tracking_code,'') tracking_code, coalesce(carrier,'') carrier, coalesce(created_by,'') created_by,
      to_char(created_at,'YYYY-MM-DD') created_at
      FROM planner.sample_requests WHERE id=$1::bigint`, [id])).rows[0];
    if (!s) return res.status(404).json({ error: 'sample not found' });
    const lines = (await pool.query(`SELECT id, sku, qty FROM planner.sample_request_lines WHERE sample_id=$1::bigint ORDER BY id`, [id])).rows;
    const notes = (await pool.query(`SELECT id, author_kind, coalesce(author_email,'') author_email, body,
      to_char(created_at,'YYYY-MM-DD HH24:MI') created_at, read_at IS NOT NULL read FROM planner.sample_notes WHERE sample_id=$1::bigint ORDER BY created_at`, [id])).rows;
    const charges = (await pool.query(`SELECT id, coalesce(supplier_name,'') supplier_name, freight_cost, product_cost,
      coalesce(description,'') description, status, to_char(created_at,'YYYY-MM-DD') created_at, other_payment_id
      FROM planner.supplier_charges WHERE source_type='sample' AND source_ref=$1 ORDER BY created_at`, [s.ref])).rows;
    const attachments = (await pool.query(`SELECT id, filename, coalesce(uploaded_by,'') uploaded_by, to_char(uploaded_at,'YYYY-MM-DD') uploaded_at
      FROM planner.portal_attachments WHERE category='sample' AND po=$1 ORDER BY uploaded_at`, [s.ref])).rows;
    res.json({ sample: s, lines, notes, charges, attachments });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/supply/sample-addresses', async (req, res) => {
  const ql = '%' + String(req.query.q || '').toLowerCase() + '%';
  try { res.json((await pool.query(`SELECT DISTINCT coalesce(recipient_company,'') recipient_company,
      coalesce(first_name,'') first_name, coalesce(last_name,'') last_name, coalesce(address_line1,'') address_line1,
      coalesce(address_line2,'') address_line2, coalesce(city,'') city, coalesce(region,'') region,
      coalesce(postcode,'') postcode, coalesce(country,'') country, coalesce(phone,'') phone
      FROM planner.sample_requests
      WHERE coalesce(recipient_company,'')<>'' AND (lower(coalesce(recipient_company,'')) LIKE $1
        OR lower(coalesce(first_name,'')||' '||coalesce(last_name,'')) LIKE $1)
      ORDER BY recipient_company LIMIT 20`, [ql])).rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/supply/sample-notes', async (req, res) => {
  try { res.json((await pool.query(`SELECT id, author_kind, coalesce(author_email,'') author_email, body,
    to_char(created_at,'YYYY-MM-DD HH24:MI') created_at, read_at IS NOT NULL read
    FROM planner.sample_notes WHERE sample_id=$1::bigint ORDER BY created_at`, [req.query.id || '0'])).rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
// Charges for a shipment (admin) — list + status; create/accept/reject reuse /api/supply/charge-*.
app.get('/api/supply/shipment-charges/:ref', async (req, res) => {
  try { res.json((await pool.query(`SELECT id, coalesce(supplier_name,'') supplier_name, freight_cost, product_cost,
    coalesce(description,'') description, status, to_char(created_at,'YYYY-MM-DD') created_at, other_payment_id
    FROM planner.supplier_charges WHERE source_type='shipment' AND source_ref=$1 ORDER BY created_at`, [req.params.ref])).rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
// Create a shipment charge (admin / "preview as supplier" — mirrors /api/portal/shipment-charge without scoping)
app.post('/api/supply/shipment-charge', async (req, res) => {
  const b = req.body || {}; if(!b.shipment_ref) return res.status(400).json({ error: 'shipment_ref required' });
  try { const sup = (await pool.query(`SELECT string_agg(DISTINCT supplier_name,', ') s FROM planner.purchase_orders WHERE shipment_ref=$1`, [b.shipment_ref])).rows[0].s || null;
    const r = await pool.query(`INSERT INTO planner.supplier_charges (source_type, source_ref, supplier_name, freight_cost, product_cost, description, created_by)
      VALUES ('shipment',$1,$2,$3,$4,$5,$6) RETURNING id`, [b.shipment_ref, b.supplier_name||sup, Number(b.freight_cost)||0, Number(b.product_cost)||0, b.description||null, b.created_by||'preview']);
    res.json({ ok:true, id: r.rows[0].id }); } catch (e) { res.status(500).json({ error: e.message }); }
});
// Direct to Client details approval (admin "preview as supplier")
app.post('/api/supply/dtc-accept', async (req, res) => {
  const po = req.body && req.body.po; if(!po) return res.status(400).json({ error: 'po required' });
  try { await pool.query(`UPDATE planner.purchase_orders SET dtc_accepted_at=now(), dtc_accepted_by=$2 WHERE po=$1`, [po, req.body.by||'D&B (preview)']);
    res.json({ ok:true }); } catch(e){ res.status(500).json({ error: e.message }); } });

// ── SUPPLY tab (Production Planner) read APIs — one route, section in the path.
// Read-only JSON from the Phase-2 planner tables. No writes (writes are a later, gated step).
app.get('/api/supply/:section', async (req, res) => {
  const q = (sql) => pool.query(sql).then(r => r.rows);
  try {
    switch (req.params.section) {
      case 'samples':   // SUPPLY ▸ Samples grid — all sample requests + open/overdue/charge flags
        return res.json(await q(`SELECT s.id, s.ref, coalesce(s.supplier_name,'') supplier_name,
          coalesce(s.recipient_company,'') recipient_company,
          trim(coalesce(s.first_name,'')||' '||coalesce(s.last_name,'')) recipient_name,
          coalesce(s.city,'') city, coalesce(s.country,'') country,
          coalesce(s.address_line1,'') address_line1, coalesce(s.address_line2,'') address_line2,
          coalesce(s.region,'') region, coalesce(s.postcode,'') postcode, coalesce(s.phone,'') phone, coalesce(s.notes,'') notes,
          coalesce((SELECT json_agg(json_build_object('sku',l.sku,'qty',l.qty) ORDER BY l.id) FROM planner.sample_request_lines l WHERE l.sample_id=s.id),'[]') lines,
          coalesce((SELECT json_agg(json_build_object('id',c.id,'freight_cost',c.freight_cost,'product_cost',c.product_cost,'status',c.status,'description',coalesce(c.description,'')) ORDER BY c.created_at) FROM planner.supplier_charges c WHERE c.source_type='sample' AND c.source_ref=s.ref),'[]') charges,
          to_char(s.completion_date_required,'YYYY-MM-DD') completion_required,
          to_char(s.supplier_expected_completion,'YYYY-MM-DD') supplier_expected,
          s.status, coalesce(s.tracking_code,'') tracking_code, coalesce(s.carrier,'') carrier,
          (s.accepted_at IS NOT NULL) accepted, coalesce(s.purpose,'{}') purpose,
          (SELECT count(*) FROM planner.sample_request_lines l WHERE l.sample_id=s.id)::int line_count,
          (SELECT coalesce(sum(l.qty),0) FROM planner.sample_request_lines l WHERE l.sample_id=s.id)::int units,
          (SELECT count(*) FROM planner.supplier_charges c WHERE c.source_type='sample' AND c.source_ref=s.ref AND c.status='pending')::int pending_charges,
          (SELECT coalesce(sum(c.freight_cost+c.product_cost),0) FROM planner.supplier_charges c WHERE c.source_type='sample' AND c.source_ref=s.ref AND c.status='accepted') accepted_charge,
          (SELECT count(*) FROM planner.sample_notes n WHERE n.sample_id=s.id AND n.author_kind='supplier' AND n.read_at IS NULL)::int unread_notes,
          coalesce(s.change_requested,false) change_requested,
          (s.status NOT IN ('cancelled','complete') AND (coalesce(s.tracking_code,'')='' OR coalesce(s.change_requested,false)
             OR EXISTS (SELECT 1 FROM planner.supplier_charges c WHERE c.source_type='sample' AND c.source_ref=s.ref AND c.status='pending')
             OR EXISTS (SELECT 1 FROM planner.sample_notes n WHERE n.sample_id=s.id AND n.author_kind='supplier' AND n.read_at IS NULL)
             OR EXISTS (SELECT 1 FROM planner.sample_notes n2 WHERE n2.sample_id=s.id AND n2.body LIKE 'Order shipped%' AND n2.created_at >= now() - interval '30 days'))) is_open,
          (s.completion_date_required IS NOT NULL AND s.status NOT IN ('cancelled','complete')
             AND (current_date > s.completion_date_required
                  OR (s.supplier_expected_completion IS NOT NULL AND s.supplier_expected_completion > s.completion_date_required))) overdue,
          CASE
            WHEN s.status='cancelled' THEN 'Cancelled'
            WHEN s.status='complete' THEN 'Complete'
            WHEN coalesce(s.change_requested,false) THEN 'Change requested'
            WHEN (SELECT count(*) FROM planner.supplier_charges c WHERE c.source_type='sample' AND c.source_ref=s.ref AND c.status='pending')>0 THEN 'Charge to review'
            WHEN coalesce(s.tracking_code,'')<>'' THEN 'Shipped'
            WHEN s.accepted_at IS NOT NULL THEN 'In production'
            ELSE 'Awaiting supplier'
          END status_calc
          FROM planner.sample_requests s ORDER BY s.created_at DESC`));
      case 'suppliers':
        return res.json(await q(`SELECT id,code,name,kind,default_currency,
          start_deposit_pct,completion_pct,balance_pct,credit_days,credit_type,
          credit_fee_on_balance_pct,production_days,country,contact_name,email
          FROM planner.suppliers ORDER BY kind,name`));
      case 'key-accounts':
        return res.json(await q(`SELECT * FROM planner.key_accounts ORDER BY name`));
      case 'bi': {   // SUPPLY ▸ BI — Metrics Summary (Phase 0a). Live operational counts; no engine yet.
        const UNITS = `coalesce((SELECT sum(l.qty) FROM planner.purchase_order_lines l WHERE l.po=p.po),0)`;
        const VAL   = `coalesce((SELECT sum(l.qty*coalesce(l.cost_price,0)) FROM planner.purchase_order_lines l WHERE l.po=p.po),0)`;
        const PAL   = `coalesce((SELECT sum(l.qty::numeric/NULLIF(sl.pallet_qty,0)) FROM planner.purchase_order_lines l LEFT JOIN planner.sku_labels sl ON sl.sku=l.sku WHERE l.po=p.po),0)`;
        const poAgg = (await q(`SELECT
            count(*) FILTER (WHERE status NOT ILIKE '%complete%')::int open_total,
            count(*) FILTER (WHERE status ILIKE 'future%')::int future,
            count(*) FILTER (WHERE status ILIKE 'production%')::int production,
            count(*) FILTER (WHERE status ILIKE 'shipping%')::int shipping,
            coalesce(sum(${UNITS}) FILTER (WHERE status ILIKE 'production%'),0)::bigint units_in_production,
            round(coalesce(sum(${PAL}) FILTER (WHERE status ILIKE 'production%'),0)::numeric,1) pallets_in_production,
            round(coalesce(sum(${VAL}) FILTER (WHERE status ILIKE 'production%'),0)::numeric) value_in_production,
            coalesce(sum(${UNITS}) FILTER (WHERE status ILIKE 'shipping%'),0)::bigint units_inbound,
            round(coalesce(sum(${VAL}) FILTER (WHERE status ILIKE 'shipping%'),0)::numeric) value_in_transit,
            count(*) FILTER (WHERE status NOT ILIKE '%complete%'
              AND coalesce((SELECT pn.require_supplier_confirmation FROM planner.prod_numbers pn WHERE pn.prod_no=p.prod_no),false)
              AND p.supplier_confirmed_at IS NULL)::int awaiting_confirmation
          FROM planner.purchase_orders p`))[0];
        const shipAgg = (await q(`SELECT count(*)::int active_shipments,
            round(coalesce(sum(pal),0)/20.0,1) containers_shipping
          FROM (SELECT coalesce((SELECT sum(l.qty::numeric/NULLIF(sl.pallet_qty,0))
                  FROM planner.purchase_orders po JOIN planner.purchase_order_lines l ON l.po=po.po
                  LEFT JOIN planner.sku_labels sl ON sl.sku=l.sku WHERE po.shipment_ref=s.shipment_ref),0) pal
                FROM planner.shipments s WHERE coalesce(s.status,'') NOT ILIKE '%complete%') z`))[0];
        // "outstanding" = deposit capital tied to deposits still drawn on by at least one OPEN (non-complete) PO.
        // (Avoids summing all-time historical deposits; the exact drawn-down balance arrives with the BI engine.)
        const dep = (await q(`SELECT round(coalesce(sum(d.amount),0)::numeric) outstanding, count(*)::int pools
          FROM planner.deposits d WHERE d.is_deposit AND EXISTS (
            SELECT 1 FROM planner.purchase_orders p
            WHERE p.deposit_ref=d.reference AND coalesce(p.status,'') NOT ILIKE '%complete%')`))[0];
        const pip = Math.round((Number(poAgg.pallets_in_production) / 20) * 10) / 10;
        return res.json({
          open_pos: { total: poAgg.open_total, future: poAgg.future, production: poAgg.production, shipping: poAgg.shipping },
          units_in_production: Number(poAgg.units_in_production),
          active_shipments: shipAgg.active_shipments,
          containers_shipping: Number(shipAgg.containers_shipping),
          containers_in_production: pip,
          units_inbound: Number(poAgg.units_inbound),
          value_in_production: Number(poAgg.value_in_production),
          value_in_transit: Number(poAgg.value_in_transit),
          awaiting_confirmation: poAgg.awaiting_confirmation,
          deposits_outstanding: Number(dep.outstanding),
          deposit_pools: dep.pools,
        });
      }
      case 'purchase-orders':
      case 'cashflow': {
        // value est = Σ(qty×cost) from order-plan lines (fallback to stored estimate).
        // Catch-up: completion = (start%+completion%)×value − actual start-deposit assigned, so
        // completion tops up to the cumulative target when the assigned deposit differed from start%.
        // Balance due: on-shipment → ship/departure + credit days; on-clearance → landing + credit days.
        // Landing imports from linked Flexport (FLEX) unless manually overridden (M).
        // 'cashflow' reuses this exact PO calc, then re-shapes the rows into dated payment line items.
        const _pos = await q(`
          WITH base AS (
            SELECT po.*, s.credit_days, s.credit_type,
              -- effective %s: per-PO override wins over the supplier's standard terms; small POs (value used
              -- < $500) default to 0% start + 0% completion (→ 100% balance) unless a per-PO override is set.
              -- ONLY for open POs (not complete) — completed history keeps its original supplier terms.
              coalesce(po.start_deposit_pct_override,
                CASE WHEN coalesce(po.status,'') NOT ILIKE '%complete%' AND coalesce(po.supplier_invoice_total, lv.line_value, po.order_value_estimation, 0) < 500 THEN 0 ELSE s.start_deposit_pct END, 0) sp,
              coalesce(po.completion_pct_override,
                CASE WHEN coalesce(po.status,'') NOT ILIKE '%complete%' AND coalesce(po.supplier_invoice_total, lv.line_value, po.order_value_estimation, 0) < 500 THEN 0 ELSE s.completion_pct END, 0) cp,
              coalesce(lv.line_value, po.order_value_estimation) value_est,
              (lv.line_value IS NOT NULL) value_from_lines,
              -- final supplier invoice amount trumps the estimate for every payment / landed calc
              coalesce(po.supplier_invoice_total, lv.line_value, po.order_value_estimation, 0) val,
              fx.flex_id, fx.landing_date flex_landing, fx.arrival_date flex_arrival, fx.departure_date flex_departure,
              sh.landing_date sh_landing, sh.delivery_date sh_delivery, sh.departure_date sh_departure, sh.arrival_date sh_arrival,
              coalesce(sh.status,'') sh_status_raw,
              sh.mode sh_mode, sh.carrier sh_carrier, sh.carrier_ref sh_carrier_ref, fx.mode flex_mode,
              (sh.master_po = po.po) is_master,
              da.avail deposit_avail, da.fx_rate deposit_fx,
              -- landed-cost inputs: flexport quote, freight rate-card, import-tax rate, per-line duty
              coalesce(fx.total_quoted_amount, fx.total_freight_cost) flex_quote,
              fr.cost freight_rate, tr.tax_pct tax_pct, coalesce(tr.base,'landed') tax_base_kind,
              dty.duty duty,
              -- lead-time inputs: production from supplier; transit from the branch, picked by the
              -- shipment's mode (air → air_lead, else sea_lead; sea assumed when no shipment/mode)
              s.production_days, b.sea_lead_time_days sea_lead, b.air_lead_time_days air_lead,
              (CASE WHEN lower(coalesce(sh.mode, CASE WHEN fx.mode ILIKE 'air%' THEN 'air' END, 'sea'))='air'
                    THEN b.air_lead_time_days ELSE b.sea_lead_time_days END) transit_lead,
              -- ship-to: explicit override ▸ the branch's country
              b.country_code branch_country,
              -- ERP (Fulfil/Cin7) mirror: final delivery date + id, for date-misalignment detection
              erp.final_delivery_date erp_final_delivery_date, erp.erp_po_id erp_po_id_src, (erp.po IS NOT NULL) erp_present
            FROM planner.purchase_orders po
            LEFT JOIN planner.suppliers s ON s.id=po.supplier_id
            LEFT JOIN planner.branches b ON b.name=po.branch
            LEFT JOIN planner.erp_purchase_orders erp ON erp.po=po.po
            LEFT JOIN planner.shipments sh ON sh.shipment_ref=po.shipment_ref
            LEFT JOIN planner.import_tax_rates tr ON tr.country=coalesce(nullif(po.country_code,''), b.country_code)
            LEFT JOIN LATERAL (SELECT sum(l.qty*l.cost_price) line_value
              FROM planner.purchase_order_lines l WHERE l.po=po.po) lv ON true
            LEFT JOIN LATERAL (SELECT f.* FROM planner.flexport_shipments f
              WHERE f.flex_id=po.flexport_reference OR f.shipment_name=po.po OR f.shipment_name=po.shipment_ref
              ORDER BY (f.flex_id=po.flexport_reference) DESC NULLS LAST LIMIT 1) fx ON true
            LEFT JOIN LATERAL (  -- remaining on the deposit ref this PO draws on (pool − assigned) + the deposit's Xero FX rate
              SELECT coalesce((SELECT sum(amount) FROM planner.deposits d
                               WHERE d.is_deposit AND d.reference=po.deposit_ref),0)
                   - coalesce((SELECT sum(coalesce(p2.pay_start_deposit_assigned,0)) FROM planner.purchase_orders p2
                               WHERE p2.deposit_ref=po.deposit_ref),0) avail,
                (SELECT d.xero_fx FROM planner.deposits d
                   WHERE d.is_deposit AND d.reference=po.deposit_ref AND d.xero_fx IS NOT NULL
                   ORDER BY d.date_paid DESC NULLS LAST LIMIT 1) fx_rate
              WHERE coalesce(po.deposit_ref,'') <> '') da ON true
            LEFT JOIN LATERAL (SELECT cost FROM planner.freight_rates
              WHERE destination=coalesce(nullif(po.country_code,''), b.country_code) AND container_size=po.container_size LIMIT 1) fr ON true
            LEFT JOIN LATERAL (  -- import duty = Σ line value × duty% (product override ▸ category card)
              SELECT sum(l.qty*l.cost_price*coalesce(pc.duty_pct, dr.duty_pct, 0)/100) duty
              FROM planner.purchase_order_lines l
              JOIN planner.products p2 ON p2.sku=l.sku
              LEFT JOIN planner.product_countries pc ON pc.sku=l.sku AND pc.country=lower(coalesce(nullif(po.country_code,''), b.country_code))
              LEFT JOIN planner.duty_rates dr ON dr.category=p2.category AND dr.country=coalesce(nullif(po.country_code,''), b.country_code)
              WHERE l.po=po.po) dty ON true
          ), calc AS (
            SELECT *,
              round(val*sp/100,2) start_calc,                                  -- start deposit (full term)
              -- start deposit actually DRAWN: a manual assignment wins; otherwise the term — but when the PO draws
              -- on a deposit ref the draw is CAPPED at that ref's remaining availability, and the shortfall rolls
              -- into the completion deposit (you can't pay more deposit than the ref actually holds).
              coalesce(pay_start_deposit_assigned,
                LEAST(round(val*sp/100,2), CASE WHEN coalesce(deposit_ref,'')<>'' THEN GREATEST(round(coalesce(deposit_avail,0),2),0) ELSE round(val*sp/100,2) END)) start_paid,
              -- completion term (+ any rolled-in start shortfall), but CAPPED at what's actually still owed after
              -- the start deposit AND any balance already paid — completion can never exceed the outstanding
              -- (e.g. if the balance was settled first, a term-based completion must not re-demand paid money).
              -- ONLY when the supplier actually has a completion milestone (cp>0): if there's no completion term,
              -- an unpaid/undrawn start deposit (e.g. deposit ref = NO DEPOSIT, or a pool that ran short) has no
              -- completion to roll into, so it stays in the balance (completion = 0).
              CASE WHEN cp > 0 THEN LEAST(
                round((sp+cp)/100*val - coalesce(pay_start_deposit_assigned,
                  LEAST(round(val*sp/100,2), CASE WHEN coalesce(deposit_ref,'')<>'' THEN GREATEST(round(coalesce(deposit_avail,0),2),0) ELSE round(val*sp/100,2) END)),2),
                GREATEST(round(val + coalesce(credit_amount,0) - coalesce(pay_start_deposit_assigned,
                  LEAST(round(val*sp/100,2), CASE WHEN coalesce(deposit_ref,'')<>'' THEN GREATEST(round(coalesce(deposit_avail,0),2),0) ELSE round(val*sp/100,2) END))
                  - coalesce(pay_balance_1_amount,0) - coalesce(pay_balance_2_amount,0), 2), 0)
              ) ELSE 0 END completion_calc, -- completion term + any rolled-in start shortfall (only if cp>0), capped at the remaining owed
              -- start shortfall rolled into completion — only when there IS a completion milestone (cp>0); else it lands in the balance
              CASE WHEN cp > 0 THEN round(val*sp/100 - coalesce(pay_start_deposit_assigned,
                LEAST(round(val*sp/100,2), CASE WHEN coalesce(deposit_ref,'')<>'' THEN GREATEST(round(coalesce(deposit_avail,0),2),0) ELSE round(val*sp/100,2) END)),2) ELSE 0 END catch_up,  -- start term − start drawn (rolled into completion when cp>0)
              -- production end: manual override ▸ start production + supplier lead (production_days)
              coalesce(end_production_overide,
                CASE WHEN start_production IS NOT NULL AND production_days IS NOT NULL
                     THEN (start_production + (production_days||' days')::interval)::date END) eff_prod_end,
              (end_production_overide IS NULL AND start_production IS NOT NULL AND production_days IS NOT NULL) prod_end_calc
            FROM base
          ), calc2 AS (
            SELECT *,
              -- ship: shipment departure (if assigned) ▸ flexport ▸ production end + 7 days. No PO override.
              coalesce(sh_departure, flex_departure,
                CASE WHEN eff_prod_end IS NOT NULL THEN (eff_prod_end + interval '7 days')::date END) eff_ship,
              CASE WHEN sh_departure IS NOT NULL THEN 'S' WHEN flex_departure IS NOT NULL THEN 'FLEX'
                   WHEN eff_prod_end IS NOT NULL THEN 'calc' END ship_src
            FROM calc
          ), calc3 AS (
            SELECT *,
              -- delivery: shipment delivery/arrival/landing (if assigned) ▸ flexport ▸ ship + branch transit
              -- lead (sea/air by shipment mode). No PO override.
              -- delivery/arrival: shipment overrides ▸ Flexport ARRIVAL (the real arrival date) ▸ Flexport landing
              -- (early ETA) ▸ ship + transit lead. Flexport arrival is preferred over landing (arrival is ~a week
              -- later and is the date shown on the Flexport report), matching the shipment arrival-before-landing order.
              coalesce(sh_delivery, sh_arrival, sh_landing, flex_arrival, flex_landing,
                CASE WHEN eff_ship IS NOT NULL AND transit_lead IS NOT NULL
                     THEN (eff_ship + (transit_lead||' days')::interval)::date END) eff_delivery,
              CASE WHEN sh_delivery IS NOT NULL OR sh_arrival IS NOT NULL OR sh_landing IS NOT NULL THEN 'S'
                   WHEN flex_arrival IS NOT NULL OR flex_landing IS NOT NULL THEN 'FLEX'
                   WHEN eff_ship IS NOT NULL AND transit_lead IS NOT NULL THEN 'calc' END delivery_src
            FROM calc2
          ), calc4 AS (
            SELECT *,
              -- completion = delivery + 7d warehouse check-in — EXCEPT direct-to-client is FOB (no warehouse
              -- leg) → completion = delivery, UNLESS the PO is a child of a consolidated shipment (then we
              -- crossdock via the warehouse, so the +7 applies). A self-master/no shipment stays FOB.
              CASE WHEN eff_delivery IS NOT NULL THEN (eff_delivery
                + (CASE WHEN upper(coalesce(nullif(country_code,''), branch_country, ''))='DIRECT'
                          AND coalesce(nullif(shipment_ref,''), po)=po
                        THEN 0 ELSE 7 END||' days')::interval)::date END eff_checkin,
              -- balance due: the PO's "final payment due" override (balance_due_date_overide) takes priority;
              -- then small POs (value used < $500, paid 100% on the balance) are due on the invoice-processed
              -- date once final, else the ship date while still an estimate — no credit terms applied;
              -- else the normal rule: (on-shipment → ship; on-clearance → delivery) + supplier credit days
              coalesce(balance_due_date_overide,
                CASE WHEN val < 500 AND coalesce(status,'') NOT ILIKE '%complete%' THEN coalesce(invoice_processed_date, eff_ship)
                     ELSE ((CASE WHEN credit_type='on_shipment' THEN eff_ship ELSE eff_delivery END)
                        + (coalesce(credit_days,0)||' days')::interval)::date END) bal_due_date
            FROM calc3
          ), mastered AS (
            -- Shipment wins: a PO on a shipment inherits the MASTER PO's effective dates (they travel as one).
            -- The shipment's master is shipments.master_po (or, for a master-PO-as-shipment, the shipment_ref
            -- itself). m_* are null for the master itself and for POs not on a shipment → they keep own dates.
            SELECT calc4.*, m.eff_delivery m_delivery, m.eff_checkin m_checkin, m.eff_ship m_ship,
                   coalesce(nullif(sh2.master_po,''), calc4.shipment_ref) ship_master_po
            FROM calc4
            LEFT JOIN planner.shipments sh2 ON sh2.shipment_ref = calc4.shipment_ref
            LEFT JOIN calc4 m ON m.po = coalesce(nullif(sh2.master_po,''), calc4.shipment_ref) AND m.po <> calc4.po
          )
          SELECT po, supplier_name, status,
            CASE WHEN coalesce(status,'') ILIKE '%complete%' THEN 'complete'
                 WHEN coalesce(status,'') ILIKE '%future%' THEN 'future' ELSE 'in_progress' END progress,
            -- effective status of the assigned shipment (mirrors the SHIPMENTS grid; all-complete override is
            -- irrelevant here since a PO showing this is itself open). Used to offer "advance to SHIPPING".
            CASE WHEN coalesce(shipment_ref,'')='' THEN NULL
                 ELSE coalesce(
                   CASE lower(nullif(sh_status_raw,'')) WHEN 'active' THEN 'Shipping' WHEN 'complete' THEN 'Completed'
                        WHEN 'completed' THEN 'Completed' WHEN 'shipping' THEN 'Shipping' WHEN 'planned' THEN 'Planned'
                        ELSE nullif(sh_status_raw,'') END,
                   CASE WHEN coalesce(sh_arrival, sh_landing, flex_landing) < current_date THEN 'Completed'
                        WHEN coalesce(sh_departure, flex_departure) <= current_date THEN 'Shipping'
                        ELSE 'Planned' END) END ship_status,
            to_char(start_production,'YYYY-MM-DD') prod_start,
            to_char(eff_prod_end,'YYYY-MM-DD') prod_end,
            CASE WHEN end_production_overide IS NOT NULL THEN 'M' WHEN prod_end_calc THEN 'calc' END prod_end_src,
            to_char(coalesce(m_ship, eff_ship),'YYYY-MM-DD') ship, CASE WHEN m_ship IS NOT NULL THEN 'S' ELSE ship_src END ship_src,
            to_char(coalesce(m_delivery, eff_delivery),'YYYY-MM-DD') delivery, CASE WHEN m_delivery IS NOT NULL THEN 'S' ELSE delivery_src END delivery_src,
            to_char(coalesce(m_checkin, eff_checkin),'YYYY-MM-DD') checkin,
            CASE WHEN m_delivery IS NOT NULL THEN ship_master_po END delivery_master_po,   -- set = these dates came from this shipment's master PO
            -- raw overrides for the PLAN date editors (blank = use the calculated value)
            to_char(end_production_overide,'YYYY-MM-DD') end_override,
            to_char(supplier_ship_date,'YYYY-MM-DD') ship_override,
            to_char(delivery_date_overide,'YYYY-MM-DD') delivery_override,
            coalesce(is_master,false) is_master,
            flexport_reference, flex_id, value_est, value_from_lines,
            round(supplier_invoice_total,2) final_invoice, (supplier_invoice_total IS NOT NULL) is_final, round(val,2) value_used,
            sp start_pct, cp completion_pct, greatest(100-sp-cp,0) balance_pct,
            -- main-row figures: assigned amount if set, else the term calc
            start_paid start_dep,
            CASE WHEN val>0 THEN coalesce(pay_completion_assigned, completion_calc) END completion,
            -- balance includes any credit_amount (a charge added to the invoice, settled in the balance)
            CASE WHEN val>0 THEN round(val + coalesce(credit_amount,0) - start_paid - coalesce(pay_completion_assigned, completion_calc),2) END balance_owing,
            round(coalesce(credit_amount,0),2) credit_amount,
            -- PLAN-panel detail: per-milestone calc, override amount, override date
            start_calc, round(pay_start_deposit_assigned,2) start_assigned, to_char(pay_start_deposit_date,'YYYY-MM-DD') start_date,
            completion_calc, round(pay_completion_assigned,2) completion_assigned, to_char(pay_completion_date,'YYYY-MM-DD') completion_date,
            round(pay_balance_1_amount,2) balance_1_amount, to_char(pay_balance_1_date,'YYYY-MM-DD') balance_1_date,
            round(pay_balance_2_amount,2) balance_2_amount, to_char(pay_balance_2_date,'YYYY-MM-DD') balance_2_date,
            round(catch_up,2) catch_up, round(deposit_avail,2) deposit_avail, deposit_fx, coalesce(notes,'') notes,
            CASE WHEN start_calc > 0 THEN to_char(start_production,'YYYY-MM-DD') END start_due,        -- no due date for a 0% milestone
            CASE WHEN completion_calc > 0 THEN to_char(eff_prod_end,'YYYY-MM-DD') END completion_due,
            to_char(bal_due_date,'YYYY-MM-DD') balance_due,
            to_char(balance_due_date_overide,'YYYY-MM-DD') final_payment_due,   -- the "final payment due" override (priority for balance due)
            credit_days, credit_type,
            coalesce(deposit_ref,'') deposit_ref, coalesce(shipment_ref,'') shipment,
            coalesce(sh_carrier,'') ship_carrier, coalesce(sh_carrier_ref,'') ship_carrier_ref,
            coalesce(client,'') client, coalesce(client_requirements,'') client_requirements,
            coalesce(sales_order_ref,'') sales_order_ref, coalesce(client_po_ref,'') client_po_ref,
            to_char(client_deadline_date,'YYYY-MM-DD') client_deadline, coalesce(asn_numbers,'') asn_numbers,
            to_char(supplier_confirmed_at,'YYYY-MM-DD') supplier_confirmed, coalesce(supplier_confirmed_by,'') supplier_confirmed_by,
            coalesce(dispatch_order_ref,'') dispatch_order_ref, coalesce(final_delivery_address,'') final_delivery_address,
            coalesce(crossdock_skus,'') crossdock_skus,
            coalesce(dtc_custom,false) dtc_custom, coalesce(dtc_key_account,false) dtc_key_account,   -- Direct-to-Client tags
            -- Packing & Labelling (migration 086) + Direct to Client details approval
            coalesce(pack_polybags,false) pack_polybags, coalesce(pack_polybags_notes,'') pack_polybags_notes,
            coalesce(pack_dnb_barcodes,false) pack_dnb_barcodes, coalesce(pack_dnb_barcodes_notes,'') pack_dnb_barcodes_notes,
            coalesce(pack_rfid_barcodes,false) pack_rfid_barcodes, coalesce(pack_rfid_barcodes_notes,'') pack_rfid_barcodes_notes,
            coalesce(pack_dnb_carton,false) pack_dnb_carton, coalesce(pack_dnb_carton_notes,'') pack_dnb_carton_notes,
            coalesce(pack_client_carton,false) pack_client_carton, coalesce(pack_client_carton_notes,'') pack_client_carton_notes,
            coalesce(pack_pallet_notes,'') pack_pallet_notes, coalesce(pack_other_notes,'') pack_other_notes,
            to_char(dtc_accepted_at,'YYYY-MM-DD HH24:MI') dtc_accepted_at, coalesce(dtc_accepted_by,'') dtc_accepted_by,
            coalesce(nullif(country_code,''), branch_country, '') country,
            CASE WHEN nullif(country_code,'') IS NOT NULL THEN 'M' WHEN branch_country IS NOT NULL THEN 'branch' END country_src,
            coalesce(country_code,'') country_override, coalesce(branch,'') branch,
            coalesce(erp_po,'') erp, coalesce(prod_no,'') prod_no, coalesce(batch_id,'') batch_id,
            coalesce((SELECT pn.require_supplier_confirmation FROM planner.prod_numbers pn WHERE pn.prod_no=calc4.prod_no),false) require_confirmation,
            coalesce(starred,false) starred,   -- ⭐ Focus / favourite toggle (migration 082)
            -- ERP sync: drift = planned qty/cost differs from the ERP MIRROR (planner.erp_purchase_order_lines,
            -- fed by n8n). erp_in/erp_total drive the 3-state badge (✓ match / ⚠ drift / ✗ not in ERP).
            -- ERP deviation = QUANTITY only. Price differences are NEVER an exception (cost still rides along
            -- when the user pushes an update — see erp_cost=cost_price on the push). COMPLETE POs are ignored.
            (CASE WHEN coalesce(status,'') ILIKE '%complete%' THEN 0 ELSE
              (SELECT count(*) FROM planner.purchase_order_lines l LEFT JOIN planner.erp_purchase_order_lines el ON el.po=l.po AND el.sku=l.sku
                 WHERE l.po=calc4.po AND l.qty IS DISTINCT FROM el.qty) END)::int erp_pending,
            (SELECT count(*) FROM planner.purchase_order_lines l JOIN planner.erp_purchase_order_lines el ON el.po=l.po AND el.sku=l.sku WHERE l.po=calc4.po)::int erp_in,
            (SELECT count(*) FROM planner.purchase_order_lines l WHERE l.po=calc4.po)::int erp_total,
            -- ERP date misalignment: our calculated "completed at warehouse" date (eff_checkin) vs the
            -- ERP's final delivery date. 1 = differs MATERIALLY. Materiality = the day gap as a fraction of how
            -- far away the date is (days from today to eff_checkin): only flag when the gap is >=10% of the
            -- lead time. E.g. 2 days out of ~100 away = 2% → not flagged; 5 days out of 30 away = 17% → flagged.
            to_char(erp_final_delivery_date,'YYYY-MM-DD') erp_final_delivery, coalesce(erp_po_id_src,'') erp_po_id, erp_present,
            (CASE WHEN erp_final_delivery_date IS NOT NULL AND coalesce(m_checkin, eff_checkin) IS NOT NULL
                  AND coalesce(m_checkin, eff_checkin) IS DISTINCT FROM erp_final_delivery_date
                  AND abs(coalesce(m_checkin, eff_checkin) - erp_final_delivery_date)::numeric / GREATEST(abs(coalesce(m_checkin, eff_checkin) - CURRENT_DATE), 1) >= 0.10
                  THEN 1 ELSE 0 END)::int erp_date_pending,
            -- supplier production-confidence: confirmed status + days since last confirmation
            coalesce(production_status,'') production_status,
            (CURRENT_DATE - production_confirmed_at::date)::int prod_confirmed_age,
            -- action-item flags (vs current_date), only for POs not complete
            -- "late" = past the forecast delivery date AND not yet shipped. Once SHIPPING (in transit) or
            -- DELIVERED/COMPLETE it's no longer an actionable late exception, so exclude those statuses.
            (coalesce(status,'') NOT ILIKE '%complete%' AND coalesce(status,'') NOT ILIKE '%shipping%'
               AND coalesce(status,'') NOT ILIKE '%deliver%' AND coalesce(m_delivery, eff_delivery) < current_date) is_late,
            (coalesce(status,'') NOT ILIKE '%complete%' AND coalesce(shipment_ref,'')='') unassigned_shipment,
            (coalesce(status,'') NOT ILIKE '%complete%' AND (
               (start_production < current_date AND pay_start_deposit_assigned IS NULL AND coalesce(deposit_ref,'')='' AND start_calc > 0)
               OR (eff_prod_end < current_date AND pay_completion_assigned IS NULL AND completion_calc > 0)
               OR (bal_due_date < current_date AND pay_balance_1_amount IS NULL
                   AND round(val + coalesce(credit_amount,0) - start_paid - coalesce(pay_completion_assigned, completion_calc),2) > 0.01))) payment_overdue,
            (coalesce(status,'') ILIKE '%production%') is_production,
            -- pallet estimate (Σ line qty ÷ sku pallet_qty); 20 pallets = one container
            (SELECT round(sum(l.qty::numeric/NULLIF(sl.pallet_qty,0)),1) FROM planner.purchase_order_lines l
               LEFT JOIN planner.sku_labels sl ON sl.sku=l.sku WHERE l.po=calc4.po) pallets,
            -- manual "likely payment date" per milestone (cash flow report) — keyed dep|comp|bal|bal2:PO
            (SELECT to_char(likely_date,'YYYY-MM-DD') FROM planner.payment_likely_dates WHERE line_key='dep:'||calc4.po) likely_start,
            (SELECT to_char(likely_date,'YYYY-MM-DD') FROM planner.payment_likely_dates WHERE line_key='comp:'||calc4.po) likely_completion,
            (SELECT to_char(likely_date,'YYYY-MM-DD') FROM planner.payment_likely_dates WHERE line_key='bal:'||calc4.po) likely_balance_1,
            (SELECT to_char(likely_date,'YYYY-MM-DD') FROM planner.payment_likely_dates WHERE line_key='bal2:'||calc4.po) likely_balance_2,
            -- supplier-portal: latest PENDING invoice value awaiting approve/reject, and unread supplier notes (Timeline action)
            (SELECT round(value::numeric,2) FROM planner.supplier_submissions ss WHERE ss.po=calc4.po AND ss.kind='invoice_value' AND ss.status='pending'
               ORDER BY ss.id DESC LIMIT 1) sup_invoice_pending,
            (SELECT value FROM planner.supplier_submissions ss WHERE ss.po=calc4.po AND ss.kind='completion_date' AND ss.status='pending'
               ORDER BY ss.id DESC LIMIT 1) sup_completion_pending,
            (SELECT count(*) FROM planner.supplier_notes sn WHERE sn.po=calc4.po AND sn.author_kind='supplier' AND sn.read_at IS NULL)::int unread_notes,
            (SELECT count(*) FROM planner.portal_line_costs plc WHERE plc.po=calc4.po
               AND (plc.actual_cost IS NOT NULL OR plc.amended_qty IS NOT NULL OR plc.is_added=true)
               AND (plc.confirmed_at IS NULL OR plc.confirmed_at < plc.submitted_at))::int orderplan_unconfirmed,
            -- landed cost (est): goods + freight (Flexport quote ▸ rate card) + duty + import tax
            coalesce(container_size,'') container_size,
            round(coalesce(flex_quote, freight_rate),2) est_freight,
            CASE WHEN flex_quote IS NOT NULL THEN 'FLEX' WHEN freight_rate IS NOT NULL THEN 'rate' END freight_src,
            round(flex_quote,2) flex_quote,
            -- sea rates for this PO's destination, so the PLAN can auto-estimate freight from pallets (cheapest combo, assume sea)
            (SELECT json_agg(json_build_object('cap', fr.pallets, 'cost', fr.cost, 'sz', fr.container_size)) FROM planner.freight_rates fr
              WHERE upper(fr.destination)=coalesce(nullif(upper(coalesce(nullif(country_code,''), branch_country)),''),'UK') AND coalesce(fr.pallets,0)>0 AND fr.cost IS NOT NULL) sea_tiers,
            round(coalesce(duty,0),2) est_duty,
            round((CASE WHEN tax_base_kind='goods' THEN val
                        ELSE val + coalesce(duty,0) + coalesce(flex_quote, freight_rate, 0) END)
                  * coalesce(tax_pct,0)/100,2) est_tax,
            tax_pct,
            round(val + coalesce(flex_quote, freight_rate, 0) + coalesce(duty,0)
                  + (CASE WHEN tax_base_kind='goods' THEN val
                          ELSE val + coalesce(duty,0) + coalesce(flex_quote, freight_rate, 0) END)
                    * coalesce(tax_pct,0)/100, 2) landed_total
          FROM mastered calc4 ORDER BY po`);
        if (req.params.section === 'cashflow') return res.json(await cashflowResponse(_pos, q));
        return res.json(_pos);
      }
      case 'lookups': {  // dropdown sources for PO editing: deposit refs, batches, prod#s, shipments
        const [dep, bat, pr, sh, su, br, xd, po] = await Promise.all([
          q(`SELECT reference FROM planner.deposits ORDER BY reference`),
          q(`SELECT batch FROM planner.batches ORDER BY batch DESC`),
          q(`SELECT prod_no FROM planner.prod_numbers WHERE prod_no IS NOT NULL ORDER BY prod_no`),
          q(`SELECT shipment_ref FROM planner.shipments ORDER BY shipment_ref`),
          q(`SELECT name FROM planner.suppliers WHERE name IS NOT NULL ORDER BY name`),
          q(`SELECT name FROM planner.branches ORDER BY name`),
          // eligible crossdock SKUs (code starts with CROSSDOCK or PREORDER), union of products + sku_labels
          q(`SELECT sku FROM (
               SELECT sku FROM planner.products WHERE sku ILIKE 'CROSSDOCK%' OR sku ILIKE 'PREORDER%'
               UNION SELECT sku FROM planner.sku_labels WHERE sku ILIKE 'CROSSDOCK%' OR sku ILIKE 'PREORDER%'
             ) z ORDER BY sku`),
          // active (not-complete) POs — for assigning a PO onto a shipment from the shipment view
          q(`SELECT po FROM planner.purchase_orders WHERE coalesce(status,'') NOT ILIKE '%complete%' ORDER BY po`),
        ]).catch(() => [[], [], [], [], [], [], [], []]);
        return res.json({
          deposits: dep.map(x => x.reference),
          batches: bat.map(x => x.batch),
          prods: pr.map(x => x.prod_no),
          shipments: sh.map(x => x.shipment_ref),
          suppliers: su.map(x => x.name),
          branches: br.map(x => x.name),
          crossdock: xd.map(x => x.sku),
          pos: po.map(x => x.po),
        });
      }
      case 'skus':  // SKU master for Order Plan "all in category" scope + release-window filtering + sticky attribute columns
        return res.json(await q(`SELECT s.sku, coalesce(s.category,'') category, coalesce(s.release_window,'') release_window,
          coalesce(s.barcode_sku_name,'') name,
          coalesce(p.product_ean,'') product_ean, coalesce(p.product_name,'') product_name,
          coalesce(p.size_short,'') size, coalesce(p.size_long,'') size_long, coalesce(p.colour_long,'') colour_long,
          p.main_supplier_final supplier, p.supplier_multiple_all,
          nullif(p.carton_qty,'') carton_qty,
          nullif(p.discontinue_date_final,'') discontinue, nullif(p.discontinue_date_au_final,'') discontinue_au, nullif(p.discontinue_date_ca,'') discontinue_ca
          FROM planner.sku_labels s LEFT JOIN planner.products p ON p.sku = s.sku
          WHERE coalesce(s.status,'') NOT ILIKE '%discontinued%' ORDER BY s.category, s.sku`));
      case 'manufacturing-bom':   // CONFIG ▸ Manufacturing BOM — parent (finished) → component × qty
        return res.json(await q(`SELECT parent_sku, component_sku, qty::numeric qty FROM planner.manufacturing_bom ORDER BY parent_sku, component_sku`));
      case 'manufacturing':       // SUPPLY ▸ PURCHASE ORDERS ▸ Manufacturing — finished-bundle demand vs manufacturing-PO component supply
        return res.json(await manufacturingData());
      case 'client-attachments':   // Client/FBA docs across all POs (category='client') — portal Barcodes & Labels tab
        return res.json(await q(`SELECT po, id, filename FROM planner.portal_attachments WHERE coalesce(category,'')='client' ORDER BY uploaded_at DESC`));
      case 'portal-docs':   // supplier-uploaded documents across all POs (every category except 'client') — portal Documents section
        return res.json(await q(`SELECT po, id, filename, coalesce(category,'Other') category, to_char(uploaded_at,'YYYY-MM-DD') uploaded_at
          FROM planner.portal_attachments WHERE coalesce(category,'') NOT IN ('client') ORDER BY uploaded_at DESC`));
      case 'shipment-plan': {   // master shipments + the POs aboard each (Shipment Plan — admin sub-tab + supplier portal tab)
        const rows = await q(`
          SELECT p.shipment_ref,
            coalesce(sh.master_po, p.shipment_ref) master_po,
            coalesce(lower(sh.mode), CASE WHEN fx.mode ILIKE 'air%' THEN 'air' ELSE 'sea' END) mode,
            coalesce(sh.carrier, CASE WHEN sh.carrier_ref ILIKE 'FLEX%' THEN 'Flexport' END, '') carrier,
            coalesce(sh.carrier_ref,'') carrier_ref, coalesce(fx.flex_id,'') flex_id,
            to_char(coalesce(sh.departure_date, fx.departure_date),'YYYY-MM-DD') departure,
            to_char(coalesce(sh.landing_date, fx.landing_date),'YYYY-MM-DD') landing,
            to_char(coalesce(sh.arrival_date, fx.arrival_date),'YYYY-MM-DD') arrival,
            p.po, coalesce(p.supplier_name,'') supplier_name, coalesce(p.client,'') client,
            to_char(p.client_deadline_date,'YYYY-MM-DD') client_deadline,
            (p.po = coalesce(sh.master_po, p.shipment_ref)) is_master, coalesce(sh.escalated,false) escalated,
            round(coalesce((SELECT sum(l.qty::numeric/NULLIF(sl.pallet_qty,0))
              FROM planner.purchase_order_lines l LEFT JOIN planner.sku_labels sl ON sl.sku=l.sku WHERE l.po=p.po),0)::numeric,1) pallets
          FROM planner.purchase_orders p
          LEFT JOIN planner.shipments sh ON sh.shipment_ref=p.shipment_ref
          LEFT JOIN LATERAL (SELECT f.flex_id, f.mode, f.departure_date, f.landing_date, f.arrival_date FROM planner.flexport_shipments f
            WHERE f.flex_id=sh.carrier_ref OR f.shipment_name=p.shipment_ref OR f.flex_id=p.flexport_reference
            ORDER BY (f.flex_id=p.flexport_reference) DESC NULLS LAST LIMIT 1) fx ON true
          WHERE coalesce(p.shipment_ref,'')<>'' AND coalesce(p.status,'') NOT ILIKE '%complete%'
          ORDER BY p.shipment_ref, (p.po = coalesce(sh.master_po, p.shipment_ref)) DESC, p.po`);
        const byRef = {};
        rows.forEach(r => { let s = byRef[r.shipment_ref];
          if (!s) s = byRef[r.shipment_ref] = { shipment_ref: r.shipment_ref, master_po: r.master_po, mode: r.mode, carrier: r.carrier, carrier_ref: r.carrier_ref, flex_id: r.flex_id, departure: r.departure, landing: r.landing, arrival: r.arrival, escalated: !!r.escalated, master_client: '', master_deadline: '', master_supplier: '', total_pallets: 0, suppliers: [], members: [] };
          s.total_pallets += Number(r.pallets) || 0;
          if (s.suppliers.indexOf(r.supplier_name) < 0 && r.supplier_name) s.suppliers.push(r.supplier_name);
          if (r.is_master) { s.master_client = r.client; s.master_deadline = r.client_deadline; s.master_supplier = r.supplier_name; }
          // include EVERY PO on the shipment (incl. the master) so the summary's pallets sum to the total
          s.members.push({ po: r.po, supplier: r.supplier_name, pallets: Number(r.pallets) || 0, client: r.client, is_master: !!r.is_master });
        });
        // ensure each shipment's MASTER PO appears in members (+ its pallets/client) even if it doesn't
        // reference its own shipment_ref — so the summary's pallets sum to the true total.
        const masterPos = Object.keys(byRef).map(k => byRef[k].master_po).filter(Boolean);
        if (masterPos.length) {
          const masters = (await pool.query(`SELECT p.po, coalesce(p.supplier_name,'') supplier_name, coalesce(p.client,'') client,
              to_char(p.client_deadline_date,'YYYY-MM-DD') client_deadline,
              round(coalesce((SELECT sum(l.qty::numeric/NULLIF(sl.pallet_qty,0)) FROM planner.purchase_order_lines l
                LEFT JOIN planner.sku_labels sl ON sl.sku=l.sku WHERE l.po=p.po),0)::numeric,1) pallets
            FROM planner.purchase_orders p WHERE p.po = ANY($1)`, [masterPos])).rows;
          const mById = {}; masters.forEach(m => mById[m.po] = m);
          Object.keys(byRef).forEach(k => { const s = byRef[k]; const m = mById[s.master_po]; if (!m) return;
            if (!s.members.some(x => x.po === s.master_po)) {   // master not already aboard → add it
              s.members.unshift({ po: m.po, supplier: m.supplier_name, pallets: Number(m.pallets) || 0, client: m.client, is_master: true });
              s.total_pallets += Number(m.pallets) || 0;
              if (s.suppliers.indexOf(m.supplier_name) < 0 && m.supplier_name) s.suppliers.push(m.supplier_name);
            }
            if (!s.master_client) s.master_client = m.client;
            if (!s.master_deadline) s.master_deadline = m.client_deadline;
            if (!s.master_supplier) s.master_supplier = m.supplier_name;
          });
        }
        const shipEntries = Object.keys(byRef).map(k => { const s = byRef[k]; s.total_pallets = Math.round(s.total_pallets * 10) / 10; return s; });
        // FOB orders — no shipment to us (collected at the factory / delivered to a nominated forwarder). Show open
        // ones (PRODUCTION/FUTURE) as display-only entries. FOB = no shipment_ref AND (Manufacturing branch OR a
        // destination that isn't one of our import warehouses UK/US/EU/AU/CA) — mirrors the app's isFOBdest rule.
        const fobRows = (await pool.query(`
          SELECT p.po, coalesce(p.supplier_name,'') supplier_name, coalesce(p.client,'') client, coalesce(p.status,'') status,
            to_char(p.client_deadline_date,'YYYY-MM-DD') client_deadline,
            to_char(coalesce(p.end_production_overide, p.start_production + (coalesce(s.production_days,0)||' days')::interval)::date,'YYYY-MM-DD') prod_end,
            round(coalesce((SELECT sum(l.qty::numeric/NULLIF(sl.pallet_qty,0)) FROM planner.purchase_order_lines l
              LEFT JOIN planner.sku_labels sl ON sl.sku=l.sku WHERE l.po=p.po),0)::numeric,1) pallets
          FROM planner.purchase_orders p
          LEFT JOIN planner.suppliers s ON s.id=p.supplier_id
          LEFT JOIN planner.branches  b ON b.name=p.branch
          WHERE coalesce(p.shipment_ref,'')=''
            AND NOT EXISTS (SELECT 1 FROM planner.shipments sh WHERE sh.master_po = p.po)  -- a master PO can have a blank shipment_ref but still be on a shipment
            AND coalesce(p.status,'') NOT ILIKE '%complete%' AND coalesce(p.status,'') NOT ILIKE '%deliver%' AND coalesce(p.status,'') NOT ILIKE '%ship%'
            AND ( p.branch ILIKE '%manufactur%' OR upper(coalesce(nullif(p.country_code,''), b.country_code, '')) NOT IN ('UK','US','EU','AU','CA') )
            AND EXISTS (SELECT 1 FROM planner.purchase_order_lines l WHERE l.po=p.po AND coalesce(l.qty,0)>0)`)).rows;
        // definitive guard: never show a PO as FOB if it's already represented on a real shipment (as master or member)
        const onShip = new Set(); shipEntries.forEach(s => { if (s.master_po) onShip.add(s.master_po); (s.members || []).forEach(m => onShip.add(m.po)); });
        fobRows.forEach(r => { if (onShip.has(r.po)) return; const pallets = Number(r.pallets) || 0; shipEntries.push({
          shipment_ref: '', is_fob: true, master_po: r.po, mode: 'FOB', carrier: '', carrier_ref: '', flex_id: '',
          departure: '', landing: '', arrival: '', escalated: false, status: r.status, prod_end: r.prod_end || '',
          master_client: r.client, master_deadline: r.client_deadline, master_supplier: r.supplier_name,
          total_pallets: pallets, suppliers: r.supplier_name ? [r.supplier_name] : [],
          members: [{ po: r.po, supplier: r.supplier_name, pallets, client: r.client, is_master: true }] }); });
        return res.json(shipEntries
          .sort((a, b) => (a.departure || '9999').localeCompare(b.departure || '9999') || String(a.master_po).localeCompare(String(b.master_po))));
      }
      case 'shipment-notes':   // ?ref=… → timeline notes for a master shipment
        return res.json((await pool.query(`SELECT id, author_kind, coalesce(author_email,'') author_email, body, to_char(created_at,'YYYY-MM-DD HH24:MI') created_at, read_at IS NOT NULL read
          FROM planner.shipment_notes WHERE shipment_ref=$1 ORDER BY created_at`, [req.query.ref || ''])).rows);
      case 'flexport':
        return res.json(await q(`SELECT flex_id, shipment_name, mode, status_description status, incoterm,
          CASE WHEN arrival_date < current_date THEN 'Completed' ELSE 'Active' END status_group,
          to_char(packing_date,'YYYY-MM-DD') packing, to_char(departure_date,'YYYY-MM-DD') departure,
          to_char(landing_date,'YYYY-MM-DD') landing, to_char(arrival_date,'YYYY-MM-DD') arrival,
          container_numbers, mbl_number, total_freight_cost, total_invoiced_amount, customs_duty_cost
          FROM planner.flexport_shipments ORDER BY arrival_date DESC NULLS LAST`));
      case 'order-plan':  // enriched lines for the side-by-side grid (filter/group/pivot client-side)
        return res.json(await q(`SELECT l.po, l.sku, l.qty, el.qty erp_qty,
          (l.qty IS DISTINCT FROM el.qty) pending, to_char(pol.proposed_at,'YYYY-MM-DD') proposed_at,
          l.cost_price, l.carton_qty, l.partial_carton_approved, l.full_carton_check,
          pol.supplier_risk_approved, pol.discontinue_approved,
          coalesce(p.prod_no,'') prod_no, coalesce(p.status,'') status, coalesce(p.starred,false) starred,
          coalesce(p.batch_id,'') batch_id,
          coalesce(p.supplier_name,'') supplier_name, coalesce(p.shipment_ref,'') shipment_ref,
          coalesce(nullif(p.country_code,''), b.country_code, '') country,
          coalesce(p.client,'') client, coalesce(p.sales_order_ref,'') sales_order_ref, coalesce(p.branch,'') branch,
          coalesce(sl.category,'') category, coalesce(sl.release_window,'') release_window, sl.pallet_qty,
          to_char(p.start_production,'YYYY-MM-DD') prod_start,
          to_char(p.end_production_overide,'YYYY-MM-DD') prod_end,
          to_char(coalesce(fx.departure_date, p.supplier_ship_date),'YYYY-MM-DD') ship_date,
          coalesce(to_char(p.delivery_date_overide,'YYYY-MM-DD'), to_char(p.landing_date_overide,'YYYY-MM-DD'),
                   to_char(fx.landing_date,'YYYY-MM-DD')) delivery
          FROM planner.v_purchase_order_lines l
          JOIN planner.purchase_order_lines pol ON pol.po_sku=l.po_sku
          LEFT JOIN planner.erp_purchase_order_lines el ON el.po=l.po AND el.sku=l.sku
          JOIN planner.purchase_orders p ON p.po=l.po
          LEFT JOIN planner.branches b ON b.name=p.branch
          LEFT JOIN planner.sku_labels sl ON sl.sku=l.sku
          LEFT JOIN LATERAL (SELECT f.departure_date, f.landing_date FROM planner.flexport_shipments f
            WHERE f.flex_id=p.flexport_reference OR f.shipment_name=p.po OR f.shipment_name=p.shipment_ref
            ORDER BY (f.flex_id=p.flexport_reference) DESC NULLS LAST LIMIT 1) fx ON true
          ORDER BY l.po, l.sku`));
      case 'shipments': {
        // Editable shipment records (planner.shipments) joined to the POs aboard them. A shipment's
        // own date columns OVERRIDE the POs; where blank they fall back to Flexport. Effective
        // landing precedence: shipment (S) ▸ master-PO override (M) ▸ Flexport (FLEX). Drives off the
        // shipments table so empty (PO-less) shipments still show; LEFT JOINs the PO aggregate.
        const shipments = await q(`
          WITH agg AS (
            SELECT po.shipment_ref,
              count(*)::int po_count, string_agg(po.po,', ' ORDER BY po.po) pos,
              count(DISTINCT po.supplier_name)::int suppliers,
              bool_and(coalesce(po.status,'') ILIKE '%complete%') all_complete,
              sum(coalesce((SELECT sum(l.qty) FROM planner.purchase_order_lines l WHERE l.po=po.po),0))::int units,
              round(sum(coalesce((SELECT sum(l.qty::numeric/NULLIF(sl.pallet_qty,0))
                 FROM planner.purchase_order_lines l LEFT JOIN planner.sku_labels sl ON sl.sku=l.sku WHERE l.po=po.po),0))::numeric,1) pallets,
              round(sum(coalesce((SELECT sum(l.qty*p.prod_weight_uk)
                 FROM planner.purchase_order_lines l JOIN planner.products p ON p.sku=l.sku WHERE l.po=po.po),0))::numeric) weight_kg,
              max(upper(coalesce(nullif(po.country_code,''), pb.country_code, ''))) market,   -- fall back to the branch country (PO country_code is often blank)
              string_agg(DISTINCT nullif(po.branch,''), ', ') branch,
              sum(coalesce((SELECT sum(l.qty*l.cost_price) FROM planner.purchase_order_lines l WHERE l.po=po.po),0)) value
            FROM planner.purchase_orders po LEFT JOIN planner.branches pb ON pb.name=po.branch
            WHERE po.shipment_ref IS NOT NULL
            GROUP BY po.shipment_ref
          )
          SELECT sh.shipment_ref, coalesce(sh.master_po, sh.shipment_ref) master_po,
            CASE WHEN a.all_complete THEN 'Completed'   -- all linked POs complete → shipment is complete (calculated, overrides any stored status)
                 ELSE coalesce(
                   -- normalise any legacy stored value (Active→Shipping, Complete→Completed)
                   CASE lower(NULLIF(sh.status,'')) WHEN 'active' THEN 'Shipping' WHEN 'complete' THEN 'Completed'
                        WHEN 'completed' THEN 'Completed' WHEN 'shipping' THEN 'Shipping' WHEN 'planned' THEN 'Planned'
                        ELSE NULLIF(sh.status,'') END,
                   CASE WHEN coalesce(sh.arrival_date, fx.arrival_date, sh.landing_date, fx.landing_date) < current_date THEN 'Completed'
                        WHEN coalesce(sh.departure_date, fx.departure_date) <= current_date THEN 'Shipping'
                        ELSE 'Planned' END) END status,
            (sh.status IS NULL OR sh.status='' OR a.all_complete) status_auto,
            coalesce(a.po_count,0) po_count, coalesce(a.pos,'') pos, coalesce(a.suppliers,0) suppliers,
            coalesce(a.units,0) units, coalesce(a.pallets,0) pallets, round(coalesce(a.value,0)) value,
            coalesce(sh.carrier, CASE WHEN sh.carrier_ref ILIKE 'FLEX%' THEN 'Flexport' END) carrier,
            coalesce(sh.carrier_ref,'') carrier_ref, coalesce(sh.notes,'') notes,
            fx.flex_id, fx.mode, fx.container_numbers, fx.total_freight_cost,
            coalesce(lower(sh.mode), CASE WHEN fx.mode ILIKE 'air%' THEN 'air' ELSE 'sea' END) mode_eff,
            coalesce(a.weight_kg,0) weight_kg,
            -- destination: shipment override ▸ master PO (calculated). Never read from the non-master POs.
            coalesce(nullif(upper(sh.country_code),''), nullif(mp.mp_country,''), '') market,
            CASE WHEN nullif(sh.country_code,'') IS NOT NULL THEN 'S' WHEN nullif(mp.mp_country,'') IS NOT NULL THEN 'calc' END market_src,
            coalesce(nullif(sh.branch,''), nullif(mp.mp_branch,''), '') branch,
            CASE WHEN nullif(sh.branch,'') IS NOT NULL THEN 'S' WHEN nullif(mp.mp_branch,'') IS NOT NULL THEN 'calc' END branch_src,
            coalesce(sh.country_code,'') ov_country, coalesce(sh.branch,'') ov_branch,
            fx.total_freight_cost flex_cost, sh.cost_manual cost_manual,
            (SELECT json_agg(json_build_object('cap', fr.pallets, 'cost', fr.cost, 'sz', fr.container_size)) FROM planner.freight_rates fr
              WHERE upper(fr.destination)=coalesce(nullif(coalesce(nullif(upper(sh.country_code),''), nullif(mp.mp_country,'')),''),'UK') AND coalesce(fr.pallets,0)>0 AND fr.cost IS NOT NULL) sea_tiers,
            (SELECT ar.rate_per_kg FROM planner.air_freight_rates ar WHERE coalesce(a.weight_kg,0) >= ar.min_kg AND coalesce(a.weight_kg,0) < ar.max_kg ORDER BY ar.min_kg LIMIT 1) air_rate,
            to_char(sh.tracked_delivery_date,'YYYY-MM-DD') tracked_delivery_date, coalesce(sh.tracked_source,'') tracked_source,
            -- effective dates (override ▸ flexport) and the raw override the UI edits
            -- effective dates: shipment override ▸ Flexport ▸ CALCULATED from the master PO (prod-end +7 = departure;
            -- + branch transit lead by mode = landing/arrival) so an unlinked shipment still shows dates.
            coalesce(to_char(sh.departure_date,'YYYY-MM-DD'), to_char(fx.departure_date,'YYYY-MM-DD'), to_char(mp.ship_calc,'YYYY-MM-DD')) departure,
            -- effective LANDING: override ▸ Flexport ▸ (EFFECTIVE departure + branch transit). Chains off the
            -- departure override, so overriding an earlier date shifts the later CALCULATED ones (final dates).
            coalesce(to_char(sh.landing_date,'YYYY-MM-DD'), to_char(fx.landing_date,'YYYY-MM-DD'),
              to_char((coalesce(sh.departure_date, fx.departure_date, mp.ship_calc) + (coalesce(mp.transit_days,0)||' days')::interval)::date,'YYYY-MM-DD')) landing,
            CASE WHEN sh.landing_date IS NOT NULL THEN 'S' WHEN fx.landing_date IS NOT NULL THEN 'FLEX' WHEN mp.ship_calc IS NOT NULL THEN 'calc' END landing_src,
            CASE WHEN sh.departure_date IS NOT NULL THEN 'S' WHEN fx.departure_date IS NOT NULL THEN 'FLEX' WHEN mp.ship_calc IS NOT NULL THEN 'calc' END departure_src,
            CASE WHEN sh.arrival_date IS NOT NULL THEN 'S' WHEN fx.arrival_date IS NOT NULL THEN 'FLEX' WHEN mp.ship_calc IS NOT NULL THEN 'calc' END arrival_src,
            (fx.flex_id IS NOT NULL) flex_matched,
            -- effective ARRIVAL: override ▸ Flexport ▸ EFFECTIVE landing (chained off departure)
            coalesce(to_char(sh.arrival_date,'YYYY-MM-DD'), to_char(fx.arrival_date,'YYYY-MM-DD'),
              to_char(coalesce(sh.landing_date, fx.landing_date, (coalesce(sh.departure_date, fx.departure_date, mp.ship_calc) + (coalesce(mp.transit_days,0)||' days')::interval)::date),'YYYY-MM-DD')) arrival,
            to_char(sh.departure_date,'YYYY-MM-DD') ov_departure,
            to_char(sh.landing_date,'YYYY-MM-DD')   ov_landing,
            to_char(sh.delivery_date,'YYYY-MM-DD')  ov_delivery,
            to_char(sh.arrival_date,'YYYY-MM-DD')   ov_arrival,
            -- completion = warehouse-received = override (sh.delivery_date) ▸ EFFECTIVE arrival + 7 days
            coalesce(to_char(sh.delivery_date,'YYYY-MM-DD'),
              to_char((coalesce(sh.arrival_date, fx.arrival_date, coalesce(sh.landing_date, fx.landing_date, (coalesce(sh.departure_date, fx.departure_date, mp.ship_calc) + (coalesce(mp.transit_days,0)||' days')::interval)::date)) + interval '7 days')::date,'YYYY-MM-DD')) completion,
            CASE WHEN sh.delivery_date IS NOT NULL THEN 'S'
                 WHEN coalesce(sh.arrival_date, fx.arrival_date, sh.landing_date, fx.landing_date, mp.ship_calc) IS NOT NULL THEN 'calc' END completion_src,
            -- exception flags (client suppresses all of these once the shipment is Completed):
            --   no_pos       — not linked to ANY purchase orders (empty shipment)
            --   no_flex_match — carries a Flexport reference that doesn't match a Flexport shipment
            (coalesce(a.po_count,0) = 0) no_pos,
            ((coalesce(sh.carrier,'') ILIKE 'flex%' OR coalesce(sh.carrier_ref,'') ILIKE 'FLEX%') AND fx.flex_id IS NULL) no_flex_match,
            (coalesce(a.pallets,0) > 20) over_pallets,   -- est. cargo over one 20-pallet container → exception
            coalesce(sh.escalated,false) escalated,
            coalesce(sh.starred,false) starred,   -- ⭐ Focus / favourite toggle (migration 082)
            (SELECT count(*) FROM planner.shipment_notes sn WHERE sn.shipment_ref=sh.shipment_ref AND sn.author_kind='supplier' AND sn.read_at IS NULL)::int unread_notes,
            (SELECT count(*) FROM planner.supplier_charges sc WHERE sc.source_type='shipment' AND sc.source_ref=sh.shipment_ref AND sc.status='pending')::int pending_charges
          FROM planner.shipments sh
          LEFT JOIN agg a ON a.shipment_ref=sh.shipment_ref
          LEFT JOIN LATERAL (SELECT f.* FROM planner.flexport_shipments f
            WHERE f.flex_id=sh.carrier_ref OR f.shipment_name=sh.shipment_ref
            ORDER BY (f.flex_id=sh.carrier_ref) DESC NULLS LAST LIMIT 1) fx ON true
          -- master-PO date calc: prod-end +7 = departure; + branch transit (air/sea by shipment mode) = landing/arrival
          LEFT JOIN LATERAL (
            SELECT CASE WHEN pe IS NOT NULL THEN (pe + interval '7 days')::date END ship_calc,
                   (CASE WHEN coalesce(lower(sh.mode), CASE WHEN fx.mode ILIKE 'air%' THEN 'air' ELSE 'sea' END)='air'
                         THEN coalesce(mb.air_lead_time_days,0) ELSE coalesce(mb.sea_lead_time_days,0) END) transit_days,
                   CASE WHEN pe IS NOT NULL THEN (pe + interval '7 days'
                      + ((CASE WHEN coalesce(lower(sh.mode), CASE WHEN fx.mode ILIKE 'air%' THEN 'air' ELSE 'sea' END)='air'
                               THEN coalesce(mb.air_lead_time_days,0) ELSE coalesce(mb.sea_lead_time_days,0) END)||' days')::interval)::date END delivery_calc,
                   coalesce(m.branch,'') mp_branch,
                   upper(coalesce(nullif(m.country_code,''), mb.country_code, '')) mp_country
            FROM planner.purchase_orders m
            LEFT JOIN planner.suppliers ms ON ms.id=m.supplier_id
            LEFT JOIN planner.branches mb ON mb.name=m.branch
            CROSS JOIN LATERAL (SELECT coalesce(m.end_production_overide,
                (m.start_production + (coalesce(ms.production_days,0)||' days')::interval)::date) pe) pec
            WHERE m.po = coalesce(NULLIF(sh.master_po,''), sh.shipment_ref)
            LIMIT 1) mp ON true
          ORDER BY landing DESC NULLS LAST`);
        const unassigned = await q(`SELECT po, supplier_name, coalesce(status,'') status, coalesce(prod_no,'') prod_no
          FROM planner.purchase_orders
          WHERE coalesce(shipment_ref,'')='' AND coalesce(status,'') NOT ILIKE '%complete%' ORDER BY po`);
        return res.json({ shipments, unassigned });
      }
      case 'shipment-detail':  // not used directly (param route below); kept for switch completeness
        return res.status(400).json({ error: 'use /api/supply/shipment-detail/:ref' });
      case 'deposits':
        // Keyed by surrogate id (reference is not unique). Drawdown CALCULATED, not stored:
        //   used      = Σ start-deposit assigned on the POs pointing at this reference (spec B8.6)
        //   remaining = pool amount for the reference − used   (pool = Σ amounts of rows sharing the
        //               ref, so installments/credit-notes/write-offs net correctly)
        //   linked_pos= the POs actually assigned to the reference.
        // All three are NULL for "Other" sundry payments (is_deposit=false) — no pool concept there.
        return res.json(await q(`
          WITH draw AS (
            SELECT po.deposit_ref, sum(coalesce(po.pay_start_deposit_assigned,0)) used
            FROM planner.purchase_orders po WHERE po.deposit_ref IS NOT NULL
            GROUP BY po.deposit_ref
          ), pool AS (
            SELECT reference, sum(coalesce(amount,0)) pool_amount
            FROM planner.deposits WHERE is_deposit AND reference IS NOT NULL GROUP BY reference
          ), est AS (
            -- estimated allocation per deposit ref = Σ calculated start deposit (value × start%) of the OPEN,
            -- not-yet-allocated POs on that ref. Mirrors the main calc: val × sp/100.
            SELECT po.deposit_ref,
              sum(round(coalesce(po.supplier_invoice_total, lv.line_value, po.order_value_estimation, 0)
                        * coalesce(po.start_deposit_pct_override, s.start_deposit_pct, 0)/100, 2)) est_alloc,
              count(*) open_unalloc
            FROM planner.purchase_orders po
            LEFT JOIN planner.suppliers s ON s.id=po.supplier_id
            LEFT JOIN LATERAL (SELECT sum(l.qty*l.cost_price) line_value FROM planner.purchase_order_lines l WHERE l.po=po.po) lv ON true
            WHERE po.deposit_ref IS NOT NULL
              AND coalesce(po.status,'') NOT ILIKE '%complete%'
              AND po.pay_start_deposit_assigned IS NULL
              AND round(coalesce(po.supplier_invoice_total, lv.line_value, po.order_value_estimation, 0)
                        * coalesce(po.start_deposit_pct_override, s.start_deposit_pct, 0)/100, 2) > 0
            GROUP BY po.deposit_ref
          )
          SELECT d.id,d.reference,d.is_deposit,d.supplier_name,d.prod_no,d.country,d.description,
            d.amount,d.xero_fx,d.xero_account_code, coalesce(d.status,'') status, to_char(d.date_paid,'YYYY-MM-DD') date_paid,
            to_char(d.date_due,'YYYY-MM-DD') date_due, to_char(d.date_likely_pay,'YYYY-MM-DD') date_likely_pay,
            CASE WHEN d.is_deposit THEN coalesce(dr.used,0) END deposit_used,
            CASE WHEN d.is_deposit THEN coalesce(p.pool_amount, coalesce(d.amount,0))-coalesce(dr.used,0) END deposit_remaining,
            CASE WHEN d.is_deposit THEN round(coalesce(ea.est_alloc,0),2) END est_alloc,
            CASE WHEN d.is_deposit THEN
              (SELECT string_agg(po.po,', ' ORDER BY po.po) FROM planner.purchase_orders po WHERE po.deposit_ref=d.reference)
            END linked_pos,
            (d.reference IS NOT NULL AND EXISTS (SELECT 1 FROM planner.deposits d2 WHERE d2.reference=d.reference AND d2.id<>d.id)) shared_ref,
            (SELECT string_agg(pd.prod_no||CASE WHEN coalesce(pd.supplier_name,'')<>'' THEN ' · '||pd.supplier_name ELSE '' END, ', ' ORDER BY pd.prod_no)
             FROM planner.production_deposits pd WHERE pd.deposit_ref=d.reference) assigned_prods,
            -- purchase orders linked to this deposit (po.deposit_ref = reference). pos_open = only POs not yet
            -- complete; the full list is linked_pos above ("all").
            (SELECT string_agg(po.po, ', ' ORDER BY po.po) FROM planner.purchase_orders po
               WHERE po.deposit_ref=d.reference AND coalesce(po.status,'') NOT ILIKE '%complete%') pos_open
          FROM planner.deposits d
          LEFT JOIN draw dr ON dr.deposit_ref=d.reference
          LEFT JOIN pool p ON p.reference=d.reference
          LEFT JOIN est ea ON ea.deposit_ref=d.reference
          ORDER BY d.is_deposit DESC, d.date_paid DESC NULLS FIRST, d.id DESC`));
      case 'productions': {
        // A PRODUCTION = one supplier within a prod_no (the bulk factory run for that supplier).
        // So prod_no P54 with 4 suppliers = 4 productions. Aggregates units/value across the
        // supplier's POs in that prod_no. Deposits assign at this (prod_no × supplier) level.
        const prods = await q(`
          SELECT po.prod_no, coalesce(po.supplier_name,'(no supplier)') supplier,
            count(*)::int po_count,
            bool_and(coalesce(po.status,'') ILIKE '%complete%') all_complete,
            string_agg(DISTINCT nullif(po.deposit_ref,''), ', ') po_deposits,
            (SELECT string_agg(DISTINCT pd.deposit_ref, ', ') FROM planner.production_deposits pd
              WHERE pd.prod_no=po.prod_no AND pd.supplier_name=po.supplier_name) prod_deposits,
            coalesce((SELECT sum(l.qty) FROM planner.purchase_order_lines l
                      JOIN planner.purchase_orders p2 ON p2.po=l.po
                      WHERE p2.prod_no=po.prod_no AND coalesce(p2.supplier_name,'')=coalesce(po.supplier_name,'')),0)::int units,
            round(coalesce((SELECT sum(l.qty*l.cost_price) FROM planner.purchase_order_lines l
                      JOIN planner.purchase_orders p2 ON p2.po=l.po
                      WHERE p2.prod_no=po.prod_no AND coalesce(p2.supplier_name,'')=coalesce(po.supplier_name,'')),0), 2) value
          FROM planner.purchase_orders po WHERE coalesce(po.prod_no,'') <> ''
          GROUP BY po.prod_no, po.supplier_name ORDER BY po.prod_no DESC, supplier`);
        return res.json(prods.map(p => ({ ...p, status: p.all_complete ? 'Completed' : 'Active',
          deposits: p.prod_deposits || p.po_deposits || '' })));
      }
      case 'batches':
        return res.json(await q(`SELECT batch,to_char(batch_date,'YYYY-MM-DD') batch_date,
          first_release_window,notes FROM planner.batches ORDER BY batch_date DESC NULLS LAST`));
      case 'prod-numbers':   // CONFIG ▸ Productions: raw prod_numbers master + PO/supplier counts (editable via /prod-number/:id)
        return res.json(await q(`
          SELECT pn.id, pn.prod_no, coalesce(pn.status,'') status, coalesce(pn.xero_account_code,'') xero_account_code,
            coalesce(pn.xero_account_name,'') xero_account_name, coalesce(pn.require_supplier_confirmation,false) require_supplier_confirmation,
            (SELECT count(*) FROM planner.purchase_orders po WHERE po.prod_no=pn.prod_no)::int po_count,
            (SELECT count(DISTINCT po.supplier_name) FROM planner.purchase_orders po WHERE po.prod_no=pn.prod_no)::int suppliers
          FROM planner.prod_numbers pn ORDER BY pn.prod_no DESC NULLS LAST`));
      case 'portal-users':   // CONFIG ▸ Portal Users: approved supplier-portal logins (email ↔ supplier)
        return res.json(await q(`
          SELECT u.id, u.email, u.supplier_id, coalesce(u.supplier_name, s.name, '') supplier_name,
            coalesce(u.contact_name,'') contact_name, u.active,
            to_char(u.created_at,'YYYY-MM-DD') created_at,
            (SELECT count(*) FROM planner.portal_sessions ps WHERE ps.email=lower(u.email) AND ps.expires_at>now())::int live_sessions
          FROM planner.supplier_portal_users u LEFT JOIN planner.suppliers s ON s.id=u.supplier_id
          ORDER BY coalesce(u.supplier_name, s.name, ''), u.email`));
      case 'products-all': { // CONFIG ▸ Products: full products master + release window, read-only (columns dynamic)
        const pr = await pool.query(`SELECT p.*, sl.release_window FROM planner.products p
          LEFT JOIN planner.sku_labels sl ON sl.sku=p.sku ORDER BY p.sku`);
        return res.json({ columns: pr.fields.map(f => f.name).filter(c => c !== 'loaded_at'), rows: pr.rows });
      }
      case 'barcodes': {
        // release_window for the seasonal filter; prod_nos / suppliers aggregated from the POs each SKU appears on
        // (prod_nos restricted to the canonical prod_numbers list so junk values like 'AU' don't appear);
        // per-market RRP from products (uk/us/eu only — migration 023) for the optional RRP columns.
        const rows = await q(`WITH sku_po AS (
            SELECT l.sku,
              string_agg(DISTINCT po.prod_no, ', ') FILTER (WHERE po.prod_no ~ '^[0-9]') prod_nos,   -- real (numeric) prod numbers only; excludes junk like 'AU'
              string_agg(DISTINCT po.supplier_name, ', ') FILTER (WHERE coalesce(po.supplier_name,'')<>'') suppliers
            FROM planner.purchase_order_lines l JOIN planner.purchase_orders po ON po.po=l.po
            GROUP BY l.sku)
          SELECT sl.sku, sl.barcode_sku_name, sl.barcode_carton_name, sl.barcode_inner_name,
            sl.size, coalesce(p.size_short, sl.size_short, '') size_short, sl.category, coalesce(sl.release_window,'') release_window, sl.carton_qty,
            sl.product_barcode, sl.carton_barcode, sl.inner_barcode, sl.grs_material, sl.swatch_url,
            sl.uk_carton_l, sl.uk_carton_w, sl.uk_carton_h, sl.uk_carton_wt,
            coalesce(sp.prod_nos,'') prod_nos, coalesce(sp.suppliers,'') suppliers,
            coalesce(p.supplier_multiple_all,'') supplier_multiple,
            p.uk_rt, p.us_rt, p.eu_rt, coalesce(p.product_name,'') product_name
          FROM planner.sku_labels sl
          LEFT JOIN sku_po sp ON sp.sku=sl.sku
          LEFT JOIN planner.products p ON p.sku=sl.sku
          WHERE coalesce(sl.product_barcode,sl.carton_barcode,sl.inner_barcode) IS NOT NULL
            AND coalesce(sl.variant_type,'') NOT ILIKE 'set'   -- MASTER products only (hide multipack/set variants)
          ORDER BY sl.sku`);
        // batches carry the data a barcode label can be stamped with (batch no + date + release window)
        const batches = await q(`SELECT batch, to_char(batch_date,'YYYY-MM-DD') batch_date,
          coalesce(first_release_window,'') first_release_window FROM planner.batches ORDER BY batch`).catch(() => []);
        return res.json({ rows, batches });
      }
      case 'payments': {
        // Engine model: a "run" = all txns sharing a date (grouped client-side). Run-level
        // bank/currency/bank-amount/FX live in payment_run_meta (→ USD equivalent for Xero).
        const txns = await q(`SELECT id, to_char(payment_date,'YYYY-MM-DD') run_date, transaction_type,
          transaction_reference, transaction_supplier, transaction_amount, deposit_ref
          FROM planner.payment_transactions ORDER BY payment_date DESC NULLS LAST, id`);
        const meta = await q(`SELECT to_char(run_date,'YYYY-MM-DD') run_date, bank, paid_currency,
          bank_amount, fx_rate FROM planner.payment_run_meta`);
        return res.json({ txns, meta });
      }
      case 'payments-report': {
        // A "payment" = one bank payment to a supplier on a date. Master row carries the base-currency
        // (USD) total + the actual bank-currency amount/currency (planner.payment_fx); expand to see the
        // sub-payments — each typed transaction (deposit/completion/balance) + any sundry "other" payment,
        // with its reference + deposit ref. transaction_supplier/reference can be comma-joined (one bank
        // payment covering several POs) → supplier is de-duped for grouping.
        // DERIVED payments report — every payment line is derived from its source-of-truth table, so what's
        // recorded is what shows (no separate payment_transactions ledger to drift against). Sources:
        //   • PO COMPLETION + BALANCE milestones (purchase_orders pay_* — amount + payment date set)
        //   • DEPOSIT register (planner.deposits is_deposit=true) — the actual deposit cash payments (incl.
        //     negative credit-notes / write-offs)
        //   • OTHER payments (planner.deposits is_deposit=false)
        // NOTE: PO *starting deposits* are deliberately EXCLUDED — they are a drawdown/allocation against a
        // register deposit, not a separate cash payment. The register entry is the real payment.
        // Xero AccountCode per PO line: AU delivery → always '620.00 AU'; else the deposit the PO is
        // assigned to (deposits.xero_account_code by deposit_ref); else the production's code
        // (prod_numbers.xero_account_code by prod_no). supplier_code = suppliers.code (the 2-letter code).
        const ACCT = `CASE
            WHEN upper(coalesce(nullif(o.country_code,''),(SELECT br.country_code FROM planner.branches br WHERE br.name=o.branch),''))='AU' THEN '620.00 AU'
            WHEN coalesce(o.deposit_ref,'')<>'' THEN (SELECT d.xero_account_code FROM planner.deposits d WHERE d.reference=o.deposit_ref AND coalesce(d.xero_account_code,'')<>'' ORDER BY d.id LIMIT 1)
            ELSE (SELECT pn.xero_account_code FROM planner.prod_numbers pn
                   WHERE regexp_replace(upper(coalesce(pn.prod_no,'')),'^P','')=regexp_replace(upper(coalesce(o.prod_no,'')),'^P','')
                     AND coalesce(pn.xero_account_code,'')<>'' LIMIT 1) END`;
        const SUPC = nm => `(SELECT s.code FROM planner.suppliers s WHERE lower(trim(s.name))=lower(trim(${nm})) LIMIT 1)`;
        // only payments to a supplier whose master kind = 'supplier' (excludes freight / transfer / other kinds)
        const KIND = nm => `EXISTS (SELECT 1 FROM planner.suppliers s WHERE lower(trim(s.name))=lower(trim(${nm})) AND coalesce(s.kind,'')='supplier')`;
        const lines = (await pool.query(`
          SELECT to_char(o.pay_completion_date,'YYYY-MM-DD') dt, coalesce(o.supplier_name,'(none)') supplier,
            o.po reference, round(o.pay_completion_assigned,2) amount, 'Completion' type, coalesce(o.deposit_ref,'') deposit_ref, 'po' source,
            ${ACCT} account_code, ${SUPC('o.supplier_name')} supplier_code, coalesce(o.prod_no,'') prod_no
          FROM planner.purchase_orders o WHERE o.pay_completion_date IS NOT NULL AND coalesce(o.pay_completion_assigned,0)>0 AND ${KIND('o.supplier_name')}
          UNION ALL
          SELECT to_char(o.pay_balance_1_date,'YYYY-MM-DD'), coalesce(o.supplier_name,'(none)'),
            o.po, round(o.pay_balance_1_amount,2), 'Balance', coalesce(o.deposit_ref,''), 'po', ${ACCT}, ${SUPC('o.supplier_name')}, coalesce(o.prod_no,'')
          FROM planner.purchase_orders o WHERE o.pay_balance_1_date IS NOT NULL AND coalesce(o.pay_balance_1_amount,0)>0 AND ${KIND('o.supplier_name')}
          UNION ALL
          SELECT to_char(o.pay_balance_2_date,'YYYY-MM-DD'), coalesce(o.supplier_name,'(none)'),
            o.po, round(o.pay_balance_2_amount,2), 'Balance', coalesce(o.deposit_ref,''), 'po', ${ACCT}, ${SUPC('o.supplier_name')}, coalesce(o.prod_no,'')
          FROM planner.purchase_orders o WHERE o.pay_balance_2_date IS NOT NULL AND coalesce(o.pay_balance_2_amount,0)>0 AND ${KIND('o.supplier_name')}
          UNION ALL
          SELECT to_char(date_paid,'YYYY-MM-DD'), coalesce(supplier_name,'(none)'),
            coalesce(nullif(reference,''), description, ''), round(amount,2), 'Deposit', '', 'deposit',
            CASE WHEN upper(coalesce(country,''))='AU' THEN '620.00 AU' ELSE xero_account_code END, ${SUPC('supplier_name')}, coalesce(prod_no,'')
          FROM planner.deposits WHERE is_deposit=true AND date_paid IS NOT NULL AND round(coalesce(amount,0))<>0 AND ${KIND('supplier_name')}
          UNION ALL
          SELECT to_char(date_paid,'YYYY-MM-DD'), coalesce(supplier_name,'(none)'),
            coalesce(nullif(reference,''), description, ''), round(amount,2), 'Other', '', 'other', NULL, ${SUPC('supplier_name')}, coalesce(prod_no,'')
          FROM planner.deposits WHERE is_deposit=false AND date_paid IS NOT NULL AND round(coalesce(amount,0))<>0 AND ${KIND('supplier_name')}`)).rows;
        const fx = (await pool.query(`SELECT to_char(run_date,'YYYY-MM-DD') dt, supplier, paid_amount, coalesce(paid_currency,'') ccy FROM planner.payment_fx`)).rows;
        const normSup = s => { const p = (s || '').split(',').map(x => x.trim()).filter(Boolean); return Array.from(new Set(p)).join(', ') || '(none)'; };
        const fxMap = {}; fx.forEach(f => fxMap[f.dt + '|' + normSup(f.supplier)] = f);
        const groups = {};
        for (const l of lines) { const sup = normSup(l.supplier); const k = l.dt + '|' + sup;
          const g = groups[k] || (groups[k] = { dt: l.dt, supplier: sup, total: 0, lines: [] });
          g.total += Number(l.amount);
          if (l.supplier_code && !g.supplier_code) g.supplier_code = l.supplier_code;
          g.lines.push({ reference: l.reference, amount: Number(l.amount), type: l.type, deposit_ref: l.deposit_ref, source: l.source, account_code: l.account_code || '', prod_no: l.prod_no || '' }); }
        const TYPE_ORD = { Deposit: 0, Completion: 1, Balance: 2, Other: 3 };
        const out = Object.values(groups).map(g => { const f = fxMap[g.dt + '|' + g.supplier];
          g.lines.sort((a, b) => (TYPE_ORD[a.type] ?? 9) - (TYPE_ORD[b.type] ?? 9));
          return { dt: g.dt, supplier: g.supplier, supplier_code: g.supplier_code || '', total: Math.round(g.total * 100) / 100, base_ccy: 'USD',
            other_amount: f && f.paid_amount != null ? Number(f.paid_amount) : null, bank_ccy: f ? f.ccy : '',
            lines: g.lines }; })
          .sort((a, b) => a.dt < b.dt ? 1 : a.dt > b.dt ? -1 : (a.supplier < b.supplier ? -1 : 1));
        return res.json(out);
      }
      case 'actions': {  // derived exceptions (spec B3.2). Each carries an inline-fix descriptor
        // (fix/target/field) plus target_key — the key the fix endpoint addresses (po number, or
        // the deposit row id now that deposits are id-keyed). Lifecycle state (dismiss/snooze/done)
        // attached below against a stable key = type|target_key, mirroring DEMAND ▸ Actions.
        const arows = await q(`
          SELECT * FROM (
          SELECT 'high' severity,'Date conflict' type, po ref,
            'Landing '||landing_date_overide::text||' is in the past (status '||coalesce(status,'?')||')' detail,
            'date' fix, 'po' target, 'landing_date_overide' field, po target_key
            FROM planner.purchase_orders
            WHERE landing_date_overide < current_date AND coalesce(status,'') NOT ILIKE '%complete%'
          UNION ALL
          SELECT 'low','Unassigned shipment', po, 'Past production with no shipment assigned',
            'shipment','po','shipment_ref', po
            FROM planner.purchase_orders
            WHERE shipment_ref IS NULL AND coalesce(status,'') NOT ILIKE '%complete%'
          UNION ALL
          SELECT 'high','PO missing supplier', po, 'No supplier set on this PO', 'supplier','po','supplier_name', po
            FROM planner.purchase_orders WHERE supplier_name IS NULL
          UNION ALL
          SELECT 'amber','Deposit not paid', coalesce(reference, description, 'deposit #'||id),
            'Deposit '||coalesce(round(amount)::text,'?')||' '||coalesce(country,'')||' has no paid date',
            'date','deposit','date_paid', id::text
            FROM planner.deposits WHERE is_deposit AND date_paid IS NULL AND coalesce(amount,0) > 0
          UNION ALL
          -- paid deposit with no Xero FX rate captured → medium-priority review
          SELECT 'amber','Deposit FX missing', coalesce(reference, description, 'deposit #'||id),
            'Deposit '||coalesce(reference, description, '')||' is paid but has no Xero FX rate',
            '','deposit','xero_fx', id::text
            FROM planner.deposits WHERE is_deposit AND date_paid IS NOT NULL
              AND (xero_fx IS NULL OR xero_fx::text='') AND coalesce(status,'')<>'closed'
          UNION ALL
          SELECT 'high','Deposit over-assigned', d.reference,
            'Assigned start deposits '||round(dr.used)||' exceed pool '||round(d.pool)
            ||' (remaining '||round(d.pool-dr.used)||')', '','','', d.reference
            FROM (SELECT reference, sum(coalesce(amount,0)) pool FROM planner.deposits
                  WHERE is_deposit AND reference IS NOT NULL AND coalesce(status,'')<>'closed' GROUP BY reference) d
            JOIN (SELECT deposit_ref, sum(coalesce(pay_start_deposit_assigned,0)) used
                  FROM planner.purchase_orders WHERE deposit_ref IS NOT NULL GROUP BY deposit_ref
            ) dr ON dr.deposit_ref=d.reference WHERE dr.used > d.pool + 0.01
          UNION ALL
          -- deposit still has money left, but its open POs have no start deposit left to allocate → review
          SELECT 'amber','Deposit remaining', x.reference,
            'Deposit remaining '||round(x.rem,2)||', none left to be allocated', '','deposit','', x.reference
            FROM (
              SELECT dref.reference,
                (SELECT sum(coalesce(amount,0)) FROM planner.deposits d2 WHERE d2.reference=dref.reference)
                  - coalesce((SELECT sum(coalesce(po.pay_start_deposit_assigned,0)) FROM planner.purchase_orders po WHERE po.deposit_ref=dref.reference),0) rem,
                coalesce((SELECT sum(round(coalesce(po.supplier_invoice_total,
                           (SELECT sum(l.qty*l.cost_price) FROM planner.purchase_order_lines l WHERE l.po=po.po),
                           po.order_value_estimation,0)*coalesce(po.start_deposit_pct_override,s.start_deposit_pct,0)/100,2))
                   FROM planner.purchase_orders po LEFT JOIN planner.suppliers s ON s.id=po.supplier_id
                   WHERE po.deposit_ref=dref.reference AND coalesce(po.status,'') NOT ILIKE '%complete%'
                     AND po.pay_start_deposit_assigned IS NULL),0) est,
                (SELECT count(*) FROM planner.purchase_orders po WHERE po.deposit_ref=dref.reference AND coalesce(po.status,'') NOT ILIKE '%complete%') open_po
              FROM (SELECT DISTINCT reference FROM planner.deposits WHERE is_deposit AND coalesce(status,'')<>'closed' AND coalesce(reference,'')<>'') dref
            ) x
            WHERE x.rem > 0.01 AND x.est = 0 AND x.open_po > 0
          UNION ALL
          -- deposit still has money left, but NO open (non-complete) PO is drawing on it → stranded cash, reassign/close
          SELECT 'amber','Deposit remaining, no open PO', x2.reference,
            'Deposit remaining '||round(x2.rem,2)||', no open PO assigned', '','deposit','', x2.reference
            FROM (
              SELECT dref.reference,
                (SELECT sum(coalesce(amount,0)) FROM planner.deposits d2 WHERE d2.reference=dref.reference)
                  - coalesce((SELECT sum(coalesce(po.pay_start_deposit_assigned,0)) FROM planner.purchase_orders po WHERE po.deposit_ref=dref.reference),0) rem,
                (SELECT count(*) FROM planner.purchase_orders po WHERE po.deposit_ref=dref.reference AND coalesce(po.status,'') NOT ILIKE '%complete%') open_po
              FROM (SELECT DISTINCT reference FROM planner.deposits WHERE is_deposit AND coalesce(status,'')<>'closed' AND coalesce(reference,'')<>'') dref
            ) x2
            WHERE x2.rem > 0.01 AND x2.open_po = 0
          UNION ALL
          SELECT 'low','Partial cartons need approval', l.po,
            count(*)||' line(s) not a full carton multiple and not yet approved', 'orderplan','','partials', l.po
            FROM planner.v_purchase_order_lines l
            JOIN planner.purchase_orders p ON p.po=l.po
            WHERE l.full_carton_check LIKE '⚠%' AND coalesce(p.status,'') NOT ILIKE '%complete%'
            GROUP BY l.po
          UNION ALL
          -- supplier hasn't confirmed the order (SKUs / qty / dates) yet — chase confirmation
          SELECT 'low','Awaiting supplier confirmation', po,
            'Supplier has not yet confirmed this order (SKUs / qty / dates)', '','po','', po
            FROM planner.purchase_orders
            WHERE supplier_confirmed_at IS NULL AND coalesce(supplier_name,'')<>''
              AND coalesce(status,'') NOT ILIKE '%complete%' AND coalesce(status,'') NOT ILIKE '%future%'
              AND coalesce((SELECT pn.require_supplier_confirmation FROM planner.prod_numbers pn WHERE pn.prod_no=purchase_orders.prod_no),false)
              AND EXISTS (SELECT 1 FROM planner.purchase_order_lines l WHERE l.po=purchase_orders.po AND coalesce(l.qty,0)>0)
          UNION ALL
          -- supplier risk: line ordered against a supplier not in the SKU's allowed multi-supplier list (until approved)
          SELECT 'amber','Supplier risk needs approval', l.po,
            count(*)||' line(s) ordered against a supplier not in the SKU''s allowed list', 'orderplan','','suprisk', l.po
            FROM planner.purchase_order_lines l
            JOIN planner.purchase_orders p ON p.po=l.po
            JOIN planner.products pr ON pr.sku=l.sku
            WHERE coalesce(l.supplier_risk_approved,false)=false AND coalesce(l.qty,0)>0
              AND coalesce(p.status,'') NOT ILIKE '%complete%'
              AND coalesce(pr.supplier_multiple_all,'')<>'' AND coalesce(p.supplier_name,'')<>''
              AND NOT (lower(trim(p.supplier_name)) = ANY(SELECT lower(trim(x)) FROM unnest(string_to_array(pr.supplier_multiple_all, ',')) x))
            GROUP BY l.po
          UNION ALL
          -- discontinued: line forecast to arrive after the product's discontinue date, per-destination (until approved)
          SELECT 'amber','Discontinued arrival needs approval', dd.po,
            dd.cnt||' line(s) forecast to arrive after the product discontinue date', 'orderplan','','disc', dd.po
            FROM (
              SELECT l.po, count(*) cnt
              FROM planner.purchase_order_lines l
              JOIN planner.purchase_orders p ON p.po=l.po
              LEFT JOIN planner.branches b ON b.name=p.branch
              JOIN planner.products pr ON pr.sku=l.sku
              LEFT JOIN LATERAL (SELECT f.landing_date FROM planner.flexport_shipments f
                WHERE f.flex_id=p.flexport_reference OR f.shipment_name=p.po OR f.shipment_name=p.shipment_ref
                ORDER BY (f.flex_id=p.flexport_reference) DESC NULLS LAST LIMIT 1) fx ON true
              CROSS JOIN LATERAL (SELECT CASE upper(coalesce(nullif(p.country_code,''), b.country_code, ''))
                  WHEN 'AU' THEN pr.discontinue_date_au_final WHEN 'CA' THEN pr.discontinue_date_ca
                  ELSE pr.discontinue_date_final END disc) dsel
              WHERE coalesce(l.discontinue_approved,false)=false AND coalesce(l.qty,0)>0
                AND coalesce(p.status,'') NOT ILIKE '%complete%'
                AND dsel.disc ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
                AND coalesce(to_char(p.delivery_date_overide,'YYYY-MM-DD'), to_char(p.landing_date_overide,'YYYY-MM-DD'), to_char(fx.landing_date,'YYYY-MM-DD')) > dsel.disc
              GROUP BY l.po
            ) dd
          UNION ALL
          -- client deadline at risk: forecast completion (arrival + warehouse leg) is after the PO's client deadline
          SELECT 'high','Client deadline at risk', cd.po,
            'Completion '||cd.completion||' is after the client deadline '||cd.cdl, '','po','', cd.po
            FROM (
              SELECT p.po, p.client_deadline_date::text cdl,
                -- mirror the grid's completion: effective delivery (shipment dates ▸ flexport ▸ PO overrides) + warehouse leg
                (coalesce(sh.delivery_date, sh.arrival_date, sh.landing_date, fx.landing_date, p.delivery_date_overide, p.landing_date_overide)
                  + (CASE WHEN upper(coalesce(nullif(p.country_code,''), b.country_code, ''))='DIRECT'
                            AND coalesce(nullif(p.shipment_ref,''), p.po)=p.po THEN 0 ELSE 7 END))::text completion
              FROM planner.purchase_orders p
              LEFT JOIN planner.branches b ON b.name=p.branch
              LEFT JOIN planner.shipments sh ON sh.shipment_ref=p.shipment_ref
              LEFT JOIN LATERAL (SELECT f.landing_date FROM planner.flexport_shipments f
                WHERE f.flex_id=p.flexport_reference OR f.shipment_name=p.po OR f.shipment_name=p.shipment_ref
                ORDER BY (f.flex_id=p.flexport_reference) DESC NULLS LAST LIMIT 1) fx ON true
              WHERE p.client_deadline_date IS NOT NULL AND coalesce(p.status,'') NOT ILIKE '%complete%'
            ) cd
            WHERE cd.completion IS NOT NULL AND cd.completion > cd.cdl
          UNION ALL
          -- escalated shipment (set in the supplier portal / Shipments grid) → review while escalated AND still live
          SELECT 'high','Shipment escalated', sh.shipment_ref,
            'Shipment '||sh.shipment_ref||' has been escalated — review', '','shipment','', sh.shipment_ref
            FROM planner.shipments sh WHERE sh.escalated=true
              AND EXISTS (SELECT 1 FROM planner.purchase_orders p WHERE p.shipment_ref=sh.shipment_ref AND coalesce(p.status,'') NOT ILIKE '%complete%')
          UNION ALL
          -- supplier created a new shipment from the portal (carrier/tracking on a PO with no shipment) → review while live
          SELECT 'amber','Supplier created new shipment', sh.shipment_ref,
            'A supplier created shipment '||sh.shipment_ref||' from the portal'||coalesce(' ('||sh.supplier_created_by||')','')||' — review the carrier / tracking & dates',
            '','shipment','', sh.shipment_ref
            FROM planner.shipments sh WHERE sh.supplier_created_at IS NOT NULL
              AND EXISTS (SELECT 1 FROM planner.purchase_orders p WHERE p.shipment_ref=sh.shipment_ref AND coalesce(p.status,'') NOT ILIKE '%complete%')
          UNION ALL
          SELECT 'amber','Order-plan change pending ERP push', l.po,
            count(*)||' line(s) edited, not yet uploaded to the ERP', 'upload','po','', l.po
            FROM planner.purchase_order_lines l LEFT JOIN planner.erp_purchase_order_lines el ON el.po=l.po AND el.sku=l.sku
            JOIN planner.purchase_orders p ON p.po=l.po AND coalesce(p.status,'') NOT ILIKE '%complete%'  -- ignore COMPLETE POs
            WHERE l.qty IS DISTINCT FROM el.qty  -- focus: SKU + QUANTITY (cost drift handled in the PO order-plan panel)
            GROUP BY l.po HAVING count(*) FILTER (WHERE el.qty IS NOT NULL)>0  -- has ≥1 line in the ERP mirror (else "not in ERP" below)
          UNION ALL
          SELECT 'high','PO not in ERP', l.po,
            count(*)||' line(s) exist but none are mirrored from the ERP (never pushed)', 'upload','po','', l.po
            FROM planner.purchase_order_lines l
            JOIN planner.purchase_orders p ON p.po=l.po
            LEFT JOIN planner.erp_purchase_order_lines el ON el.po=l.po AND el.sku=l.sku
            WHERE coalesce(p.status,'') NOT ILIKE '%complete%'
            GROUP BY l.po HAVING count(*) FILTER (WHERE el.qty IS NOT NULL)=0
          -- (removed) "Production check-in" time-based nag — supplier production status is now a field on
          -- PO ▸ PLAN ▸ DATES + the supplier portal, with a logic-based exception flagged there (not here).
          UNION ALL
          SELECT CASE WHEN y.shipd < current_date THEN 'high' ELSE 'amber' END,'Ship check-in', y.po,
            CASE WHEN y.shipd < current_date
              THEN 'Production complete; planned ship '||y.shipd||' passed ('||(current_date-y.shipd)||'d ago) — confirm it shipped'
              ELSE 'Production complete; ships ~'||y.shipd||' (in '||(y.shipd-current_date)||'d) — confirm it''s on the water' END,
            'prodstatus','po','production_status', y.po
            FROM (SELECT po.po,
                    coalesce(sh.departure_date,
                      (coalesce(po.end_production_overide,
                                po.start_production + (coalesce(s.production_days,0)||' days')::interval)::date + 7))::date shipd,
                    coalesce(po.production_status,'') ps
                  FROM planner.purchase_orders po
                  LEFT JOIN planner.suppliers s ON s.id=po.supplier_id
                  LEFT JOIN planner.shipments sh ON sh.shipment_ref=po.shipment_ref
                  WHERE coalesce(po.status,'') NOT ILIKE '%complete%') y
            WHERE y.shipd IS NOT NULL AND y.shipd <= current_date + 7 AND y.ps='complete'
          UNION ALL
          SELECT 'amber','Shipment missing dates', s.shipment_ref,
            'Assigned to live PO(s) but has no departure/ETA date set', 'date','shipment','arrival_date', s.shipment_ref
            FROM planner.shipments s
            WHERE s.departure_date IS NULL AND s.arrival_date IS NULL AND s.landing_date IS NULL AND s.delivery_date IS NULL
              AND EXISTS (SELECT 1 FROM planner.purchase_orders p WHERE p.shipment_ref=s.shipment_ref
                          AND coalesce(p.status,'') NOT ILIKE '%complete%')
          UNION ALL
          SELECT 'amber','Shipment ETA passed', s.shipment_ref,
            'ETA '||coalesce(s.arrival_date,s.delivery_date,s.landing_date)::text||' has passed but not marked arrived',
            'arrived','shipment','status', s.shipment_ref
            FROM planner.shipments s
            WHERE coalesce(s.arrival_date,s.delivery_date,s.landing_date) < current_date
              AND coalesce(s.status,'') NOT ILIKE '%arriv%' AND coalesce(s.status,'') NOT ILIKE '%complete%'
              AND coalesce(s.status,'') NOT ILIKE '%deliver%'
              AND EXISTS (SELECT 1 FROM planner.purchase_orders p WHERE p.shipment_ref=s.shipment_ref
                          AND coalesce(p.status,'') NOT ILIKE '%complete%')
          UNION ALL
          SELECT 'amber','Shipment delivered — update PO', po.po,
            'Shipment '||po.shipment_ref||' has landed/completed but this PO is still '''||coalesce(nullif(po.status,''),'?')||''' — mark it delivered',
            'podeliver','po','status', po.po
            FROM planner.purchase_orders po
            JOIN planner.shipments s2 ON s2.shipment_ref=po.shipment_ref
            LEFT JOIN LATERAL (SELECT f.arrival_date, f.landing_date FROM planner.flexport_shipments f
              WHERE f.flex_id=s2.carrier_ref OR f.shipment_name=s2.shipment_ref LIMIT 1) fx2 ON true
            WHERE coalesce(po.status,'') NOT ILIKE '%complete%' AND coalesce(po.status,'') NOT ILIKE '%deliver%'
              AND (lower(coalesce(s2.status,'')) LIKE 'complet%' OR coalesce(s2.arrival_date, fx2.arrival_date, s2.landing_date, fx2.landing_date) < current_date)
              AND NOT (upper(coalesce(po.country_code,''))='DIRECT' AND po.branch IN ('UK ILG','US Geneva','EU iFulfillment','AU Coghlans'))
          UNION ALL
          -- PO sat in DELIVERED past its completion (arrival + 7) but not yet Received in Cin7/Fulfil → chase the receipt
          SELECT 'amber','Awaiting ERP receipt', po.po,
            'Delivered & completion ('||to_char((coalesce(s2.arrival_date, fx2.arrival_date, s2.landing_date, fx2.landing_date) + interval '7 days')::date,'YYYY-MM-DD')
              ||') has passed — receive it in Cin7/Fulfil to complete the PO',
            'gotopo','po','', po.po
            FROM planner.purchase_orders po
            JOIN planner.shipments s2 ON s2.shipment_ref=po.shipment_ref
            LEFT JOIN LATERAL (SELECT f.arrival_date, f.landing_date FROM planner.flexport_shipments f
              WHERE f.flex_id=s2.carrier_ref OR f.shipment_name=s2.shipment_ref LIMIT 1) fx2 ON true
            WHERE coalesce(po.status,'') ILIKE '%deliver%' AND coalesce(po.status,'') NOT ILIKE '%complete%'
              AND (coalesce(s2.arrival_date, fx2.arrival_date, s2.landing_date, fx2.landing_date) + interval '7 days')::date < current_date
          UNION ALL
          SELECT 'high','Payment invalid', po,
            'A payment amount is set with no payment date — add the date in the PO''s PLAN', 'gotopo','po','', po
            FROM planner.purchase_orders
            WHERE coalesce(status,'') NOT ILIKE '%complete%' AND (
              (coalesce(pay_start_deposit_assigned,0)>0 AND pay_start_deposit_date IS NULL) OR
              (coalesce(pay_completion_assigned,0)>0 AND pay_completion_date IS NULL) OR
              (coalesce(pay_balance_1_amount,0)>0 AND pay_balance_1_date IS NULL) OR
              (coalesce(pay_balance_2_amount,0)>0 AND pay_balance_2_date IS NULL) )
          UNION ALL
          SELECT 'amber','Over 20 pallets', z.po,
            'Estimated '||round(z.pal,1)||' pallets (>20 = over one container) — rebalance across this production''s POs',
            'rebalance','po','', z.po
            FROM (SELECT po.po, upper(coalesce(nullif(po.country_code,''), b.country_code, '')) ctry,
                    (SELECT sum(l.qty::numeric/NULLIF(sl.pallet_qty,0)) FROM planner.purchase_order_lines l
                       LEFT JOIN planner.sku_labels sl ON sl.sku=l.sku WHERE l.po=po.po) pal
                  FROM planner.purchase_orders po LEFT JOIN planner.branches b ON b.name=po.branch
                  -- only BEFORE it ships (FUTURE / PRODUCTION / READY TO SHIP) — once shipped it's too late to rebalance
                  WHERE coalesce(po.status,'') NOT ILIKE '%complete%' AND coalesce(po.status,'') NOT ILIKE 'ship%'
                    AND coalesce(po.status,'') NOT ILIKE '%deliver%') z
            WHERE z.pal > 20 AND z.ctry <> 'DIRECT'
          ) _a ORDER BY CASE severity WHEN 'high' THEN 0 WHEN 'amber' THEN 1 ELSE 2 END, type LIMIT 400`);
        try { (await expediteActions()).forEach(a => arows.push(a)); } catch (e) { /* recommendation layer is best-effort */ }
        try { (await submissionActions()).forEach(a => arows.push(a)); } catch (e) { /* portal-submission layer is best-effort */ }
        try { (await manufacturingActions()).forEach(a => arows.push(a)); } catch (e) { /* manufacturing-mismatch layer is best-effort */ }
        // ERP COMPARE — a single medium-priority action when there are open ERP POs missing from the planner
        try { const ec = await erpCompareActiveCount();
          if (ec > 0) arows.push({ severity: 'amber', type: 'ERP POs not in planner',
            ref: ec + ' PO' + (ec > 1 ? 's' : ''),
            detail: 'There ' + (ec > 1 ? 'are ' : 'is ') + ec + ' PO' + (ec > 1 ? 's' : '') + ' open in the ERP but not in the planner — review the ERP Compare report',
            fix: 'gotoreport', target: '', field: 'erp-compare', target_key: 'erp-compare' }); } catch (e) { /* best-effort */ }
        const dtoday = (await pool.query(`SELECT to_char(current_date,'YYYY-MM-DD') d`)).rows[0].d;
        let astate = {};
        try { (await pool.query(`SELECT action_key, status, to_char(snooze_until,'YYYY-MM-DD') snooze_until FROM planner.supply_action_state`))
          .rows.forEach(s => { astate[s.action_key] = s; }); } catch (e) { /* table not yet created (migration 037) */ }
        arows.forEach(r => {
          // portal-submission cards carry their own apply/dismiss (no generic snooze/dismiss lifecycle)
          if (r.fix === 'applysub') { r.status = 'open'; return; }
          r.key = r.type + '|' + (r.target_key || r.ref || ''); const s = astate[r.key]; r.status = 'open'; r.snooze_until = null;
          if (s) { if (s.status === 'snoozed' && s.snooze_until && s.snooze_until >= dtoday) { r.status = 'snoozed'; r.snooze_until = s.snooze_until; }
            else if (s.status !== 'snoozed') r.status = s.status; } });
        return res.json(arows);
      }
      case 'upcoming':    // "What's next" briefing reuses the same per-PO milestone data as the pipeline
      case 'pipeline': {  // PO lifecycle — bucket every open PO into one stage of its journey, from the
        // date chain + supplier-confirmed production status. Each PO carries its next milestone date and a
        // health (late / due-soon / on-track) so the board reads as a grouped timeline.
        const today = (await pool.query(`SELECT to_char(CURRENT_DATE,'YYYY-MM-DD') d`)).rows[0].d;
        const rows = (await pool.query(`
          WITH s AS (
            SELECT po.po, coalesce(po.status,'') status, coalesce(po.supplier_name,'') supplier,
              upper(coalesce(nullif(po.country_code,''), b.country_code,'')) market,
              coalesce(po.production_status,'') production_status,
              (CURRENT_DATE - po.production_confirmed_at::date)::int prod_conf_age,
              coalesce(po.shipment_ref,'') shipment_ref,
              po.start_production prod_start,
              coalesce(po.end_production_overide, po.start_production + (coalesce(sup.production_days,0)||' days')::interval)::date prod_end,
              coalesce(sh.departure_date, po.supplier_ship_date,
                       coalesce(po.end_production_overide, po.start_production + (coalesce(sup.production_days,0)||' days')::interval) + interval '7 days')::date ship_date,
              coalesce(sh.delivery_date, sh.arrival_date, sh.landing_date, po.delivery_date_overide, po.landing_date_overide)::date arr_known,
              po.supplier_ship_date sup_ship, sh.departure_date sh_dep, coalesce(sh.status,'') sh_status,
              b.sea_lead_time_days sea_lead,
              coalesce(po.supplier_invoice_total,
                       (SELECT sum(l.qty*coalesce(l.cost_price,0)) FROM planner.purchase_order_lines l WHERE l.po=po.po),
                       po.order_value_estimation, 0)::numeric val,
              (SELECT coalesce(sum(l.qty),0) FROM planner.purchase_order_lines l WHERE l.po=po.po)::int units,
              coalesce(fxs.flex_id, po.flexport_reference, '') flex
            FROM planner.purchase_orders po
            LEFT JOIN planner.suppliers sup ON sup.id=po.supplier_id
            LEFT JOIN planner.branches b ON b.name=po.branch
            LEFT JOIN planner.shipments sh ON sh.shipment_ref=po.shipment_ref
            LEFT JOIN LATERAL (SELECT f.flex_id FROM planner.flexport_shipments f
              WHERE f.flex_id=po.flexport_reference OR f.shipment_name=po.po OR f.shipment_name=po.shipment_ref
              ORDER BY (f.flex_id=po.flexport_reference) DESC NULLS LAST LIMIT 1) fxs ON true
            WHERE coalesce(po.status,'') NOT ILIKE '%complete%')
          SELECT po, status, supplier, market, production_status, prod_conf_age, shipment_ref,
            to_char(prod_start,'YYYY-MM-DD') prod_start,
            to_char(prod_end,'YYYY-MM-DD') prod_end,
            to_char(ship_date,'YYYY-MM-DD') ship_date,
            to_char(coalesce(arr_known, ship_date + (coalesce(sea_lead,0)||' days')::interval),'YYYY-MM-DD') arrival,
            (arr_known IS NOT NULL) arrival_known, units, round(val)::int val, flex,
            -- planned-vs-confirmed inputs for the OVERDUE check (a passed planned date with no confirmation)
            to_char(coalesce(sup_ship, prod_end + interval '7 days'),'YYYY-MM-DD') planned_ship,
            (sh_dep IS NOT NULL) departed,
            (sh_status ~* 'arriv|deliver|complete|receiv') arrived,
            to_char(coalesce(arr_known, coalesce(sup_ship, prod_end + interval '7 days') + (coalesce(sea_lead,0)||' days')::interval),'YYYY-MM-DD') eta
          FROM s`)).rows;
        const STAGES = [['awaiting','Awaiting production'],['in_production','In production'],
          ['prod_complete','Production complete'],['in_transit','In transit'],['arriving','Arriving ≤2wk'],['checked_in','Checked in']];
        const order = STAGES.map(s => s[0]);
        const dleft = iso => iso ? Math.round((Date.parse(iso) - Date.parse(today)) / 86400000) : null;
        const pos = rows.map(r => {
          let st;
          const arrIn = dleft(r.arrival);
          if (r.arrival && r.arrival <= today) st = 'checked_in';
          else if (r.ship_date && r.ship_date <= today) st = (arrIn != null && arrIn <= 14) ? 'arriving' : 'in_transit';
          else if (r.prod_end && r.prod_end <= today) st = 'prod_complete';
          else if (r.prod_start && r.prod_start <= today) st = 'in_production';
          else st = 'awaiting';
          const atLeast = m => { if (order.indexOf(st) < order.indexOf(m)) st = m; };          // trust confirmed status
          if (r.production_status === 'in_production' || r.production_status === 'nearing_completion') atLeast('in_production');
          if (r.production_status === 'complete') atLeast('prod_complete');
          if (r.production_status === 'shipped') atLeast('in_transit');
          const nextDate = { awaiting: r.prod_start, in_production: r.prod_end, prod_complete: r.ship_date,
            in_transit: r.arrival, arriving: r.arrival, checked_in: null }[st];
          const d = dleft(nextDate);
          const health = nextDate == null ? (st === 'checked_in' ? 'done' : 'unknown') : (d < 0 ? 'late' : (d <= 7 ? 'soon' : 'ok'));
          // OVERDUE = earliest planned milestone whose date has passed without confirmation that it happened.
          // (The stage above advances optimistically off dates; this instead checks planned-vs-confirmed.)
          // The PO's management status is also authoritative: SHIPPING/READY TO SHIP/DELIVERED are past the
          // completion milestone (so "Completing" can't be overdue); SHIPPING/DELIVERED are past the ship
          // milestone; DELIVERED is arrived. Use it alongside production_status (which is often unset).
          const mstatus = (r.status || '').toUpperCase();
          const mPastCompletion = /SHIPPING|READY TO SHIP|DELIVERED/.test(mstatus);
          const mDelivered = /DELIVERED/.test(mstatus);
          const prodDone = r.production_status === 'complete' || r.production_status === 'shipped' || mPastCompletion;
          const departed = r.departed || r.production_status === 'shipped' || /SHIPPING|DELIVERED/.test(mstatus);
          const arrived = r.arrived || mDelivered;
          let overdue = null;
          if (r.prod_end && r.prod_end < today && !prodDone && !departed && !arrived) overdue = { type: 'Completing', date: r.prod_end };
          else if (r.planned_ship && r.planned_ship < today && !departed && !arrived) overdue = { type: 'Shipping', date: r.planned_ship };
          else if (r.eta && r.eta < today && !arrived) overdue = { type: 'Arriving', date: r.eta };
          if (overdue) overdue.days = -dleft(overdue.date);
          return { po: r.po, supplier: r.supplier, market: r.market, units: r.units, val: r.val,
            shipment_ref: r.shipment_ref, flex: r.flex || '', production_status: r.production_status, prod_conf_age: r.prod_conf_age,
            stage: st, next_date: nextDate, next_days: d, health, overdue,
            prod_start: r.prod_start, prod_end: r.prod_end, ship_date: r.ship_date, arrival: r.arrival, arrival_known: r.arrival_known };
        });
        return res.json({ today, stages: STAGES, pos });
      }
      case 'config':      // CONFIG view (rate-card sub-tabs); suppliers/batches fetched separately
      case 'settings': {  // editable cards: import tax, freight, duty, branches (lead times)
        const [tax, freight, duty, branches] = await Promise.all([
          q(`SELECT country, tax_pct, coalesce(base,'landed') base, coalesce(notes,'') notes
             FROM planner.import_tax_rates ORDER BY country`),
          q(`SELECT id, coalesce(destination,'') destination, coalesce(container_size,'') container_size,
             cost, pallets, coalesce(currency,'USD') currency, coalesce(notes,'') notes
             FROM planner.freight_rates ORDER BY pallets DESC NULLS LAST, destination`),
          q(`SELECT id, coalesce(category,'') category, coalesce(country,'') country, duty_pct, coalesce(notes,'') notes
             FROM planner.duty_rates ORDER BY category, country`),
          q(`SELECT name, coalesce(country_code,'') country_code, sea_lead_time_days, air_lead_time_days,
             coalesce(shipping_notes,'') shipping_notes FROM planner.branches ORDER BY name`),
        ]);
        const air = await q(`SELECT id, min_kg, max_kg, rate_per_kg FROM planner.air_freight_rates ORDER BY min_kg`).catch(() => []);
        return res.json({ tax, freight, duty, branches, air, sizes: ['20ft','40ft','LCL'] });
      }
      default:
        return res.status(404).json({ error: 'unknown section: ' + req.params.section });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── SUPPLY writes — editable cells in PAYMENTS/DEPOSITS save here. Targets the configured DB
// (Ben's sandbox). Whitelisted fields only, parameterised. Production writes stay Diviyaj's/gated.
async function patch(res, table, keyCol, keyVal, allowed, body, keyType) {
  const sets = [], vals = []; let i = 1;
  for (const k of Object.keys(body || {})) {
    if (!allowed[k]) continue;
    sets.push(`${k}=$${i++}::${allowed[k]}`);
    vals.push(body[k] === '' ? null : body[k]);
  }
  if (!sets.length) return res.status(400).json({ error: 'no editable fields' });
  vals.push(keyVal);
  try {
    const r = await pool.query(`UPDATE ${table} SET ${sets.join(',')} WHERE ${keyCol}=$${i}${keyType ? '::' + keyType : ''}`, vals);
    res.json({ updated: r.rowCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
}
app.post('/api/supply/deposit/:id', async (req, res) => {
  // a typed supplier that isn't in the master gets added (so the picker stays a real dropdown)
  try { const nm = req.body && req.body.supplier_name;
    if (nm && nm.trim()) await pool.query(
      `INSERT INTO planner.suppliers(name,kind) SELECT $1,'supplier'
         WHERE NOT EXISTS (SELECT 1 FROM planner.suppliers WHERE lower(trim(name))=lower(trim($1)))`, [nm.trim()]);
  } catch (e) { /* non-fatal */ }
  patch(res, 'planner.deposits', 'id', req.params.id,
    { amount: 'numeric', xero_fx: 'numeric', date_paid: 'date', date_due: 'date', date_likely_pay: 'date', reference: 'text',
      supplier_name: 'text', description: 'text', prod_no: 'text', country: 'text',
      xero_account_code: 'text', status: 'text' }, req.body, 'bigint');
});
// Delete a deposit / other-payment row. Other payments (is_deposit=false) delete freely. A deposit
// (is_deposit=true) can only be deleted when NO purchase order is assigned to its reference; any
// production-assignment rows for the reference are cleaned up alongside.
app.post('/api/supply/deposit/:id/delete', async (req, res) => {
  try {
    const d = (await pool.query(`SELECT id, is_deposit, coalesce(reference,'') reference, date_paid FROM planner.deposits WHERE id=$1`, [req.params.id])).rows[0];
    if (!d) return res.status(404).json({ error: 'deposit not found' });
    if (d.date_paid) return res.status(400).json({ error: 'Cannot delete — this item has a payment date. Clear the paid date first if it was entered in error.' });
    if (d.is_deposit && d.reference) {
      const n = Number((await pool.query(`SELECT count(*) n FROM planner.purchase_orders WHERE deposit_ref=$1`, [d.reference])).rows[0].n);
      if (n > 0) return res.status(400).json({ error: `Cannot delete — ${n} purchase order(s) are assigned to this deposit. Unassign them first.` });
      await pool.query(`DELETE FROM planner.production_deposits WHERE deposit_ref=$1`, [d.reference]);
    }
    await pool.query(`DELETE FROM planner.deposits WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Apply a deposit to every open PO in its production + supplier that has no deposit yet.
// Region-guarded: an AU deposit only lands on AU POs, a non-AU deposit only on non-AU POs.
app.post('/api/supply/deposit/:id/apply-all', async (req, res) => {
  try {
    const d = (await pool.query(`SELECT coalesce(reference,'') reference, coalesce(supplier_name,'') supplier_name,
      coalesce(prod_no,'') prod_no, coalesce(country,'') country FROM planner.deposits WHERE id=$1 AND is_deposit`, [req.params.id])).rows[0];
    if (!d || !d.reference) return res.status(404).json({ error: 'deposit not found' });
    if (!d.prod_no || !d.supplier_name) return res.status(400).json({ error: 'This deposit needs a production (PROD#) and supplier set before it can be applied.' });
    const depAU = /^AU$/i.test((d.country || '').trim());
    // candidate open POs on the same production + supplier with no deposit yet
    const cand = (await pool.query(`
      SELECT po.po, upper(coalesce(nullif(po.country_code,''),(SELECT b.country_code FROM planner.branches b WHERE b.name=po.branch),'')) ctry
      FROM planner.purchase_orders po
      WHERE coalesce(po.prod_no,'')=$1 AND lower(trim(coalesce(po.supplier_name,'')))=lower(trim($2))
        AND coalesce(po.deposit_ref,'')='' AND coalesce(po.status,'') NOT ILIKE '%complete%'`, [d.prod_no, d.supplier_name])).rows;
    const match = cand.filter(r => (/^AU$/.test(r.ctry || '')) === depAU);
    for (const r of match) await pool.query(`UPDATE planner.purchase_orders SET deposit_ref=$1 WHERE po=$2`, [d.reference, r.po]);
    res.json({ assigned: match.length, skipped_region: cand.length - match.length, reference: d.reference, pos: match.map(r => r.po) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// CASH FLOW — manual "likely payment date" for an overdue line. Empty date clears the override.
app.post('/api/supply/likely-date', async (req, res) => {
  const { line_key, likely_date } = req.body || {};
  if (!line_key) return res.status(400).json({ error: 'line_key required' });
  try {
    if (!likely_date) { await pool.query(`DELETE FROM planner.payment_likely_dates WHERE line_key=$1`, [line_key]); return res.json({ cleared: true }); }
    await pool.query(`INSERT INTO planner.payment_likely_dates (line_key, likely_date, updated_at) VALUES ($1,$2::date,now())
      ON CONFLICT (line_key) DO UPDATE SET likely_date=excluded.likely_date, updated_at=now()`, [line_key, likely_date]);
    res.json({ saved: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Settings — landed-cost rate cards. Import tax keyed by country (upsert); freight rates by id.
app.post('/api/supply/tax-rate/:country', async (req, res) => {
  const b = req.body || {}, allowed = { tax_pct: 'numeric', base: 'text', notes: 'text' };
  const cols = ['country'], vals = [req.params.country], ph = ['$1::text']; let i = 2;
  for (const k of Object.keys(b)) { if (!allowed[k]) continue; cols.push(k); vals.push(b[k] === '' ? null : b[k]); ph.push(`$${i++}::${allowed[k]}`); }
  const upd = cols.slice(1).map(c => `${c}=excluded.${c}`).join(',') || 'updated_at=now()';
  try {
    await pool.query(`INSERT INTO planner.import_tax_rates (${cols.join(',')}) VALUES (${ph.join(',')})
      ON CONFLICT (country) DO UPDATE SET ${upd}, updated_at=now()`, vals);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/supply/freight-rate/:id', (req, res) =>
  patch(res, 'planner.freight_rates', 'id', req.params.id,
    { destination: 'text', container_size: 'text', cost: 'numeric', currency: 'text', notes: 'text' },
    req.body, 'bigint'));
app.post('/api/supply/freight-rate-create', async (req, res) => {
  const b = req.body || {};
  try {
    const r = await pool.query(`INSERT INTO planner.freight_rates (destination, container_size, cost, currency)
      VALUES ($1,$2,$3,coalesce($4,'USD')) RETURNING id`,
      [b.destination || null, b.container_size || null, b.cost === '' || b.cost == null ? null : b.cost, b.currency || null]);
    res.json({ ok: true, id: r.rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/supply/duty-rate/:id', (req, res) =>
  patch(res, 'planner.duty_rates', 'id', req.params.id,
    { category: 'text', country: 'text', duty_pct: 'numeric', notes: 'text' }, req.body, 'bigint'));
app.post('/api/supply/duty-rate-create', async (req, res) => {
  const b = req.body || {};
  try {
    const r = await pool.query(`INSERT INTO planner.duty_rates (category, country, duty_pct) VALUES ($1,$2,$3) RETURNING id`,
      [b.category || null, b.country || null, b.duty_pct === '' || b.duty_pct == null ? null : b.duty_pct]);
    res.json({ ok: true, id: r.rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Branches (lead-time table) — edit by name (upsert), and create. Drives PO ship/landing dates.
app.post('/api/supply/branch/:name', async (req, res) => {
  const b = req.body || {}, allowed = { country_code: 'text', sea_lead_time_days: 'int', air_lead_time_days: 'int', shipping_notes: 'text' };
  const cols = ['name'], vals = [req.params.name], ph = ['$1::text']; let i = 2;
  for (const k of Object.keys(b)) { if (!allowed[k]) continue; cols.push(k); vals.push(b[k] === '' ? null : b[k]); ph.push(`$${i++}::${allowed[k]}`); }
  const upd = cols.slice(1).map(c => `${c}=excluded.${c}`).join(',') || 'name=excluded.name';
  try {
    await pool.query(`INSERT INTO planner.branches (${cols.join(',')}) VALUES (${ph.join(',')})
      ON CONFLICT (name) DO UPDATE SET ${upd}`, vals);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Suppliers — editable terms table (CONFIG). Edit by id; create a new supplier (name required).
app.post('/api/supply/supplier/:id', (req, res) =>
  patch(res, 'planner.suppliers', 'id', req.params.id,
    { code: 'text', name: 'text', kind: 'text', default_currency: 'text',
      start_deposit_pct: 'numeric', completion_pct: 'numeric', balance_pct: 'numeric',
      credit_days: 'int', credit_type: 'text', credit_fee_on_balance_pct: 'numeric',
      production_days: 'int', country: 'text', contact_name: 'text', email: 'text' }, req.body, 'bigint'));
app.post('/api/supply/supplier-create', async (req, res) => {
  const b = req.body || {}, name = (b.name || '').trim();
  if (!name) return res.status(400).json({ error: 'supplier name required' });
  try {
    const r = await pool.query(`INSERT INTO planner.suppliers (name, code, kind) VALUES ($1,$2,coalesce($3,'factory')) RETURNING id`,
      [name, (b.code || '').trim() || null, b.kind || null]);
    res.json({ ok: true, id: r.rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// ── KEY ACCOUNTS (CONFIG) — clients whose packing/labelling + requirements + address default onto a PO's
// Direct-to-Client details when selected. List / create / edit / delete, plus apply-to-PO.
const KA_FIELDS = {
  name: 'text', client_requirements: 'text', address: 'text', pack_pallet_notes: 'text', pack_other_notes: 'text',
  pack_polybags: 'boolean', pack_polybags_notes: 'text', pack_dnb_barcodes: 'boolean', pack_dnb_barcodes_notes: 'text',
  pack_rfid_barcodes: 'boolean', pack_rfid_barcodes_notes: 'text', pack_dnb_carton: 'boolean', pack_dnb_carton_notes: 'text',
  pack_client_carton: 'boolean', pack_client_carton_notes: 'text',
};
app.post('/api/supply/key-account-create', async (req, res) => {
  const name = ((req.body || {}).name || '').trim();
  if (!name) return res.status(400).json({ error: 'key account name required' });
  try { const r = await pool.query(`INSERT INTO planner.key_accounts (name) VALUES ($1) RETURNING id`, [name]); res.json({ ok: true, id: r.rows[0].id }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/supply/key-account/:id', (req, res) =>
  patch(res, 'planner.key_accounts', 'id', req.params.id, KA_FIELDS, req.body, 'int'));
app.post('/api/supply/key-account/:id/delete', async (req, res) => {
  try { await pool.query(`DELETE FROM planner.key_accounts WHERE id=$1::int`, [req.params.id]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
// Copy a key account's stored settings onto a PO's Direct-to-Client details + tag it a key-account order.
app.post('/api/supply/po/:po/apply-key-account', async (req, res) => {
  const name = ((req.body || {}).name || '').trim();
  if (!name) return res.status(400).json({ error: 'key account name required' });
  try {
    const ka = (await pool.query(`SELECT * FROM planner.key_accounts WHERE lower(name)=lower($1) LIMIT 1`, [name])).rows[0];
    if (!ka) return res.status(404).json({ error: 'key account "' + name + '" not found' });
    await pool.query(`UPDATE planner.purchase_orders SET
      client=$1, client_requirements=$2, final_delivery_address=$3,
      pack_polybags=coalesce($4,false), pack_polybags_notes=$5, pack_dnb_barcodes=coalesce($6,false), pack_dnb_barcodes_notes=$7,
      pack_rfid_barcodes=coalesce($8,false), pack_rfid_barcodes_notes=$9, pack_dnb_carton=coalesce($10,false), pack_dnb_carton_notes=$11,
      pack_client_carton=coalesce($12,false), pack_client_carton_notes=$13, pack_pallet_notes=$14, pack_other_notes=$15,
      dtc_key_account=true, dtc_accepted_at=NULL, dtc_accepted_by=NULL, updated_at=now()
      WHERE po=$16`,
      [ka.name, ka.client_requirements, ka.address,
       ka.pack_polybags, ka.pack_polybags_notes, ka.pack_dnb_barcodes, ka.pack_dnb_barcodes_notes,
       ka.pack_rfid_barcodes, ka.pack_rfid_barcodes_notes, ka.pack_dnb_carton, ka.pack_dnb_carton_notes,
       ka.pack_client_carton, ka.pack_client_carton_notes, ka.pack_pallet_notes, ka.pack_other_notes, req.params.po]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Create a key account in config FROM a PO's current Direct-to-Client details (client name + packing +
// requirements + address), and tag the PO as a key-account order. For clients not yet in the config list.
app.post('/api/supply/po/:po/create-key-account', async (req, res) => {
  try {
    const p = (await pool.query(`SELECT coalesce(client,'') client, client_requirements, final_delivery_address,
      pack_polybags, pack_polybags_notes, pack_dnb_barcodes, pack_dnb_barcodes_notes, pack_rfid_barcodes, pack_rfid_barcodes_notes,
      pack_dnb_carton, pack_dnb_carton_notes, pack_client_carton, pack_client_carton_notes, pack_pallet_notes, pack_other_notes
      FROM planner.purchase_orders WHERE po=$1`, [req.params.po])).rows[0];
    if (!p) return res.status(404).json({ error: 'PO not found' });
    const name = (p.client || '').trim();
    if (!name) return res.status(400).json({ error: 'Enter a client name on the PO first.' });
    const exists = (await pool.query(`SELECT 1 FROM planner.key_accounts WHERE lower(name)=lower($1) LIMIT 1`, [name])).rows[0];
    if (exists) return res.status(400).json({ error: 'A key account named "' + name + '" already exists.' });
    const r = await pool.query(`INSERT INTO planner.key_accounts
      (name, client_requirements, address, pack_polybags, pack_polybags_notes, pack_dnb_barcodes, pack_dnb_barcodes_notes,
       pack_rfid_barcodes, pack_rfid_barcodes_notes, pack_dnb_carton, pack_dnb_carton_notes, pack_client_carton, pack_client_carton_notes,
       pack_pallet_notes, pack_other_notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
      [name, p.client_requirements, p.final_delivery_address, p.pack_polybags, p.pack_polybags_notes, p.pack_dnb_barcodes, p.pack_dnb_barcodes_notes,
       p.pack_rfid_barcodes, p.pack_rfid_barcodes_notes, p.pack_dnb_carton, p.pack_dnb_carton_notes, p.pack_client_carton, p.pack_client_carton_notes,
       p.pack_pallet_notes, p.pack_other_notes]);
    await pool.query(`UPDATE planner.purchase_orders SET dtc_key_account=true, updated_at=now() WHERE po=$1`, [req.params.po]);
    res.json({ ok: true, id: r.rows[0].id, name });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Batches — editable buying-batch table (CONFIG). Edit by batch name; create a new batch.
app.post('/api/supply/batch/:batch', (req, res) =>
  patch(res, 'planner.batches', 'batch', req.params.batch,
    { batch_date: 'date', first_release_window: 'text', notes: 'text' }, req.body, 'text'));
app.post('/api/supply/batch-create', async (req, res) => {
  const b = req.body || {}, batch = (b.batch || '').trim();
  if (!batch) return res.status(400).json({ error: 'batch name required' });
  try {
    const dup = await pool.query(`SELECT 1 FROM planner.batches WHERE batch=$1`, [batch]);
    if (dup.rowCount) return res.status(409).json({ error: 'batch ' + batch + ' already exists' });
    await pool.query(`INSERT INTO planner.batches (batch, batch_date) VALUES ($1,$2)`, [batch, b.batch_date || null]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Create a production number (registers it in prod_numbers so it's pickable; a PO joins a production by
// setting its prod_no). A production row appears in PRODUCTIONS once a PO carries the prod_no.
app.post('/api/supply/production-create', async (req, res) => {
  const prod = (req.body && req.body.prod_no || '').trim();
  if (!prod) return res.status(400).json({ error: 'production number required' });
  try {
    const dup = await pool.query(`SELECT 1 FROM planner.prod_numbers WHERE prod_no=$1`, [prod]);
    if (dup.rowCount) return res.status(409).json({ error: 'production ' + prod + ' already exists' });
    await pool.query(`INSERT INTO planner.prod_numbers (prod_no, status) VALUES ($1,'active')`, [prod]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Edit a production row (CONFIG ▸ Productions). Edit/Save sends all fields at once.
app.post('/api/supply/prod-number/:id', (req, res) =>
  patch(res, 'planner.prod_numbers', 'id', req.params.id,
    { prod_no: 'text', status: 'text', xero_account_code: 'text', xero_account_name: 'text', xero_account_id: 'text',
      require_supplier_confirmation: 'boolean' },
    req.body, 'bigint'));

// ── Supplier portal admin (CONFIG ▸ Portal Users). The approved email↔supplier list + magic-link issue.
app.post('/api/supply/portal-user-create', async (req, res) => {
  const b = req.body || {}; const email = String(b.email || '').trim().toLowerCase();
  if (!email || !/.+@.+\..+/.test(email)) return res.status(400).json({ error: 'valid email required' });
  try {
    // resolve supplier_id from the supplier name when given (mirrors the rest of the app: map by name)
    let sid = b.supplier_id || null, sname = b.supplier_name || null;
    if (!sid && sname) { const r = await pool.query(`SELECT id FROM planner.suppliers WHERE name=$1`, [sname]); sid = r.rows[0] ? r.rows[0].id : null; }
    const r = await pool.query(`INSERT INTO planner.supplier_portal_users (email, supplier_id, supplier_name, contact_name)
      VALUES ($1,$2,$3,$4) RETURNING id`, [email, sid, sname, b.contact_name || null]);
    res.json({ id: r.rows[0].id });
  } catch (e) { res.status(500).json({ error: /unique/i.test(e.message) ? 'that email is already on the list' : e.message }); }
});
app.post('/api/supply/portal-user/:id', async (req, res) => {
  const b = req.body || {};
  if (b._delete) { try { await pool.query(`DELETE FROM planner.supplier_portal_users WHERE id=$1`, [req.params.id]); return res.json({ deleted: true }); } catch (e) { return res.status(500).json({ error: e.message }); } }
  // if supplier_name changes, re-resolve supplier_id
  if (b.supplier_name !== undefined && b.supplier_id === undefined) {
    const r = await pool.query(`SELECT id FROM planner.suppliers WHERE name=$1`, [b.supplier_name]);
    b.supplier_id = r.rows[0] ? String(r.rows[0].id) : '';
  }
  if (b.email) b.email = String(b.email).trim().toLowerCase();
  return patch(res, 'planner.supplier_portal_users', 'id', req.params.id,
    { email: 'text', supplier_id: 'bigint', supplier_name: 'text', contact_name: 'text', active: 'boolean' }, b, 'bigint');
});
// Issue a magic link (dev stub: returns the URL instead of emailing it — Diviyaj wires real email for prod).
app.post('/api/supply/portal-magic/:id', async (req, res) => {
  try {
    const u = (await pool.query(`SELECT email, active FROM planner.supplier_portal_users WHERE id=$1`, [req.params.id])).rows[0];
    if (!u) return res.status(404).json({ error: 'no such portal user' });
    if (!u.active) return res.status(400).json({ error: 'user is inactive — activate before issuing a link' });
    const token = crypto.randomBytes(24).toString('hex');
    await pool.query(`INSERT INTO planner.portal_magic_tokens (token, email, expires_at) VALUES ($1,$2, now() + interval '7 days')`, [token, u.email]);
    const base = (req.headers['x-forwarded-proto'] ? req.headers['x-forwarded-proto'] + '://' : 'http://') + (req.headers['x-forwarded-host'] || req.headers.host);
    res.json({ email: u.email, url: base + '/portal?token=' + token, expires_days: 7 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const qp = (sql, vals) => pool.query(sql, vals).then(r => r.rows);   // rows helper for the standalone portal routes
// ── Supplier portal write-backs. supplier_id is trusted here (internal preview = acting-as); the real
// /portal will derive it from the session and call the same logic. Mixed apply-flow:
//   completion_date / invoice_value → STAGED (supplier_submissions, pending) for internal one-click apply
//   tracking / carrier              → applied DIRECTLY to the PO's shipment (+ logged as applied)
//   notes                           → posted immediately (supplier_notes)
// supplier submits an actual cost price AND/OR an amended quantity for one PO line (upsert; blank clears each).
// is_added marks a SKU the supplier added to the order (one not on the original order plan).
app.post('/api/supply/portal-line-cost', async (req, res) => {
  const b = req.body || {};
  if (!b.po || !b.sku) return res.status(400).json({ error: 'po and sku required' });
  try {
    const num = v => (v === '' || v == null) ? null : Number(v);
    const cost = num(b.actual_cost), qty = num(b.amended_qty), added = !!b.is_added;
    await pool.query(`INSERT INTO planner.portal_line_costs (po, sku, actual_cost, amended_qty, is_added, submitted_by, submitted_at)
      VALUES ($1,$2,$3,$4,$5,$6, now())
      ON CONFLICT (po, sku) DO UPDATE SET actual_cost=excluded.actual_cost, amended_qty=excluded.amended_qty,
        is_added=planner.portal_line_costs.is_added OR excluded.is_added, submitted_by=excluded.submitted_by, submitted_at=now()`,
      [b.po, b.sku, cost, qty, added, b.submitted_by || null]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// supplier removes a SKU they had added to the order (only removes supplier-added rows)
app.post('/api/supply/portal-line-remove', async (req, res) => {
  const b = req.body || {};
  if (!b.po || !b.sku) return res.status(400).json({ error: 'po and sku required' });
  try { await pool.query(`DELETE FROM planner.portal_line_costs WHERE po=$1 AND sku=$2 AND is_added=true`, [b.po, b.sku]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
// SKUs assignable by a supplier (from products.supplier_multiple_all) — for the portal "add SKU" picker
app.get('/api/supply/supplier-skus/:supplier', async (req, res) => {
  try { res.json(await qp(`SELECT sku, coalesce(product_name,'') product_name
    FROM planner.products WHERE coalesce(supplier_multiple_all,'') ILIKE '%'||$1||'%' AND coalesce(sku,'')<>'' ORDER BY sku`, [req.params.supplier])); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
// Internal (PO PLAN) sets the FINAL agreed cost price per line (the value that would push to ERP). Upserts onto
// the same portal_line_costs row so supplier-submitted (actual_cost) and D&B-final (final_cost) sit side by side.
app.post('/api/supply/po-line-final', async (req, res) => {
  const b = req.body || {};
  if (!b.po || !b.sku) return res.status(400).json({ error: 'po and sku required' });
  try {
    const cost = (b.final_cost === '' || b.final_cost == null) ? null : Number(b.final_cost);
    await pool.query(`INSERT INTO planner.portal_line_costs (po, sku, final_cost, submitted_at)
      VALUES ($1,$2,$3, now()) ON CONFLICT (po, sku) DO UPDATE SET final_cost=excluded.final_cost`,
      [b.po, b.sku, cost]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// PO PLAN order plan: D&B accepts a supplier-submitted change (cost / amended qty / added SKU). Confirms the line
// and, if no final price set yet, adopts the supplier's cost as the final. `all:true` accepts every unconfirmed line on the PO.
app.post('/api/supply/po-line-accept', async (req, res) => {
  const b = req.body || {};
  if (!b.po) return res.status(400).json({ error: 'po required' });
  if (!b.all && !b.sku) return res.status(400).json({ error: 'sku or all required' });
  // which portal_line_costs rows are we accepting? a single sku, or all unconfirmed on the PO.
  const scope = b.all
    ? `plc.po=$1 AND (plc.actual_cost IS NOT NULL OR plc.amended_qty IS NOT NULL OR plc.is_added=true) AND (plc.confirmed_at IS NULL OR plc.confirmed_at < plc.submitted_at)`
    : `plc.po=$1 AND plc.sku=$2`;
  const params = b.all ? [b.po] : [b.po, b.sku];
  try {
    // 1) write accepted qty + cost onto EXISTING order-plan lines (qty<>erp_qty / cost<>erp_cost → flags ERP push)
    await pool.query(`UPDATE planner.purchase_order_lines pol SET
        qty = coalesce(round(plc.amended_qty)::int, pol.qty),
        cost_price = coalesce(plc.final_cost, plc.actual_cost, pol.cost_price),
        proposed_at = now(), proposed_by = 'order-plan accept'
      FROM planner.portal_line_costs plc
      WHERE pol.po=plc.po AND pol.sku=plc.sku AND ${scope}`, params);
    // 2) insert supplier-ADDED SKUs that aren't yet order-plan lines (erp_qty=0 → new to ERP)
    await pool.query(`INSERT INTO planner.purchase_order_lines (po_sku, po, sku, qty, erp_qty, cost_price, proposed_at, proposed_by)
      SELECT plc.po||'|'||plc.sku, plc.po, plc.sku, coalesce(round(plc.amended_qty)::int,0), 0,
             coalesce(plc.final_cost, plc.actual_cost), now(), 'order-plan accept'
      FROM planner.portal_line_costs plc
      WHERE ${scope} AND plc.is_added=true
        AND NOT EXISTS (SELECT 1 FROM planner.purchase_order_lines x WHERE x.po=plc.po AND x.sku=plc.sku)`, params);
    // 3) mark the portal lines confirmed; adopt supplier cost as final if none set
    await pool.query(`UPDATE planner.portal_line_costs plc SET confirmed_at=now(), final_cost=coalesce(plc.final_cost, plc.actual_cost) WHERE ${scope}`, params);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// PO PLAN Timeline: mark a supplier note read / unread (toggle).
app.post('/api/supply/note-read/:id', async (req, res) => {
  try {
    const read = !(req.body && req.body.read === false);
    await pool.query(`UPDATE planner.supplier_notes SET read_at=${read ? 'now()' : 'NULL'} WHERE id=$1`, [req.params.id]);
    res.json({ ok: true, read });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// The signed-in user's email, forwarded by the auth layer in front of the app (Diviyaj's Gmail login).
// Checks the common auth-proxy headers; strips the IAP "accounts.google.com:" prefix. null if none present.
function authUser(req) {
  const h = req.headers || {};
  let e = h['x-forwarded-email'] || h['x-auth-request-email'] || h['cf-access-authenticated-user-email']
        || h['x-goog-authenticated-user-email'] || h['x-authenticated-user-email'] || h['x-user-email'] || '';
  e = String(e).trim(); if (!e) return null;
  if (e.indexOf(':') >= 0) e = e.slice(e.lastIndexOf(':') + 1);   // e.g. accounts.google.com:foo@bar.com → foo@bar.com
  return e || null;
}
// Author to stamp on an INTERNAL (Dock & Bay side) note: the signed-in user if the auth layer forwards it,
// else a real name the client passed (ignore the generic "Dock & Bay" placeholder), else null.
function internalAuthor(req, clientVal) { const u = authUser(req); if (u) return u; return (clientVal && clientVal !== 'Dock & Bay') ? clientVal : null; }
app.post('/api/supply/portal-note', async (req, res) => {
  const b = req.body || {};
  if (!b.po || !String(b.body || '').trim()) return res.status(400).json({ error: 'po and body required' });
  try {
    // stamp the PO's supplier so the note shows in that supplier's portal thread (internal/PO-PLAN posts don't pass one)
    let sid = b.supplier_id || null;
    if (!sid) { const r = await pool.query(`SELECT s.id FROM planner.purchase_orders po JOIN planner.suppliers s ON s.name=po.supplier_name WHERE po.po=$1`, [b.po]); sid = (r.rows[0] && r.rows[0].id) || null; }
    const kind = b.author_kind || 'supplier';
    const email = kind === 'internal' ? internalAuthor(req, b.author_email) : (b.author_email || null);
    await pool.query(`INSERT INTO planner.supplier_notes (po, supplier_id, author_email, author_kind, body) VALUES ($1,$2,$3,$4,$5)`,
      [b.po, sid, email, kind, String(b.body).trim()]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/supply/portal-upload', async (req, res) => {
  const b = req.body || {};
  if (!b.po || !b.data_base64) return res.status(400).json({ error: 'po and data_base64 required' });
  try {
    const buf = Buffer.from(String(b.data_base64).replace(/^data:[^;]+;base64,/, ''), 'base64');
    const r = await pool.query(`INSERT INTO planner.portal_attachments (po, supplier_id, filename, mime, byte_size, data, uploaded_by, category)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`, [b.po, b.supplier_id || null, b.filename || 'invoice', b.mime || 'application/octet-stream', buf.length, buf, b.uploaded_by || null, b.category || 'invoice']);
    res.json({ id: r.rows[0].id, byte_size: buf.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Remove a supplier-uploaded document. (Won't remove Client/FBA docs — those are managed admin-side.)
app.post('/api/supply/portal-attachment-remove', async (req, res) => {
  const id = req.body && req.body.id;
  if (!id) return res.status(400).json({ error: 'id required' });
  try { const r = await pool.query(`DELETE FROM planner.portal_attachments WHERE id=$1 AND coalesce(category,'')<>'client'`, [id]); res.json({ ok: true, deleted: r.rowCount }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
// Admin PO ▸ DOCUMENTS tab: delete ANY document for a PO (incl. client/FBA docs — admin-managed here).
app.post('/api/supply/po-doc-delete', async (req, res) => {
  const id = req.body && req.body.id;
  if (!id) return res.status(400).json({ error: 'id required' });
  try { const r = await pool.query(`DELETE FROM planner.portal_attachments WHERE id=$1`, [id]); res.json({ ok: true, deleted: r.rowCount }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
// Admin PO ▸ DOCUMENTS tab: upload a document against a PO (held in the DB, like all other uploads).
app.post('/api/supply/po-doc-upload', async (req, res) => {
  const b = req.body || {};
  if (!b.po || !b.data_base64) return res.status(400).json({ error: 'po and data_base64 required' });
  try {
    const buf = Buffer.from(String(b.data_base64).replace(/^data:[^;]+;base64,/, ''), 'base64');
    const r = await pool.query(`INSERT INTO planner.portal_attachments (po, filename, mime, byte_size, data, uploaded_by, category)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`, [b.po, b.filename || 'document', b.mime || 'application/octet-stream', buf.length, buf, b.uploaded_by || 'admin', b.category || 'document']);
    res.json({ id: r.rows[0].id, byte_size: buf.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/supply/portal-submit', async (req, res) => {
  const b = req.body || {}; const sid = b.supplier_id || null, by = b.submitted_by || 'portal';
  if (!b.po) return res.status(400).json({ error: 'po required' });
  // validate up front (before opening a transaction) — a bad status must fail loudly, not be silently dropped
  if (b.production_status != null) {
    const st = String(b.production_status).trim();
    if (st !== '' && !PROD_STATUSES.includes(st)) return res.status(400).json({ error: 'bad production_status' });
  }
  const out = { staged: [], applied: [] };
  // one transaction for the whole submit so a mid-way failure can't leave a half-created shipment / orphan PO
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const stage = async (kind, value, attId) => {
      if (value == null || value === '') return;
      // supersede any earlier still-pending submission of the same kind for this PO so only the latest is actionable
      await client.query(`UPDATE planner.supplier_submissions SET status='superseded'
        WHERE po=$1 AND kind=$2 AND status='pending'`, [b.po, kind]);
      await client.query(`INSERT INTO planner.supplier_submissions (supplier_id, po, kind, value, attachment_id, status, submitted_by)
        VALUES ($1,$2,$3,$4,$5,'pending',$6)`, [sid, b.po, kind, String(value), attId || null, by]);
      out.staged.push(kind);
    };
    await stage('completion_date', b.completion_date);
    await stage('invoice_value', b.invoice_value, b.invoice_attachment_id);
    // tracking / carrier → applies to the PO's SHIPMENT (not the PO). If the PO has no shipment yet, the
    // supplier's submission CREATES a master shipment named after the PO and assigns this PO to it, so the
    // carrier/tracking flows straight onto that new shipment (and it shows up in the portal Shipment Plan).
    if (b.tracking != null && b.tracking !== '' || b.carrier != null && b.carrier !== '') {
      const sh = (await client.query(`SELECT shipment_ref FROM planner.purchase_orders WHERE po=$1`, [b.po])).rows[0];
      let ref = b.shipment_ref || (sh && sh.shipment_ref);
      if (!ref) {
        ref = b.po;   // master shipment ref = the PO number
        await client.query(`INSERT INTO planner.shipments (shipment_ref, master_po, supplier_created_at, supplier_created_by)
          VALUES ($1,$1,now(),$2) ON CONFLICT (shipment_ref) DO UPDATE SET supplier_created_at=now(), supplier_created_by=$2`, [ref, by]);
        await client.query(`UPDATE planner.purchase_orders SET shipment_ref=$1 WHERE po=$1`, [b.po]);
        out.applied.push('shipment created + assigned → ' + ref);
      }
      const sets = [], vals = []; let i = 1;
      if (b.tracking != null && b.tracking !== '') { sets.push(`carrier_ref=$${i++}`); vals.push(b.tracking); }
      if (b.carrier != null && b.carrier !== '') { sets.push(`carrier=$${i++}`); vals.push(b.carrier); }
      if (sets.length) { vals.push(ref);
        await client.query(`UPDATE planner.shipments SET ${sets.join(',')}, updated_at=now() WHERE shipment_ref=$${i}`, vals); }
      await client.query(`INSERT INTO planner.supplier_submissions (supplier_id, po, shipment_ref, kind, value, status, submitted_by, applied_by, applied_at)
        VALUES ($1,$2,$3,'tracking',$4,'applied',$5,$5,now())`, [sid, b.po, ref, JSON.stringify({ tracking: b.tracking || null, carrier: b.carrier || null }), by]);
      out.applied.push('tracking/carrier → ' + ref);
    }
    // supplier production status (validated above) — '' clears it
    if (b.production_status != null) {
      const st = String(b.production_status).trim();
      await client.query(`UPDATE planner.purchase_orders SET production_status=$2,
        production_confirmed_at=CASE WHEN $2='' THEN NULL ELSE now() END WHERE po=$1`, [b.po, st]);
      out.applied.push('production status → ' + (st || 'cleared'));
    }
    // PO confirmation (#supplier confirms SKUs / qty / dates). po_confirmed:true → confirm; false → clear (re-request).
    if (b.po_confirmed != null) {
      if (b.po_confirmed) { await client.query(`UPDATE planner.purchase_orders SET supplier_confirmed_at=now(), supplier_confirmed_by=$2 WHERE po=$1`, [b.po, by]); out.applied.push('PO confirmed'); }
      else { await client.query(`UPDATE planner.purchase_orders SET supplier_confirmed_at=NULL, supplier_confirmed_by=NULL WHERE po=$1`, [b.po]); out.applied.push('PO confirmation cleared'); }
    }
    await client.query('COMMIT');
    res.json(out);
  } catch (e) { await client.query('ROLLBACK').catch(()=>{}); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});
// ── Supplier invoice/packing .xlsx parsing (pure Node — no external dependency) ──────────────────────────
// Unzip an .xlsx via the ZIP central directory (handles stored + deflate; robust to data descriptors).
function unzipXlsx(buf) {
  const files = {};
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) { if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; } }
  if (eocd < 0) throw new Error('not a valid .xlsx (no zip directory)');
  const cdOff = buf.readUInt32LE(eocd + 16), cdCount = buf.readUInt16LE(eocd + 10);
  let p = cdOff;
  for (let n = 0; n < cdCount && p + 46 <= buf.length; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10), compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32);
    const lho = buf.readUInt32LE(p + 42), name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const lNameLen = buf.readUInt16LE(lho + 26), lExtraLen = buf.readUInt16LE(lho + 28);
    const dataStart = lho + 30 + lNameLen + lExtraLen, raw = buf.subarray(dataStart, dataStart + compSize);
    try { files[name] = method === 0 ? raw : zlib.inflateRawSync(raw); } catch (e) { /* skip unreadable entry */ }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}
// Parse a supplier invoice workbook → { po, lines:[{sku, qty, price}] }. Scans every worksheet for a header row
// with SKU + a Q'TY (PCS) column + a Unit Price column, then reads the line items below it.
function parseInvoiceXlsx(buf) {
  const f = unzipXlsx(buf);
  const dec = s => String(s).replace(/&amp;/g, '&').replace(/&#10;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  const ss = [];
  const ssXml = f['xl/sharedStrings.xml'] ? f['xl/sharedStrings.xml'].toString('utf8') : '';
  for (const m of ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g)) { ss.push(dec([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]).join('')).trim()); }
  const colNum = ref => { const c = ref.match(/^[A-Z]+/)[0]; let n = 0; for (const ch of c) n = n * 26 + (ch.charCodeAt(0) - 64); return n; };
  const sheetRows = xml => { const rows = {};
    for (const rm of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) { const rn = +rm[1], cells = {};
      for (const cm of rm[2].matchAll(/<c r="([A-Z]+\d+)"(?:[^>]*t="([^"]*)")?[^>]*>(?:<v>([\s\S]*?)<\/v>|<is><t[^>]*>([\s\S]*?)<\/t><\/is>)?<\/c>/g)) {
        const t = cm[2], v = cm[3], inl = cm[4]; let val = ''; if (inl != null) val = dec(inl); else if (v != null) val = t === 's' ? (ss[+v] || '') : v;
        cells[colNum(cm[1])] = String(val).trim(); }
      rows[rn] = cells; }
    return rows; };
  const sheetNames = Object.keys(f).filter(k => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort();
  for (const sn of sheetNames) {
    const rows = sheetRows(f[sn].toString('utf8'));
    const rns = Object.keys(rows).map(Number).sort((a, b) => a - b);
    let hr, sc, qc, pc;
    for (const rn of rns) { const e = Object.entries(rows[rn]);
      const sk = e.find(([k, v]) => /^sku$/i.test(v)); if (!sk) continue;
      const qt = e.find(([k, v]) => /q'?ty/i.test(v) && /pcs/i.test(v));
      const pr = e.find(([k, v]) => /unit\s*price/i.test(v));
      if (sk && qt && pr) { hr = rn; sc = +sk[0]; qc = +qt[0]; pc = +pr[0]; break; } }
    if (!hr) continue;   // not the invoice sheet
    let po = ''; for (const rn of rns) { const c = rows[rn]; for (const k in c) { if (/invoice\s*no/i.test(c[k])) po = (c[+k + 1] || '').trim(); } if (po) break; }
    const lines = [];
    for (const rn of rns) { if (rn <= hr) continue; const c = rows[rn];
      const sku = (c[sc] || '').trim(), qty = Number(c[qc]), price = Number(c[pc]);
      if (sku && /^[A-Za-z0-9][\w\-\.]*$/.test(sku) && qty > 0) lines.push({ sku, qty, price: isFinite(price) && price > 0 ? price : null }); }
    return { po, lines };
  }
  return { po: '', lines: [] };
}
// Parse an uploaded supplier invoice and PREVIEW it against the PO's current order plan (no DB write).
app.post('/api/supply/portal-parse-invoice', async (req, res) => {
  const b = req.body || {};
  if (!b.data_base64) return res.status(400).json({ error: 'data_base64 required' });
  try {
    const buf = Buffer.from(String(b.data_base64).replace(/^data:[^,]*,/, ''), 'base64');
    const parsed = parseInvoiceXlsx(buf);
    if (!parsed.lines.length) return res.json({ ok: false, error: 'No invoice line items found — need a sheet with SKU / Q’TY (PCS) / Unit Price columns.' });
    const po = b.po || parsed.po;
    const plan = po ? (await pool.query(`SELECT sku, qty, cost_price FROM planner.purchase_order_lines WHERE po=$1`, [po])).rows : [];
    const planBy = {}; plan.forEach(l => { planBy[String(l.sku).toUpperCase()] = l; });
    const lines = parsed.lines.map(l => { const cur = planBy[l.sku.toUpperCase()];
      const cq = cur ? Number(cur.qty) : null, cc = cur ? Number(cur.cost_price) : null;
      const status = !cur ? 'new' : ((cq !== l.qty || (l.price != null && cc !== l.price)) ? 'changed' : 'match');
      return { sku: l.sku, inv_qty: l.qty, inv_price: l.price, cur_qty: cq, cur_cost: cc, status }; });
    // plan SKUs NOT on the invoice → propose qty 0 (they weren't shipped/invoiced)
    const invSkus = new Set(parsed.lines.map(l => l.sku.toUpperCase()));
    const removed = plan.filter(l => !invSkus.has(String(l.sku).toUpperCase()) && Number(l.qty) > 0)
      .map(l => ({ sku: l.sku, inv_qty: 0, inv_price: null, cur_qty: Number(l.qty), cur_cost: (l.cost_price != null ? Number(l.cost_price) : null), status: 'removed' }));
    const allLines = lines.concat(removed);
    res.json({ ok: true, po_detected: parsed.po,
      totals: { count: lines.length, qty: lines.reduce((s, r) => s + r.inv_qty, 0), value: Math.round(lines.reduce((s, r) => s + r.inv_qty * (r.inv_price || 0), 0) * 100) / 100,
        matched: lines.filter(r => r.status !== 'new').length, changed: lines.filter(r => r.status === 'changed').length, neu: lines.filter(r => r.status === 'new').length, removed: removed.length },
      lines: allLines });
  } catch (e) { res.status(400).json({ error: 'Could not parse the file: ' + e.message }); }
});
// Apply a parsed supplier invoice to the PO's order plan as portal overrides (amended_qty / actual_cost). Re-parses
// the file server-side (single source of truth), writes only CHANGED + NEW lines (new SKUs flagged is_added), in a
// transaction. The supplier then reviews/confirms in the portal; the planner approves the order-plan change (existing flow).
app.post('/api/supply/portal-invoice-apply', async (req, res) => {
  const b = req.body || {}; const by = b.submitted_by || 'portal';
  if (!b.data_base64) return res.status(400).json({ error: 'data_base64 required' });
  let parsed;
  try { parsed = parseInvoiceXlsx(Buffer.from(String(b.data_base64).replace(/^data:[^,]*,/, ''), 'base64')); }
  catch (e) { return res.status(400).json({ error: 'Could not parse the file: ' + e.message }); }
  const po = b.po || parsed.po;
  if (!po) return res.status(400).json({ error: 'no PO (none supplied and none detected in the file)' });
  if (!parsed.lines.length) return res.status(400).json({ error: 'No invoice line items found in the file.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const plan = (await client.query(`SELECT sku, qty, cost_price FROM planner.purchase_order_lines WHERE po=$1`, [po])).rows;
    const planBy = {}; plan.forEach(l => { planBy[String(l.sku).toUpperCase()] = l; });
    let applied = 0, added = 0, unchanged = 0;
    for (const l of parsed.lines) {
      const cur = planBy[l.sku.toUpperCase()];
      const cq = cur ? Number(cur.qty) : null, cc = cur ? Number(cur.cost_price) : null;
      const isNew = !cur, changed = isNew || cq !== l.qty || (l.price != null && cc !== l.price);
      if (!changed) { unchanged++; continue; }
      await client.query(`INSERT INTO planner.portal_line_costs (po, sku, actual_cost, amended_qty, is_added, submitted_by, submitted_at)
        VALUES ($1,$2,$3,$4,$5,$6, now())
        ON CONFLICT (po, sku) DO UPDATE SET actual_cost=excluded.actual_cost, amended_qty=excluded.amended_qty,
          is_added=planner.portal_line_costs.is_added OR excluded.is_added, submitted_by=excluded.submitted_by, submitted_at=now()`,
        [po, l.sku, l.price, l.qty, isNew, by]);
      applied++; if (isNew) added++;
    }
    // plan SKUs NOT on the invoice → propose amended_qty 0 (weren't shipped/invoiced). Cost left untouched on conflict.
    const invSkus = new Set(parsed.lines.map(l => l.sku.toUpperCase()));
    let zeroed = 0;
    for (const l of plan) {
      if (invSkus.has(String(l.sku).toUpperCase()) || Number(l.qty) <= 0) continue;
      await client.query(`INSERT INTO planner.portal_line_costs (po, sku, actual_cost, amended_qty, is_added, submitted_by, submitted_at)
        VALUES ($1,$2,$3,0,false,$4, now())
        ON CONFLICT (po, sku) DO UPDATE SET amended_qty=0, submitted_by=excluded.submitted_by, submitted_at=now()`,
        [po, l.sku, (l.cost_price != null ? Number(l.cost_price) : null), by]);
      applied++; zeroed++;
    }
    await client.query('COMMIT');
    res.json({ ok: true, po, applied, added, unchanged, zeroed, total: parsed.lines.length });
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});
// Manufacturing: accept (sign off) a component's shortage/overage between finished-bundle demand and the mfg POs.
app.post('/api/supply/manufacturing-accept', async (req, res) => {
  const b = req.body || {}; if (!b.component_sku) return res.status(400).json({ error: 'component_sku required' });
  const on = b.accepted !== false;
  try {
    if (on) await pool.query(`INSERT INTO planner.manufacturing_accept (component_sku, accepted, accepted_by, accepted_at)
      VALUES ($1, true, $2, now()) ON CONFLICT (component_sku) DO UPDATE SET accepted=true, accepted_by=$2, accepted_at=now()`, [b.component_sku, b.accepted_by || 'PO PLAN']);
    else await pool.query(`DELETE FROM planner.manufacturing_accept WHERE component_sku=$1`, [b.component_sku]);
    res.json({ ok: true, component_sku: b.component_sku, accepted: on });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// CONFIG ▸ Manufacturing BOM — upsert a parent→component row (qty per finished unit). Add or edit.
app.post('/api/supply/manufacturing-bom-save', async (req, res) => {
  const b = req.body || {};
  const parent = String(b.parent_sku || '').trim(), comp = String(b.component_sku || '').trim();
  const qty = Number(b.qty);
  if (!parent || !comp) return res.status(400).json({ error: 'parent_sku and component_sku required' });
  if (!isFinite(qty) || qty <= 0) return res.status(400).json({ error: 'qty must be a positive number' });
  try {
    await pool.query(`INSERT INTO planner.manufacturing_bom (parent_sku, component_sku, qty, updated_at)
      VALUES ($1,$2,$3, now()) ON CONFLICT (parent_sku, component_sku) DO UPDATE SET qty=$3, updated_at=now()`, [parent, comp, qty]);
    res.json({ ok: true, parent_sku: parent, component_sku: comp, qty });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// CONFIG ▸ Manufacturing BOM — delete a parent→component row, or the WHOLE bundle when no component given.
app.post('/api/supply/manufacturing-bom-delete', async (req, res) => {
  const b = req.body || {};
  const parent = String(b.parent_sku || '').trim(), comp = String(b.component_sku || '').trim();
  if (!parent) return res.status(400).json({ error: 'parent_sku required' });
  try {
    if (comp) {   // single component row
      await pool.query(`DELETE FROM planner.manufacturing_bom WHERE parent_sku=$1 AND component_sku=$2`, [parent, comp]);
      res.json({ ok: true, parent_sku: parent, component_sku: comp });
    } else {      // entire bundle — every component of this parent
      const r = await pool.query(`DELETE FROM planner.manufacturing_bom WHERE parent_sku=$1`, [parent]);
      res.json({ ok: true, parent_sku: parent, deleted: r.rowCount });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Toggle a shipment's ESCALATED status (supplier portal or admin grid). Upserts the shipment row if needed.
app.post('/api/supply/shipment/:ref/escalate', async (req, res) => {
  const ref = req.params.ref; const on = !!(req.body && req.body.escalated);
  try {
    await pool.query(`INSERT INTO planner.shipments (shipment_ref, escalated, escalated_at)
      VALUES ($1,$2, CASE WHEN $2 THEN now() END)
      ON CONFLICT (shipment_ref) DO UPDATE SET escalated=$2, escalated_at=CASE WHEN $2 THEN now() ELSE NULL END, updated_at=now()`, [ref, on]);
    res.json({ ok: true, escalated: on });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Shipment Plan timeline — post a note against a master shipment (admin or supplier).
app.post('/api/supply/shipment-note', async (req, res) => {
  const b = req.body || {};
  if (!b.shipment_ref || !b.body) return res.status(400).json({ error: 'shipment_ref and body required' });
  try {
    const kind = b.author_kind || 'internal';
    const email = kind === 'internal' ? internalAuthor(req, b.author_email) : (b.author_email || null);
    const r = await pool.query(`INSERT INTO planner.shipment_notes (shipment_ref, author_kind, author_email, body)
      VALUES ($1,$2,$3,$4) RETURNING id`, [b.shipment_ref, kind, email, String(b.body)]);
    res.json({ id: r.rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Shipment Plan timeline: mark a supplier note read / unread (toggle) — admin side, mirrors note-read for POs.
app.post('/api/supply/shipment-note-read/:id', async (req, res) => {
  try {
    const read = !(req.body && req.body.read === false);
    await pool.query(`UPDATE planner.shipment_notes SET read_at=${read ? 'now()' : 'NULL'} WHERE id=$1`, [req.params.id]);
    res.json({ ok: true, read });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Portal data for the preview/portal: notes + submissions for a supplier (scoped by supplier_id).
app.get('/api/supply/portal-notes/:sid', async (req, res) => {
  try { res.json(await qp(`SELECT id, po, author_kind, coalesce(author_email,'') author_email, body,
      to_char(created_at,'YYYY-MM-DD HH24:MI') created_at, read_at IS NOT NULL read
    FROM planner.supplier_notes WHERE supplier_id=$1 ORDER BY created_at`, [req.params.sid])); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/supply/portal-submissions/:sid', async (req, res) => {
  try { res.json(await qp(`SELECT id, po, kind, value, status, attachment_id, to_char(submitted_at,'YYYY-MM-DD') submitted_at, to_char(applied_at,'YYYY-MM-DD') applied_at, note
    FROM planner.supplier_submissions WHERE supplier_id=$1 ORDER BY submitted_at DESC`, [req.params.sid])); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
// Internal one-click apply / dismiss of a staged supplier submission (Phase 4). Apply writes to the live PO
// (the internal click is the confirmation); completion_date → end_production_overide, invoice_value → supplier_invoice_total.
app.post('/api/supply/submission/:id/apply', async (req, res) => {
  try {
    const s = (await pool.query(`SELECT * FROM planner.supplier_submissions WHERE id=$1`, [req.params.id])).rows[0];
    if (!s) return res.status(404).json({ error: 'no such submission' });
    // allow (re)apply on pending OR already-applied (e.g. the final was later edited and needs re-syncing);
    // only a rejected/dismissed submission can't be applied.
    if (s.status === 'dismissed') return res.status(400).json({ error: 'this submission was rejected' });
    let applied;
    if (s.kind === 'completion_date') { await pool.query(`UPDATE planner.purchase_orders SET end_production_overide=$1::date, updated_at=now() WHERE po=$2`, [s.value, s.po]); applied = 'production-end → ' + s.value; }
    else if (s.kind === 'invoice_value') { await pool.query(`UPDATE planner.purchase_orders SET supplier_invoice_total=$1::numeric, updated_at=now() WHERE po=$2`, [s.value, s.po]); applied = 'invoice total → $' + s.value; }
    else return res.status(400).json({ error: 'kind ' + s.kind + ' is not applyable here' });
    await pool.query(`UPDATE planner.supplier_submissions SET status='applied', applied_at=now(), applied_by=$1 WHERE id=$2`, [(req.body && req.body.by) || 'internal', req.params.id]);
    res.json({ applied });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/supply/submission/:id/dismiss', async (req, res) => {
  try { await pool.query(`UPDATE planner.supplier_submissions SET status='dismissed' WHERE id=$1`, [req.params.id]); res.json({ dismissed: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/supply/portal-attachment/:id', async (req, res) => {
  try { const r = (await pool.query(`SELECT filename, mime, data FROM planner.portal_attachments WHERE id=$1`, [req.params.id])).rows[0];
    if (!r) return res.status(404).send('not found');
    res.setHeader('Content-Type', r.mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'inline; filename="' + (r.filename || 'file').replace(/"/g, '') + '"');
    res.send(r.data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Lifecycle for SUPPLY ▸ Actions (dismiss / snooze / done) by stable key. Absent row = open; restore deletes.
app.post('/api/supply/actions/state', async (req, res) => {
  const b = req.body || {}, key = (b.key || '').trim();
  if (!key) return res.status(400).json({ error: 'key required' });
  try {
    if (b.status === 'open' || b.restore) { await pool.query(`DELETE FROM planner.supply_action_state WHERE action_key=$1`, [key]); return res.json({ ok: true }); }
    const days = String(parseInt(b.snooze_days, 10) || 7);
    await pool.query(`INSERT INTO planner.supply_action_state (action_key, status, snooze_until, note)
      VALUES ($1,$2, CASE WHEN $2='snoozed' THEN current_date + ($3||' days')::interval ELSE NULL END, $4)
      ON CONFLICT (action_key) DO UPDATE SET status=excluded.status, snooze_until=excluded.snooze_until, note=excluded.note, updated_at=now()`,
      [key, b.status || 'dismissed', days, b.note || null]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Import-duty pivot (CONFIG ▸ Import duty): set duty % for a category × country. Upserts the duty_rates row.
app.post('/api/supply/duty-upsert', async (req, res) => {
  const b = req.body || {}, cat = (b.category || '').trim(), country = (b.country || '').trim();
  if (!cat || !country) return res.status(400).json({ error: 'category + country required' });
  const dv = (b.duty_pct === '' || b.duty_pct == null) ? null : Number(b.duty_pct);
  try {
    const ex = await pool.query(`SELECT id FROM planner.duty_rates WHERE category=$1 AND country=$2 LIMIT 1`, [cat, country]);
    if (ex.rowCount) await pool.query(`UPDATE planner.duty_rates SET duty_pct=$1 WHERE id=$2`, [dv, ex.rows[0].id]);
    else await pool.query(`INSERT INTO planner.duty_rates (category, country, duty_pct) VALUES ($1,$2,$3)`, [cat, country, dv]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Air-freight tier rate edit (CONFIG ▸ Freight rates ▸ Air): rate per kg by weight band.
app.post('/api/supply/air-rate/:id', (req, res) =>
  patch(res, 'planner.air_freight_rates', 'id', req.params.id,
    { rate_per_kg: 'numeric', min_kg: 'numeric', max_kg: 'numeric' }, req.body, 'bigint'));
// Set the pallet capacity for a sea container size (applies to all its destination rows).
app.post('/api/supply/freight-pallets', async (req, res) => {
  const b = req.body || {}, sz = (b.container_size || '').trim();
  if (!sz) return res.status(400).json({ error: 'container_size required' });
  const p = (b.pallets === '' || b.pallets == null) ? null : parseInt(b.pallets, 10);
  try { await pool.query(`UPDATE planner.freight_rates SET pallets=$1 WHERE container_size=$2`, [p, sz]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
// Freight-rate pivot (CONFIG ▸ Freight rates): set the USD rate for a container size × destination. Upserts.
app.post('/api/supply/freight-upsert', async (req, res) => {
  const b = req.body || {}, dest = (b.destination || '').trim(), sz = (b.container_size || '').trim();
  if (!dest || !sz) return res.status(400).json({ error: 'destination + container_size required' });
  const cost = (b.cost === '' || b.cost == null) ? null : Number(b.cost);
  try {
    const ex = await pool.query(`SELECT id FROM planner.freight_rates WHERE upper(destination)=upper($1) AND container_size=$2 LIMIT 1`, [dest, sz]);
    if (ex.rowCount) await pool.query(`UPDATE planner.freight_rates SET cost=$1 WHERE id=$2`, [cost, ex.rows[0].id]);
    else await pool.query(`INSERT INTO planner.freight_rates (destination, container_size, cost, currency) VALUES ($1,$2,$3,'USD')`, [dest, sz, cost]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Create a deposit ("Deposit") or a sundry payment ("Other", is_deposit=false). Fields then edit
// inline. reference is optional (Other payments often have none) and need not be unique.
app.post('/api/supply/deposit-create', async (req, res) => {
  const b = req.body || {};
  try {
    const r = await pool.query(`INSERT INTO planner.deposits (reference, is_deposit, supplier_name, description, amount)
      VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [(b.reference || '').trim() || null, b.is_deposit !== false, b.supplier_name || null,
       b.description || null, b.amount === '' || b.amount == null ? null : b.amount]);
    res.json({ ok: true, id: r.rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/supply/payment-txn/:id', (req, res) =>
  patch(res, 'planner.payment_transactions', 'id', req.params.id,
    { transaction_amount: 'numeric', payment_date: 'date' }, req.body));
// Payment run header — bank / currency / bank amount / FX for a date-grouped run (upsert).
app.post('/api/supply/run-meta/:date', async (req, res) => {
  const allowed = { bank: 'text', paid_currency: 'text', bank_amount: 'numeric', fx_rate: 'numeric' };
  const cols = ['run_date'], vals = [req.params.date], ph = ['$1::date']; let i = 2;
  for (const k of Object.keys(req.body || {})) {
    if (!allowed[k]) continue;
    cols.push(k); vals.push(req.body[k] === '' ? null : req.body[k]); ph.push(`$${i++}::${allowed[k]}`);
  }
  if (cols.length === 1) return res.status(400).json({ error: 'no fields' });
  const upd = cols.slice(1).map(c => `${c}=excluded.${c}`).join(',');
  try {
    await pool.query(`INSERT INTO planner.payment_run_meta (${cols.join(',')}) VALUES (${ph.join(',')})
      ON CONFLICT (run_date) DO UPDATE SET ${upd}, updated_at=now()`, vals);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Order-plan line qty edit — sets our planned qty and stamps proposed_at/by while it differs from
// the ERP source of truth (erp_qty). Clears the stamp if the edit returns it to the ERP value.
app.post('/api/supply/po-line/:po_sku', async (req, res) => {
  const b = req.body || {};
  if (b.qty === undefined) return res.status(400).json({ error: 'qty required' });
  const key = req.params.po_sku;
  const po = b.po || key.split('|')[0];
  const sku = b.sku || key.slice(key.indexOf('|') + 1);
  try {
    // upsert: editing a blank cell (no existing line) creates a proposed line (erp_qty=0 → pending).
    const r = await pool.query(
      `INSERT INTO planner.purchase_order_lines (po_sku, po, sku, qty, proposed_at, proposed_by)
       VALUES ($1,$2,$3,$4::int, CASE WHEN $4::int<>0 THEN now() END, CASE WHEN $4::int<>0 THEN $5 END)
       ON CONFLICT (po_sku) DO UPDATE SET qty=excluded.qty,
         proposed_at = CASE WHEN excluded.qty IS DISTINCT FROM coalesce((SELECT el.qty FROM planner.erp_purchase_order_lines el WHERE el.po=planner.purchase_order_lines.po AND el.sku=planner.purchase_order_lines.sku),0) THEN now() ELSE NULL END,
         proposed_by = CASE WHEN excluded.qty IS DISTINCT FROM coalesce((SELECT el.qty FROM planner.erp_purchase_order_lines el WHERE el.po=planner.purchase_order_lines.po AND el.sku=planner.purchase_order_lines.sku),0) THEN $5 ELSE NULL END`,
      [key, po, sku, b.qty, b.who || 'review_ui']);
    res.json({ updated: r.rowCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// ── Pallet rebalance: even a production's open POs toward 20 pallets each (one container). Pools all line
// qty across the same supplier+production's open, UNSHIPPED, non-Direct POs and first-fit packs into the
// same POs at ≤20 pallets, moving whole SKUs and splitting a SKU's qty across POs when needed. Returns a
// preview (bins + per-line deltas); apply writes the new line quantities as proposed (not-in-ERP until Upload).
async function rebalancePlan(rootPo) {
  const REBAL_MAX = 20;
  const head = (await pool.query(`SELECT coalesce(supplier_name,'') supplier_name, coalesce(prod_no,'') prod_no, coalesce(branch,'') branch FROM planner.purchase_orders WHERE po=$1`, [rootPo])).rows[0];
  if (!head) throw new Error('PO not found');
  if (!head.prod_no) throw new Error('this PO has no production (PROD#) — rebalance works within a production');
  if (!head.branch) throw new Error('this PO has no branch (destination) — rebalance needs a destination');
  // Same supplier + production + BRANCH (same destination — you can't move stock between markets), open &
  // unshipped, not Direct-to-Client. Branch is the exact destination, so a container's POs all share one.
  const group = (await pool.query(`
    SELECT po.po, upper(coalesce(nullif(po.country_code,''), b.country_code, '')) ctry
    FROM planner.purchase_orders po LEFT JOIN planner.branches b ON b.name=po.branch
    WHERE coalesce(po.supplier_name,'')=$1 AND coalesce(po.prod_no,'')=$2 AND coalesce(po.branch,'')=$3
      AND coalesce(po.status,'') NOT ILIKE '%complete%' AND coalesce(po.status,'') NOT ILIKE 'ship%'
      AND coalesce(po.status,'') NOT ILIKE '%deliver%'
    ORDER BY po.po`, [head.supplier_name, head.prod_no, head.branch])).rows.filter(r => r.ctry !== 'DIRECT');
  if (group.length < 2) throw new Error('need 2+ open, unshipped, non-Direct POs in this production + destination to rebalance');
  const pos = group.map(g => g.po);
  const lines = (await pool.query(`
    SELECT l.po, l.sku, coalesce(l.qty,0) qty, coalesce(sl.pallet_qty,0) pallet_qty
    FROM planner.purchase_order_lines l LEFT JOIN planner.sku_labels sl ON sl.sku=l.sku
    WHERE l.po = ANY($1)`, [pos])).rows;
  const cur = {}; pos.forEach(p => cur[p] = {});
  const palq = {};
  lines.forEach(l => { cur[l.po][l.sku] = (cur[l.po][l.sku] || 0) + Number(l.qty); palq[l.sku] = Number(l.pallet_qty) || 0; });
  // MINIMAL-MOVE smoothing: start from the current layout and move only the EXCESS off any >20 PO into the
  // POs with spare capacity (whole or partial SKUs) — least disruption, not a full repack.
  const next = {}; pos.forEach(p => { next[p] = {}; for (const s in cur[p]) next[p][s] = cur[p][s]; });
  const EPS = 1e-6;
  const pal = (po) => { let t = 0; for (const s in next[po]) if (palq[s] > 0) t += next[po][s] / palq[s]; return t; };
  let guard = 0;
  pos.filter(p => pal(p) > REBAL_MAX + EPS).forEach(d => {
    while (pal(d) > REBAL_MAX + EPS && guard++ < 20000) {
      let r = null, best = EPS; pos.forEach(p => { if (p !== d) { const f = REBAL_MAX - pal(p); if (f > best) { best = f; r = p; } } });
      if (!r) break;                                   // no spare capacity anywhere → leave the overflow (flagged)
      const moveP = Math.min(pal(d) - REBAL_MAX, REBAL_MAX - pal(r));
      if (moveP <= EPS) break;
      let s = null, bq = 0; for (const k in next[d]) { if (next[d][k] > 0 && palq[k] > 0 && next[d][k] > bq) { bq = next[d][k]; s = k; } }
      if (!s) break;                                   // nothing measurable to move
      let mv = Math.min(Math.round(moveP * palq[s]), next[d][s]);
      if (mv <= 0) mv = Math.min(1, next[d][s]);        // rounding floor → nudge 1 unit to make progress
      next[d][s] -= mv; next[r][s] = (next[r][s] || 0) + mv;
    }
  });
  const palOf = (m) => { let t = 0; for (const s in m) if (palq[s] > 0) t += m[s] / palq[s]; return Math.round(t * 10) / 10; };
  const bins = pos.map(p => ({ po: p, was_pallets: palOf(cur[p]), pallets: palOf(next[p]),
    lines: Array.from(new Set([...Object.keys(cur[p]), ...Object.keys(next[p])])).map(s => ({ sku: s, old: cur[p][s] || 0, new: next[p][s] || 0 })).filter(x => x.old || x.new) }));
  const moves = []; bins.forEach(bn => bn.lines.forEach(l => { if (l.old !== l.new) moves.push({ po: bn.po, sku: l.sku, old: l.old, new: l.new }); }));
  return { supplier: head.supplier_name, prod_no: head.prod_no, target: REBAL_MAX, bins, moves, overflow: bins.some(bn => bn.pallets > REBAL_MAX + 1e-9) };
}
app.get('/api/supply/rebalance/:po', async (req, res) => {
  try { res.json(await rebalancePlan(req.params.po)); } catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/supply/rebalance-apply/:po', async (req, res) => {
  try {
    const plan = await rebalancePlan(req.params.po);
    for (const m of plan.moves) {
      await pool.query(
        `INSERT INTO planner.purchase_order_lines (po_sku, po, sku, qty, erp_qty, proposed_at, proposed_by)
         VALUES ($1,$2,$3,$4::int, 0, CASE WHEN $4::int<>0 THEN now() END, CASE WHEN $4::int<>0 THEN 'rebalance' END)
         ON CONFLICT (po_sku) DO UPDATE SET qty=excluded.qty,
           proposed_at = CASE WHEN excluded.qty IS DISTINCT FROM planner.purchase_order_lines.erp_qty THEN now() ELSE NULL END,
           proposed_by = CASE WHEN excluded.qty IS DISTINCT FROM planner.purchase_order_lines.erp_qty THEN 'rebalance' ELSE NULL END`,
        [m.po + '|' + m.sku, m.po, m.sku, m.new]);
    }
    res.json({ applied: plan.moves.length, bins: plan.bins.map(b => ({ po: b.po, pallets: b.pallets })) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Per-SKU supplier resolution for BUY→PO: main supplier (default) + all options (multi-supplier) + pallet_qty.
// Supplier name→code via suppliers.name (exact, case-insensitive) then first-word fallback (handles "MQ Print
// (Sherry)" → MQ etc.). main_supplier_final is the default; supplier_multiple_all lists every option.
async function buyplanSkuMeta(skus) {
  const sups = (await pool.query(`SELECT code, name FROM planner.suppliers WHERE code IS NOT NULL`)).rows;
  const byName = {}, byFirst = {};
  sups.forEach(s => { const n = String(s.name || '').trim().toLowerCase(); if (!n) return; byName[n] = s.code;
    const f = n.split(/\s+/)[0]; if (!(f in byFirst)) byFirst[f] = s.code; });
  const codeOf = (name) => { if (!name) return null; const n = String(name).trim().toLowerCase(); return byName[n] || byFirst[n.split(/\s+/)[0]] || null; };
  const rows = (await pool.query(`SELECT upper(p.sku) sku, coalesce(p.main_supplier_final, p.supplier) main_name,
      p.supplier_multiple_all multi, coalesce(p.category,'') category, sl.pallet_qty,
      nullif(p.discontinue_date_final,'') disc, nullif(p.discontinue_date_au_final,'') disc_au, nullif(p.discontinue_date_ca,'') disc_ca
    FROM planner.products p LEFT JOIN planner.sku_labels sl ON upper(sl.sku)=upper(p.sku)
    WHERE upper(p.sku) = ANY($1)`, [skus])).rows;
  const map = {};
  rows.forEach(r => {
    const names = (r.multi ? String(r.multi).split(',') : []).map(x => x.trim()).filter(Boolean);
    if (r.main_name && !names.some(x => x.toLowerCase() === String(r.main_name).trim().toLowerCase())) names.unshift(r.main_name);
    const seen = {}, options = [];
    names.forEach(nm => { const c = codeOf(nm); const k = c || nm.toLowerCase(); if (!seen[k]) { seen[k] = 1; options.push({ code: c, name: nm }); } });
    map[r.sku] = { pallet_qty: Number(r.pallet_qty) || 0, category: r.category || '', main_code: codeOf(r.main_name), main_name: r.main_name || '', options,
      disc: r.disc || '', disc_au: r.disc_au || '', disc_ca: r.disc_ca || '' };
  });
  return map;
}
// BUY PLAN → PURCHASE ORDERS. Take buy-plan items (each may carry an explicit supplier_code chosen in the UI,
// else the SKU's main supplier), group by supplier and split into proposed POs of ≤20 pallets each (pallets =
// qty ÷ sku_labels.pallet_qty — 20 ≈ a container). Reference = PO-{prod#}{COUNTRY}{supplier-code}{counter}.
// Dry-run by default (returns the split + any SKUs that can't be placed); commit:true inserts proposed lines
// (erp_qty=0, flagged 'not in ERP' until Diviyaj's Upload). Assigns prod_no + start_production + country.
app.post('/api/supply/buyplan-pos', async (req, res) => {
  const b = req.body || {}, MAXPAL = 20;
  const prod = (b.prod_no || '').trim(), country = (b.country || '').trim().toUpperCase();
  const startDate = (b.start_date || '').trim() || null;
  const codes = (Array.isArray(b.supplier_codes) ? b.supplier_codes : []).map(c => String(c).toUpperCase()).filter(Boolean);
  const items = (Array.isArray(b.items) ? b.items : []).filter(it => it && it.sku && Number(it.qty) > 0);
  const commit = !!b.commit;
  const mode = b.mode === 'fba' ? 'fba' : '3pl';   // FBA-direct vs 3PL — drives the default branch
  // default branch by channel × destination (must match planner.branches.name)
  const FBA_BR = { UK: 'UK FBA', US: 'US FBA', CA: 'CA FBA', AU: 'AU FBA', EU: 'DE FBA' };   // EU FBA → DE FBA
  const TPL_BR = { UK: 'UK ILG', US: 'US Geneva', EU: 'EU iFulfillment', AU: 'AU Coghlans', CA: 'CA FBA' };   // CA always → CA FBA (no CA 3PL)
  const branch = (mode === 'fba' ? FBA_BR : TPL_BR)[country] || null;
  if (mode === 'fba' && country === 'EU') return res.status(400).json({ error: 'FBA-direct PO creation is not available for EU yet (no DE FBA branch).' });
  if (!prod || !country || !items.length) return res.status(400).json({ error: 'prod_no, country and items required' });
  const num = (prod.match(/\d+/) || [prod])[0];   // 'P54' -> '54'
  try {
    const skus = items.map(it => String(it.sku).toUpperCase());
    const mmap = await buyplanSkuMeta(skus);
    const warn = [], bySup = {};
    for (const it of items) { const sku = String(it.sku).toUpperCase(), m = mmap[sku] || { options: [] };
      // chosen supplier: explicit per-item supplier_code from the UI, else the SKU's main supplier
      const code = (it.supplier_code ? String(it.supplier_code).toUpperCase() : (m.main_code || '')).toUpperCase();
      if (!code) { warn.push({ sku, issue: 'no supplier code (supplier "' + (m.main_name || '?') + '")' }); continue; }
      if (codes.length && !codes.includes(code)) continue;     // supplier not ticked in scope (when codes given)
      const pq = Number(m.pallet_qty) || 0;   // no pallet_qty → still included, just counts as 0 pallets in the split
      const opt = (m.options || []).find(o => o.code === code);
      const supName = opt ? opt.name : (m.main_name || '');
      (bySup[code] = bySup[code] || []).push({ sku, qty: Math.round(Number(it.qty)), pallet_qty: pq, sup_name: supName }); }
    const pos = [];
    for (const code of Object.keys(bySup).sort()) {
      const prefix = 'PO-' + num + country + code;
      const ex = (await pool.query(`SELECT po FROM planner.purchase_orders WHERE po LIKE $1`, [prefix + '%'])).rows;
      let maxc = 0; ex.forEach(r => { const m = r.po.slice(prefix.length).match(/^(\d+)/); if (m) maxc = Math.max(maxc, parseInt(m[1], 10)); });
      const bins = [];   // first-fit-decreasing; split a single SKU only if it alone exceeds 20 pallets
      const place = (sku, qty, pq) => {
        if (pq <= 0) { let bin = bins[0] || (bins[0] = { pallets: 0, lines: [] }); bin.lines.push({ sku, qty, pallets: 0 }); return; }  // no pallet_qty → ride along, 0 pallets
        let rem = qty;
        while (rem / pq > MAXPAL + 1e-9) { const take = MAXPAL * pq; bins.push({ pallets: MAXPAL, lines: [{ sku, qty: take, pallets: MAXPAL }] }); rem -= take; }
        if (rem <= 0) return;
        const lp = rem / pq; let bin = bins.find(bn => bn.pallets + lp <= MAXPAL + 1e-9);
        if (!bin) { bin = { pallets: 0, lines: [] }; bins.push(bin); }
        bin.lines.push({ sku, qty: rem, pallets: lp }); bin.pallets += lp; };
      const palOf = l => l.pallet_qty > 0 ? l.qty / l.pallet_qty : 0;
      bySup[code].slice().sort((a, b) => palOf(b) - palOf(a)).forEach(l => place(l.sku, l.qty, l.pallet_qty));
      const supName = bySup[code][0].sup_name;
      bins.forEach((bin, i) => pos.push({ po: prefix + (maxc + i + 1), supplier_code: code, supplier_name: supName,
        country, branch, prod_no: prod, start_production: startDate, pallets: Math.round(bin.pallets * 10) / 10,
        lines: bin.lines.map(x => ({ sku: x.sku, qty: x.qty, pallets: Math.round(x.pallets * 10) / 10 })) }));
    }
    if (!commit) return res.json({ preview: true, mode, branch, target_pallets: MAXPAL, pos, warnings: warn });
    let created = 0;
    for (const p of pos) {
      await pool.query(`INSERT INTO planner.purchase_orders (po, supplier_name, prod_no, country_code, branch, start_production, status)
        VALUES ($1,$2,$3,$4,$5,$6,'FUTURE') ON CONFLICT (po) DO NOTHING`, [p.po, p.supplier_name, prod, country, branch, startDate]);
      for (const l of p.lines)
        await pool.query(`INSERT INTO planner.purchase_order_lines (po_sku, po, sku, qty, erp_qty, proposed_at, proposed_by)
          VALUES ($1,$2,$3,$4::int,0,now(),'buyplan') ON CONFLICT (po_sku) DO UPDATE SET qty=excluded.qty, proposed_at=now(), proposed_by='buyplan'`,
          [p.po + '|' + l.sku, p.po, l.sku, l.qty]);
      created++;
    }
    res.json({ committed: true, created, pos, warnings: warn });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Per-SKU supplier options for the BUY→PO dialog: each SKU's qty, pallet_qty, main supplier (default) and the
// full option list (multi-supplier). The UI shows a tick + supplier picker per SKU.
app.post('/api/supply/buyplan-skus', async (req, res) => {
  const items = (Array.isArray(req.body && req.body.items) ? req.body.items : []).filter(it => it && it.sku && Number(it.qty) > 0);
  if (!items.length) return res.json({ skus: [] });
  try {
    const map = await buyplanSkuMeta(items.map(it => String(it.sku).toUpperCase()));
    const ctry = String((req.body && req.body.country) || '').toUpperCase();
    const discFor = m => ctry === 'AU' ? (m.disc_au || m.disc || '') : ctry === 'CA' ? (m.disc_ca || m.disc || '') : (m.disc || '');
    res.json({ skus: items.map(it => { const sku = String(it.sku).toUpperCase(), m = map[sku] || { options: [] };
      return { sku, qty: Math.round(Number(it.qty)), pallet_qty: m.pallet_qty || 0, category: m.category || '', main_code: m.main_code || null,
        main_name: m.main_name || '', options: (m.options || []).map(o => ({ code: o.code, name: o.name })), discontinue: discFor(m) }; }) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Approve an order-plan exception on a line. field selects which: partial (default) → partial_carton_approved,
// supplier → supplier_risk_approved, discontinue → discontinue_approved.
app.post('/api/supply/po-line/:po_sku/approve', (req, res) => {
  const field = (req.body && req.body.field) || 'partial';
  const col = { partial: 'partial_carton_approved', supplier: 'supplier_risk_approved', discontinue: 'discontinue_approved' }[field];
  if (!col) return res.status(400).json({ error: 'unknown approve field' });
  const val = req.body && req.body.approved;
  return patch(res, 'planner.purchase_order_lines', 'po_sku', req.params.po_sku, { [col]: 'boolean' }, { [col]: val });
});
// "Upload changes" — push a PO's planned qtys to the ERP (Cin7/Fulfil). The actual ERP API write
// is a gated Diviyaj integration; here we record the push (erp_qty := qty) and log it, clearing the
// mismatch. Returns how many lines changed.
app.post('/api/supply/po/:po/upload', async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE planner.purchase_order_lines SET erp_qty=qty, erp_cost=cost_price, proposed_at=NULL, proposed_by=NULL
       WHERE po=$1 AND (erp_qty IS DISTINCT FROM qty OR cost_price IS DISTINCT FROM erp_cost)`,
      [req.params.po]);
    await pool.query(`INSERT INTO planner.etl_runs (job, status, rows_affected, message)
       VALUES ('supply_erp_push','pending',$1,$2)`,
      [r.rowCount, `${r.rowCount} line(s) staged to push to ERP (qty + cost) for ${req.params.po}`]);
    res.json({ uploaded: r.rowCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Delete a Purchase Order and its owned children (Master Data tab). Gated/confirmed in the UI.
app.post('/api/supply/po/:po/delete', async (req, res) => {
  const po = req.params.po;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM planner.purchase_order_lines WHERE po=$1', [po]);
    await client.query('DELETE FROM planner.erp_purchase_order_lines WHERE po=$1', [po]);
    await client.query('DELETE FROM planner.erp_purchase_orders WHERE po=$1', [po]);
    await client.query('DELETE FROM planner.portal_attachments WHERE po=$1', [po]);
    await client.query('DELETE FROM planner.supplier_submissions WHERE po=$1', [po]);
    await client.query('DELETE FROM planner.supplier_notes WHERE po=$1', [po]);
    const r = await client.query('DELETE FROM planner.purchase_orders WHERE po=$1', [po]);
    await client.query('COMMIT');
    res.json({ deleted: r.rowCount });
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});
// Resolve the Cin7 Authorization header from env — accepts EITHER form, so it's flexible:
//   • CIN7_AUTH = full header   → "Basic <base64>"      (used as-is)
//   • CIN7_AUTH = bare base64   → "<base64 of user:key>" (we prepend "Basic ")
//   • CIN7_USERNAME + CIN7_KEY  → we base64-encode "user:key" ourselves
// Returns null when nothing is configured (endpoints then no-op with 501).
function cin7Auth() {
  const a = (process.env.CIN7_AUTH || '').trim();
  if (a) return /^basic\s/i.test(a) ? a : ('Basic ' + a);
  const u = process.env.CIN7_USERNAME, k = process.env.CIN7_KEY;
  if (u && k) return 'Basic ' + Buffer.from(u + ':' + k).toString('base64');
  return null;
}
// Update the Cin7 PO's EstimatedDeliveryDate to the planner's Completion date (#14). LIVE write to Cin7 —
// gated: requires Cin7 creds (see cin7Auth). Safe no-op (501) when the credential is absent.
app.post('/api/supply/po/:po/cin7-date', async (req, res) => {
  const po = req.params.po;
  const completion = ((req.body && req.body.completion_date) || '').trim();
  if (!completion) return res.status(400).json({ error: 'completion_date required' });
  try {
    const row = (await pool.query('SELECT erp_po_id FROM planner.erp_purchase_orders WHERE po=$1', [po])).rows[0];
    const cin7Id = row && row.erp_po_id;
    if (!cin7Id) return res.status(404).json({ error: 'No Cin7 PO id (erp_po_id) found for ' + po + ' — sync the ERP mirror first.' });
    const auth = cin7Auth();
    if (!auth) return res.status(501).json({ error: 'Cin7 API credentials not configured (set CIN7_AUTH). No write performed.' });
    const edd = /T/.test(completion) ? completion : (completion + 'T00:00:00Z');
    // preserve the PO's CURRENT approval state — read isApproved first and echo it, so a date update never
    // flips a draft to approved. If we can't read it, omit isApproved entirely (Cin7 leaves it unchanged on PUT).
    let curApproved;
    try {
      const g = await fetch('https://api.cin7.com/api/v1/PurchaseOrders?rows=1&fields=id,isApproved&where=' + encodeURIComponent('id=' + cin7Id),
        { headers: { Authorization: auth, 'content-type': 'application/json' } });
      if (g.ok) { const arr = await g.json(); if (Array.isArray(arr) && arr[0] && typeof arr[0].isApproved === 'boolean') curApproved = arr[0].isApproved; }
    } catch (e) { /* fall through — omit isApproved */ }
    const upd = { id: Number(cin7Id) || cin7Id, estimatedDeliveryDate: edd };
    if (curApproved !== undefined) upd.isApproved = curApproved;
    const body = [upd];
    const r = await fetch('https://api.cin7.com/api/v1/PurchaseOrders?loadboms=0',
      { method: 'PUT', headers: { Authorization: auth, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const txt = await r.text();
    if (!r.ok) return res.status(502).json({ error: 'Cin7 API error ' + r.status + ': ' + txt.slice(0, 300) });
    // optimistically sync the local ERP mirror so the "Date ≠ ERP" flag clears immediately (n8n re-confirms later)
    let mirrored = false;
    try { const u = await pool.query(`UPDATE planner.erp_purchase_orders SET final_delivery_date=$2::date, synced_at=now() WHERE po=$1`, [po, completion]); mirrored = u.rowCount > 0; } catch (e) { /* non-fatal — Cin7 write already succeeded */ }
    res.json({ ok: true, cin7_id: cin7Id, estimatedDeliveryDate: edd, erp_mirror_updated: mirrored,
      approval_preserved: curApproved === undefined ? 'unchanged' : (curApproved ? 'approved' : 'draft'),
      link: 'https://go.cin7.com/Cloud/TransactionEntry/TransactionEntry.aspx?idCustomerAppsLink=951111&OrderId=' + encodeURIComponent(cin7Id) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Push a PO's line items (SKU / qty / price) to Cin7 (#14b). Price = the approved supplier final cost where
// there is one (portal_line_costs.final_cost, confirmed), else the standard plan cost (cost_price).
// LIVE write to Cin7 — gated on CIN7_AUTH; safe no-op (501) when absent.
app.post('/api/supply/po/:po/cin7-lines', async (req, res) => {
  const po = req.params.po;
  const completion = ((req.body && req.body.completion_date) || '').trim();
  try {
    const erpRow = (await pool.query('SELECT erp_po_id FROM planner.erp_purchase_orders WHERE po=$1', [po])).rows[0];
    const cin7Id = erpRow && erpRow.erp_po_id;          // present → update; absent → create a new Cin7 PO
    const poRow = (await pool.query('SELECT coalesce(supplier_name,$2) supplier_name, coalesce(branch,$2) branch FROM planner.purchase_orders WHERE po=$1', [po, ''])).rows[0];
    if (!poRow) return res.status(404).json({ error: 'PO ' + po + ' not found in the planner.' });
    const lines = (await pool.query(
      `SELECT l.sku, l.qty,
              coalesce(
                (SELECT plc.final_cost FROM planner.portal_line_costs plc
                 WHERE plc.po=l.po AND plc.sku=l.sku AND plc.confirmed_at IS NOT NULL AND plc.final_cost IS NOT NULL),
                l.cost_price) price,
              ((SELECT plc.final_cost FROM planner.portal_line_costs plc
                 WHERE plc.po=l.po AND plc.sku=l.sku AND plc.confirmed_at IS NOT NULL AND plc.final_cost IS NOT NULL) IS NOT NULL) approved_price
       FROM planner.purchase_order_lines l WHERE l.po=$1 AND coalesce(l.qty,0)>0 ORDER BY l.sku`, [po])).rows;
    if (!lines.length) return res.status(400).json({ error: 'No order-plan lines with qty for ' + po + '.' });
    const mode = cin7Id ? 'updated' : 'created';
    const auth = cin7Auth();
    if (!auth) return res.status(501).json({ error: 'Cin7 API credentials not configured (set CIN7_AUTH). No write performed.', lines: lines.length, mode });
    const edd = completion ? (/T/.test(completion) ? completion : completion + 'T00:00:00Z') : undefined;
    let newId = cin7Id, r, txt, memberId, branchId, curApproved, rate = null;
    // Cin7 PO line COST field is `unitPrice` (there is NO unitCost on a PO line — the API ignores it and defaults
    // to the product's cost). unitPrice is in the order's BASE currency, so convert: unitPrice = planUSD / currencyRate.
    // For an existing PO read its currencyRate (and approval) first; for a new PO the rate is looked up on create,
    // then reconciled by the price validation below.
    if (cin7Id) {
      try {
        const g = await fetch('https://api.cin7.com/api/v1/PurchaseOrders?rows=1&fields=id,isApproved,currencyRate&where=' + encodeURIComponent('id=' + cin7Id),
          { headers: { Authorization: auth, 'content-type': 'application/json' } });
        if (g.ok) { const arr = await g.json(); const o = Array.isArray(arr) ? arr[0] : null;
          if (o && typeof o.isApproved === 'boolean') curApproved = o.isApproved;
          if (o && Number(o.currencyRate)) rate = Number(o.currencyRate); }
      } catch (e) { /* fall through — omit isApproved / rate */ }
    }
    // Cin7 expects the line unitPrice in the ORDER currency (USD) on write and converts to base itself — send planUSD as-is.
    const lineItems = lines.map(l => ({ code: l.sku, qty: Number(l.qty), unitPrice: Number(l.price) || 0 }));
    if (cin7Id) {
      // UPDATE existing Cin7 PO — preserve its current approval state (don't flip a draft to approved)
      const upd = { id: Number(cin7Id) || cin7Id, lineItems };
      if (curApproved !== undefined) upd.isApproved = curApproved;
      const body = [upd];
      r = await fetch('https://api.cin7.com/api/v1/PurchaseOrders?loadboms=0',
        { method: 'PUT', headers: { Authorization: auth, 'content-type': 'application/json' }, body: JSON.stringify(body) });
      txt = await r.text();
      if (!r.ok) return res.status(502).json({ error: 'Cin7 API error ' + r.status + ': ' + txt.slice(0, 300) });
    } else {
      // CREATE a new Cin7 PO (the planner PO isn't in Cin7 yet).
      // A Cin7 PurchaseOrder MUST be linked to the supplier via memberId and to a branchId — sending only
      // free-text `company` makes Cin7 mis-file the order (it surfaced as a SALES ORDER). Resolve both from
      // Cin7 by exact name match (branch name = planner branch; supplier = Cin7 contact company) and FAIL the
      // create (no write) if either can't be resolved, so we never silently create a malformed order again.
      async function cin7IdByCompany(resource, company) {
        if (!company) return null;
        const g = await fetch('https://api.cin7.com/api/v1/' + resource + "?rows=1&fields=id,company&where=" +
          encodeURIComponent("company='" + String(company).replace(/'/g, "''") + "'"),
          { headers: { Authorization: auth, 'content-type': 'application/json' } });
        if (!g.ok) return null;
        const arr = await g.json(); return (Array.isArray(arr) && arr[0] && arr[0].id) ? arr[0].id : null;
      }
      memberId = await cin7IdByCompany('Contacts', poRow.supplier_name);
      if (!memberId) return res.status(422).json({ error: 'Supplier "' + (poRow.supplier_name || '(none)') + '" was not found as a Cin7 contact — cannot create the PO. (Creating without a supplier link is what made the previous order a sales order.) Add/spell-match the supplier in Cin7, then retry.', lines: lines.length, mode });
      branchId = poRow.branch ? await cin7IdByCompany('Branches', poRow.branch) : null;
      if (poRow.branch && !branchId) return res.status(422).json({ error: 'Branch "' + poRow.branch + '" was not found in Cin7 Branches — cannot create the PO. Make the planner branch name match the Cin7 branch exactly, then retry.', lines: lines.length, mode });
      // DRAFT (isApproved:false) so a person reviews/approves in Cin7; stage New = standard new PO.
      const create = { reference: po, memberId: Number(memberId), company: poRow.supplier_name || '', isApproved: false, stage: 'New', lineItems };
      if (branchId) create.branchId = Number(branchId);
      if (edd) create.estimatedDeliveryDate = edd;
      r = await fetch('https://api.cin7.com/api/v1/PurchaseOrders?loadboms=0',
        { method: 'POST', headers: { Authorization: auth, 'content-type': 'application/json' }, body: JSON.stringify([create]) });
      txt = await r.text();
      if (!r.ok) return res.status(502).json({ error: 'Cin7 create error ' + r.status + ': ' + txt.slice(0, 300) });
      try { const j = JSON.parse(txt); const o = Array.isArray(j) ? j[0] : j; newId = (o && (o.id || o.orderId)) || null; } catch (e) { newId = null; }
      // mirror the new Cin7 id back into the ERP mirror so future pushes UPDATE rather than re-create
      if (newId) {
        await pool.query('DELETE FROM planner.erp_purchase_orders WHERE po=$1', [po]);
        await pool.query('INSERT INTO planner.erp_purchase_orders (po, erp_po_id, supplier_name, status, synced_at) VALUES ($1,$2,$3,$4,now())',
          [po, String(newId), poRow.supplier_name || null, 'open']);
      }
    }
    // VALIDATE: read the Cin7 PO back and confirm it matches what we sent. If Cin7 kept lines we didn't send
    // (e.g. a removed SKU — happens if the PUT merged rather than replaced), re-PUT with those extras at qty 0
    // to force exact alignment. Qty is compared (not unitCost — Cin7 may hold it in a different currency).
    let validation = null;
    try {
      const sentByCode = {}; lineItems.forEach(li => { sentByCode[String(li.code).toUpperCase()] = li; });
      const planUsdBy = {}; lines.forEach(l => { planUsdBy[String(l.sku).toUpperCase()] = Number(l.price); });   // plan cost in USD, for price validation
      const validateId = newId || cin7Id;
      async function getCin7Data() {
        const g = await fetch('https://api.cin7.com/api/v1/PurchaseOrders?rows=1&fields=id,currencyRate,lineItems&where=' + encodeURIComponent('id=' + validateId),
          { headers: { Authorization: auth, 'content-type': 'application/json' } });
        if (!g.ok) return null;
        const arr = await g.json(); const o = Array.isArray(arr) ? arr[0] : arr;
        return { items: (o && Array.isArray(o.lineItems)) ? o.lineItems : [], rate: Number(o && o.currencyRate) || null };
      }
      // Cin7 line price on read = unitPrice (base currency); USD = unitPrice × currencyRate. Compare to what we sent.
      // Cin7 line price on read = unitPrice (base currency); USD = unitPrice × currencyRate. Compare to plan USD.
      function priceOff(items, rate) { if (!rate) return [];
        const by = {}; items.forEach(li => { if (li && li.code) by[String(li.code).toUpperCase()] = li; });
        const out = []; Object.keys(sentByCode).forEach(c => { const li = by[c]; if (!li || li.unitPrice == null) return;
          const cin = Math.round(Number(li.unitPrice) * rate * 100) / 100, plan = Math.round((Number(planUsdBy[c]) || 0) * 100) / 100;
          if (Math.abs(cin - plan) >= 0.01) out.push({ sku: sentByCode[c].code, plan: plan, cin7: cin }); });
        return out; }
      if (validateId) {
        const d = await getCin7Data();
        if (d) {
          const byCode = {}; d.items.forEach(li => { if (li && li.code) byCode[String(li.code).toUpperCase()] = li; });
          const extras = Object.keys(byCode).filter(c => !sentByCode[c] && Number(byCode[c].qty) > 0);   // in Cin7, not in plan
          const qtyOff = Object.keys(sentByCode).filter(c => !byCode[c] || Number(byCode[c].qty) !== Number(sentByCode[c].qty));
          const pOff = priceOff(d.items, d.rate);
          validation = { checked: true, currency_rate: d.rate, extras: extras.length, qty_off: qtyOff.length, price_off: pOff.length, price_off_detail: pOff.slice(0, 60), corrected: false, aligned: (!extras.length && !qtyOff.length && !pOff.length) };
          if (extras.length || qtyOff.length || pOff.length) {
            // corrective PUT: re-price EVERY line using the PO's real currencyRate (unitPrice = planUSD / rate) —
            // this self-heals the create path (rate unknown at build) and any price drift — plus extras at qty 0.
            const fixItems = lines.map(l => ({ code: l.sku, qty: Number(l.qty), unitPrice: Number(l.price) || 0 }));
            const fix = fixItems.concat(extras.map(c => ({ code: byCode[c].code, qty: 0, unitPrice: Number(byCode[c].unitPrice) || 0 })));
            const body2 = [{ id: Number(validateId) || validateId, lineItems: fix }]; if (typeof curApproved === 'boolean') body2[0].isApproved = curApproved;
            const r2 = await fetch('https://api.cin7.com/api/v1/PurchaseOrders?loadboms=0',
              { method: 'PUT', headers: { Authorization: auth, 'content-type': 'application/json' }, body: JSON.stringify(body2) });
            validation.corrected = true; validation.correction_ok = r2.ok;
            const d2 = r2.ok ? await getCin7Data() : null;
            if (d2) { const b2 = {}; d2.items.forEach(li => { if (li && li.code) b2[String(li.code).toUpperCase()] = li; });
              validation.extras_after = Object.keys(b2).filter(c => !sentByCode[c] && Number(b2[c].qty) > 0).length;
              validation.qty_off_after = Object.keys(sentByCode).filter(c => !b2[c] || Number(b2[c].qty) !== Number(sentByCode[c].qty)).length;
              const pOff2 = priceOff(d2.items, d2.rate); validation.price_off_after = pOff2.length; validation.price_off_detail = pOff2.slice(0, 60);
              validation.aligned = (!validation.extras_after && !validation.qty_off_after && !validation.price_off_after); }
          }
        }
      }
    } catch (e) { validation = { checked: false, error: e.message }; }
    // optimistically sync the local ERP mirror (lines + delivery date) so the "Update ERP" drift flags clear
    // immediately — reflects what Cin7 now holds; n8n re-confirms on its next sync. Non-fatal if it fails.
    let mirrored = false;
    try {
      for (const l of lines) {
        await pool.query(`INSERT INTO planner.erp_purchase_order_lines (po, sku, qty, cost, synced_at)
          VALUES ($1,$2,$3,$4,now()) ON CONFLICT (po,sku) DO UPDATE SET qty=excluded.qty, cost=excluded.cost, synced_at=now()`,
          [po, l.sku, Number(l.qty), Number(l.price) || 0]);
      }
      if (edd) await pool.query(`UPDATE planner.erp_purchase_orders SET final_delivery_date=$2::date, synced_at=now() WHERE po=$1`, [po, completion]);
      mirrored = true;
    } catch (e) { /* non-fatal — Cin7 write already succeeded */ }
    res.json({ ok: true, mode, cin7_id: newId, cin7_member_id: memberId || null, cin7_branch_id: branchId || null, lines: lines.length, approved: lines.filter(l => l.approved_price).length, erp_mirror_updated: mirrored, validation,
      link: newId ? 'https://go.cin7.com/Cloud/TransactionEntry/TransactionEntry.aspx?idCustomerAppsLink=951111&OrderId=' + encodeURIComponent(newId) : null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// READ-ONLY verify: GET the Cin7 PO's line items and compare to the planner order plan (qty AND price).
// No write. price = approved supplier final cost, else cost_price (same as the push). ratio = cin7/plan
// (≈1.0 → USD match; ≈0.75 → Cin7 is showing GBP; anything else → didn't take).
app.get('/api/supply/po/:po/cin7-verify', async (req, res) => {
  const po = req.params.po;
  try {
    const erpRow = (await pool.query('SELECT erp_po_id FROM planner.erp_purchase_orders WHERE po=$1', [po])).rows[0];
    const cin7Id = erpRow && erpRow.erp_po_id;
    if (!cin7Id) return res.status(404).json({ error: 'No Cin7 PO id for ' + po });
    const auth = cin7Auth();
    if (!auth) return res.status(501).json({ error: 'Cin7 credentials not configured' });
    const plan = (await pool.query(
      `SELECT l.sku, l.qty::numeric qty,
              coalesce((SELECT plc.final_cost FROM planner.portal_line_costs plc WHERE plc.po=l.po AND plc.sku=l.sku AND plc.confirmed_at IS NOT NULL AND plc.final_cost IS NOT NULL), l.cost_price)::numeric price
       FROM planner.purchase_order_lines l WHERE l.po=$1 AND coalesce(l.qty,0)>0`, [po])).rows;
    const planBy = {}; plan.forEach(l => { planBy[String(l.sku).toUpperCase()] = l; });
    const g = await fetch('https://api.cin7.com/api/v1/PurchaseOrders?rows=1&fields=id,currencyRate,lineItems&where=' + encodeURIComponent('id=' + cin7Id),
      { headers: { Authorization: auth, 'content-type': 'application/json' } });
    if (!g.ok) return res.status(502).json({ error: 'Cin7 read error ' + g.status });
    const arr = await g.json(); const o = Array.isArray(arr) ? arr[0] : arr;
    // Cin7 line unitPrice is in the order's BASE currency; USD = unitPrice / currencyRate (Ben). Match to 0.01.
    const rate = Number(o && o.currencyRate) || null;
    const cin = (o && Array.isArray(o.lineItems)) ? o.lineItems : [];
    const cinBy = {}; cin.forEach(li => { if (li && li.code) cinBy[String(li.code).toUpperCase()] = li; });
    const rows = plan.map(l => { const c = cinBy[String(l.sku).toUpperCase()];
      const pq = Number(l.qty), pp = Number(l.price);
      const cq = c ? Number(c.qty) : null, raw = c ? Number(c.unitPrice) : null;
      const usd = (raw != null && rate) ? Math.round((raw * rate) * 10000) / 10000 : null;   // base→USD (rate is USD per base unit)
      return { sku: l.sku, plan_qty: pq, cin7_qty: cq, plan_price: pp, cin7_unitprice: raw, cin7_usd: usd,
        created: c ? c.createdDate : null, qtyShipped: c ? Number(c.qtyShipped) : null, holdingQty: c ? Number(c.holdingQty) : null,
        qty_ok: c ? cq === pq : false,
        price_ok: (usd != null && pp != null) ? Math.abs(usd - pp) < 0.01 : false }; });
    const extras = Object.keys(cinBy).filter(c => !planBy[c] && Number(cinBy[c].qty) > 0);
    res.json({ ok: true, cin7_id: cin7Id, currency_rate: rate, lines: rows.length,
      qty_ok: rows.filter(r => r.qty_ok).length, price_ok: rows.filter(r => r.price_ok).length,
      qty_off: rows.filter(r => !r.qty_ok).map(r => r.sku),
      price_off: rows.filter(r => !r.price_ok).map(r => ({ sku: r.sku, plan_usd: r.plan_price, cin7_usd: r.cin7_usd, created: r.created, qtyShipped: r.qtyShipped, holdingQty: r.holdingQty })),
      extras_in_cin7: extras });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// BULK "Update Cin7 Date" — push the planner completion date to Cin7 EstimatedDeliveryDate for every supplied PO.
// body: { pos: [{ po, completion_date }] }. Server RE-VALIDATES: only ACTIVE (non-complete) POs that exist in Cin7
// are touched (a complete PO is skipped — its date no longer needs pushing). Each PO's CURRENT approval state is
// read and echoed so the bulk update never flips a draft to approved. One batched PUT. LIVE write — gated on creds.
app.post('/api/supply/cin7-dates-sync', async (req, res) => {
  const auth = cin7Auth();
  if (!auth) return res.status(501).json({ error: 'Cin7 API credentials not configured (set CIN7_AUTH). No write performed.' });
  const items = Array.isArray(req.body && req.body.pos) ? req.body.pos.filter(x => x && x.po) : [];
  if (!items.length) return res.json({ ok: true, updated: 0, skipped: 0, message: 'no POs supplied' });
  try {
    // authoritative guard: status + Cin7 id straight from the DB (don't trust the client on complete-vs-active)
    const meta = {};
    (await pool.query(`SELECT p.po, coalesce(p.status,'') status, e.erp_po_id
      FROM planner.purchase_orders p JOIN planner.erp_purchase_orders e ON e.po=p.po
      WHERE p.po = ANY($1)`, [items.map(x => x.po)])).rows.forEach(r => { meta[r.po] = r; });
    // 1) validate (active-only, in-Cin7, has date) → build the to-do list
    const todo = [], skipped = [];
    for (const it of items) {
      const m = meta[it.po];
      if (!m || !m.erp_po_id) { skipped.push({ po: it.po, reason: 'not in Cin7' }); continue; }
      if (/complete/i.test(m.status)) { skipped.push({ po: it.po, reason: 'complete — skipped' }); continue; }
      const c = (it.completion_date || '').trim();
      if (!c) { skipped.push({ po: it.po, reason: 'no completion date' }); continue; }
      todo.push({ po: it.po, id: Number(m.erp_po_id) || m.erp_po_id, date: c, edd: /T/.test(c) ? c : (c + 'T00:00:00Z') });
    }
    if (!todo.length) return res.json({ ok: true, updated: 0, skipped: skipped.length, skippedDetail: skipped });
    // 2) read current approval state for all ids in chunks (id IN (...)) so the update preserves draft/approved
    const approvedById = {}; const ids = todo.map(t => t.id);
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      try {
        const g = await fetch('https://api.cin7.com/api/v1/PurchaseOrders?rows=250&fields=id,isApproved&where=' + encodeURIComponent('id IN (' + chunk.join(',') + ')'),
          { headers: { Authorization: auth, 'content-type': 'application/json' } });
        if (g.ok) { const arr = await g.json(); if (Array.isArray(arr)) arr.forEach(o => { if (o && typeof o.isApproved === 'boolean') approvedById[o.id] = o.isApproved; }); }
      } catch (e) { /* unread → isApproved omitted, Cin7 leaves it unchanged */ }
    }
    // 3) one batched PUT, echoing each PO's current approval state
    const batch = todo.map(t => { const upd = { id: t.id, estimatedDeliveryDate: t.edd };
      if (approvedById[t.id] !== undefined) upd.isApproved = approvedById[t.id]; return upd; });
    const r = await fetch('https://api.cin7.com/api/v1/PurchaseOrders?loadboms=0',
      { method: 'PUT', headers: { Authorization: auth, 'content-type': 'application/json' }, body: JSON.stringify(batch) });
    const txt = await r.text();
    if (!r.ok) return res.status(502).json({ error: 'Cin7 API error ' + r.status + ': ' + txt.slice(0, 300) });
    // optimistically sync the local ERP mirror so the "Date ≠ ERP" flags clear immediately (n8n re-confirms later)
    let mirrored = 0;
    for (const t of todo) { try { const u = await pool.query(`UPDATE planner.erp_purchase_orders SET final_delivery_date=$2::date, synced_at=now() WHERE po=$1`, [t.po, t.date]); mirrored += u.rowCount; } catch (e) { /* non-fatal */ } }
    res.json({ ok: true, updated: batch.length, erp_mirror_updated: mirrored, skipped: skipped.length, skippedDetail: skipped });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Rename a PO (Master Data tab) — cascades the key across all owned tables + shipment pointers.
app.post('/api/supply/po/:po/rename', async (req, res) => {
  const oldpo = req.params.po, newpo = ((req.body && req.body.new_po) || '').trim();
  if (!newpo) return res.status(400).json({ error: 'new_po required' });
  if (newpo === oldpo) return res.json({ ok: true });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ex = await client.query('SELECT 1 FROM planner.purchase_orders WHERE po=$1', [newpo]);
    if (ex.rowCount) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'PO ' + newpo + ' already exists' }); }
    await client.query('UPDATE planner.purchase_orders SET po=$1 WHERE po=$2', [newpo, oldpo]);
    await client.query("UPDATE planner.purchase_order_lines SET po=$1, po_sku=$1||'|'||sku WHERE po=$2", [newpo, oldpo]);
    await client.query('UPDATE planner.erp_purchase_order_lines SET po=$1 WHERE po=$2', [newpo, oldpo]);
    await client.query('UPDATE planner.erp_purchase_orders SET po=$1 WHERE po=$2', [newpo, oldpo]);
    await client.query('UPDATE planner.portal_attachments SET po=$1 WHERE po=$2', [newpo, oldpo]);
    await client.query('UPDATE planner.supplier_submissions SET po=$1 WHERE po=$2', [newpo, oldpo]);
    await client.query('UPDATE planner.supplier_notes SET po=$1 WHERE po=$2', [newpo, oldpo]);
    await client.query('UPDATE planner.purchase_orders SET shipment_ref=$1 WHERE shipment_ref=$2', [newpo, oldpo]);
    await client.query('UPDATE planner.shipments SET shipment_ref=$1 WHERE shipment_ref=$2', [newpo, oldpo]).catch(() => {});
    await client.query('UPDATE planner.shipments SET master_po=$1 WHERE master_po=$2', [newpo, oldpo]).catch(() => {});
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});
// PO management engine — inline edits on the purchase_orders inputs/overrides.
app.post('/api/supply/po/:po', async (req, res) => {
  const body = req.body || {};
  // editing anything shown in the "Direct to Client details" (packing/labelling OR the client sales ref /
  // PO number / notes) invalidates a prior supplier approval → re-approve
  const DTC_FIELDS = ['sales_order_ref', 'client_po_ref', 'client_requirements'];
  if (Object.keys(body).some(k => k.indexOf('pack_') === 0 || DTC_FIELDS.indexOf(k) >= 0)) {
    try { await pool.query(`UPDATE planner.purchase_orders SET dtc_accepted_at=NULL, dtc_accepted_by=NULL WHERE po=$1`, [req.params.po]); } catch (e) {}
  }
  // Deposit assignment guards: (1) region — AU deposits pair only with AU POs and vice-versa; (2) supplier —
  // a deposit can only go on a PO from the same supplier (a Lixin deposit only onto Lixin POs). Prevents
  // accidental cross-region / cross-supplier assignment.
  if (body.deposit_ref && String(body.deposit_ref).trim() && String(body.deposit_ref).trim().toUpperCase() !== 'NO DEPOSIT') {
    try {
      const ref = String(body.deposit_ref).trim();
      const dep = (await pool.query(`SELECT coalesce(country,'') country, coalesce(supplier_name,'') supplier FROM planner.deposits WHERE reference=$1 AND is_deposit LIMIT 1`, [ref])).rows[0];
      const poc = (await pool.query(`SELECT upper(coalesce(nullif(po.country_code,''),(SELECT b.country_code FROM planner.branches b WHERE b.name=po.branch),'')) ctry, coalesce(po.supplier_name,'') supplier FROM planner.purchase_orders po WHERE po.po=$1`, [req.params.po])).rows[0];
      if (dep && poc) {
        const depAU = /^AU$/i.test((dep.country || '').trim()), poAU = /^AU$/.test(poc.ctry || '');
        if (depAU !== poAU) return res.status(400).json({ error: 'Region mismatch — ' + (depAU ? 'an AU deposit' : 'a non-AU deposit') + ' cannot be assigned to ' + (poAU ? 'an AU purchase order' : 'a non-AU purchase order') + '.' });
        const norm = s => String(s || '').trim().toLowerCase();
        if (norm(dep.supplier) && norm(poc.supplier) && norm(dep.supplier) !== norm(poc.supplier))
          return res.status(400).json({ error: 'Supplier mismatch — deposit ' + ref + ' belongs to ' + dep.supplier + ', but this PO is ' + poc.supplier + '. A deposit can only be assigned to a PO from the same supplier.' });
      }
    } catch (e) { /* non-fatal — fall through */ }
  }
  patch(res, 'planner.purchase_orders', 'po', req.params.po, {
    status: 'text', ship_type: 'text', deposit_ref: 'text', shipment_ref: 'text', prod_no: 'text',
    starred: 'boolean',   // ⭐ Focus / favourite toggle (migration 082)
    batch_id: 'text', branch: 'text', erp_po: 'text', notes: 'text', container_size: 'text',
    country_code: 'text', client: 'text', client_requirements: 'text', sales_order_ref: 'text', client_deadline_date: 'date', asn_numbers: 'text',
    client_po_ref: 'text', dispatch_order_ref: 'text', final_delivery_address: 'text', crossdock_skus: 'text',
    // Packing & Labelling (Client/FBA tab → supplier portal "Direct to Client details") — migration 086
    pack_polybags: 'boolean', pack_polybags_notes: 'text', pack_dnb_barcodes: 'boolean', pack_dnb_barcodes_notes: 'text',
    pack_rfid_barcodes: 'boolean', pack_rfid_barcodes_notes: 'text', pack_dnb_carton: 'boolean', pack_dnb_carton_notes: 'text',
    pack_client_carton: 'boolean', pack_client_carton_notes: 'text', pack_pallet_notes: 'text', pack_other_notes: 'text',
    dtc_custom: 'boolean', dtc_key_account: 'boolean',
    order_value_estimation: 'numeric', supplier_invoice_total: 'numeric',
    start_production: 'date', end_production_overide: 'date', landing_date_overide: 'date',
    delivery_date_overide: 'date', balance_due_date_overide: 'date', supplier_ship_date: 'date',
    // payment-plan overrides (PLAN panel): % terms, assigned amounts, payment dates
    start_deposit_pct_override: 'numeric', completion_pct_override: 'numeric',
    pay_start_deposit_assigned: 'numeric', pay_start_deposit_date: 'date',
    pay_completion_assigned: 'numeric', pay_completion_date: 'date',
    pay_balance_1_amount: 'numeric', pay_balance_1_date: 'date',
    pay_balance_2_amount: 'numeric', pay_balance_2_date: 'date',
    credit_amount: 'numeric',
  }, body);
});
// Advance a PO (and every PO on the same master shipment still in PRODUCTION) to SHIPPING. Offered on the
// grid when the shipment has departed but the PO status still says PRODUCTION. Only touches PRODUCTION POs
// (never re-opens completed/delivered ones); scoped to the PO's shipment_ref so "ships-with" POs move together.
app.post('/api/supply/po/:po/set-shipping', async (req, res) => {
  try {
    const r = (await pool.query(`SELECT coalesce(shipment_ref,'') shipment_ref FROM planner.purchase_orders WHERE po=$1`, [req.params.po])).rows[0];
    if (!r) return res.status(404).json({ error: 'PO not found' });
    let rows;
    if (r.shipment_ref) rows = (await pool.query(
      `UPDATE planner.purchase_orders SET status='SHIPPING', updated_at=now()
        WHERE shipment_ref=$1 AND status ILIKE '%production%' RETURNING po`, [r.shipment_ref])).rows;
    else rows = (await pool.query(
      `UPDATE planner.purchase_orders SET status='SHIPPING', updated_at=now()
        WHERE po=$1 AND status ILIKE '%production%' RETURNING po`, [req.params.po])).rows;
    res.json({ updated: rows.length, pos: rows.map(x => x.po), shipment: r.shipment_ref || null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Supplier edit — sets the name AND resolves supplier_id so payment terms / production lead apply.
app.post('/api/supply/po/:po/supplier', async (req, res) => {
  const name = (req.body && req.body.supplier_name || '').trim() || null;
  try {
    await pool.query(`UPDATE planner.purchase_orders
      SET supplier_name=$2, supplier_id=(SELECT id FROM planner.suppliers WHERE name=$2 LIMIT 1)
      WHERE po=$1`, [req.params.po, name]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Supplier production-confidence: set the confirmed production status and stamp the confirmation time
// (now). Clearing the status clears the stamp. Drives the "Production unconfirmed" action.
const PROD_STATUSES = ['not_started','in_production','nearing_completion','complete','shipped'];
app.post('/api/supply/po/:po/prod-status', async (req, res) => {
  const st = (req.body && req.body.production_status || '').trim();
  if (st && !PROD_STATUSES.includes(st)) return res.status(400).json({ error: 'bad status' });
  try {
    await pool.query(`UPDATE planner.purchase_orders
      SET production_status=$2, production_confirmed_at=CASE WHEN $2='' THEN NULL ELSE now() END WHERE po=$1`,
      [req.params.po, st]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Create / input a new purchase order. Minimal header; the rest is filled inline + in the PLAN panel.
// supplier_id is resolved from the supplier name so payment terms / production lead apply immediately.
app.post('/api/supply/po-create', async (req, res) => {
  const b = req.body || {}, po = (b.po || '').trim();
  if (!po) return res.status(400).json({ error: 'PO number required' });
  try {
    const dup = await pool.query(`SELECT 1 FROM planner.purchase_orders WHERE po=$1`, [po]);
    if (dup.rowCount) return res.status(409).json({ error: 'PO ' + po + ' already exists' });
    let supId = null;
    if (b.supplier_name) {
      const s = await pool.query(`SELECT id FROM planner.suppliers WHERE name=$1 LIMIT 1`, [b.supplier_name]);
      supId = s.rows[0] ? s.rows[0].id : null;
    }
    await pool.query(`INSERT INTO planner.purchase_orders
      (po, supplier_name, supplier_id, country_code, branch, status, start_production)
      VALUES ($1,$2,$3,$4,$5,coalesce($6,'FUTURE'),$7)`,
      [po, b.supplier_name || null, supId, b.country_code || null, b.branch || null,
       b.status || null, b.start_production || null]);
    res.json({ ok: true, po });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Bulk-upload POs from a pasted/uploaded list. Each row: PO (+ optional supplier/ship-to/branch/status/start
// + optional SKU/Qty). Rows are grouped by PO — a NEW PO is created from its header fields; an EXISTING PO is
// kept as-is (its details aren't overwritten). Any row carrying a SKU adds/updates an order-plan line
// (proposed, erp_qty=0 → shows as "not in ERP" until pushed). Repeat the PO across lines for multiple SKUs.
app.post('/api/supply/po-bulk', async (req, res) => {
  const rows = (req.body && req.body.rows) || [];
  if (!Array.isArray(rows) || !rows.length) return res.status(400).json({ error: 'no rows' });
  // group by PO, merging header fields (first non-empty wins) and collecting SKU/qty lines
  const byPo = {};
  for (const r of rows) {
    const po = (r.po || '').trim(); if (!po) continue;
    const g = byPo[po] || (byPo[po] = { po, supplier_name: '', country_code: '', branch: '', status: '', start_production: '', lines: [] });
    ['supplier_name', 'country_code', 'branch', 'status', 'start_production'].forEach(k => { if (!g[k] && r[k]) g[k] = String(r[k]).trim(); });
    const sku = (r.sku || '').toString().trim();
    if (sku) { const q = (r.qty === '' || r.qty == null) ? 0 : Math.round(Number(r.qty)); g.lines.push({ sku: sku.toUpperCase(), qty: isNaN(q) ? 0 : q }); }
  }
  let created = 0, existing = 0, lines = 0; const errors = [];
  for (const po of Object.keys(byPo)) {
    const g = byPo[po];
    try {
      const dup = await pool.query(`SELECT 1 FROM planner.purchase_orders WHERE po=$1`, [po]);
      if (!dup.rowCount) {
        let supId = null;
        if (g.supplier_name) { const s = await pool.query(`SELECT id FROM planner.suppliers WHERE name=$1 LIMIT 1`, [g.supplier_name]); supId = s.rows[0] ? s.rows[0].id : null; }
        await pool.query(`INSERT INTO planner.purchase_orders
          (po, supplier_name, supplier_id, country_code, branch, status, start_production)
          VALUES ($1,$2,$3,$4,$5,coalesce($6,'FUTURE'),$7)`,
          [po, g.supplier_name || null, supId, g.country_code || null, g.branch || null, g.status || null, g.start_production || null]);
        created++;
      } else { existing++; }   // keep existing PO's details; only add its lines
      for (const l of g.lines) {
        if (!l.sku) continue;
        await pool.query(`INSERT INTO planner.purchase_order_lines (po_sku, po, sku, qty, erp_qty, proposed_at, proposed_by)
          VALUES ($1,$2,$3,$4::int,0,now(),'upload') ON CONFLICT (po_sku) DO UPDATE SET qty=excluded.qty, proposed_at=now(), proposed_by='upload'`,
          [po + '|' + l.sku, po, l.sku, l.qty]);
        lines++;
      }
    } catch (e) { errors.push(po + ': ' + e.message); }
  }
  res.json({ created, existing, lines, errors });
});
// PO detail — the linked records across tables (lines, deposit, payments, flexport) for one PO.
app.get('/api/supply/po-detail/:po', async (req, res) => {
  const po = req.params.po;
  try {
    const [lines, deposit, payments, flexport, supInv, supDocs, notes, subs, lineCosts, supComp, xdShip, addCosts, poMeta] = await Promise.all([
      pool.query(`SELECT l.sku,l.qty,l.carton_qty,l.full_carton_check,l.cost_price,
                    el.qty erp_qty, el.cost erp_cost,
                    (l.qty IS DISTINCT FROM el.qty) qty_pending,
                    (l.cost_price IS DISTINCT FROM el.cost) cost_pending
                  FROM planner.v_purchase_order_lines l
                  LEFT JOIN planner.erp_purchase_order_lines el ON el.po=l.po AND el.sku=l.sku
                  WHERE l.po=$1 ORDER BY l.sku`, [po]),
      pool.query(`SELECT d.reference,d.supplier_name,d.amount,d.xero_fx,
                    to_char(d.date_paid,'YYYY-MM-DD') date_paid,d.deposit_used,d.deposit_remaining
                  FROM planner.deposits d JOIN planner.purchase_orders p ON p.deposit_ref=d.reference
                  WHERE p.po=$1`, [po]),
      pool.query(`SELECT to_char(payment_date,'YYYY-MM-DD') payment_date,transaction_type,
                    transaction_amount,transaction_supplier
                  FROM planner.payment_transactions
                  WHERE po_completion=$1 OR po_balance_1=$1 OR po_balance_2=$1 OR po_balance_3=$1
                  ORDER BY payment_date`, [po]),
      pool.query(`SELECT flex_id,mode,status_description status,
                    to_char(departure_date,'YYYY-MM-DD') departure,
                    to_char(landing_date,'YYYY-MM-DD') landing,
                    to_char(arrival_date,'YYYY-MM-DD') arrival,container_numbers,total_freight_cost
                  FROM planner.flexport_shipments
                  WHERE shipment_name=$1
                     OR shipment_name=(SELECT shipment_ref FROM planner.purchase_orders WHERE po=$1)`, [po]),
      // supplier-portal: latest submitted invoice value (+ id, status, doc) and all uploaded invoice docs
      pool.query(`SELECT id, value, status, submitted_by, to_char(submitted_at,'YYYY-MM-DD') submitted_at, attachment_id
                  FROM planner.supplier_submissions WHERE po=$1 AND kind='invoice_value' ORDER BY id DESC LIMIT 1`, [po]).catch(() => ({ rows: [] })),
      pool.query(`SELECT id, filename, coalesce(category,'invoice') category, coalesce(uploaded_by,'') uploaded_by, byte_size,
                    to_char(uploaded_at,'YYYY-MM-DD HH24:MI') uploaded_at FROM planner.portal_attachments WHERE po=$1 ORDER BY uploaded_at DESC`, [po]).catch(() => ({ rows: [] })),
      // PO PLAN Timeline: notes (supplier + internal) + submission status
      pool.query(`SELECT id, author_kind, coalesce(author_email,'') author_email, body,
                    to_char(created_at,'YYYY-MM-DD HH24:MI') created_at, read_at IS NOT NULL read
                  FROM planner.supplier_notes WHERE po=$1 ORDER BY created_at`, [po]).catch(() => ({ rows: [] })),
      pool.query(`SELECT kind, value, status, coalesce(submitted_by,'') submitted_by, to_char(submitted_at,'YYYY-MM-DD') submitted_at, attachment_id
                  FROM planner.supplier_submissions WHERE po=$1 ORDER BY submitted_at`, [po]).catch(() => ({ rows: [] })),
      // PO PLAN order plan: supplier-submitted actual cost + amended qty + added SKUs + D&B final cost per line
      pool.query(`SELECT plc.sku, plc.actual_cost, plc.final_cost, plc.amended_qty, coalesce(plc.is_added,false) is_added,
                    coalesce(pr.product_name,'') product_name,
                    coalesce(plc.submitted_by,'') submitted_by, to_char(plc.submitted_at,'YYYY-MM-DD') submitted_at,
                    plc.confirmed_at IS NOT NULL AND plc.confirmed_at >= plc.submitted_at confirmed,
                    (plc.actual_cost IS NOT NULL OR plc.amended_qty IS NOT NULL OR plc.is_added=true)
                      AND (plc.confirmed_at IS NULL OR plc.confirmed_at < plc.submitted_at) unconfirmed
                  FROM planner.portal_line_costs plc LEFT JOIN planner.products pr ON pr.sku=plc.sku WHERE plc.po=$1`, [po]).catch(() => ({ rows: [] })),
      // PO PLAN DATES: latest supplier-submitted completion date (+ id/status for approve/reject)
      pool.query(`SELECT id, value, status, coalesce(submitted_by,'') submitted_by, to_char(submitted_at,'YYYY-MM-DD') submitted_at
                  FROM planner.supplier_submissions WHERE po=$1 AND kind='completion_date' ORDER BY id DESC LIMIT 1`, [po]).catch(() => ({ rows: [] })),
      // CLIENT tab: supplier-entered crossdock shipped quantities for this PO
      pool.query(`SELECT sku, qty FROM planner.crossdock_shipments WHERE po=$1`, [po]).catch(() => ({ rows: [] })),
      // ORDER PLAN: supplier-entered additional cost lines for this PO
      pool.query(`SELECT id, coalesce(description,'') description, qty, price FROM planner.portal_additional_costs WHERE po=$1 ORDER BY id`, [po]).catch(() => ({ rows: [] })),
      // ERP-deviation gate for THIS PO: only COMPLETE matters (deviations are quantity-only; price is never
      // an exception, so no cost-trigger signal is needed).
      pool.query(`SELECT coalesce(p.status,'') ILIKE '%complete%' AS is_complete
                  FROM planner.purchase_orders p WHERE p.po=$1`, [po]).catch(() => ({ rows: [] })),
    ]);
    const lc = {}; lineCosts.rows.forEach(r => { lc[r.sku] = r; });
    res.json({ lines: lines.rows, deposit: deposit.rows, payments: payments.rows, flexport: flexport.rows,
      sup_invoice: supInv.rows[0] || null,
      sup_docs: supDocs.rows.filter(x => x.category !== 'client'),
      client_docs: supDocs.rows.filter(x => x.category === 'client'),
      all_docs: supDocs.rows,   // every document held for this PO (all categories) — PO ▸ DOCUMENTS tab
      notes: notes.rows, subs: subs.rows, line_costs: lc,
      sup_completion: supComp.rows[0] || null, crossdock_shipped: xdShip.rows, additional_costs: addCosts.rows,
      erp_complete: !!(poMeta.rows[0] && poMeta.rows[0].is_complete) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// SHIPS-WITH master label fields for one PO. source supplier + production ref = this PO; ships-with supplier + PO
// = the supplier/ref of the master shipment this PO rides on (sh.master_po, fallback shipment_ref); plus dest + client.
app.get('/api/supply/ships-with/:po', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT po.po production_ref, coalesce(po.supplier_name,'') source_supplier,
             coalesce(po.shipment_ref,'') ships_with_po,
             coalesce(po.branch,'') dest_branch,
             coalesce(nullif(po.country_code,''), b.country_code, '') dest_country,
             coalesce(po.client,'') client, coalesce(po.sales_order_ref,'') sales_order_ref,
             coalesce(mpo.supplier_name,'') ships_with_supplier
      FROM planner.purchase_orders po
      LEFT JOIN planner.branches b ON b.name=po.branch
      LEFT JOIN planner.shipments sh ON sh.shipment_ref=po.shipment_ref
      LEFT JOIN planner.purchase_orders mpo ON mpo.po = coalesce(nullif(sh.master_po,''), sh.shipment_ref)
      WHERE po.po=$1`, [req.params.po]);
    res.json(r.rows[0] || {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Production detail (a prod_no × supplier): SKU × total qty, the POs, and assigned deposits.
app.get('/api/supply/production-detail/:prod', async (req, res) => {
  const prod = req.params.prod;
  const supplier = (req.query.supplier === '(no supplier)' ? '' : (req.query.supplier || ''));
  const supMatch = `coalesce(po.supplier_name,'')=$2`;
  try {
    const [skus, pos, deps] = await Promise.all([
      pool.query(`SELECT l.sku, coalesce(pr.product_name,'') name, coalesce(pr.category,'(uncategorised)') category,
          coalesce(sl.product_barcode,'') ean, sum(l.qty)::int qty, round(sum(l.qty*l.cost_price)) value
        FROM planner.purchase_order_lines l
        JOIN planner.purchase_orders po ON po.po=l.po
        LEFT JOIN planner.products pr ON pr.sku=l.sku
        LEFT JOIN planner.sku_labels sl ON sl.sku=l.sku
        WHERE po.prod_no=$1 AND ${supMatch} GROUP BY l.sku, pr.product_name, pr.category, sl.product_barcode
        HAVING sum(l.qty) <> 0 ORDER BY category, l.sku`, [prod, supplier]),
      pool.query(`SELECT po.po, coalesce(po.supplier_name,'') supplier_name, coalesce(po.status,'') status,
          coalesce(po.country_code,'') country, coalesce(po.deposit_ref,'') deposit_ref,
          coalesce((SELECT sum(l.qty) FROM planner.purchase_order_lines l WHERE l.po=po.po),0)::int units
        FROM planner.purchase_orders po WHERE po.prod_no=$1 AND ${supMatch} ORDER BY po.po`, [prod, supplier]),
      pool.query(`SELECT pd.deposit_ref, coalesce(d.amount,0) amount, to_char(d.date_paid,'YYYY-MM-DD') date_paid,
          coalesce(d.supplier_name,'') dep_supplier
        FROM planner.production_deposits pd LEFT JOIN planner.deposits d ON d.reference=pd.deposit_ref
        WHERE pd.prod_no=$1 AND coalesce(pd.supplier_name,'')=$2 ORDER BY pd.deposit_ref`, [prod, supplier]),
    ]);
    res.json({ skus: skus.rows, pos: pos.rows, deposits: deps.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Assign / unassign a deposit to a production (prod_no × supplier).
app.post('/api/supply/production-deposit', async (req, res) => {
  const b = req.body || {}; const sup = (b.supplier_name === '(no supplier)' ? '' : (b.supplier_name || ''));
  if (!b.prod_no || !b.deposit_ref) return res.status(400).json({ error: 'prod_no + deposit_ref required' });
  try {
    if (b.assign === false) {
      await pool.query(`DELETE FROM planner.production_deposits WHERE prod_no=$1 AND coalesce(supplier_name,'')=$2 AND deposit_ref=$3`, [b.prod_no, sup, b.deposit_ref]);
    } else {
      await pool.query(`INSERT INTO planner.production_deposits (prod_no, supplier_name, deposit_ref)
        VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [b.prod_no, sup, b.deposit_ref]);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Create a deposit FOR a production (prod_no × supplier) and assign it. Reference auto-formats as
// {prod_no}-{supplier 2-digit code}-{n}; amount defaults to 30% of the production value LESS deposits
// already assigned to it; date defaults to today. All editable afterwards in the deposits table.
app.post('/api/supply/production-deposit-create', async (req, res) => {
  const b = req.body || {}; const prod = b.prod_no;
  const sup = (b.supplier_name === '(no supplier)' ? '' : (b.supplier_name || ''));
  if (!prod) return res.status(400).json({ error: 'prod_no required' });
  try {
    const codeRow = (await pool.query(`SELECT coalesce(nullif(code,''), upper(left(name,2))) c FROM planner.suppliers WHERE name=$1 LIMIT 1`, [sup])).rows[0];
    const sc = (codeRow && codeRow.c) || (sup ? sup.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() : 'NA');
    const val = Number((await pool.query(`SELECT coalesce(sum(l.qty*l.cost_price),0) v
      FROM planner.purchase_order_lines l JOIN planner.purchase_orders po ON po.po=l.po
      WHERE po.prod_no=$1 AND coalesce(po.supplier_name,'')=$2`, [prod, sup])).rows[0].v);
    const assigned = Number((await pool.query(`SELECT coalesce(sum(d.amount),0) a
      FROM planner.production_deposits pd JOIN planner.deposits d ON d.reference=pd.deposit_ref
      WHERE pd.prod_no=$1 AND coalesce(pd.supplier_name,'')=$2`, [prod, sup])).rows[0].a);
    const amount = Math.max(0, Math.round(0.30 * val - assigned));
    let n = 1 + Number((await pool.query(`SELECT count(*) c FROM planner.production_deposits WHERE prod_no=$1 AND coalesce(supplier_name,'')=$2`, [prod, sup])).rows[0].c);
    let ref;
    for (;;) { ref = `${prod}-${sc}-${n}`;
      const exists = await pool.query(`SELECT 1 FROM planner.deposits WHERE reference=$1`, [ref]);
      if (!exists.rowCount) break; n++; }
    await pool.query(`INSERT INTO planner.deposits (reference, is_deposit, supplier_name, prod_no, amount, date_paid)
      VALUES ($1,true,$2,$3,$4,CURRENT_DATE)`, [ref, sup || null, prod, amount]);
    await pool.query(`INSERT INTO planner.production_deposits (prod_no, supplier_name, deposit_ref)
      VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [prod, sup, ref]);
    res.json({ ok: true, reference: ref, amount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Record the actual paid currency + amount for a payment (date × supplier) — alt to the USD legs.
app.post('/api/supply/payment-fx', async (req, res) => {
  const b = req.body || {};
  if (!b.run_date || !b.supplier) return res.status(400).json({ error: 'run_date + supplier required' });
  try {
    await pool.query(`INSERT INTO planner.payment_fx (run_date, supplier, paid_currency, paid_amount)
      VALUES ($1,$2,$3,$4) ON CONFLICT (run_date, supplier) DO UPDATE
      SET paid_currency=excluded.paid_currency, paid_amount=excluded.paid_amount, updated_at=now()`,
      [b.run_date, b.supplier, b.paid_currency || null, (b.paid_amount === '' || b.paid_amount == null) ? null : b.paid_amount]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Shipment detail — the POs aboard a shipment (master first).
app.get('/api/supply/shipment-detail/:ref', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT po.po, po.supplier_name, coalesce(po.status,'') status,
        (po.po = coalesce((SELECT master_po FROM planner.shipments WHERE shipment_ref=$1), $1)) is_master,
        coalesce((SELECT sum(l.qty) FROM planner.purchase_order_lines l WHERE l.po=po.po),0)::int units,
        round(coalesce((SELECT sum(l.qty*l.cost_price) FROM planner.purchase_order_lines l WHERE l.po=po.po),0)) value
      FROM planner.purchase_orders po WHERE po.shipment_ref=$1
      ORDER BY is_master DESC, po.po`, [req.params.ref]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Shipment edit (upsert) — carrier/ref/master/status/notes + the date OVERRIDES that win over the
// POs aboard. Row may not exist yet (a shipment_ref freshly typed onto a PO), so insert-on-conflict.
const SHIP_FIELDS = {
  master_po: 'text', carrier: 'text', carrier_ref: 'text', status: 'text', notes: 'text', mode: 'text',
  starred: 'boolean',   // ⭐ Focus / favourite toggle (migration 082)
  cost_manual: 'numeric', tracked_delivery_date: 'date', tracked_source: 'text',
  departure_date: 'date', landing_date: 'date', delivery_date: 'date', arrival_date: 'date',
  branch: 'text', country_code: 'text',   // shipment-level destination override (inherits from master PO)
};
app.post('/api/supply/shipment/:ref', async (req, res) => {
  const ref = req.params.ref;
  const cols = ['shipment_ref'], vals = [ref], ph = ['$1::text']; let i = 2;
  for (const k of Object.keys(req.body || {})) {
    if (!SHIP_FIELDS[k]) continue;
    cols.push(k); vals.push(req.body[k] === '' ? null : req.body[k]); ph.push(`$${i++}::${SHIP_FIELDS[k]}`);
  }
  const upd = cols.slice(1).map(c => `${c}=excluded.${c}`).join(',') || 'updated_at=now()';
  try {
    await pool.query(`INSERT INTO planner.shipments (${cols.join(',')}) VALUES (${ph.join(',')})
      ON CONFLICT (shipment_ref) DO UPDATE SET ${upd}, updated_at=now()`, vals);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Create a new shipment (header only; POs are assigned separately). master_po defaults to the ref.
app.post('/api/supply/shipment-create', async (req, res) => {
  const ref = (req.body && req.body.shipment_ref || '').trim();
  if (!ref) return res.status(400).json({ error: 'shipment_ref required' });
  try {
    await pool.query(`INSERT INTO planner.shipments (shipment_ref, master_po, carrier, carrier_ref)
      VALUES ($1,$2,$3,$4) ON CONFLICT (shipment_ref) DO NOTHING`,
      [ref, (req.body.master_po || ref), req.body.carrier || null, req.body.carrier_ref || null]);
    res.json({ ok: true, shipment_ref: ref });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Assign / unassign a PO to a shipment, and optionally mark it the master (consolidation) PO.
// body: { po, assign:true|false, master:true }. Unassign clears purchase_orders.shipment_ref.
app.post('/api/supply/shipment/:ref/assign', async (req, res) => {
  const ref = req.params.ref, b = req.body || {};
  if (!b.po) return res.status(400).json({ error: 'po required' });
  try {
    if (b.assign === false) {
      await pool.query(`UPDATE planner.purchase_orders SET shipment_ref=NULL WHERE po=$1`, [b.po]);
      await pool.query(`UPDATE planner.shipments SET master_po=NULL, updated_at=now()
        WHERE shipment_ref=$1 AND master_po=$2`, [ref, b.po]);
    } else {
      await pool.query(`INSERT INTO planner.shipments (shipment_ref, master_po) VALUES ($1,$1)
        ON CONFLICT (shipment_ref) DO NOTHING`, [ref]);
      await pool.query(`UPDATE planner.purchase_orders SET shipment_ref=$2 WHERE po=$1`, [b.po, ref]);
      if (b.master) await pool.query(`UPDATE planner.shipments SET master_po=$2, updated_at=now()
        WHERE shipment_ref=$1`, [ref, b.po]);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Delete a shipment. Unassigns every PO aboard (clears their shipment_ref), removes its timeline notes,
// then deletes the shipment row. POs themselves are left intact.
app.post('/api/supply/shipment/:ref/delete', async (req, res) => {
  const ref = req.params.ref;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const unassigned = await client.query(`UPDATE planner.purchase_orders SET shipment_ref=NULL WHERE shipment_ref=$1`, [ref]);
    await client.query(`DELETE FROM planner.shipment_notes WHERE shipment_ref=$1`, [ref]);
    const r = await client.query(`DELETE FROM planner.shipments WHERE shipment_ref=$1`, [ref]);
    await client.query('COMMIT');
    res.json({ deleted: r.rowCount, unassigned_pos: unassigned.rowCount });
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

// ── SCENARIO PLANNER ───────────────────────────────────────────────────────
// Prime Day: inventory by SKU split into FBA / 3PL / AWD per the selected market(s).
// product_inventory warehouses are '{country}_{type}' (uk_3pl, us_fba, …). AWD is not yet loaded
// into product_inventory (only an external CSV exists) → returned as null and flagged.
app.post('/api/scenario/prime-day', async (req, res) => {
  const b = req.body || {};
  const skus = Array.isArray(b.skus) ? b.skus.filter(Boolean).map(s => s.trim().toUpperCase()) : [];
  const country = (b.country || '').toLowerCase(); // '' = all markets
  const category = b.category || '';
  const where = [], vals = []; let i = 1;
  if (skus.length) { where.push(`upper(p.sku) = ANY($${i++})`); vals.push(skus); }
  if (category) { where.push(`p.category = $${i++}`); vals.push(category); }
  if (country) { where.push(`pi.warehouse LIKE $${i++}`); vals.push(country + '\\_%'); }
  const wsql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const awdApplies = (country === '' || country === 'us'); // AWD is a US warehouse
  const pAwd = i++, pSkuFlag = i; // param indexes for awdApplies + "skus listed" flag
  try {
    const { rows } = await pool.query(`
      SELECT p.sku, coalesce(p.product_name,'') name, coalesce(p.category,'') category,
        coalesce(sum(pi.available) FILTER (WHERE pi.warehouse LIKE '%\\_fba'),0)::int fba,
        coalesce(sum(pi.available) FILTER (WHERE pi.warehouse LIKE '%\\_3pl'),0)::int three_pl,
        (CASE WHEN $${pAwd} THEN coalesce(p.awd_us,0) ELSE 0 END)::int awd,
        (coalesce(sum(pi.available),0) + CASE WHEN $${pAwd} THEN coalesce(p.awd_us,0) ELSE 0 END)::int total
      FROM planner.products p
      JOIN planner.product_inventory pi ON pi.sku=p.sku
      ${wsql}
      GROUP BY p.sku, p.product_name, p.category, p.awd_us
      HAVING coalesce(sum(pi.available),0) > 0 OR coalesce(p.awd_us,0) > 0 OR $${pSkuFlag} = true
      ORDER BY total DESC`, [...vals, awdApplies, skus.length > 0]);
    const tot = rows.reduce((a, r) => { a.fba += r.fba; a.three_pl += r.three_pl; a.awd += r.awd; a.total += r.total; return a; }, { fba: 0, three_pl: 0, awd: 0, total: 0 });
    res.json({ rows, totals: tot, sku_count: rows.length, awd_available: awdApplies });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Buy-plan extra stock pools per SKU: AWD (US upstream, awd_us) + NonGRS on-hand (UK/US). The buy plan pools
// AWD into FBA cover and shows it in its own column; NonGRS is shown as a sub-line under SOH 3PL (display only).
// Defensive on the NonGRS columns so it works before migration 036 is applied (returns 0 until then).
app.get('/api/buy-extra-stock', async (req, res) => {
  try {
    const cols = (await pool.query(`SELECT column_name FROM information_schema.columns
      WHERE table_schema='planner' AND table_name='products'
        AND column_name IN ('inventory_uk_nongrs','inventory_us_nongrs')`)).rows.map(r => r.column_name);
    const ukn = cols.includes('inventory_uk_nongrs') ? 'coalesce(inventory_uk_nongrs,0)' : '0';
    const usn = cols.includes('inventory_us_nongrs') ? 'coalesce(inventory_us_nongrs,0)' : '0';
    const rows = (await pool.query(`SELECT sku, coalesce(awd_us,0)::int awd, ${ukn}::int nuk, ${usn}::int nus
      FROM planner.products WHERE in_planning_scope`)).rows;
    const stock = {};
    rows.forEach(r => { if (r.awd || r.nuk || r.nus) stock[r.sku] = { awd: r.awd, nuk: r.nuk, nus: r.nus }; });
    res.json({ stock, has_nongrs: cols.length === 2 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// B2B Allocation — per requested SKU: available stock in the market, recent velocity (cover),
// per-unit weight (airfreight rush), wholesale price (50% of ex-VAT retail) and avg cost (margin).
app.post('/api/scenario/b2b', async (req, res) => {
  const b = req.body || {};
  const skus = (Array.isArray(b.skus) ? b.skus : []).filter(Boolean).map(s => s.trim().toUpperCase());
  const market = (b.market || 'UK').toLowerCase();
  const date = (b.date && /^\d{4}-\d{2}-\d{2}$/.test(b.date)) ? b.date : null;   // required-by date for the B2B order
  if (!skus.length) return res.json({ rows: [] });
  try {
    const { rows } = await pool.query(`
      SELECT p.sku, coalesce(p.product_name,'') name, coalesce(p.category,'') category,
        (coalesce((SELECT sum(available) FROM planner.product_inventory pi WHERE pi.sku=p.sku AND pi.warehouse LIKE $2||'\\_%'),0)
         + CASE WHEN $2='us' THEN coalesce(p.awd_us,0) ELSE 0 END)::int available,
        coalesce((SELECT sum(units) FROM planner.sales_actuals sa WHERE sa.sku=p.sku AND lower(sa.country)=$2
                  AND sa.month > (SELECT max(month) FROM planner.sales_actuals) - interval '3 months'),0)::int recent_units,
        p.prod_weight_uk weight,
        (CASE $2 WHEN 'uk' THEN p.uk_rt WHEN 'us' THEN p.us_rt WHEN 'eu' THEN p.eu_rt
                 WHEN 'au' THEN p.au_rt WHEN 'ca' THEN p.ca_rt END) retail,
        (CASE $2 WHEN 'uk' THEN p.cogs_uk_3pl_final WHEN 'us' THEN p.cogs_us_3pl_final WHEN 'eu' THEN p.cogs_eu_3pl_final
                 WHEN 'au' THEN p.cogs_au_3pl_final WHEN 'ca' THEN p.cogs_ca_3pl_final END) cogs,
        (SELECT round(avg(cost_price),2) FROM planner.purchase_order_lines l WHERE l.sku=p.sku AND coalesce(cost_price,0) > 0) avg_cost,
        -- inbound for this market: landing on/before the order date (only when a date is given), plus the next inbound
        coalesce((SELECT sum(ib.quantity - coalesce(ib.received_quantity,0)) FROM planner.inbound_shipments ib
           WHERE ib.sku=p.sku AND ib.destination_warehouse LIKE $2||'\\_%' AND ib.quantity > coalesce(ib.received_quantity,0)
             AND $3::date IS NOT NULL AND ib.estimated_delivery_date <= $3::date),0)::int inbound_by_date,
        coalesce((SELECT sum(ib.quantity - coalesce(ib.received_quantity,0)) FROM planner.inbound_shipments ib
           WHERE ib.sku=p.sku AND ib.destination_warehouse LIKE $2||'\\_%' AND ib.quantity > coalesce(ib.received_quantity,0)),0)::int inbound_total,
        to_char((SELECT min(ib.estimated_delivery_date) FROM planner.inbound_shipments ib
           WHERE ib.sku=p.sku AND ib.destination_warehouse LIKE $2||'\\_%' AND ib.quantity > coalesce(ib.received_quantity,0)
             AND ib.estimated_delivery_date >= CURRENT_DATE),'YYYY-MM-DD') next_inbound_date,
        coalesce((SELECT sum(ib.quantity - coalesce(ib.received_quantity,0)) FROM planner.inbound_shipments ib
           WHERE ib.sku=p.sku AND ib.destination_warehouse LIKE $2||'\\_%' AND ib.quantity > coalesce(ib.received_quantity,0)
             AND ib.estimated_delivery_date = (SELECT min(ib2.estimated_delivery_date) FROM planner.inbound_shipments ib2
                WHERE ib2.sku=p.sku AND ib2.destination_warehouse LIKE $2||'\\_%' AND ib2.quantity > coalesce(ib2.received_quantity,0) AND ib2.estimated_delivery_date >= CURRENT_DATE)),0)::int next_inbound_qty
      FROM planner.products p WHERE upper(p.sku) = ANY($1)`, [skus, market, date]);
    res.json({ market: market.toUpperCase(), date, rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Financial Forecast Model — quarterly (FY Mar–Feb) per category × market. Returns last-year actual
// units/revenue per quarter (from category_sales_summary) joined with saved growth/price overrides.
// FY27 models on FY26 actuals (Mar25–Feb26); FY26 models on FY25 actuals (Mar24–Feb25).
app.get('/api/scenario/fin-model', async (req, res) => {
  const fy = (req.query.fy || 'FY27').toUpperCase();
  const country = (req.query.country || 'UK').toUpperCase();
  const endYr = 2000 + parseInt(fy.replace('FY', ''), 10);     // FY27 → 2027
  if (isNaN(endYr)) return res.status(400).json({ error: 'bad fy' });
  const lyStart = (endYr - 2) + '-03-01';                       // LY = prior FY: Mar (endYr-2)
  const lyEnd = (endYr - 1) + '-02-01';                         // … through Feb (endYr-1)
  try {
    // quarter from month within a Mar-start FY: Mar→Q1 … Dec/Jan/Feb→Q4
    const ly = await pool.query(`
      SELECT category,
        (floor((((extract(month from month)::int + 9) % 12))/3)+1)::int quarter,
        sum(units)::bigint u, sum(revenue)::numeric r
      FROM planner.category_sales_summary
      WHERE upper(country)=$1 AND month >= $2::date AND month <= $3::date AND category IS NOT NULL
      GROUP BY category, quarter`, [country, lyStart, lyEnd]);
    const ovr = await pool.query(`SELECT category, quarter, growth_pct, price_change_pct, coalesce(notes,'') notes
      FROM planner.financial_model WHERE fy=$1 AND country=$2`, [fy, country]);
    const cats = {};
    const blank = () => ({ ly: [{u:0,r:0},{u:0,r:0},{u:0,r:0},{u:0,r:0}], ovr: [{growth:null,price:null,notes:''},{growth:null,price:null,notes:''},{growth:null,price:null,notes:''},{growth:null,price:null,notes:''}] });
    for (const x of ly.rows) { (cats[x.category] || (cats[x.category] = blank())).ly[x.quarter - 1] = { u: Number(x.u), r: Number(x.r) }; }
    for (const o of ovr.rows) { const c = cats[o.category] || (cats[o.category] = blank()); c.ovr[o.quarter - 1] = { growth: o.growth_pct == null ? null : Number(o.growth_pct), price: o.price_change_pct == null ? null : Number(o.price_change_pct), notes: o.notes }; }
    const rows = Object.keys(cats).sort().map(cat => ({ category: cat, ly: cats[cat].ly, ovr: cats[cat].ovr }));
    res.json({ fy, country, ly_label: 'FY' + (endYr - 1).toString().slice(2), rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/scenario/fin-model', async (req, res) => {
  const b = req.body || {};
  if (!b.fy || !b.category || !b.country || !b.quarter) return res.status(400).json({ error: 'fy, category, country, quarter required' });
  const num = v => (v === '' || v == null ? null : v);
  try {
    await pool.query(`INSERT INTO planner.financial_model (fy,category,country,quarter,growth_pct,price_change_pct,notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (fy,category,country,quarter) DO UPDATE SET
        growth_pct=excluded.growth_pct, price_change_pct=excluded.price_change_pct, notes=excluded.notes, updated_at=now()`,
      [b.fy, b.category, b.country, b.quarter, num(b.growth_pct), num(b.price_change_pct), b.notes || null]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Import growth % from the demand-plan category forecast: per category × quarter, growth =
// (this-FY units / last-FY actual units − 1)×100, where this-FY units = actuals where the month has
// passed, else the saved SKU forecast (forecast_outputs aggregated to category × country × quarter).
app.post('/api/scenario/fin-model-import', async (req, res) => {
  const b = req.body || {};
  const fy = (b.fy || 'FY27').toUpperCase();
  const country = (b.country || 'UK').toUpperCase();
  const endYr = 2000 + parseInt(fy.replace('FY', ''), 10);
  if (isNaN(endYr)) return res.status(400).json({ error: 'bad fy' });
  const fyStart = (endYr - 1) + '-03-01', fyEnd = endYr + '-02-01';
  const lyStart = (endYr - 2) + '-03-01', lyEnd = (endYr - 1) + '-02-01';
  const QEXP = `(floor((((extract(month from month)::int + 9) % 12))/3)+1)::int`;
  try {
    const lastAct = (await pool.query(`SELECT max(month) m FROM planner.sales_actuals`)).rows[0].m;
    const [actThis, fcThis, lyR] = await Promise.all([
      pool.query(`SELECT category, ${QEXP} quarter, sum(units)::numeric u FROM planner.category_sales_summary
        WHERE upper(country)=$1 AND month >= $2::date AND month <= $3::date GROUP BY category, quarter`,
        [country, fyStart, lastAct]),
      pool.query(`SELECT p.category, (floor((((extract(month from fo.month)::int + 9) % 12))/3)+1)::int quarter, sum(fo.units)::numeric u
        FROM planner.forecast_outputs fo JOIN planner.products p ON p.sku=fo.sku
        WHERE upper(split_part(fo.warehouse,'_',1))=$1 AND fo.month > $2::date AND fo.month <= $3::date
        GROUP BY p.category, quarter`, [country, lastAct, fyEnd]),
      pool.query(`SELECT category, ${QEXP} quarter, sum(units)::numeric u FROM planner.category_sales_summary
        WHERE upper(country)=$1 AND month >= $2::date AND month <= $3::date GROUP BY category, quarter`,
        [country, lyStart, lyEnd]),
    ]);
    const thisFY = {}, ly = {};
    const add = (o, cat, q, u) => { (o[cat] || (o[cat] = [0, 0, 0, 0]))[q - 1] += Number(u); };
    actThis.rows.forEach(r => add(thisFY, r.category, r.quarter, r.u));
    fcThis.rows.forEach(r => add(thisFY, r.category, r.quarter, r.u));
    lyR.rows.forEach(r => add(ly, r.category, r.quarter, r.u));
    let updated = 0;
    for (const cat of Object.keys(ly)) {
      for (let q = 0; q < 4; q++) {
        const l = ly[cat][q]; if (!(l > 0)) continue;
        const g = Math.round(((thisFY[cat] || [0,0,0,0])[q] / l - 1) * 100);
        await pool.query(`INSERT INTO planner.financial_model (fy,category,country,quarter,growth_pct)
          VALUES ($1,$2,$3,$4,$5) ON CONFLICT (fy,category,country,quarter)
          DO UPDATE SET growth_pct=excluded.growth_pct, updated_at=now()`, [fy, cat, country, q + 1, g]);
        updated++;
      }
    }
    res.json({ ok: true, updated });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Financial Forecast scenario overlays (exec-summary-style view): growth % + price % per channel × country.
app.get('/api/scenario/fin-overlay', async (req, res) => {
  try { res.json((await pool.query(`SELECT channel, country, coalesce(subcategory,'') subcategory, coalesce(period,'') period, growth_pct, price_pct FROM planner.scenario_fin_overlay`)).rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/scenario/fin-overlay', async (req, res) => {
  const b = req.body || {};
  if (!b.channel || !b.country) return res.status(400).json({ error: 'channel and country required' });
  const sub = (b.subcategory == null ? '' : String(b.subcategory));
  const period = (b.period == null ? '' : String(b.period));
  const num = v => (v === '' || v == null) ? null : Number(v);
  try {
    await pool.query(`INSERT INTO planner.scenario_fin_overlay (channel, country, subcategory, period, growth_pct, price_pct, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6, now()) ON CONFLICT (channel, country, subcategory, period) DO UPDATE SET growth_pct=excluded.growth_pct, price_pct=excluded.price_pct, updated_at=now()`,
      [b.channel, b.country, sub, period, num(b.growth_pct), num(b.price_pct)]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PO STOCK PRIORITY — for a given PO, how critical is each SKU's quantity, vs stock-on-hand + OTHER inbound
// (this PO removed) against forecast demand to the PO's cover window. Determines how much of each line is
// actually needed (HIGH/MEDIUM/LOW/NOT REQUIRED) so over-ordered lines can be trimmed.
const PO_STOCK_COVER_WEEKS = 13;   // demand window after the PO lands that it is assumed to cover (tunable)
app.get('/api/scenario/po-stock-priority/:po', async (req, res) => {
  const po = req.params.po;
  try {
    const meta = (await pool.query(`
      SELECT p.po,
        lower(coalesce(nullif(p.country_code,''), (SELECT b.country_code FROM planner.branches b WHERE b.name=p.branch), ''))
          ||'_'|| (CASE WHEN coalesce(p.branch,'') ILIKE '%fba%' THEN 'fba' ELSE '3pl' END) wh,
        coalesce(p.supplier_name,'') supplier_name, coalesce(p.status,'') status,
        to_char((SELECT max(estimated_delivery_date) FROM planner.inbound_shipments i WHERE i.reference=p.po),'YYYY-MM-DD') landing
      FROM planner.purchase_orders p WHERE p.po=$1`, [po])).rows[0];
    if (!meta) return res.status(404).json({ error: 'PO not found' });
    const rows = (await pool.query(`
      WITH base AS (
        SELECT $2::text wh, (coalesce($3::date, current_date) + ($4||' weeks')::interval)::date horizon_end )
      SELECT l.sku, sum(l.qty)::int qty, b.wh,
        coalesce((SELECT available FROM planner.product_inventory pi WHERE pi.sku=l.sku AND pi.warehouse=b.wh),0)::int on_hand,
        coalesce((SELECT sum(i.quantity-coalesce(i.received_quantity,0)) FROM planner.inbound_shipments i
                   WHERE i.sku=l.sku AND i.destination_warehouse=b.wh AND i.reference<>$1 AND coalesce(i.received_quantity,0)<i.quantity),0)::int other_inbound,
        coalesce((SELECT sum(f.units) FROM planner.forecast_outputs f
                   WHERE f.sku=l.sku AND f.warehouse=b.wh AND f.month>=date_trunc('month',current_date) AND f.month<=b.horizon_end),0)::int demand
      FROM planner.purchase_order_lines l CROSS JOIN base b
      WHERE l.po=$1 GROUP BY l.sku, b.wh, b.horizon_end
      ORDER BY l.sku`, [po, meta.wh, meta.landing, String(PO_STOCK_COVER_WEEKS)])).rows;
    const out = rows.map(r => {
      const supply = r.on_hand + r.other_inbound;
      const need = Math.max(0, r.demand - supply);
      const required = Math.min(r.qty, need);
      const removable = r.qty - required;
      const ratio = r.qty > 0 ? required / r.qty : 0;
      const priority = ratio === 0 ? 'NOT REQUIRED' : ratio <= 0.33 ? 'LOW' : ratio <= 0.66 ? 'MEDIUM' : 'HIGH';
      const rec = priority === 'NOT REQUIRED'
          ? `Covered without this PO — all ${r.qty} units removable.`
        : priority === 'HIGH'
          ? `Critical — ${required} of ${r.qty} needed to avoid stock-out; keep.`
        : `Partly needed — ${required} of ${r.qty} needed; ~${removable} removable.`;
      return { sku: r.sku, qty: r.qty, on_hand: r.on_hand, other_inbound: r.other_inbound, demand: r.demand,
        required, removable, priority, recommendation: rec };
    });
    res.json({ po: meta.po, warehouse: meta.wh, supplier_name: meta.supplier_name, status: meta.status,
      landing: meta.landing, cover_weeks: PO_STOCK_COVER_WEEKS, rows: out });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Auto Forecast — a 12-month buy plan by subcategory × primary supplier, and the resulting
// cash-flow (deposit / completion / balance / freight+duty). Model (all transparent, v1):
//   demand[subcat,month] from saved SKU forecast (forecast_outputs) aggregated to subcategory × market.
//   forward-cover netting by ARRIVAL month: arrive[m] = max(0, cover_target + demand[m] − stock_before),
//     where cover_target = next COVER_MONTHS of demand; stock_before[0] = current on-hand.
//   order month = arrival − lead (lead = production_lead_time_weeks + china_to_<market>_lead_time_weeks).
//   value = units × avg PO cost_price for the subcat. Payments phased off the primary supplier's terms:
//     deposit (start%) at order month · completion% at order+production_days · balance% at arrival+credit_days.
//   freight+duty estimated as FREIGHT_PCT of value at arrival month (flagged as an estimate — the precise
//     landed-cost engine lives on the PO view; this report uses a flat uplift for the cash-flow).
const AF_COVER_MONTHS = 2, AF_FREIGHT_PCT = 0.15;
function afAddMonths(ym, n){ let [y,m]=ym.split('-').map(Number); let t=(y*12+(m-1))+n; return Math.floor(t/12)+'-'+String(t%12+1).padStart(2,'0'); }
app.get('/api/scenario/auto-forecast', async (req, res) => {
  const markets = (req.query.market||'all').toLowerCase()==='all' ? ['uk','us','eu','au'] : [(req.query.market||'uk').toLowerCase()];
  const COVER = Math.max(1, Math.min(12, parseInt(req.query.cover,10) || AF_COVER_MONTHS));   // cover-target months (1–12)
  const FREIGHT = (req.query.freight!=null && req.query.freight!=='' && isFinite(+req.query.freight)) ? Math.max(0, +req.query.freight/100) : AF_FREIGHT_PCT;
  try {
    const dataMin='2026-06', dataMax='2027-12';
    // display window = 12 months from the earliest forecast month
    const win=[]; for(let i=0;i<12;i++) win.push(afAddMonths(dataMin,i));
    const allMonths=[]; { let m=dataMin; while(m<=dataMax){ allMonths.push(m); m=afAddMonths(m,1); } }
    const leadCol={uk:'china_to_uk_lead_time_weeks',us:'china_to_us_lead_time_weeks',eu:'china_to_eu_lead_time_weeks',au:'china_to_au_lead_time_weeks'};
    // one combined pass per market then aggregate the output tables
    const unitsBy={}, supplierBy={};                       // subcat -> {month->units, total}, subcat->supplier
    const pay={deposit:{},completion:{},balance:{},freight:{}}; // bucket -> month -> amount
    const addPay=(b,mo,v)=>{ if(win.indexOf(mo)<0||!(v>0))return; (pay[b][mo]=(pay[b][mo]||0)+v); };
    let truncated=false;
    for(const mk of markets){
      const lc=leadCol[mk];
      const [dem,stk,lead,cost]=await Promise.all([
        pool.query(`SELECT p.subcategory s, to_char(fo.month,'YYYY-MM') m, sum(fo.units)::numeric u
          FROM planner.forecast_outputs fo JOIN planner.products p ON p.sku=fo.sku
          WHERE split_part(fo.warehouse,'_',1)=$1 AND p.subcategory IS NOT NULL GROUP BY 1,2`,[mk]),
        pool.query(`SELECT p.subcategory s, sum(i.available)::numeric u FROM planner.product_inventory i
          JOIN planner.products p ON p.sku=i.sku WHERE split_part(i.warehouse,'_',1)=$1 AND p.subcategory IS NOT NULL GROUP BY 1`,[mk]),
        pool.query(`SELECT subcategory s, avg(coalesce(production_lead_time_weeks,0)+coalesce(${lc},0)) wk
          FROM planner.products WHERE subcategory IS NOT NULL GROUP BY 1`),
        pool.query(`SELECT pr.subcategory s, avg(l.cost_price) c FROM planner.purchase_order_lines l
          JOIN planner.products pr ON pr.sku=l.sku WHERE pr.subcategory IS NOT NULL AND l.cost_price>0 GROUP BY 1`),
      ]);
      const demand={}, stock={}, leadM={}, unitCost={};
      dem.rows.forEach(r=>{ (demand[r.s]||(demand[r.s]={}))[r.m]=Number(r.u); });
      stk.rows.forEach(r=> stock[r.s]=Number(r.u));
      lead.rows.forEach(r=> leadM[r.s]=Math.max(1,Math.round(Number(r.wk)/4.345)));   // weeks→months
      cost.rows.forEach(r=> unitCost[r.s]=Number(r.c));
      // primary supplier per subcat = volume-dominant supplier on its PO history
      const supName={};
      (await pool.query(`SELECT s, nm FROM (
          SELECT pr.subcategory s, po.supplier_name nm,
            row_number() OVER (PARTITION BY pr.subcategory ORDER BY sum(l.qty) DESC) rn
          FROM planner.purchase_order_lines l JOIN planner.purchase_orders po ON po.po=l.po
          JOIN planner.products pr ON pr.sku=l.sku
          WHERE pr.subcategory IS NOT NULL AND coalesce(po.supplier_name,'')<>'' GROUP BY 1,2) q WHERE rn=1`)).rows
        .forEach(r=> supName[r.s]=r.nm);
      const terms=(await pool.query(`SELECT name,start_deposit_pct,completion_pct,balance_pct,production_days,credit_days FROM planner.suppliers`)).rows
        .reduce((a,t)=>{a[t.name]=t;return a;},{});
      for(const s of Object.keys(demand)){
        const lm=leadM[s]||2, c=unitCost[s]||0, nm=supName[s]||'—';
        const t=terms[nm]||{start_deposit_pct:30,completion_pct:0,balance_pct:70,production_days:60,credit_days:0};
        let sb=stock[s]||0;
        for(let i=0;i<allMonths.length;i++){
          const m=allMonths[i], d=demand[s][m]||0;
          let cover=0; for(let k=1;k<=COVER;k++) cover+=(demand[s][allMonths[i+k]]||0);
          const arrive=Math.max(0, cover+d-sb);
          sb=sb+arrive-d;
          if(arrive<=0) continue;
          const om=afAddMonths(m,-lm);                       // order month
          if(win.indexOf(om)>=0){
            const u=unitsBy[s]||(unitsBy[s]={t:0}); u[om]=(u[om]||0)+arrive; u.t+=arrive; supplierBy[s]=nm;
          } else if(om<win[0]) { /* ordered already / in past — skip display */ }
          else truncated=true;
          const val=arrive*c;
          addPay('deposit', om, val*Number(t.start_deposit_pct||0)/100);
          addPay('completion', afAddMonths(om, Math.round((t.production_days||0)/30)), val*Number(t.completion_pct||0)/100);
          addPay('balance', afAddMonths(m, Math.round((t.credit_days||0)/30)), val*Number(t.balance_pct||0)/100);
          addPay('freight', m, val*FREIGHT);
        }
      }
    }
    const unitRows=Object.keys(unitsBy).filter(s=>unitsBy[s].t>0).sort().map(s=>({
      subcat:s, supplier:supplierBy[s]||'—', months:win.map(m=>Math.round(unitsBy[s][m]||0)), total:Math.round(unitsBy[s].t) }));
    const payRow=b=>win.map(m=>Math.round(pay[b][m]||0));
    const dep=payRow('deposit'),comp=payRow('completion'),bal=payRow('balance'),frt=payRow('freight');
    const total=win.map((m,i)=>dep[i]+comp[i]+bal[i]+frt[i]);
    res.json({ months:win, units:unitRows,
      payments:{deposit:dep,completion:comp,balance:bal,freight:frt,total},
      assumptions:{cover_months:COVER,freight_pct:FREIGHT,truncated} });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Slow Moving — per SKU × warehouse stock health. Returns the raw metrics (on-hand, trailing velocity,
// weeks of cover, days since last sale, cash tied up) for every stocked SKU×warehouse; the client filters
// against adjustable thresholds (cover wks · days-since-sale · velocity · min units) + market/warehouse pills.
// Warehouse↔sales mapping: <co>_fba ← FBA channel; <co>_3pl ← DTC+B2B. Velocity = units sold over the last
// VEL_WEEKS, /VEL_WEEKS. (No AWD stock location exists in inventory, so AWD is omitted.)
app.get('/api/scenario/slow-moving', async (req, res) => {
  const VEL_WEEKS = 13;                                  // trailing window ≈ 3 months
  try {
    const rows = (await pool.query(`
      WITH maxm AS (SELECT max(month) m FROM planner.sales_actuals),
      sw AS (   -- sales mapped to a warehouse code
        SELECT sku, lower(country)||'_'||CASE WHEN channel='FBA' THEN 'fba' ELSE '3pl' END wh, month, units
        FROM planner.sales_actuals),
      vel AS (
        SELECT sku, wh, sum(units)::numeric sold FROM sw, maxm
        WHERE month > maxm.m - interval '3 months' AND month <= maxm.m GROUP BY 1,2),
      last AS (
        SELECT sku, wh, max(month) last_m FROM sw WHERE units>0 GROUP BY 1,2),
      cost AS (
        SELECT sku, avg(cost_price) c FROM planner.purchase_order_lines WHERE cost_price>0 GROUP BY 1),
      fc AS (   -- forward (seasonal) demand: saved SKU forecast over the next 3 months, by sku × warehouse
        SELECT sku, warehouse wh, sum(units)::numeric fsold FROM planner.forecast_outputs
        WHERE month >= date_trunc('month',CURRENT_DATE) AND month < date_trunc('month',CURRENT_DATE)+interval '3 months'
        GROUP BY 1,2),
      inv AS (  -- AWD (US-only, upstream) is pooled into us_fba: it feeds FBA and is the same stock pool
        SELECT i.sku, i.warehouse wh,
          (i.available + CASE WHEN i.warehouse='us_fba' THEN coalesce(p.awd_us,0) ELSE 0 END)::int on_hand,
          (CASE WHEN i.warehouse='us_fba' THEN coalesce(p.awd_us,0) ELSE 0 END)::int awd
        FROM planner.product_inventory i JOIN planner.products p ON p.sku=i.sku WHERE p.in_planning_scope)
      SELECT inv.sku, p.product_name, p.category, p.subcategory, p.release_window, inv.wh,
        inv.on_hand, inv.awd,
        coalesce(v.sold,0)::numeric sold_win,
        coalesce(f.fsold,0)::numeric fc_win,
        l.last_m,
        (CURRENT_DATE - l.last_m)::int days_since,
        coalesce(c.c,0)::numeric unit_cost
      FROM inv
      JOIN planner.products p ON p.sku=inv.sku
      LEFT JOIN vel  v ON v.sku=inv.sku AND v.wh=inv.wh
      LEFT JOIN fc   f ON f.sku=inv.sku AND f.wh=inv.wh
      LEFT JOIN last l ON l.sku=inv.sku AND l.wh=inv.wh
      LEFT JOIN cost c ON c.sku=inv.sku
      WHERE inv.on_hand>0`)).rows;
    const out = rows.map(r => {
      const vel = Number(r.sold_win) / VEL_WEEKS;          // trailing actual units/week
      const fvel = Number(r.fc_win) / VEL_WEEKS;           // forward (seasonal) forecast units/week
      const cover = v => v > 0 ? Math.round(r.on_hand / v) : null;  // weeks of cover; null = no demand on that basis
      return { sku: r.sku, name: r.product_name, category: r.category, subcat: r.subcategory,
        release_window: r.release_window || '',
        wh: r.wh, market: r.wh.split('_')[0], whtype: r.wh.split('_')[1],
        on_hand: r.on_hand, awd: Number(r.awd) || 0,
        vel_wk: Math.round(vel * 10) / 10, cover_wks: cover(vel),
        fc_vel_wk: Math.round(fvel * 10) / 10, cover_fc: cover(fvel),
        days_since: r.days_since == null ? null : Number(r.days_since),
        value: Math.round(r.on_hand * Number(r.unit_cost)) };
    });
    res.json({ rows: out, vel_weeks: VEL_WEEKS });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Markdown & EOS plan — at end of season, which stock won't clear, and what to do with it. Per SKU × market:
// project sales to the season-end date (default basis = the saved SEASONAL FORECAST, which encodes the summer
// peak; ?basis=trail uses the trailing 13wk run rate instead). residual = on-hand that won't sell by then.
// Recommendation: CLEARS (≥95% gone) · CARRYOVER (still live, hold to next season — towels are non-perishable)
// · MARKDOWN (discontinued so can't carry, OR no demand anywhere, OR >1.5yr of trailing-annual demand left
// over — carryover won't fix it). Markdown depth (15/25/35/50%) scales with how stuck it is; £ shows capital
// at risk (residual × cost) and the markdown give-away (residual × net retail × depth). Tunables:
// ?end=YYYY-MM-DD season end (default 31 Aug), ?market=all|uk|us|eu|au|ca, ?basis=fc|trail.
app.get('/api/scenario/markdown-eos', async (req, res) => {
  const VEL_WEEKS = 13;
  try {
    // season end: query param, else next 31 Aug (summer EOS for beach product)
    const today = new Date();
    let end = (req.query.end && /^\d{4}-\d{2}-\d{2}$/.test(req.query.end)) ? new Date(req.query.end + 'T00:00:00Z')
      : (() => { const y = today.getUTCFullYear(); let e = new Date(Date.UTC(y, 7, 31)); if (e < today) e = new Date(Date.UTC(y + 1, 7, 31)); return e; })();
    const endISO = end.toISOString().slice(0, 10);
    const wksToEos = Math.max(0.1, (end - today) / (7 * 86400000));
    const mkt = (req.query.market || 'all').toLowerCase();
    const basis = req.query.basis === 'trail' ? 'trail' : 'fc';   // default: seasonal forecast (correct for an EOS projection)
    const mfilter = (mkt !== 'all') ? ` AND inv.market = '${mkt.replace(/[^a-z]/g, '')}'` : '';
    const rows = (await pool.query(`
      WITH maxm AS (SELECT max(month) m FROM planner.sales_actuals),
      vel AS (SELECT sku, lower(country) market, sum(units)::numeric sold       -- trailing 13wk (display run rate)
        FROM planner.sales_actuals, maxm WHERE month > maxm.m - interval '3 months' AND month <= maxm.m GROUP BY 1,2),
      ann AS (SELECT sku, lower(country) market, sum(units)::numeric sold        -- trailing 12mo (seasonally-neutral annual demand)
        FROM planner.sales_actuals, maxm WHERE month > maxm.m - interval '12 months' AND month <= maxm.m GROUP BY 1,2),
      fc AS (SELECT sku, split_part(warehouse,'_',1) market, sum(units)::numeric fsold  -- saved seasonal forecast, now → season end
        FROM planner.forecast_outputs
        WHERE month >= date_trunc('month',CURRENT_DATE) AND month <= date_trunc('month',$1::date) GROUP BY 1,2),
      cost AS (SELECT sku, avg(cost_price) c FROM planner.purchase_order_lines WHERE cost_price>0 GROUP BY 1),
      inv AS (SELECT i.sku, split_part(i.warehouse,'_',1) market,
          sum(i.available + CASE WHEN i.warehouse='us_fba' THEN coalesce(p.awd_us,0) ELSE 0 END)::int on_hand
        FROM planner.product_inventory i JOIN planner.products p ON p.sku=i.sku
        WHERE p.in_planning_scope GROUP BY 1,2),
      avail AS (SELECT sku, lower(country) market, bool_or(is_available) live
        FROM planner.v_product_availability GROUP BY 1,2)
      SELECT inv.sku, p.product_name, p.category, p.subcategory, inv.market, inv.on_hand,
        coalesce(v.sold,0)::numeric sold_win, coalesce(an.sold,0)::numeric ann_sold,
        coalesce(f.fsold,0)::numeric fc_units, coalesce(c.c,0)::numeric unit_cost,
        (CASE inv.market WHEN 'uk' THEN p.uk_rt WHEN 'us' THEN p.us_rt WHEN 'eu' THEN p.eu_rt
              WHEN 'au' THEN p.au_rt WHEN 'ca' THEN p.ca_rt END)::numeric retail,
        coalesce(a.live,false) live
      FROM inv JOIN planner.products p ON p.sku=inv.sku
      LEFT JOIN vel  v  ON v.sku=inv.sku  AND v.market=inv.market
      LEFT JOIN ann  an ON an.sku=inv.sku AND an.market=inv.market
      LEFT JOIN fc   f  ON f.sku=inv.sku  AND f.market=inv.market
      LEFT JOIN cost c  ON c.sku=inv.sku
      LEFT JOIN avail a ON a.sku=inv.sku  AND a.market=inv.market
      WHERE inv.on_hand>0${mfilter}`, [endISO])).rows;
    const depthFor = (ratio, dead) => { let d = ratio < 0.3 ? 0.15 : ratio < 0.6 ? 0.25 : ratio < 0.85 ? 0.35 : 0.5; if (dead) d = Math.max(d, 0.35); return d; };
    const out = rows.map(r => {
      const oh = Number(r.on_hand), vel = Number(r.sold_win) / VEL_WEEKS, fcU = Number(r.fc_units), ann = Number(r.ann_sold), cost = Number(r.unit_cost) || 0;
      const projClear = Math.min(oh, Math.round(basis === 'trail' ? vel * wksToEos : fcU)), residual = Math.max(0, oh - projClear);
      const ratio = oh > 0 ? residual / oh : 0, live = r.live === true, dead = vel <= 0.001 && fcU <= 0 && ann <= 0;
      const net = r.retail == null ? 0 : (['uk', 'eu'].includes(r.market) ? Number(r.retail) / 1.2 : Number(r.retail));
      let status, depth = 0;
      if (ratio <= 0.05) status = 'clear';
      else if (!live) { status = 'markdown'; depth = depthFor(ratio, dead); }            // discontinued → can't carry
      else if (dead) { status = 'markdown'; depth = depthFor(ratio, true); }              // no demand anywhere
      else if (ann > 0 && residual > ann * 1.5) { status = 'markdown'; depth = depthFor(ratio, false); }  // >1.5yr real annual demand left over
      else status = 'carryover';                                                           // still live → holds to next season
      return { sku: r.sku, name: r.product_name, category: r.category, subcat: r.subcategory, market: r.market,
        on_hand: oh, vel_wk: Math.round((basis === 'trail' ? vel : fcU / wksToEos) * 10) / 10, proj_clear: projClear, residual,
        st_eos: oh > 0 ? Math.round((oh - residual) / oh * 100) : null,
        live, status, depth, residual_cost: Math.round(residual * cost),
        markdown_give: status === 'markdown' ? Math.round(residual * net * depth) : 0,
        recover: status === 'markdown' ? Math.round(residual * net * (1 - depth)) : 0 };
    }).filter(r => r.residual > 0 || r.status === 'clear');
    out.sort((a, b) => (b.residual_cost - a.residual_cost) || (b.residual - a.residual));
    res.json({ rows: out, season_end: endISO, wks_to_eos: Math.round(wksToEos), vel_weeks: VEL_WEEKS, basis });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Open-To-Buy (OTB) — per category × market, how much is left to buy (or how over-committed you are) to hit
// the cover target over a forward horizon. Rolls stock forward: projected closing = on-hand + on-order (open
// PO receipts landing in the horizon) − forecast demand. Target closing = cover-weeks target × weekly forward
// demand. OTB units = target closing − projected closing (positive = buy; negative = already over-bought).
// £ at cost. Tunables: ?market=all|uk|… ?months=6 horizon ?defcover=8 fallback cover when no target set.
app.get('/api/scenario/otb', async (req, res) => {
  try {
    const months = Math.max(1, Math.min(12, parseInt(req.query.months, 10) || 6));
    const defCover = Math.max(1, Number(req.query.defcover) || 8);
    const mkt = (req.query.market || 'all').toLowerCase();
    const weeks = months * 4.345;
    const rows = (await pool.query(`
      WITH fc AS (SELECT p.category, split_part(fo.warehouse,'_',1) market, sum(fo.units)::numeric demand
          FROM planner.forecast_outputs fo JOIN planner.products p ON p.sku=fo.sku
          WHERE fo.month >= date_trunc('month',CURRENT_DATE)
            AND fo.month < date_trunc('month',CURRENT_DATE) + ($1||' months')::interval
          GROUP BY 1,2),
      oo AS (SELECT p.category, lower(coalesce(nullif(po.country_code,''), b.country_code,'')) market, sum(l.qty)::numeric qty
          FROM planner.purchase_orders po
          JOIN planner.purchase_order_lines l ON l.po=po.po
          JOIN planner.products p ON p.sku=l.sku
          LEFT JOIN planner.shipments s ON s.shipment_ref=po.shipment_ref
          LEFT JOIN planner.branches  b ON b.name=po.branch
          WHERE coalesce(po.status,'') NOT ILIKE '%complete%'
            AND coalesce(s.arrival_date,s.delivery_date,s.landing_date,po.landing_date_overide) >= CURRENT_DATE
            AND coalesce(s.arrival_date,s.delivery_date,s.landing_date,po.landing_date_overide) < CURRENT_DATE + ($1||' months')::interval
          GROUP BY 1,2),
      oh AS (SELECT p.category, split_part(i.warehouse,'_',1) market,
            sum(i.available + CASE WHEN i.warehouse='us_fba' THEN coalesce(p.awd_us,0) ELSE 0 END)::numeric onhand
          FROM planner.product_inventory i JOIN planner.products p ON p.sku=i.sku
          WHERE p.in_planning_scope GROUP BY 1,2),
      cost AS (SELECT pr.category, avg(l.cost_price) c FROM planner.purchase_order_lines l
          JOIN planner.products pr ON pr.sku=l.sku WHERE l.cost_price>0 AND pr.category IS NOT NULL GROUP BY 1),
      tgt AS (SELECT category, market, cover_weeks_target FROM planner.sell_through_targets WHERE cover_weeks_target IS NOT NULL),
      keys AS (SELECT category, market FROM fc UNION SELECT category, market FROM oh UNION SELECT category, market FROM oo)
      SELECT k.category, k.market,
        coalesce(oh.onhand,0) onhand, coalesce(oo.qty,0) onorder, coalesce(fc.demand,0) demand,
        coalesce(c.c,0) unit_cost, t.cover_weeks_target
      FROM keys k
      LEFT JOIN fc   ON fc.category=k.category AND fc.market=k.market
      LEFT JOIN oo   ON oo.category=k.category AND oo.market=k.market
      LEFT JOIN oh   ON oh.category=k.category AND oh.market=k.market
      LEFT JOIN cost c ON c.category=k.category
      LEFT JOIN tgt  t ON t.category=k.category AND t.market=upper(k.market)
      WHERE k.category IS NOT NULL AND k.market <> ''`, [String(months)])).rows;
    // OTB is only meaningful where there's forward demand; zero-demand stock is a markdown/slow-moving signal, not a buy decision
    const out = rows.filter(r => TARGET_MARKETS.includes((r.market || '').toUpperCase()) && Number(r.demand) > 0)
      .map(r => {
        const onhand = Number(r.onhand), onorder = Number(r.onorder), demand = Number(r.demand), cost = Number(r.unit_cost) || 0;
        const wkDemand = demand / weeks, projClose = onhand + onorder - demand;
        const coverT = r.cover_weeks_target != null ? Number(r.cover_weeks_target) : defCover;
        const targetClose = coverT * wkDemand;
        const otb = Math.round(targetClose - projClose);
        return { category: r.category, market: r.market.toUpperCase(), onhand: Math.round(onhand), onorder: Math.round(onorder),
          demand: Math.round(demand), proj_close: Math.round(projClose),
          cover_now: wkDemand > 0 ? Math.round(onhand / wkDemand) : null,
          proj_cover: wkDemand > 0 ? Math.round(projClose / wkDemand) : null,
          cover_target: coverT, has_target: r.cover_weeks_target != null,
          otb_units: otb, otb_cost: Math.round(otb * cost),
          status: otb > Math.max(50, demand * 0.05) ? 'buy' : (otb < -Math.max(50, demand * 0.05) ? 'over' : 'ok') };
      });
    out.sort((a, b) => Math.abs(b.otb_cost) - Math.abs(a.otb_cost));
    const f = mkt === 'all' ? out : out.filter(r => r.market.toLowerCase() === mkt);
    res.json({ rows: f, months, weeks: Math.round(weeks), def_cover: defCover });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Key Stock Arrivals — what is landing soon and how desperately it's needed. For every open PO with an
// upcoming arrival date (shipment arrival/delivery/landing date if linked, else the PO landing override),
// list the SKUs + quantities on it and score each by stockout risk:
//   stockout date = today + on-hand ÷ weekly (seasonal) demand;  gap = stockout date − arrival date.
//   gap < 0  → CRITICAL (out of stock before it lands);  0–14d → tight;  else comfortable;  no demand → n/a.
// On-hand/demand are taken at the destination market (AWD pooled into US). Grouped by shipment (or the PO
// when unlinked), shipments sorted by arrival, SKUs by gap (most urgent first). No writes, no schema.
app.get('/api/scenario/key-arrivals', async (req, res) => {
  const FC_WEEKS = 13;
  try {
    const rows = (await pool.query(`
      WITH arr AS (
        SELECT po.po, po.shipment_ref,
          coalesce(po.supplier_name,'') supplier,
          lower(coalesce(nullif(po.country_code,''), b.country_code, '')) market,
          coalesce(s.arrival_date, s.delivery_date, s.landing_date, po.landing_date_overide) arrival,
          coalesce(nullif(s.status,''), nullif(po.status,''), '') status
        FROM planner.purchase_orders po
        LEFT JOIN planner.shipments s ON s.shipment_ref = po.shipment_ref
        LEFT JOIN planner.branches  b ON b.name = po.branch
        WHERE coalesce(po.status,'') NOT ILIKE '%complete%'
          AND coalesce(s.arrival_date, s.delivery_date, s.landing_date, po.landing_date_overide) >= CURRENT_DATE),
      osku AS (SELECT sku, split_part(warehouse,'_',1) market, sum(available)::numeric oh
        FROM planner.product_inventory GROUP BY 1,2),
      fc AS (SELECT sku, split_part(warehouse,'_',1) market, sum(units)::numeric fsold
        FROM planner.forecast_outputs
        WHERE month >= date_trunc('month',CURRENT_DATE) AND month < date_trunc('month',CURRENT_DATE)+interval '3 months'
        GROUP BY 1,2)
      SELECT arr.po, arr.shipment_ref, arr.supplier, arr.market, arr.status,
        to_char(arr.arrival,'YYYY-MM-DD') arrival, (arr.arrival - CURRENT_DATE)::int days_to_arrival,
        l.sku, l.qty::int qty, coalesce(p.product_name,'') name, coalesce(p.subcategory,'') subcat,
        (coalesce(oh.oh,0) + CASE WHEN arr.market='us' THEN coalesce(p.awd_us,0) ELSE 0 END)::numeric on_hand,
        coalesce(fc.fsold,0)::numeric fc_win
      FROM arr
      JOIN planner.purchase_order_lines l ON l.po=arr.po AND l.qty>0
      JOIN planner.products p ON p.sku=l.sku
      LEFT JOIN osku oh ON oh.sku=l.sku AND oh.market=arr.market
      LEFT JOIN fc      ON fc.sku=l.sku AND fc.market=arr.market`)).rows;
    // assemble: group by shipment (or PO when unlinked), score each line
    const groups = {};
    for (const r of rows) {
      const key = r.shipment_ref ? 'S:' + r.shipment_ref : 'P:' + r.po;
      const g = groups[key] || (groups[key] = { kind: r.shipment_ref ? 'shipment' : 'po',
        ref: r.shipment_ref || r.po, supplier: r.supplier, market: r.market, status: r.status,
        arrival: r.arrival, days_to_arrival: Number(r.days_to_arrival), pos: new Set(), lines: [] });
      g.pos.add(r.po);
      const vel = Number(r.fc_win) / FC_WEEKS;                       // seasonal units/week at this market
      const oh = Number(r.on_hand);
      const daysToStockout = vel > 0 ? Math.round(oh / vel * 7) : null;
      const gap = daysToStockout == null ? null : daysToStockout - Number(r.days_to_arrival);
      const urgency = gap == null ? 'none' : (gap < 0 ? 'critical' : (gap <= 14 ? 'tight' : 'ok'));
      g.lines.push({ sku: r.sku, name: r.name, subcat: r.subcat, qty: Number(r.qty),
        on_hand: Math.round(oh), vel_wk: Math.round(vel * 10) / 10,
        cover_wks: vel > 0 ? Math.round(oh / vel) : null,
        days_to_stockout: daysToStockout, gap_days: gap, urgency });
    }
    const rank = { critical: 0, tight: 1, ok: 2, none: 3 };
    const arrivals = Object.values(groups).map(g => {
      g.lines.sort((a, b) => (a.gap_days == null ? 1e9 : a.gap_days) - (b.gap_days == null ? 1e9 : b.gap_days));
      return { kind: g.kind, ref: g.ref, supplier: g.supplier, market: g.market, status: g.status,
        arrival: g.arrival, days_to_arrival: g.days_to_arrival, po_count: g.pos.size,
        units: g.lines.reduce((s, l) => s + l.qty, 0),
        crit: g.lines.filter(l => l.urgency === 'critical').length,
        tight: g.lines.filter(l => l.urgency === 'tight').length,
        lines: g.lines };
    }).sort((a, b) => a.arrival < b.arrival ? -1 : a.arrival > b.arrival ? 1 : 0);
    res.json({ arrivals, fc_weeks: FC_WEEKS });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Sell-through targets (DEMAND ▸ Targets) — target % by category × market. GET returns the in-scope
// category list + markets + the saved targets; POST upserts one cell.
const TARGET_MARKETS = ['UK', 'US', 'EU', 'AU'];
app.get('/api/targets', async (req, res) => {
  try {
    const cats = (await pool.query(`SELECT DISTINCT category FROM planner.products
      WHERE in_planning_scope AND category IS NOT NULL ORDER BY category`)).rows.map(r => r.category);
    const rows = (await pool.query(`SELECT category, market, target_pct, cover_weeks_target FROM planner.sell_through_targets`)).rows;
    const targets = {}, covers = {};
    rows.forEach(r => { var k = r.category + '|' + r.market;
      targets[k] = r.target_pct == null ? null : Number(r.target_pct);
      covers[k] = r.cover_weeks_target == null ? null : Number(r.cover_weeks_target); });
    const full = await stActuals(); const actuals = {}, actualsCover = {};
    for (const k of Object.keys(full)) { actuals[k] = full[k].st; actualsCover[k] = full[k].cover; }
    // avg PO cost per category → £ exposure
    const cost = {};
    (await pool.query(`SELECT pr.category, avg(l.cost_price) c FROM planner.purchase_order_lines l
      JOIN planner.products pr ON pr.sku=l.sku WHERE l.cost_price>0 AND pr.category IS NOT NULL GROUP BY 1`))
      .rows.forEach(r => { cost[r.category] = Number(r.c) || 0; });
    // LY seasonal pace: % of the prior season's full-year demand that had sold by this point last year — a
    // data-driven "expected sell-through to date" used to suggest a target where none is set.
    const pace = {};
    (await pool.query(`
      WITH ss AS (SELECT make_date(extract(year from current_date)::int - CASE WHEN extract(month from current_date)<3 THEN 1 ELSE 0 END, 3, 1) d),
      sly AS (SELECT (SELECT d FROM ss) - interval '1 year' d)
      SELECT p.category, upper(sa.country) market,
        sum(CASE WHEN sa.month >= (SELECT d FROM sly) AND sa.month < (date_trunc('month',current_date) - interval '1 year') THEN sa.units ELSE 0 END)::numeric todate,
        sum(CASE WHEN sa.month >= (SELECT d FROM sly) AND sa.month < (SELECT d FROM sly) + interval '12 months' THEN sa.units ELSE 0 END)::numeric fullseason
      FROM planner.sales_actuals sa JOIN planner.products p ON p.sku=sa.sku
      WHERE p.category IS NOT NULL GROUP BY 1,2`))
      .rows.forEach(r => { const t = Number(r.todate), f = Number(r.fullseason);
        if (f > 0) pace[r.category + '|' + r.market] = Math.round(t / f * 100); });
    // scorecard: status + plain-English recommendation per category × market (ST gap × cover position)
    const score = [];
    for (const k of Object.keys(full)) {
      const [cat, market] = k.split('|'); const a = full[k];
      const stT = targets[k], cvT = covers[k], cst = cost[cat] || 0, value = Math.round(a.onhand * cst), sug = pace[k] != null ? pace[k] : null;
      let status, rec;
      if (stT == null && cvT == null) {
        status = 'none';
        rec = sug != null ? 'No target set — LY pace suggests ~' + sug + '% by now. Set a target to monitor & alert.' : 'No target set — set one to monitor sell-through.';
      } else if (stT != null && a.st < stT - 5) {
        status = 'behind';
        const healthy = (cvT != null ? a.cover != null && a.cover >= cvT : a.cover != null && a.cover >= 12);
        rec = healthy
          ? a.st + '% vs ' + stT + '% target with ' + (a.cover != null ? a.cover + 'wk' : 'high') + ' cover — under-selling on healthy stock. Promote / markdown to shift ' + a.onhand.toLocaleString() + ' units (£' + value.toLocaleString() + ').'
          : a.st + '% vs ' + stT + '% target but cover ' + (a.cover != null ? a.cover + 'wk' : 'thin') + ' — selling slow yet stock is tight; monitor, don\'t over-discount.';
      } else if (stT != null && a.st > stT + 10) {
        status = 'ahead';
        const thin = cvT != null ? (a.cover != null && a.cover < cvT) : (a.cover != null && a.cover < 6);
        rec = thin
          ? a.st + '% vs ' + stT + '% target, cover only ' + (a.cover != null ? a.cover + 'wk' : 'thin') + ' — selling ahead of plan with thin cover. Buy / expedite (see Open-to-Buy).'
          : a.st + '% vs ' + stT + '% — strong sell-through, cover healthy. On track.';
      } else {
        status = 'on';
        rec = stT != null ? 'On track — ' + a.st + '% vs ' + stT + '% target' + (cvT != null && a.cover != null ? ' · cover ' + a.cover + 'wk vs ' + cvT + 'wk' : '') + '.'
          : 'Cover ' + (a.cover != null ? a.cover + 'wk' : '–') + ' vs ' + cvT + 'wk target.';
      }
      score.push({ cat, market, st: a.st, st_target: stT == null ? null : stT, cover: a.cover, cover_target: cvT == null ? null : cvT,
        onhand: a.onhand, run: a.run, value, suggest: sug, status, rec });
    }
    const rk = { behind: 0, ahead: 1, none: 2, on: 3 };
    score.sort((x, y) => (rk[x.status] - rk[y.status]) || (y.value - x.value) || (x.cat < y.cat ? -1 : 1));
    res.json({ categories: cats, markets: TARGET_MARKETS, targets, covers, actuals, actualsCover, score });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Season-to-date sell-through per category × market = sold ÷ (sold + on-hand). Season starts 1 Mar
// (FY Mar–Feb); on-hand pools AWD into US. A monthly-data proxy (no opening/intake history). Shared by
// the Targets view and Demand Actions.
async function stActuals() {
  const act = (await pool.query(`
    WITH ss AS (SELECT make_date(extract(year from current_date)::int - CASE WHEN extract(month from current_date)<3 THEN 1 ELSE 0 END, 3, 1) d),
    sold AS (SELECT p.category, upper(sa.country) market, sum(sa.units)::numeric u
      FROM planner.sales_actuals sa JOIN planner.products p ON p.sku=sa.sku, ss
      WHERE sa.month >= ss.d AND p.category IS NOT NULL GROUP BY 1,2),
    oh AS (SELECT p.category, upper(split_part(i.warehouse,'_',1)) market,
             sum(i.available + CASE WHEN i.warehouse='us_fba' THEN coalesce(p.awd_us,0) ELSE 0 END)::numeric u
      FROM planner.product_inventory i JOIN planner.products p ON p.sku=i.sku WHERE p.category IS NOT NULL GROUP BY 1,2)
    SELECT coalesce(sold.category,oh.category) category, coalesce(sold.market,oh.market) market,
      coalesce(sold.u,0) sold, coalesce(oh.u,0) onhand
    FROM sold FULL OUTER JOIN oh ON sold.category=oh.category AND sold.market=oh.market`)).rows;
  // last full month units per category × market = the run rate for cover
  const runMap = {};
  (await pool.query(`
    WITH lc AS (SELECT (date_trunc('month',current_date) - interval '1 month')::date m)
    SELECT p.category, upper(sa.country) market, sum(sa.units)::numeric u
    FROM planner.sales_actuals sa JOIN planner.products p ON p.sku=sa.sku, lc
    WHERE sa.month=lc.m AND p.category IS NOT NULL GROUP BY 1,2`)).rows
    .forEach(r => { runMap[r.category + '|' + r.market] = Number(r.u) || 0; });
  const actuals = {};
  act.forEach(r => { const s = Number(r.sold), o = Number(r.onhand); if (s + o > 0 && TARGET_MARKETS.includes(r.market)) {
    const key = r.category + '|' + r.market, run = runMap[key] || 0;
    actuals[key] = { st: Math.round(s / (s + o) * 100), sold: Math.round(s), onhand: Math.round(o),
      run: Math.round(run), cover: run > 0 ? Math.round(o / (run / 4.345)) : null }; } });
  return actuals;
}
app.post('/api/targets', async (req, res) => {
  const b = req.body || {}, cat = (b.category || '').trim(), mkt = (b.market || '').trim().toUpperCase();
  if (!cat || !mkt) return res.status(400).json({ error: 'category + market required' });
  // edit one metric at a time: 'st' → target_pct, 'cover' → cover_weeks_target (back-compat: target_pct in body)
  const col = b.metric === 'cover' ? 'cover_weeks_target' : 'target_pct';
  const raw = b.metric ? b.value : b.target_pct;
  const val = (raw === '' || raw == null) ? null : Number(raw);
  try {
    await pool.query(`INSERT INTO planner.sell_through_targets (category, market, ${col})
      VALUES ($1,$2,$3) ON CONFLICT (category, market) DO UPDATE SET ${col}=excluded.${col}, updated_at=now()`,
      [cat, mkt, val]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// DEMAND ▸ Actions — demand-side exceptions (category × market): sell-through vs target (markdown / stock
// signals) and trading vs last year. Monthly data; season-to-date ST + last complete month YoY.
app.get('/api/demand-actions', async (req, res) => {
  try {
    const tmap = {}, ctmap = {};
    (await pool.query(`SELECT category, market, target_pct, cover_weeks_target FROM planner.sell_through_targets`))
      .rows.forEach(t => { var k = t.category + '|' + t.market;
        if (t.target_pct != null) tmap[k] = Number(t.target_pct);
        if (t.cover_weeks_target != null) ctmap[k] = Number(t.cover_weeks_target); });
    const st = await stActuals();
    const cost = {};  // avg PO cost per category → £ impact
    (await pool.query(`SELECT pr.category, avg(l.cost_price) c FROM planner.purchase_order_lines l
      JOIN planner.products pr ON pr.sku=l.sku WHERE l.cost_price>0 AND pr.category IS NOT NULL GROUP BY 1`))
      .rows.forEach(r => { cost[r.category] = Number(r.c) || 0; });
    // concrete cover position for the guidance: "X on hand · ~Y wks cover at NN/mo [— below the Zwk target]"
    const coverPhrase = (k) => { const a = st[k]; if (!a || !a.onhand) return '';
      if (a.run > 0 && a.cover != null) { let s = a.onhand.toLocaleString() + ' on hand · ~' + a.cover + 'wk cover at ' + a.run.toLocaleString() + '/mo';
        const ct = ctmap[k]; if (ct) s += (a.cover < ct ? ' — below the ' + ct + 'wk target' : ' — at/above the ' + ct + 'wk target'); return s; }
      return a.onhand.toLocaleString() + ' units on hand'; };
    const out = [];
    const push = (severity, type, cat, market, detail, impact) =>
      out.push({ key: type + '|' + cat + '|' + market, severity, type, cat, market, detail, impact: Math.round(impact || 0) });
    // calendar events carry an id in the key so multiple events on the same cat×market stay distinct
    const pushCal = (severity, cat, market, id, detail, impact) =>
      out.push({ key: 'Event approaching|' + cat + '|' + market + '|' + id, severity, type: 'Event approaching', cat, market, detail, impact: Math.round(impact || 0) });
    for (const k of Object.keys(tmap)) {
      const a = st[k]; if (!a) continue; const tgt = tmap[k], gap = a.st - tgt, [cat, mkt] = k.split('|'); const c = cost[cat] || 0; const cp = coverPhrase(k);
      if (gap <= -10) push('high', 'Behind sell-through target', cat, mkt, a.st + '% sold vs ' + tgt + '% target (' + gap + 'pts) — markdown / promo risk · ' + cp, a.onhand * c);
      else if (gap <= -5) push('amber', 'Behind sell-through target', cat, mkt, a.st + '% vs ' + tgt + '% target (' + gap + 'pts behind) · ' + cp, a.onhand * c);
      else if (gap >= 15 && a.onhand > 0) push('amber', 'Ahead of target — check availability', cat, mkt, a.st + '% sold vs ' + tgt + '% — selling faster than planned · ' + cp, 0);
    }
    const ly = (await pool.query(`
      WITH lc AS (SELECT (date_trunc('month',current_date) - interval '1 month')::date m)
      SELECT p.category, upper(sa.country) market,
        sum(CASE WHEN sa.month=lc.m THEN sa.units ELSE 0 END)::numeric ty,
        sum(CASE WHEN sa.month=(lc.m - interval '1 year')::date THEN sa.units ELSE 0 END)::numeric ly
      FROM planner.sales_actuals sa JOIN planner.products p ON p.sku=sa.sku, lc
      WHERE p.category IS NOT NULL AND sa.month IN (lc.m, (lc.m - interval '1 year')::date)
      GROUP BY 1,2`)).rows;
    ly.forEach(r => { if (!TARGET_MARKETS.includes(r.market)) return; const ty = Number(r.ty), lyv = Number(r.ly), c = cost[r.category] || 0;
      if (lyv < 20 && ty < 20) return; const ch = lyv > 0 ? (ty / lyv - 1) : (ty > 0 ? 1 : 0);
      var cpl = coverPhrase(r.category + '|' + r.market);
      if (ch <= -0.3) push('amber', 'Trading behind last year', r.category, r.market, 'last month ' + Math.round(ty).toLocaleString() + 'u vs ' + Math.round(lyv).toLocaleString() + 'u LY (' + Math.round(ch * 100) + '%)' + (cpl ? ' · ' + cpl : ''), Math.max(0, lyv - ty) * c);
      else if (ch >= 0.4) push('info', 'Trading ahead of last year', r.category, r.market, 'last month ' + Math.round(ty).toLocaleString() + 'u vs ' + Math.round(lyv).toLocaleString() + 'u LY (+' + Math.round(ch * 100) + '%)' + (cpl ? ' — ' + cpl : ' — check cover'), 0);
    });
    // Upcoming trading-calendar events (next 6 weeks): is there cover for the planned spike?
    const calEv = (await pool.query(`
      SELECT id, to_char(event_date,'DD Mon') d, (event_date - current_date) days_until,
             upper(coalesce(market,'')) market, coalesce(category,'') category,
             coalesce(nullif(title,''), nullif(event_type,''), 'Event') title,
             coalesce(uplift_pct,0) uplift, coalesce(sku_list,'') sku_list
      FROM planner.trading_calendar
      WHERE event_date IS NOT NULL AND event_date >= current_date
        AND event_date <= current_date + interval '42 days'
      ORDER BY event_date`)).rows;
    calEv.forEach(e => {
      const mkt = e.market, cat = e.category, u = Number(e.uplift) || 0;
      const du = Number(e.days_until), wk = Math.max(0, Math.round(du / 7));
      const when = e.d + (wk <= 1 ? ' (this week)' : ' (in ' + wk + ' wks)');
      const upTxt = u > 0 ? ' · +' + u + '% planned' : '';
      if (mkt && mkt !== 'ALL' && cat && cat !== 'ALL' && TARGET_MARKETS.includes(mkt)) {
        const a = st[cat + '|' + mkt], ct = ctmap[cat + '|' + mkt], c = cost[cat] || 0;
        if (a && a.run > 0) {
          const upRun = a.run * (1 + u / 100), covUp = Math.round(a.onhand / (upRun / 4.345)), extra = Math.max(0, a.run * (u / 100));
          const base = e.title + ' ' + when + upTxt + ' · ' + a.onhand.toLocaleString() + ' on hand · ~' + covUp + 'wk cover at uplifted ' + Math.round(upRun).toLocaleString() + '/mo';
          if (covUp < wk) pushCal('high', cat, mkt, e.id, base + " — won't cover to the event, build stock now", extra * c);
          else if (ct && covUp < ct) pushCal('amber', cat, mkt, e.id, base + ' — below the ' + ct + 'wk target for the spike', extra * c);
          else pushCal('info', cat, mkt, e.id, base + ' — cover looks adequate', 0);
        } else {
          pushCal('info', cat, mkt, e.id, e.title + ' ' + when + upTxt + ' — review cover (no recent run rate)', 0);
        }
      } else {
        const tail = e.sku_list ? ' · SKUs: ' + e.sku_list : (cat && cat !== 'ALL' ? ' · ' + cat : '');
        pushCal('info', cat || 'ALL', mkt || 'ALL', e.id, e.title + ' ' + when + upTxt + tail + ' — review cover', 0);
      }
    });
    // attach lifecycle state (dismissed / snoozed / done); snooze expires back to open
    const today = (await pool.query(`SELECT to_char(current_date,'YYYY-MM-DD') d`)).rows[0].d;
    const state = {};
    (await pool.query(`SELECT action_key, status, to_char(snooze_until,'YYYY-MM-DD') snooze_until FROM planner.demand_action_state`))
      .rows.forEach(s => { state[s.action_key] = s; });
    out.forEach(o => { const s = state[o.key]; o.status = 'open'; o.snooze_until = null;
      if (s) { if (s.status === 'snoozed' && s.snooze_until && s.snooze_until >= today) { o.status = 'snoozed'; o.snooze_until = s.snooze_until; }
        else if (s.status !== 'snoozed') o.status = s.status; } });
    const rank = { high: 0, amber: 1, info: 2 };
    out.sort((a, b) => (rank[a.severity] - rank[b.severity]) || (b.impact - a.impact) || (a.cat < b.cat ? -1 : 1));
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Lifecycle: dismiss / snooze / done a demand action (by stable key); restore (status:'open') deletes it.
app.post('/api/demand-actions/state', async (req, res) => {
  const b = req.body || {}, key = (b.key || '').trim();
  if (!key) return res.status(400).json({ error: 'key required' });
  try {
    if (b.status === 'open' || b.restore) { await pool.query(`DELETE FROM planner.demand_action_state WHERE action_key=$1`, [key]); return res.json({ ok: true }); }
    const days = String(parseInt(b.snooze_days, 10) || 7);
    await pool.query(`INSERT INTO planner.demand_action_state (action_key, status, snooze_until, note)
      VALUES ($1,$2, CASE WHEN $2='snoozed' THEN current_date + ($3||' days')::interval ELSE NULL END, $4)
      ON CONFLICT (action_key) DO UPDATE SET status=excluded.status, snooze_until=excluded.snooze_until, note=excluded.note, updated_at=now()`,
      [key, b.status || 'dismissed', days, b.note || null]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Read the lifecycle state map (for client-side-computed demand actions to apply their own
// done/snooze/dismiss status). Snoozes past their date read back as 'open'.
app.get('/api/demand-actions/state', async (req, res) => {
  try {
    const today = (await pool.query(`SELECT to_char(current_date,'YYYY-MM-DD') d`)).rows[0].d;
    const state = {};
    (await pool.query(`SELECT action_key, status, to_char(snooze_until,'YYYY-MM-DD') snooze_until FROM planner.demand_action_state`))
      .rows.forEach(s => {
        let status = s.status, snooze_until = null;
        if (s.status === 'snoozed') { if (s.snooze_until && s.snooze_until >= today) { snooze_until = s.snooze_until; } else status = 'open'; }
        if (status !== 'open') state[s.action_key] = { status, snooze_until };
      });
    res.json({ today, state });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Trading calendar (DEMAND ▸ Calendar) — events by date × market; editable + CSV up/down.
const CAL_FIELDS = { event_date: 'date', market: 'text', category: 'text', sku_list: 'text', event_type: 'text', title: 'text', uplift_pct: 'numeric', notes: 'text' };
app.get('/api/trading-calendar', async (req, res) => {
  try {
    const r = await pool.query(`SELECT id, to_char(event_date,'YYYY-MM-DD') event_date, coalesce(market,'') market,
      coalesce(category,'ALL') category, coalesce(sku_list,'') sku_list, coalesce(event_type,'') event_type, coalesce(title,'') title,
      uplift_pct, coalesce(notes,'') notes
      FROM planner.trading_calendar ORDER BY event_date NULLS LAST, id`);
    const cats = (await pool.query(`SELECT DISTINCT category FROM planner.products WHERE in_planning_scope AND category IS NOT NULL ORDER BY category`)).rows.map(c => c.category);
    res.json({ events: r.rows, categories: cats });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/trading-calendar', async (req, res) => {     // create a row (blank or with fields)
  const b = req.body || {};
  try { const r = await pool.query(`INSERT INTO planner.trading_calendar (event_date, market, category, sku_list, event_type, title, uplift_pct, notes)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [b.event_date || null, b.market || 'ALL', b.category || 'ALL', b.sku_list || null, b.event_type || null, b.title || null,
     (b.uplift_pct === '' || b.uplift_pct == null ? null : b.uplift_pct), b.notes || null]);
    res.json({ ok: true, id: r.rows[0].id }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/trading-calendar/import', async (req, res) => {   // declared before /:id so it isn't caught by it
  const rows = Array.isArray(req.body && req.body.rows) ? req.body.rows : [];
  const replace = !!(req.body && req.body.replace);
  try {
    if (replace) await pool.query(`DELETE FROM planner.trading_calendar`);
    let n = 0;
    for (const r of rows) {
      if (!(r.event_date || r.title || r.event_type)) continue;
      await pool.query(`INSERT INTO planner.trading_calendar (event_date, market, category, sku_list, event_type, title, uplift_pct, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [r.event_date || null, r.market || 'ALL', r.category || 'ALL', r.sku_list || null, r.event_type || null, r.title || null,
         (r.uplift_pct === '' || r.uplift_pct == null ? null : r.uplift_pct), r.notes || null]); n++;
    }
    res.json({ ok: true, imported: n });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/trading-calendar/:id/delete', async (req, res) => {
  try { await pool.query(`DELETE FROM planner.trading_calendar WHERE id=$1`, [req.params.id]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/trading-calendar/:id', (req, res) =>
  patch(res, 'planner.trading_calendar', 'id', req.params.id, CAL_FIELDS, req.body, 'bigint'));

// ── SAMPLES — writes ─────────────────────────────────────────────────────────────
const SAMPLE_FIELDS = { supplier_id:'bigint', supplier_name:'text', recipient_company:'text', first_name:'text',
  last_name:'text', address_line1:'text', address_line2:'text', city:'text', region:'text', postcode:'text',
  country:'text', phone:'text', completion_date_required:'date', purpose:'text[]', notes:'text', status:'text',
  supplier_expected_completion:'date', tracking_code:'text', carrier:'text' };
// When tracking is newly set on a sample, drop a timeline note announcing the shipment (an unread
// notification for the other side). Posted as the supplier (the shipment event).
async function maybeShippedNote(sampleId, body, authorKind, email){
  if(!body || body.tracking_code===undefined) return;
  const trk = String(body.tracking_code||'').trim(); if(!trk) return;
  const cur = (await pool.query(`SELECT coalesce(tracking_code,'') tc FROM planner.sample_requests WHERE id=$1::bigint`, [sampleId])).rows[0];
  if(cur && cur.tc===trk) return;   // unchanged → no note
  const car = String(body.carrier||'').trim();
  try { await pool.query(`INSERT INTO planner.sample_notes (sample_id, author_kind, author_email, body) VALUES ($1::bigint,$2,$3,$4)`,
    [sampleId, authorKind||'supplier', email||null, 'Order shipped — tracking '+trk+(car?' ('+car+')':'')]); } catch(e){}
}
app.post('/api/supply/sample-create', async (req, res) => {
  const b = req.body || {};
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (b.supplier_name && b.supplier_name.trim()) await client.query(   // keep the supplier picker a real dropdown
      `INSERT INTO planner.suppliers(name,kind) SELECT $1,'supplier' WHERE NOT EXISTS (SELECT 1 FROM planner.suppliers WHERE lower(trim(name))=lower(trim($1)))`, [b.supplier_name.trim()]);
    const ins = await client.query(`INSERT INTO planner.sample_requests
      (supplier_id, supplier_name, recipient_company, first_name, last_name, address_line1, address_line2, city, region, postcode, country, phone, completion_date_required, purpose, notes, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
      [b.supplier_id||null, b.supplier_name||null, b.recipient_company||null, b.first_name||null, b.last_name||null,
       b.address_line1||null, b.address_line2||null, b.city||null, b.region||null, b.postcode||null, b.country||null, b.phone||null,
       b.completion_date_required||null, Array.isArray(b.purpose)?b.purpose:null, b.notes||null, b.created_by||'planner']);
    const id = ins.rows[0].id, ref = 'SR-' + id;
    await client.query(`UPDATE planner.sample_requests SET ref=$1 WHERE id=$2`, [ref, id]);
    for (const l of (Array.isArray(b.lines)?b.lines:[])) { if (!l || !l.sku) continue;
      await client.query(`INSERT INTO planner.sample_request_lines (sample_id, sku, qty) VALUES ($1,$2,$3)`,
        [id, String(l.sku).trim(), Math.round(Number(l.qty)||0)]); }
    await client.query('COMMIT');
    res.json({ ok:true, id, ref });
  } catch (e) { await client.query('ROLLBACK').catch(()=>{}); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});
app.post('/api/supply/sample/:id/lines', async (req, res) => {   // replace all lines (paste + inline edits)
  const lines = Array.isArray(req.body && req.body.lines) ? req.body.lines : [];
  const client = await pool.connect();
  try { await client.query('BEGIN');
    await client.query(`DELETE FROM planner.sample_request_lines WHERE sample_id=$1::bigint`, [req.params.id]);
    for (const l of lines) { if (!l || !l.sku) continue;
      await client.query(`INSERT INTO planner.sample_request_lines (sample_id, sku, qty) VALUES ($1::bigint,$2,$3)`,
        [req.params.id, String(l.sku).trim(), Math.round(Number(l.qty)||0)]); }
    // SKUs/qty changed after acceptance → flag for re-acceptance (treated like not-yet-accepted)
    await client.query(`UPDATE planner.sample_requests SET change_requested=true, updated_at=now() WHERE id=$1::bigint AND accepted_at IS NOT NULL`, [req.params.id]);
    await client.query('COMMIT'); res.json({ ok:true, count: lines.length });
  } catch (e) { await client.query('ROLLBACK').catch(()=>{}); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});
app.post('/api/supply/sample/:id/accept', async (req, res) => {   // supplier accepts the request
  try { await pool.query(`UPDATE planner.sample_requests SET accepted_at=coalesce(accepted_at,now()), change_requested=false, updated_at=now() WHERE id=$1::bigint`, [req.params.id]);
    res.json({ ok:true }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/supply/sample/:id/delete', async (req, res) => {
  try { await pool.query(`DELETE FROM planner.sample_requests WHERE id=$1::bigint`, [req.params.id]); res.json({ ok:true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/supply/sample/:id', (req, res) =>     // patch fields (admin edits + supplier expected/tracking/carrier)
  patch(res, 'planner.sample_requests', 'id', req.params.id, SAMPLE_FIELDS, req.body, 'bigint'));
app.post('/api/supply/sample-note', async (req, res) => {
  const b = req.body || {}; const sid = b.sample_id || b.id;   // accept either key (admin grid vs portal preview)
  if (!sid || !b.body) return res.status(400).json({ error: 'sample_id and body required' });
  try { const kind = b.author_kind || 'internal';
    const email = kind === 'internal' ? internalAuthor(req, b.author_email) : (b.author_email || null);
    const r = await pool.query(`INSERT INTO planner.sample_notes (sample_id, author_kind, author_email, body)
    VALUES ($1::bigint,$2,$3,$4) RETURNING id`, [sid, kind, email, String(b.body)]);
    res.json({ id: r.rows[0].id }); } catch (e) { res.status(500).json({ error: e.message }); }
});
// Admin-gated sample actions matching the portal-view body shapes ({id} in body) — used by the
// admin "preview as supplier" (the real portal uses the /api/portal/sample-* equivalents).
app.post('/api/supply/sample-accept', async (req, res) => {
  const id = req.body && req.body.id; if(!id) return res.status(400).json({ error: 'id required' });
  try { await pool.query(`UPDATE planner.sample_requests SET accepted_at=coalesce(accepted_at,now()), change_requested=false, updated_at=now() WHERE id=$1::bigint`, [id]); res.json({ ok:true }); }
  catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/supply/sample-update', async (req, res) => {
  const b = req.body || {}; if(!b.id) return res.status(400).json({ error: 'id required' });
  await maybeShippedNote(b.id, b, 'supplier', 'D&B');   // preview/admin acting as supplier → "D&B as <supplier>"
  patch(res, 'planner.sample_requests', 'id', b.id, { supplier_expected_completion:'date', tracking_code:'text', carrier:'text' }, b, 'bigint'); });
app.post('/api/supply/sample-charge', async (req, res) => {
  const b = req.body || {}; if(!b.id) return res.status(400).json({ error: 'id required' });
  try { const s = (await pool.query(`SELECT ref, supplier_name FROM planner.sample_requests WHERE id=$1::bigint`, [b.id])).rows[0];
    if(!s) return res.status(404).json({ error: 'sample not found' });
    const r = await pool.query(`INSERT INTO planner.supplier_charges (source_type, source_ref, supplier_name, freight_cost, product_cost, description, created_by)
      VALUES ('sample',$1,$2,$3,$4,$5,$6) RETURNING id`, [s.ref, s.supplier_name, Number(b.freight_cost)||0, Number(b.product_cost)||0, b.description||null, b.created_by||'preview']); res.json({ ok:true, id: r.rows[0].id }); }
  catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/supply/sample-attachment', async (req, res) => {   // admin/preview upload to a sample (body {id})
  const b = req.body || {}; if(!b.id || !b.data_base64) return res.status(400).json({ error: 'id and data_base64 required' });
  try { const s = (await pool.query(`SELECT ref FROM planner.sample_requests WHERE id=$1::bigint`, [b.id])).rows[0]; if(!s) return res.status(404).json({ error: 'sample not found' });
    const buf = Buffer.from(String(b.data_base64).replace(/^data:[^;]+;base64,/, ''), 'base64');
    const r = await pool.query(`INSERT INTO planner.portal_attachments (po, filename, mime, byte_size, data, uploaded_by, category) VALUES ($1,$2,$3,$4,$5,$6,'sample') RETURNING id`,
      [s.ref, b.filename||'attachment', b.mime||'application/octet-stream', buf.length, buf, b.uploaded_by||'PO PLAN']); res.json({ ok:true, id: r.rows[0].id }); }
  catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/supply/sample-attachment-remove', async (req, res) => {
  const id = req.body && req.body.att_id;
  try { await pool.query(`DELETE FROM planner.portal_attachments WHERE id=$1 AND category='sample'`, [id]); res.json({ ok:true }); }
  catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/supply/sample-note-read/:id', async (req, res) => {
  try { const read = !(req.body && req.body.read === false);
    await pool.query(`UPDATE planner.sample_notes SET read_at=${read?'now()':'NULL'} WHERE id=$1::bigint`, [req.params.id]);
    res.json({ ok:true, read }); } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── SUPPLIER CHARGES (samples + shipments) → Other Payment on accept ─────────────
app.post('/api/supply/charge-create', async (req, res) => {
  const b = req.body || {};
  if (!b.source_type || !b.source_ref) return res.status(400).json({ error: 'source_type and source_ref required' });
  try { const r = await pool.query(`INSERT INTO planner.supplier_charges
    (source_type, source_ref, supplier_name, freight_cost, product_cost, description, created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [b.source_type, b.source_ref, b.supplier_name||null, Number(b.freight_cost)||0, Number(b.product_cost)||0, b.description||null, b.created_by||null]);
    res.json({ ok:true, id: r.rows[0].id }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/supply/charge/:id/reject', async (req, res) => {
  try { await pool.query(`UPDATE planner.supplier_charges SET status='rejected' WHERE id=$1::bigint AND status='pending'`, [req.params.id]);
    res.json({ ok:true }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/supply/charge/:id/accept', async (req, res) => {   // accept → Other Payment (deposits, is_deposit=false)
  const client = await pool.connect();
  try { await client.query('BEGIN');
    const c = (await client.query(`SELECT * FROM planner.supplier_charges WHERE id=$1::bigint FOR UPDATE`, [req.params.id])).rows[0];
    if (!c) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'charge not found' }); }
    if (c.status === 'accepted') { await client.query('ROLLBACK'); return res.json({ ok:true, already:true, other_payment_id:c.other_payment_id }); }
    const fr = Math.round(Number(c.freight_cost)||0), pr = Math.round(Number(c.product_cost)||0), amount = (Number(c.freight_cost)||0)+(Number(c.product_cost)||0);
    let label;
    if (c.source_type === 'shipment') {   // put the shipment's linked POs in the Other Payment description
      const pos = (await client.query(`SELECT string_agg(po,', ' ORDER BY po) pos FROM planner.purchase_orders WHERE shipment_ref=$1`, [c.source_ref])).rows[0].pos || '';
      label = `Shipment ${c.source_ref}${pos?` (POs: ${pos})`:''}`;
    } else label = `Sample ${c.source_ref}`;
    const desc = `${label} — freight $${fr} + product $${pr}${c.description?` · ${c.description}`:''}`;
    const op = await client.query(`INSERT INTO planner.deposits (is_deposit, supplier_name, amount, description, reference, date_due)
      VALUES (false, $1, $2, $3, $4, current_date) RETURNING id`, [c.supplier_name||null, amount, desc, c.source_ref]);
    await client.query(`UPDATE planner.supplier_charges SET status='accepted', accepted_at=now(), other_payment_id=$1 WHERE id=$2::bigint`, [op.rows[0].id, req.params.id]);
    await client.query('COMMIT');
    res.json({ ok:true, other_payment_id: op.rows[0].id, amount });
  } catch (e) { await client.query('ROLLBACK').catch(()=>{}); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
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

// ════════════════════════════════════════════════════════════════════════════
// SUPPLIER PORTAL — real magic-link login + single-page supplier view.
// Two surfaces: GET /portal (login page, or the portal app once authed). Auth is a
// magic-link token → httpOnly session cookie (psid). All data + writes are scoped
// SERVER-SIDE to the session's supplier(s); a supplier can never see or touch
// another supplier's POs. Exempt from the planner-key gate (see middleware above).
// ════════════════════════════════════════════════════════════════════════════
// Scoped PO calc for the portal — same date/payment logic as the admin purchase-orders endpoint
// (so the figures match exactly), filtered to the supplier ($1 = supplier names[]). Landed-cost /
// duty / freight / ERP fields the portal renderer doesn't use are omitted.
const POS_SQL_PORTAL = `
  WITH base AS (
    SELECT po.*, s.credit_days, s.credit_type,
      coalesce(po.start_deposit_pct_override, s.start_deposit_pct, 0) sp,
      coalesce(po.completion_pct_override, s.completion_pct, 0) cp,
      coalesce(lv.line_value, po.order_value_estimation) value_est,
      coalesce(po.supplier_invoice_total, lv.line_value, po.order_value_estimation, 0) val,
      fx.flex_id, fx.landing_date flex_landing, fx.departure_date flex_departure,
      sh.landing_date sh_landing, sh.delivery_date sh_delivery, sh.departure_date sh_departure, sh.arrival_date sh_arrival,
      sh.mode sh_mode, fx.mode flex_mode,
      s.production_days, b.sea_lead_time_days sea_lead, b.air_lead_time_days air_lead,
      (CASE WHEN lower(coalesce(sh.mode, CASE WHEN fx.mode ILIKE 'air%' THEN 'air' END, 'sea'))='air'
            THEN b.air_lead_time_days ELSE b.sea_lead_time_days END) transit_lead,
      b.country_code branch_country
    FROM planner.purchase_orders po
    LEFT JOIN planner.suppliers s ON s.id=po.supplier_id
    LEFT JOIN planner.branches b ON b.name=po.branch
    LEFT JOIN planner.shipments sh ON sh.shipment_ref=po.shipment_ref
    LEFT JOIN LATERAL (SELECT sum(l.qty*l.cost_price) line_value FROM planner.purchase_order_lines l WHERE l.po=po.po) lv ON true
    LEFT JOIN LATERAL (SELECT f.* FROM planner.flexport_shipments f
      WHERE f.flex_id=po.flexport_reference OR f.shipment_name=po.po OR f.shipment_name=po.shipment_ref
      ORDER BY (f.flex_id=po.flexport_reference) DESC NULLS LAST LIMIT 1) fx ON true
    WHERE po.supplier_name = ANY($1)
  ), calc AS (
    SELECT *,
      round(val*sp/100,2) start_calc,
      coalesce(pay_start_deposit_assigned, round(val*sp/100,2)) start_paid,
      round((sp+cp)/100*val - coalesce(pay_start_deposit_assigned, val*sp/100),2) completion_calc,
      coalesce(end_production_overide, CASE WHEN start_production IS NOT NULL AND production_days IS NOT NULL
        THEN (start_production + (production_days||' days')::interval)::date END) eff_prod_end
    FROM base
  ), calc2 AS (
    SELECT *, coalesce(sh_departure, flex_departure,
      CASE WHEN eff_prod_end IS NOT NULL THEN (eff_prod_end + interval '7 days')::date END) eff_ship FROM calc
  ), calc3 AS (
    SELECT *, coalesce(sh_delivery, sh_arrival, sh_landing, flex_landing,
      CASE WHEN eff_ship IS NOT NULL AND transit_lead IS NOT NULL THEN (eff_ship + (transit_lead||' days')::interval)::date END) eff_delivery FROM calc2
  ), calc4 AS (
    SELECT *, coalesce(balance_due_date_overide, ((CASE WHEN credit_type='on_shipment' THEN eff_ship ELSE eff_delivery END)
      + (coalesce(credit_days,0)||' days')::interval)::date) bal_due_date FROM calc3
  )
  SELECT po, supplier_name, status,
    to_char(start_production,'YYYY-MM-DD') prod_start,
    to_char(eff_prod_end,'YYYY-MM-DD') prod_end,
    to_char(eff_ship,'YYYY-MM-DD') ship,
    flexport_reference, flex_id, value_est,
    round(supplier_invoice_total,2) final_invoice, round(val,2) value_used,
    sp start_pct, cp completion_pct, greatest(100-sp-cp,0) balance_pct,
    start_paid start_dep,
    CASE WHEN val>0 THEN coalesce(pay_completion_assigned, completion_calc) END completion,
    CASE WHEN val>0 THEN round(val - start_paid - coalesce(pay_completion_assigned, completion_calc),2) END balance_owing,
    start_calc, round(pay_start_deposit_assigned,2) start_assigned, to_char(pay_start_deposit_date,'YYYY-MM-DD') start_date,
    completion_calc, round(pay_completion_assigned,2) completion_assigned, to_char(pay_completion_date,'YYYY-MM-DD') completion_date,
    round(pay_balance_1_amount,2) balance_1_amount, to_char(pay_balance_1_date,'YYYY-MM-DD') balance_1_date,
    to_char(bal_due_date,'YYYY-MM-DD') balance_due,
    coalesce(deposit_ref,'') deposit_ref, coalesce(shipment_ref,'') shipment,
    coalesce(client,'') client, coalesce(dispatch_order_ref,'') dispatch_order_ref,
    coalesce(final_delivery_address,'') final_delivery_address, coalesce(crossdock_skus,'') crossdock_skus,
    coalesce(prod_no,'') prod_no, coalesce(batch_id,'') batch_id,
    coalesce(branch,'') branch, coalesce(nullif(country_code,''), branch_country, '') country,
    coalesce(client_requirements,'') client_requirements, coalesce(sales_order_ref,'') sales_order_ref,
    to_char(client_deadline_date,'YYYY-MM-DD') client_deadline, coalesce(client_po_ref,'') client_po_ref,
    -- Packing & Labelling (migration 086) + Direct to Client details approval
    coalesce(pack_polybags,false) pack_polybags, coalesce(pack_polybags_notes,'') pack_polybags_notes,
    coalesce(pack_dnb_barcodes,false) pack_dnb_barcodes, coalesce(pack_dnb_barcodes_notes,'') pack_dnb_barcodes_notes,
    coalesce(pack_rfid_barcodes,false) pack_rfid_barcodes, coalesce(pack_rfid_barcodes_notes,'') pack_rfid_barcodes_notes,
    coalesce(pack_dnb_carton,false) pack_dnb_carton, coalesce(pack_dnb_carton_notes,'') pack_dnb_carton_notes,
    coalesce(pack_client_carton,false) pack_client_carton, coalesce(pack_client_carton_notes,'') pack_client_carton_notes,
    coalesce(pack_pallet_notes,'') pack_pallet_notes, coalesce(pack_other_notes,'') pack_other_notes,
    to_char(dtc_accepted_at,'YYYY-MM-DD HH24:MI') dtc_accepted_at, coalesce(dtc_accepted_by,'') dtc_accepted_by
  FROM calc4 ORDER BY po`;
function loadPortalPage() { try { return readFileSync(new URL('./supply/portal.html', import.meta.url), 'utf8'); } catch { return '<!doctype html><meta charset=utf8>portal page missing'; } }
const PORTAL_PAGE = DEV ? null : loadPortalPage();
const portalToken = () => crypto.randomBytes(24).toString('hex');
// active supplier rows (id+name) for an email — an email may map to >1 supplier
const portalSuppliers = (email) => pool.query(
  `SELECT supplier_id, supplier_name FROM planner.supplier_portal_users WHERE lower(email)=lower($1) AND active=true AND coalesce(supplier_name,'')<>''`,
  [email]).then(r => r.rows);
async function sendMagicEmail(email, url) {
  if (process.env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: process.env.PORTAL_FROM || 'Dock & Bay <portal@dockandbay.com>', to: [email],
          subject: 'Your Dock & Bay supplier portal link',
          html: `<p>Hi,</p><p>Here's your link to the Dock &amp; Bay supplier portal (valid 7 days):</p><p><a href="${url}">${url}</a></p><p>If you didn't request this, you can ignore this email.</p>` }) });
      return;
    } catch (e) { console.error('[portal email] Resend failed:', e.message); }
  }
  console.log('[portal email] (no RESEND_API_KEY) magic link for ' + email + ':\n  ' + url);   // dev fallback
}
// ── DEMAND ▸ KPIs ▸ In Stock rate ────────────────────────────────────────────────────────────────────────
// For each market × channel: of the ACTIVE products available in that channel, how many have > threshold units
// on hand (3PL stock for the 3PL channel, FBA stock for FBA). Threshold toggleable per channel-type (3PL/FBA).
// "A players" = market_tier 'A'. Active = in_planning_scope.
app.get('/api/kpi/in-stock', async (req, res) => {
  const t3pl = Number(req.query.t3pl); const tfba = Number(req.query.tfba);
  const T3 = isFinite(t3pl) ? t3pl : 5, TF = isFinite(tfba) ? tfba : 5;
  const grp = ['Core', 'Seasonal', 'Non-Core'].includes(req.query.group) ? req.query.group : '';   // core/seasonal split
  try {
    const prods = (await pool.query(`SELECT sku, coalesce(in_planning_scope,false) act, coalesce(market_tier,'') tier, coalesce(core_seasonal,'') cs,
        coalesce(available_uk_dtc,false) OR coalesce(available_uk_b2b,false) uk3, coalesce(available_uk_fba,false) ukf,
        coalesce(available_us_dtc,false) OR coalesce(available_us_b2b,false) us3, coalesce(available_us_fba,false) usf,
        coalesce(available_eu_dtc,false) OR coalesce(available_eu_b2b,false) eu3, coalesce(available_eu_fba,false) euf,
        coalesce(available_au_dtc,false) au3, coalesce(available_au_fba,false) auf, coalesce(available_ca_fba,false) caf,
        coalesce(discontinue_date_final,'') disc, coalesce(discontinue_date_au_final,'') disc_au, coalesce(discontinue_date_ca,'') disc_ca
      FROM planner.products`)).rows;
    const inv = {}; (await pool.query(`SELECT sku, warehouse, coalesce(available,0) a FROM planner.product_inventory`)).rows
      .forEach(r => { (inv[r.sku] = inv[r.sku] || {})[r.warehouse] = Number(r.a) || 0; });
    const today = new Date().toISOString().slice(0, 10);
    const dpast = s => { const m = /^(\d{4}-\d{2}-\d{2})/.exec(s || ''); return !!(m && m[1] < today); };   // discontinued = a past date
    const discontinued = (p, mk) => dpast(mk === 'AU' ? (p.disc_au || p.disc) : mk === 'CA' ? (p.disc_ca || p.disc) : p.disc);
    const combos = [
      ['US 3PL', 'us3', 'us_3pl', T3, '3PL', 'US'], ['UK 3PL', 'uk3', 'uk_3pl', T3, '3PL', 'UK'], ['EU 3PL', 'eu3', 'eu_3pl', T3, '3PL', 'EU'], ['AU 3PL', 'au3', 'au_3pl', T3, '3PL', 'AU'],
      ['US FBA', 'usf', 'us_fba', TF, 'FBA', 'US'], ['UK FBA', 'ukf', 'uk_fba', TF, 'FBA', 'UK'], ['EU FBA', 'euf', 'eu_fba', TF, 'FBA', 'EU'], ['AU FBA', 'auf', 'au_fba', TF, 'FBA', 'AU'], ['CA FBA', 'caf', 'ca_fba', TF, 'FBA', 'CA'],
    ];
    const rows = combos.map(([label, fld, wh, thr, ct, mk]) => {
      let skus = 0, instock = 0, aSkus = 0, aInstock = 0;
      for (const p of prods) { if (!p.act || !p[fld] || discontinued(p, mk)) continue; if (grp && p.cs !== grp) continue; const ok = ((inv[p.sku] || {})[wh] || 0) > thr;
        skus++; if (ok) instock++; if (p.tier === 'A') { aSkus++; if (ok) aInstock++; } }
      return { channel: label, type: ct, skus, instock, pct: skus ? Math.round(instock / skus * 100) : 0, a_skus: aSkus, a_instock: aInstock, a_pct: aSkus ? Math.round(aInstock / aSkus * 100) : 0 };
    });
    const tot = type => { const r = rows.filter(x => x.type === type); const s = k => r.reduce((a, x) => a + x[k], 0);
      return { channel: 'Total ' + type, type: 'TOTAL', skus: s('skus'), instock: s('instock'), pct: s('skus') ? Math.round(s('instock') / s('skus') * 100) : 0, a_skus: s('a_skus'), a_instock: s('a_instock'), a_pct: s('a_skus') ? Math.round(s('a_instock') / s('a_skus') * 100) : 0 }; };
    res.json({ ok: true, t3pl: T3, tfba: TF, group: grp || 'All', rows: rows.filter(r => r.type === '3PL').concat([tot('3PL')], rows.filter(r => r.type === 'FBA'), [tot('FBA')]) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// market × channel → inventory warehouse (3PL stock serves DTC+B2B; FBA stock serves FBA)
const KPI_WH = [['US 3PL', 'US', 'us_3pl', '3PL'], ['UK 3PL', 'UK', 'uk_3pl', '3PL'], ['EU 3PL', 'EU', 'eu_3pl', '3PL'], ['AU 3PL', 'AU', 'au_3pl', '3PL'],
  ['US FBA', 'US', 'us_fba', 'FBA'], ['UK FBA', 'UK', 'uk_fba', 'FBA'], ['EU FBA', 'EU', 'eu_fba', 'FBA'], ['AU FBA', 'AU', 'au_fba', 'FBA'], ['CA FBA', 'CA', 'ca_fba', 'FBA']];
// shared base for the inventory KPIs: per-SKU meta + on-hand by warehouse + 12-mo demand by warehouse
async function kpiBase() {
  const prods = {};
  (await pool.query(`SELECT sku, coalesce(in_planning_scope,false) act, coalesce(market_tier,'') tier, coalesce(core_seasonal,'') cs,
      coalesce(discontinue_date_final,'') disc, coalesce(discontinue_date_au_final,'') disc_au, coalesce(discontinue_date_ca,'') disc_ca,
      coalesce(cogs_uk_3pl_final,0) cogs_UK, coalesce(cogs_us_3pl_final,0) cogs_US, coalesce(cogs_eu_3pl_final,0) cogs_EU, coalesce(cogs_au_3pl_final,0) cogs_AU, coalesce(cogs_ca_3pl_final,0) cogs_CA
    FROM planner.products`)).rows.forEach(r => { prods[r.sku] = r; });
  const onhand = {}; (await pool.query(`SELECT sku, warehouse, coalesce(available,0) a FROM planner.product_inventory`)).rows
    .forEach(r => { (onhand[r.sku] = onhand[r.sku] || {})[r.warehouse] = Number(r.a) || 0; });
  const dem = {}; (await pool.query(`SELECT sku, warehouse, sum(units) u FROM planner.forecast_outputs
      WHERE month >= date_trunc('month',current_date) AND month < date_trunc('month',current_date) + interval '12 months' GROUP BY sku, warehouse`)).rows
    .forEach(r => { (dem[r.sku] = dem[r.sku] || {})[r.warehouse] = Number(r.u) || 0; });
  return { prods, onhand, dem };
}
const kpiToday = () => new Date().toISOString().slice(0, 10);
const kpiDpast = s => { const m = /^(\d{4}-\d{2}-\d{2})/.exec(s || ''); return !!(m && m[1] < kpiToday()); };
const kpiDisc = (p, co) => kpiDpast(co === 'AU' ? (p.disc_au || p.disc) : co === 'CA' ? (p.disc_ca || p.disc) : p.disc);

// ── SUPPLY ▸ BI core engine — fluid net-position projection (Phase 0b). Per SKU × country:
//    cover = (on_hand + inbound) / avg monthly demand; urgency band; need-to-target qty.
//    Reuses kpiBase() (same on-hand + 12-mo demand as the KPIs) so BI == KPIs == buy plan inputs.
//    TARGET_MONTHS default ≈12 weeks; exact per-SKU/category/market targets get ported from the BUY artifact next.
const BI_COUNTRIES = ['UK', 'US', 'EU', 'AU', 'CA'];
const BI_TARGET_MONTHS = 3;
async function biProjection() {
  const { prods, onhand, dem } = await kpiBase();
  const whCo = wh => String(wh || '').split('_')[0].toUpperCase();   // 'us_3pl' -> 'US'
  // cover targets (WEEKS) — same source as the buy plan: SKU override ▸ category, per warehouse. Default 12wk.
  const catCover = {}, skuOvr = {}, skuCat = {};
  (await pool.query(`SELECT category, warehouse, target_cover_weeks::float w FROM planner.category_target_cover`)).rows
    .forEach(r => { (catCover[r.category] = catCover[r.category] || {})[r.warehouse] = r.w; });
  (await pool.query(`SELECT sku, warehouse, target_cover_weeks::float w FROM planner.product_target_cover_override`)).rows
    .forEach(r => { (skuOvr[r.sku] = skuOvr[r.sku] || {})[r.warehouse] = r.w; });
  const skuCq = {};
  (await pool.query(`SELECT p.sku, coalesce(p.category,'') category, coalesce(sl.carton_qty,0) cq
     FROM planner.products p LEFT JOIN planner.sku_labels sl ON sl.sku=p.sku`)).rows
    .forEach(r => { skuCat[r.sku] = r.category; skuCq[r.sku] = Number(r.cq) || 0; });
  const twFor = (sku, wh) => { const o = skuOvr[sku] && skuOvr[sku][wh]; if (o != null) return o;
    const c = catCover[skuCat[sku]] && catCover[skuCat[sku]][wh]; return c != null ? c : null; };
  const inb = {};   // inbound open-PO units per sku|country
  (await pool.query(`SELECT l.sku, upper(coalesce(nullif(p.country_code,''), b.country_code, '')) country, sum(l.qty)::numeric qty
      FROM planner.purchase_orders p JOIN planner.purchase_order_lines l ON l.po=p.po
      LEFT JOIN planner.branches b ON b.name=p.branch
      WHERE coalesce(p.status,'') NOT ILIKE '%complete%' AND coalesce(l.qty,0)>0
      GROUP BY l.sku, country`)).rows
    .forEach(r => { if (!r.country) return; (inb[r.sku] = inb[r.sku] || {})[r.country] = Number(r.qty) || 0; });
  const WK_PER_MO = 4.345, DEF_WK = 12;
  const rows = [];
  for (const sku of Object.keys(prods)) {
    const p = prods[sku]; if (!p.act) continue;
    const oh = {}, dm = {}, twNum = {}, twDen = {};   // twNum/twDen → demand-weighted target weeks per country
    for (const wh of Object.keys(onhand[sku] || {})) { const co = whCo(wh); oh[co] = (oh[co] || 0) + onhand[sku][wh]; }
    for (const wh of Object.keys(dem[sku] || {})) { const co = whCo(wh); dm[co] = (dm[co] || 0) + dem[sku][wh];
      const tw = twFor(sku, wh); if (tw != null) { twNum[co] = (twNum[co] || 0) + tw * dem[sku][wh]; twDen[co] = (twDen[co] || 0) + dem[sku][wh]; } }
    for (const co of BI_COUNTRIES) {
      if (kpiDisc(p, co)) continue;
      const d12 = dm[co] || 0, onh = oh[co] || 0, inbound = (inb[sku] || {})[co] || 0;
      if (d12 <= 0 && onh <= 0 && inbound <= 0) continue;
      const tgtWk = (twDen[co] > 0) ? (twNum[co] / twDen[co]) : DEF_WK;   // weeks → months
      const TM = tgtWk / WK_PER_MO;
      const avgM = d12 / 12;
      const coverNow = avgM > 0 ? onh / avgM : (onh > 0 ? 999 : 0);
      const coverInb = avgM > 0 ? (onh + inbound) / avgM : (onh + inbound > 0 ? 999 : 0);
      // urgency keys off cover INCLUDING inbound (what's on the way counts) — so a SKU with stock arriving
      // isn't flagged critical. (Timing-aware: does inbound land before stockout? = refinement once we
      // carry PO arrival dates into the projection.)
      let urgency;
      if (avgM <= 0) urgency = (onh + inbound > 0 ? 'surplus' : 'none');
      else if (coverInb < 1) urgency = 'critical';
      else if (coverInb < TM) urgency = 'soon';
      else if (coverInb > TM * 2) urgency = 'surplus';
      else urgency = 'ok';
      rows.push({ sku, country: co, category: p.cs || '', tier: p.tier || '',
        on_hand: Math.round(onh), inbound: Math.round(inbound), demand_12m: Math.round(d12),
        cover_now: avgM > 0 ? Math.round(coverNow * 10) / 10 : null,
        cover_with_inbound: avgM > 0 ? Math.round(coverInb * 10) / 10 : null,
        target_months: Math.round(TM * 10) / 10, target_weeks: Math.round(tgtWk),
        need_qty: Math.max(0, Math.round(avgM * TM - (onh + inbound))),
        carton_qty: skuCq[sku] || 0, urgency });
    }
  }
  return rows;
}
app.get('/api/supply/bi/projection', async (req, res) => {
  try {
    const rows = await biProjection();
    const counts = { critical: 0, soon: 0, ok: 0, surplus: 0, none: 0 };
    rows.forEach(r => { counts[r.urgency] = (counts[r.urgency] || 0) + 1; });
    res.json({ ok: true, target_months: BI_TARGET_MONTHS, counts, rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── BI ▸ REALLOCATE (Phase 1) — within an EDITABLE production (Future/Production), move order-plan qty for a
// SKU from a destination with SURPLUS cover to one that's SHORT, so the same run covers demand. Zero-sum
// (supplier total unchanged). Capped by the donor's line qty and by keeping the donor at/above target.
async function biReallocations() {
  const proj = await biProjection();
  const pj = {}; proj.forEach(r => { pj[r.sku + '|' + r.country] = r; });
  const lines = (await pool.query(`
    SELECT p.prod_no, p.po, upper(coalesce(nullif(p.country_code,''), b.country_code, '')) country,
           l.sku, l.qty::int qty, coalesce(p.supplier_name,'') supplier
    FROM planner.purchase_orders p
    JOIN planner.purchase_order_lines l ON l.po=p.po
    LEFT JOIN planner.branches b ON b.name=p.branch
    WHERE coalesce(p.prod_no,'')<>'' AND (p.status ILIKE 'future%' OR p.status ILIKE 'production%') AND coalesce(l.qty,0)>0`)).rows;
  const coPO = {}, qByCoSku = {};   // prod→country→{po,supplier} ; prod→sku→country→qty
  lines.forEach(r => { if (!r.country) return;
    (coPO[r.prod_no] = coPO[r.prod_no] || {})[r.country] = coPO[r.prod_no][r.country] || { po: r.po, supplier: r.supplier };
    (((qByCoSku[r.prod_no] = qByCoSku[r.prod_no] || {})[r.sku] = qByCoSku[r.prod_no][r.sku] || {})[r.country] = (qByCoSku[r.prod_no][r.sku][r.country] || 0) + r.qty); });
  const recs = [];
  for (const prod of Object.keys(qByCoSku)) {
    const cos = Object.keys(coPO[prod] || {});
    for (const sku of Object.keys(qByCoSku[prod])) {
      const qByCo = qByCoSku[prod][sku];
      const donors = [];
      for (const co of cos) { const r = pj[sku + '|' + co], lq = qByCo[co] || 0;
        if (!r || lq <= 0 || r.urgency !== 'surplus') continue;
        const avgM = r.demand_12m / 12;
        const spare = Math.floor(avgM > 0 ? (r.on_hand + r.inbound) - (r.target_months || 3) * avgM : (r.on_hand + r.inbound));
        if (spare > 0) donors.push({ co, po: coPO[prod][co].po, spare: Math.min(spare, lq), cover: r.cover_with_inbound, avgM, sup: coPO[prod][co].supplier }); }
      if (!donors.length) continue;
      donors.sort((a, b) => b.spare - a.spare);
      for (const co of cos) { const r = pj[sku + '|' + co];
        if (!r || (r.urgency !== 'critical' && r.urgency !== 'soon')) continue;
        const need = r.need_qty || 0; if (need <= 0) continue;
        const donor = donors.find(d => d.co !== co && d.spare > 0); if (!donor) continue;
        let move = Math.min(need, donor.spare); if (move <= 0) continue;
        // round to whole cartons, minimum 1 carton — capped by what the donor can spare (skip if <1 carton fits)
        const cq = r.carton_qty || 0;
        if (cq > 0) { let cartons = Math.max(1, Math.round(move / cq)); if (cartons * cq > donor.spare) cartons = Math.floor(donor.spare / cq); if (cartons < 1) continue; move = cartons * cq; }
        const avgR = r.demand_12m / 12, dr = pj[sku + '|' + donor.co];
        donor.spare -= move;
        recs.push({ key: 'bi-realloc|' + sku + '|' + donor.po + '|' + coPO[prod][co].po,
          prod_no: prod, sku, supplier: coPO[prod][co].supplier || donor.sup || '',
          from_po: donor.po, from_country: donor.co, to_po: coPO[prod][co].po, to_country: co, qty: move,
          from_cover: donor.cover, from_cover_after: donor.avgM > 0 ? Math.round((((dr.on_hand + dr.inbound) - move) / donor.avgM) * 10) / 10 : null,
          to_cover: r.cover_with_inbound, to_cover_after: avgR > 0 ? Math.round(((r.on_hand + r.inbound + move) / avgR) * 10) / 10 : null,
          to_urgency: r.urgency, to_need: need }); }
    }
  }
  return recs;
}
app.get('/api/supply/bi/reallocations', async (req, res) => {
  try {
    const recs = await biReallocations();
    const st = {}; (await pool.query(`SELECT action_key, status, to_char(snooze_until,'YYYY-MM-DD') snooze_until FROM planner.supply_action_state`)).rows
      .forEach(s => { st[s.action_key] = s; });
    const today = kpiToday();
    const open = recs.filter(rc => { const s = st[rc.key]; if (!s) return true;
      if (s.status === 'dismissed' || s.status === 'applied') return false;
      if (s.status === 'snoozed' && s.snooze_until && s.snooze_until >= today) return false; return true; });
    open.sort((a, b) => (a.to_urgency === 'critical' ? 0 : 1) - (b.to_urgency === 'critical' ? 0 : 1) || b.qty - a.qty);
    res.json({ ok: true, target_months: BI_TARGET_MONTHS, count: open.length, recs: open });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Apply a reallocation: zero-sum move of `qty` of `sku` from from_po → to_po (transactional), then mark applied.
app.post('/api/supply/bi/apply-reallocation', async (req, res) => {
  const b = req.body || {};
  const fromPo = String(b.from_po || ''), toPo = String(b.to_po || ''), sku = String(b.sku || ''), qty = parseInt(b.qty, 10) || 0, key = String(b.key || '');
  if (!fromPo || !toPo || !sku || qty <= 0) return res.status(400).json({ error: 'from_po, to_po, sku and qty>0 required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const fq = (await client.query(`SELECT qty FROM planner.purchase_order_lines WHERE po=$1 AND sku=$2 FOR UPDATE`, [fromPo, sku])).rows[0];
    if (!fq || Number(fq.qty) < qty) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Donor line no longer has ' + qty + ' units (now ' + (fq ? fq.qty : 0) + ') — recompute.' }); }
    await client.query(`UPDATE planner.purchase_order_lines SET qty=qty-$3 WHERE po=$1 AND sku=$2`, [fromPo, sku, qty]);
    await client.query(`INSERT INTO planner.purchase_order_lines (po_sku, po, sku, qty) VALUES ($1||'|'||$2,$1,$2,$3)
      ON CONFLICT (po_sku) DO UPDATE SET qty=coalesce(planner.purchase_order_lines.qty,0)+$3`, [toPo, sku, qty]);
    if (key) await client.query(`INSERT INTO planner.supply_action_state (action_key, status, note)
      VALUES ($1,'applied',$2) ON CONFLICT (action_key) DO UPDATE SET status='applied', note=excluded.note, snooze_until=NULL`,
      [key, 'reallocated ' + qty + ' ' + sku + ' ' + fromPo + '→' + toPo]);
    await client.query('COMMIT');
    res.json({ ok: true, moved: qty, from_po: fromPo, to_po: toPo, sku });
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

// ── BI ▸ CONTAINER FILL (Phase 2) — shipments with spare pallet capacity (<20) that could carry urgent/near-term
// buys for the SAME destination, made by a supplier already ON that shipment. Bounded by need (no over-fill) and
// by the spare pallets. Rush flag when the supplier's production lead time exceeds days-to-departure.
async function biContainerFill() {
  const proj = await biProjection();
  const skuMeta = {};
  (await pool.query(`SELECT p.sku, coalesce(p.supplier,'') supplier, coalesce(sl.pallet_qty::numeric,0) pallet_qty
     FROM planner.products p LEFT JOIN planner.sku_labels sl ON sl.sku=p.sku`)).rows
    .forEach(r => { skuMeta[r.sku] = { supplier: r.supplier, pq: Number(r.pallet_qty) || 0 }; });
  const supDays = {};
  (await pool.query(`SELECT name, coalesce(production_days,0) d FROM planner.suppliers`)).rows
    .forEach(r => { supDays[(r.name || '').toLowerCase()] = Number(r.d) || 0; });
  // departure: shipment date ▸ (Flexport) ▸ ESTIMATE = master-PO production-end + 4 days (Ben's rule) when blank.
  const ships = (await pool.query(`
    SELECT s.shipment_ref,
      to_char(coalesce(s.departure_date,
        (coalesce(mp.end_production_overide, mp.start_production + (coalesce(sup.production_days,0)||' days')::interval) + interval '4 days')::date
      ),'YYYY-MM-DD') departure,
      (s.departure_date IS NULL) departure_estimated,
      upper(coalesce(nullif(mp.country_code,''), b.country_code, '')) country,
      coalesce((SELECT sum(l.qty::numeric/NULLIF(sl.pallet_qty::numeric,0))
        FROM planner.purchase_orders po JOIN planner.purchase_order_lines l ON l.po=po.po
        LEFT JOIN planner.sku_labels sl ON sl.sku=l.sku WHERE po.shipment_ref=s.shipment_ref),0) pallets
    FROM planner.shipments s
    LEFT JOIN planner.purchase_orders mp ON mp.po=coalesce(s.master_po,s.shipment_ref)
    LEFT JOIN planner.branches b ON b.name=mp.branch
    LEFT JOIN planner.suppliers sup ON lower(sup.name)=lower(mp.supplier_name)
    WHERE coalesce(s.status,'') NOT ILIKE '%complete%'`)).rows;
  const shipSupPO = {};
  (await pool.query(`SELECT po.shipment_ref, lower(coalesce(po.supplier_name,'')) sup, po.po
     FROM planner.purchase_orders po WHERE coalesce(po.shipment_ref,'')<>''`)).rows
    .forEach(r => { (shipSupPO[r.shipment_ref] = shipSupPO[r.shipment_ref] || {})[r.sup] = shipSupPO[r.shipment_ref][r.sup] || r.po; });
  const today = kpiToday(), recs = [];
  for (const s of ships) {
    let spare = Math.floor(20 - (Number(s.pallets) || 0));
    if (spare <= 0 || !s.country) continue;
    const supPO = shipSupPO[s.shipment_ref] || {};
    const daysToDep = s.departure ? Math.round((new Date(s.departure) - new Date(today)) / 86400000) : null;
    const cands = proj.filter(r => r.country === s.country && (r.urgency === 'critical' || r.urgency === 'soon') && r.need_qty > 0
        && skuMeta[r.sku] && skuMeta[r.sku].pq > 0 && supPO[(skuMeta[r.sku].supplier || '').toLowerCase()])
      .sort((a, b) => (a.urgency === 'critical' ? 0 : 1) - (b.urgency === 'critical' ? 0 : 1) || b.need_qty - a.need_qty);
    for (const r of cands) {
      if (spare <= 0) break;
      const pq = skuMeta[r.sku].pq, fit = Math.floor(spare * pq);
      let add = Math.min(r.need_qty, fit); if (add <= 0) continue;
      // round to whole cartons, minimum 1 carton — capped by what fits in the spare pallets (skip if <1 fits)
      const cq = r.carton_qty || 0;
      if (cq > 0) { const fitC = Math.floor(fit / cq); if (fitC < 1) continue; let cartons = Math.max(1, Math.round(add / cq)); if (cartons > fitC) cartons = fitC; add = cartons * cq; }
      const used = Math.round((add / pq) * 10) / 10; spare = Math.max(0, Math.round((spare - used) * 10) / 10);
      const sup = skuMeta[r.sku].supplier, avgM = r.demand_12m / 12;
      recs.push({ key: 'bi-fill|' + s.shipment_ref + '|' + r.sku, shipment_ref: s.shipment_ref, country: s.country,
        departure: s.departure, departure_estimated: s.departure_estimated, days_to_departure: daysToDep, sku: r.sku, supplier: sup,
        to_po: supPO[(sup || '').toLowerCase()], add_qty: add, pallets_used: used,
        rush: daysToDep != null && daysToDep < (supDays[(sup || '').toLowerCase()] || 0), urgency: r.urgency,
        cover: r.cover_with_inbound, cover_after: avgM > 0 ? Math.round(((r.on_hand + r.inbound + add) / avgM) * 10) / 10 : null, need: r.need_qty });
    }
  }
  return recs;
}
app.get('/api/supply/bi/container-fill', async (req, res) => {
  try {
    const recs = await biContainerFill();
    const st = {}; (await pool.query(`SELECT action_key, status, to_char(snooze_until,'YYYY-MM-DD') snooze_until FROM planner.supply_action_state`)).rows
      .forEach(s => { st[s.action_key] = s; });
    const today = kpiToday();
    const open = recs.filter(rc => { const s = st[rc.key]; if (!s) return true;
      if (s.status === 'dismissed' || s.status === 'applied') return false;
      if (s.status === 'snoozed' && s.snooze_until && s.snooze_until >= today) return false; return true; });
    res.json({ ok: true, target_months: BI_TARGET_MONTHS, count: open.length, recs: open });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Apply a container-fill: ADD add_qty of sku to the on-board PO (increases the supplier order), then mark applied.
app.post('/api/supply/bi/apply-fill', async (req, res) => {
  const b = req.body || {};
  const toPo = String(b.to_po || ''), sku = String(b.sku || ''), qty = parseInt(b.qty, 10) || 0, key = String(b.key || '');
  if (!toPo || !sku || qty <= 0) return res.status(400).json({ error: 'to_po, sku and qty>0 required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`INSERT INTO planner.purchase_order_lines (po_sku, po, sku, qty) VALUES ($1||'|'||$2,$1,$2,$3)
      ON CONFLICT (po_sku) DO UPDATE SET qty=coalesce(planner.purchase_order_lines.qty,0)+$3`, [toPo, sku, qty]);
    if (key) await client.query(`INSERT INTO planner.supply_action_state (action_key, status, note)
      VALUES ($1,'applied',$2) ON CONFLICT (action_key) DO UPDATE SET status='applied', note=excluded.note, snooze_until=NULL`,
      [key, 'container-fill +' + qty + ' ' + sku + ' → ' + toPo]);
    await client.query('COMMIT');
    res.json({ ok: true, added: qty, to_po: toPo, sku });
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

// ── BI ▸ CONSOLIDATE (Phase 3) — under-filled shipments (0<pallets<20) to the SAME destination whose departures
// fall within a window and whose combined load fits one 20-pallet container → merge into the largest. One fewer
// container of freight. Departure = shipment date ▸ estimate (prod-end+4d). Greedy bin-pack per country.
async function biConsolidations() {
  const WINDOW = 14, CAP = 20;
  const ships = (await pool.query(`
    SELECT s.shipment_ref,
      to_char(coalesce(s.departure_date,(coalesce(mp.end_production_overide, mp.start_production + (coalesce(sup.production_days,0)||' days')::interval) + interval '4 days')::date),'YYYY-MM-DD') departure,
      (s.departure_date IS NULL) dep_est,
      upper(coalesce(nullif(mp.country_code,''), b.country_code, '')) country,
      round(coalesce((SELECT sum(l.qty::numeric/NULLIF(sl.pallet_qty::numeric,0))
        FROM planner.purchase_orders po JOIN planner.purchase_order_lines l ON l.po=po.po
        LEFT JOIN planner.sku_labels sl ON sl.sku=l.sku WHERE po.shipment_ref=s.shipment_ref),0)::numeric,1) pallets
    FROM planner.shipments s
    LEFT JOIN planner.purchase_orders mp ON mp.po=coalesce(s.master_po,s.shipment_ref)
    LEFT JOIN planner.branches b ON b.name=mp.branch
    LEFT JOIN planner.suppliers sup ON lower(sup.name)=lower(mp.supplier_name)
    WHERE coalesce(s.status,'') NOT ILIKE '%complete%'`)).rows
    .filter(s => s.country && Number(s.pallets) > 0 && Number(s.pallets) < CAP && s.departure);
  const byCo = {}; ships.forEach(s => { (byCo[s.country] = byCo[s.country] || []).push(s); });
  const recs = [];
  for (const co of Object.keys(byCo)) {
    const list = byCo[co].slice().sort((a, b) => new Date(a.departure) - new Date(b.departure) || Number(b.pallets) - Number(a.pallets));
    const bins = [];
    for (const s of list) {
      let placed = false;
      for (const bin of bins) {
        if (bin.pallets + Number(s.pallets) <= CAP && Math.abs(new Date(s.departure) - new Date(bin.anchor.departure)) / 86400000 <= WINDOW) {
          bin.members.push(s); bin.pallets = Math.round((bin.pallets + Number(s.pallets)) * 10) / 10; placed = true; break; }
      }
      if (!placed) bins.push({ anchor: s, members: [s], pallets: Number(s.pallets) });
    }
    for (const bin of bins) {
      if (bin.members.length < 2) continue;
      const sorted = bin.members.slice().sort((a, b) => Number(b.pallets) - Number(a.pallets));
      const keep = sorted[0];
      for (let i = 1; i < sorted.length; i++) { const m = sorted[i];
        recs.push({ key: 'bi-consol|' + keep.shipment_ref + '|' + m.shipment_ref, country: co,
          keep: keep.shipment_ref, keep_pallets: Number(keep.pallets), keep_departure: keep.departure,
          merge: m.shipment_ref, merge_pallets: Number(m.pallets), merge_departure: m.departure,
          combined: Math.round((Number(keep.pallets) + Number(m.pallets)) * 10) / 10, dep_est: !!(keep.dep_est || m.dep_est) }); }
    }
  }
  return recs;
}
app.get('/api/supply/bi/consolidations', async (req, res) => {
  try {
    const recs = await biConsolidations();
    const st = {}; (await pool.query(`SELECT action_key, status, to_char(snooze_until,'YYYY-MM-DD') snooze_until FROM planner.supply_action_state`)).rows
      .forEach(s => { st[s.action_key] = s; });
    const today = kpiToday();
    const open = recs.filter(rc => { const s = st[rc.key]; if (!s) return true;
      if (s.status === 'dismissed' || s.status === 'applied') return false;
      if (s.status === 'snoozed' && s.snooze_until && s.snooze_until >= today) return false; return true; });
    open.sort((a, b) => b.combined - a.combined);
    res.json({ ok: true, count: open.length, recs: open });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// ERP COMPARE — open/draft ERP POs that are NOT in the planner's purchase_orders, limited to POs whose
// supplier matches a product supplier in the planner (planner.suppliers, kind='supplier') so freight/
// internal/test vendors (Flexport, HMRC, print shops, …) are excluded.
const ERP_COMPARE_SQL = `
  SELECT e.po, coalesce(e.erp_po_id,'') erp_po_id, coalesce(e.supplier_name,'') supplier_name,
         coalesce(e.status,'') status, to_char(e.order_date,'YYYY-MM-DD') order_date,
         e.total_value, coalesce(e.currency,'') currency,
         to_char(e.final_delivery_date,'YYYY-MM-DD') final_delivery_date,
         to_char(e.synced_at,'YYYY-MM-DD HH24:MI') synced_at,
         (i.po IS NOT NULL) ignored,
         -- branch: the ERP mirror has no branch field, so derive a best-effort label from the PO reference
         -- (region token + FBA/Crossdock/B2B/Direct marker). Shown as '—' when nothing parses.
         NULLIF(trim(
           coalesce(substring(upper(e.po) from 'PO-[0-9]+([A-Z]{2})'),'') || ' ' ||
           CASE WHEN e.po ~* 'crossdock' THEN 'Crossdock' WHEN e.po ~* 'fba' THEN 'FBA'
                WHEN e.po ~* 'b2b' THEN 'B2B' WHEN e.po ~* 'direct' THEN 'Direct' ELSE '' END
         ),'') branch
  FROM planner.erp_purchase_orders e
  LEFT JOIN planner.purchase_orders p ON p.po = e.po
  LEFT JOIN planner.erp_compare_ignored i ON i.po = e.po
  WHERE p.po IS NULL                                                    -- not in the planner's PO list
    AND coalesce(e.status,'') !~* '(complete|cancel|void|closed|received)'   -- open / draft only
    AND EXISTS (SELECT 1 FROM planner.suppliers s
                WHERE lower(trim(s.name)) = lower(trim(e.supplier_name))
                  AND coalesce(s.kind,'supplier') = 'supplier')         -- product supplier in the planner
  ORDER BY (i.po IS NOT NULL), e.supplier_name NULLS LAST, e.po`;
// active (non-ignored) count — drives the open-actions item
async function erpCompareActiveCount() {
  try { return (await pool.query(`SELECT count(*)::int c FROM (${ERP_COMPARE_SQL}) z WHERE NOT z.ignored`)).rows[0].c; }
  catch (e) { return 0; }
}
app.get('/api/supply/bi/erp-compare', async (req, res) => {
  try {
    const rows = (await pool.query(ERP_COMPARE_SQL)).rows;
    res.json({ ok: true, count: rows.filter(r => !r.ignored).length, rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Ignore / un-ignore an ERP PO on the compare report.
app.post('/api/supply/bi/erp-compare/ignore', async (req, res) => {
  const b = req.body || {}; if (!b.po) return res.status(400).json({ error: 'po required' });
  try {
    if (b.ignore === false) await pool.query(`DELETE FROM planner.erp_compare_ignored WHERE po=$1`, [b.po]);
    else await pool.query(`INSERT INTO planner.erp_compare_ignored (po, ignored_by) VALUES ($1,$2)
      ON CONFLICT (po) DO UPDATE SET ignored_by=excluded.ignored_by, ignored_at=now()`, [b.po, b.by || 'admin']);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Apply a consolidation: re-point the merge shipment's POs onto the keep shipment, then mark applied.
app.post('/api/supply/bi/apply-consolidate', async (req, res) => {
  const b = req.body || {};
  const keep = String(b.keep || ''), merge = String(b.merge || ''), key = String(b.key || '');
  if (!keep || !merge || keep === merge) return res.status(400).json({ error: 'distinct keep + merge shipment refs required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query(`UPDATE planner.purchase_orders SET shipment_ref=$1 WHERE shipment_ref=$2`, [keep, merge]);
    if (key) await client.query(`INSERT INTO planner.supply_action_state (action_key, status, note)
      VALUES ($1,'applied',$2) ON CONFLICT (action_key) DO UPDATE SET status='applied', note=excluded.note, snooze_until=NULL`,
      [key, 'consolidated ' + merge + ' → ' + keep + ' (' + r.rowCount + ' PO)']);
    await client.query('COMMIT');
    res.json({ ok: true, repointed: r.rowCount, keep, merge });
  } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});
const kpiGroup = q => (['Core', 'Seasonal', 'Non-Core'].includes(q) ? q : '');
const kpiTotals = (rows, keys) => { const out = { TOTAL3: { channel: 'Total 3PL', type: 'TOTAL' }, TOTALF: { channel: 'Total FBA', type: 'TOTAL' } };
  rows.forEach(r => { const t = r.type === '3PL' ? out.TOTAL3 : out.TOTALF; keys.forEach(k => { t[k] = (t[k] || 0) + (Number(r[k]) || 0); }); });
  return out; };

// KPI 1 — Slow moving / overstock: active SKUs whose months-of-cover exceeds the threshold (on-hand vs 12-mo demand)
app.get('/api/kpi/slow-moving', async (req, res) => {
  const cover = Number(req.query.cover); const COV = isFinite(cover) && cover > 0 ? cover : 6; const grp = kpiGroup(req.query.group);
  try {
    const { prods, onhand, dem } = await kpiBase();
    const rows = KPI_WH.map(([label, co, wh, ct]) => { let skus = 0, units = 0, value = 0, slow = 0, sUnits = 0, sValue = 0;
      for (const sku in prods) { const p = prods[sku]; if (!p.act || kpiDisc(p, co)) continue; if (grp && p.cs !== grp) continue;
        const oh = (onhand[sku] || {})[wh] || 0; if (oh <= 0) continue; const d12 = (dem[sku] || {})[wh] || 0;
        const covM = d12 > 0 ? oh * 12 / d12 : Infinity; const val = oh * (Number(p['cogs_' + co.toLowerCase()]) || 0);
        skus++; units += oh; value += val; if (covM > COV) { slow++; sUnits += oh; sValue += Math.round(val); } }
      return { channel: label, type: ct, slow_skus: slow, slow_units: sUnits, slow_value: sValue, stocked_skus: skus }; });
    const t = kpiTotals(rows, ['slow_skus', 'slow_units', 'slow_value', 'stocked_skus']);
    res.json({ ok: true, cover: COV, group: grp || 'All', rows: rows.filter(r => r.type === '3PL').concat([t.TOTAL3], rows.filter(r => r.type === 'FBA'), [t.TOTALF]) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// KPI 2 — Inventory months of cover: on-hand units, value and weighted months of cover per market×channel
app.get('/api/kpi/inventory-cover', async (req, res) => {
  const grp = kpiGroup(req.query.group);
  try {
    const { prods, onhand, dem } = await kpiBase();
    const rows = KPI_WH.map(([label, co, wh, ct]) => { let units = 0, value = 0, d12 = 0;
      for (const sku in prods) { const p = prods[sku]; if (!p.act || kpiDisc(p, co)) continue; if (grp && p.cs !== grp) continue;
        const oh = (onhand[sku] || {})[wh] || 0; units += oh; value += oh * (Number(p['cogs_' + co.toLowerCase()]) || 0); d12 += (dem[sku] || {})[wh] || 0; }
      const monthly = d12 / 12; const cover = monthly > 0 ? Math.round(units / monthly * 10) / 10 : null;
      return { channel: label, type: ct, units, value: Math.round(value), monthly_demand: Math.round(monthly), months_cover: cover }; });
    const t = kpiTotals(rows, ['units', 'value']);
    ['TOTAL3', 'TOTALF'].forEach(k => { const sub = rows.filter(r => r.type === (k === 'TOTAL3' ? '3PL' : 'FBA')); const md = sub.reduce((a, r) => a + r.monthly_demand, 0);
      t[k].monthly_demand = md; t[k].months_cover = md > 0 ? Math.round(t[k].units / md * 10) / 10 : null; });
    res.json({ ok: true, group: grp || 'All', rows: rows.filter(r => r.type === '3PL').concat([t.TOTAL3], rows.filter(r => r.type === 'FBA'), [t.TOTALF]) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// KPI 3 — Stockout risk: active SKUs whose cumulative forecast demand over the next N months exceeds on-hand
app.get('/api/kpi/stockout-risk', async (req, res) => {
  const within = Number(req.query.within); const N = isFinite(within) && within > 0 ? Math.min(12, within) : 3; const grp = kpiGroup(req.query.group);
  try {
    const prods = {}; (await pool.query(`SELECT sku, coalesce(in_planning_scope,false) act, coalesce(core_seasonal,'') cs, coalesce(market_tier,'') tier,
        coalesce(discontinue_date_final,'') disc, coalesce(discontinue_date_au_final,'') disc_au, coalesce(discontinue_date_ca,'') disc_ca FROM planner.products`)).rows.forEach(r => { prods[r.sku] = r; });
    const onhand = {}; (await pool.query(`SELECT sku, warehouse, coalesce(available,0) a FROM planner.product_inventory`)).rows.forEach(r => { (onhand[r.sku] = onhand[r.sku] || {})[r.warehouse] = Number(r.a) || 0; });
    // first N months of demand per sku/warehouse
    const demN = {}; (await pool.query(`SELECT sku, warehouse, sum(units) u FROM planner.forecast_outputs
        WHERE month >= date_trunc('month',current_date) AND month < date_trunc('month',current_date) + ($1||' months')::interval GROUP BY sku, warehouse`, [N])).rows
      .forEach(r => { (demN[r.sku] = demN[r.sku] || {})[r.warehouse] = Number(r.u) || 0; });
    const rows = KPI_WH.map(([label, co, wh, ct]) => { let active = 0, atRisk = 0, unitsShort = 0;
      for (const sku in prods) { const p = prods[sku]; if (!p.act || kpiDisc(p, co)) continue; if (grp && p.cs !== grp) continue;
        const need = (demN[sku] || {})[wh] || 0; if (need <= 0) continue; active++; const oh = (onhand[sku] || {})[wh] || 0;
        if (need > oh) { atRisk++; unitsShort += (need - oh); } }
      return { channel: label, type: ct, at_risk_skus: atRisk, units_short: unitsShort, with_demand: active, pct: active ? Math.round(atRisk / active * 100) : 0 }; });
    const t = kpiTotals(rows, ['at_risk_skus', 'units_short', 'with_demand']);
    ['TOTAL3', 'TOTALF'].forEach(k => { t[k].pct = t[k].with_demand ? Math.round(t[k].at_risk_skus / t[k].with_demand * 100) : 0; });
    res.json({ ok: true, within: N, group: grp || 'All', rows: rows.filter(r => r.type === '3PL').concat([t.TOTAL3], rows.filter(r => r.type === 'FBA'), [t.TOTALF]) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// KPI 4 — Discontinued holding stock: SKUs past their discontinue date that still carry on-hand units
app.get('/api/kpi/discontinued-stock', async (req, res) => {
  try {
    const { prods, onhand } = await kpiBase();
    const rows = KPI_WH.map(([label, co, wh, ct]) => { let skus = 0, units = 0, value = 0;
      for (const sku in prods) { const p = prods[sku]; if (!kpiDisc(p, co)) continue; const oh = (onhand[sku] || {})[wh] || 0; if (oh <= 0) continue;
        skus++; units += oh; value += Math.round(oh * (Number(p['cogs_' + co.toLowerCase()]) || 0)); }
      return { channel: label, type: ct, skus, units, value }; });
    const t = kpiTotals(rows, ['skus', 'units', 'value']);
    res.json({ ok: true, rows: rows.filter(r => r.type === '3PL').concat([t.TOTAL3], rows.filter(r => r.type === 'FBA'), [t.TOTALF]) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Snapshot the current SKU-level forecast (forecast_outputs) into forecast_runs + forecasts(level='sku').
// Run monthly (Diviyaj wires an n8n trigger) and/or manually from the KPIs page so true forecast accuracy
// accrues: a dated snapshot of what we forecast, later compared to actuals.
app.post('/api/forecast/snapshot', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const hz = (await client.query(`SELECT min(month) s, max(month) e, count(*) n FROM planner.forecast_outputs`)).rows[0];
    if (!hz.s || Number(hz.n) === 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'no forecast to snapshot (forecast_outputs is empty)' }); }
    const run = (await client.query(`INSERT INTO planner.forecast_runs (engine_version, horizon_start, horizon_end, notes)
      VALUES ('sku-snapshot', $1, $2, $3) RETURNING id, to_char(run_at,'YYYY-MM-DD HH24:MI') run_at`,
      [hz.s, hz.e, (req.body && req.body.note) || 'Manual SKU forecast snapshot'])).rows[0];
    const ins = await client.query(`INSERT INTO planner.forecasts (run_id, level, subcategory, country, channel, sku, warehouse, month, units, method, reason)
      SELECT $1, 'sku', coalesce(NULLIF(p.subcategory,''),'Uncategorised'),
        upper(split_part(fo.warehouse,'_',1)),
        CASE WHEN upper(fo.channel)='FBA' THEN 'FBA' WHEN upper(fo.channel)='B2B' THEN 'B2B' ELSE 'DTC' END,
        fo.sku, fo.warehouse, fo.month, fo.units, 'snapshot', 'manual snapshot'
      FROM planner.forecast_outputs fo LEFT JOIN planner.products p ON p.sku=fo.sku`, [run.id]);
    await client.query('COMMIT');
    res.json({ ok: true, run_id: run.id, run_at: run.run_at, rows: ins.rowCount });
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); res.status(500).json({ error: e.message }); }
});

// Forecast accuracy KPI — TRUE historical accuracy from SKU snapshots (accrues as snapshots build), plus a
// "plan vs recent run-rate" panel that's always available today. Params: level=cc|category|sku, lag (months
// the forecast was made before the target month, default 1), window (trailing complete months, default 12).
app.get('/api/kpi/forecast-accuracy', async (req, res) => {
  const level = ['cc', 'category', 'sku'].includes(req.query.level) ? req.query.level : 'cc';
  const lag = Math.max(0, Math.min(12, Number(req.query.lag) || 1));
  const win = Math.max(1, Math.min(36, Number(req.query.window) || 12));
  const rr = Math.max(1, Math.min(12, Number(req.query.months) || 3));
  try {
    // snapshot status
    const snap = (await pool.query(`SELECT count(DISTINCT r.id) runs, max(to_char(r.run_at,'YYYY-MM-DD HH24:MI')) last_at,
      (SELECT count(DISTINCT run_id) FROM planner.forecasts WHERE level='sku') sku_runs FROM planner.forecast_runs r`)).rows[0];

    // TRUE accuracy: actuals for completed months in window, matched to the SKU forecast snapshot made >= lag months before
    const grp = level === 'cc' ? `country, channel` : level === 'category' ? `category` : `sku, country, channel`;
    const sel = level === 'cc' ? `country, channel` : level === 'category' ? `coalesce(category,'Uncategorised') category` : `sku, country, channel`;
    const accSql = `
      WITH act AS (
        SELECT upper(country) country, channel, sku, month, sum(units) au FROM planner.sales_actuals
        WHERE month >= date_trunc('month',current_date) - ($1||' months')::interval AND month < date_trunc('month',current_date)
        GROUP BY 1,2,3,4),
      fc AS (   -- the SKU forecast for each COMPLETED window month, taken from the snapshot made >= lag months before it
        SELECT f.sku, f.country, f.channel, f.month, sum(f.units) fu, min(f.subcategory) subcategory
        FROM planner.forecasts f JOIN planner.forecast_runs r ON r.id=f.run_id
        WHERE f.level='sku'
          AND f.month >= date_trunc('month',current_date) - ($1||' months')::interval AND f.month < date_trunc('month',current_date)
          AND r.run_at < (f.month - ($2||' months')::interval)
          AND NOT EXISTS (SELECT 1 FROM planner.forecasts f2 JOIN planner.forecast_runs r2 ON r2.id=f2.run_id
             WHERE f2.level='sku' AND f2.sku=f.sku AND f2.country=f.country AND f2.channel=f.channel AND f2.month=f.month
               AND r2.run_at < (f.month - ($2||' months')::interval) AND r2.run_at > r.run_at)
        GROUP BY 1,2,3,4),
      mfc AS (SELECT DISTINCT month FROM fc),   -- only evaluate months we actually forecast before they happened
      m AS (
        SELECT coalesce(a.sku,fc.sku) sku, coalesce(a.country,fc.country) country, coalesce(a.channel,fc.channel) channel,
               coalesce(a.au,0) au, coalesce(fc.fu,0) fu, coalesce(fc.subcategory, pr.subcategory) category
        FROM (SELECT * FROM act WHERE month IN (SELECT month FROM mfc)) a
        FULL OUTER JOIN fc ON fc.sku=a.sku AND fc.country=a.country AND fc.channel=a.channel AND fc.month=a.month
        LEFT JOIN planner.products pr ON pr.sku=coalesce(a.sku,fc.sku))
      SELECT ${sel}, round(sum(fu)) fc_units, round(sum(au)) act_units, round(sum(abs(fu-au))) abs_err, count(*) n
      FROM m GROUP BY ${grp} ORDER BY act_units DESC NULLS LAST`;
    const accRows = (await pool.query(accSql, [win, lag])).rows.map(r => {
      const fc = Number(r.fc_units) || 0, act = Number(r.act_units) || 0, ae = Number(r.abs_err) || 0;
      return { ...r, fc_units: fc, act_units: act,
        bias_pct: act > 0 ? Math.round((fc - act) / act * 100) : null,
        wmape_pct: act > 0 ? Math.round(ae / act * 100) : null,
        attainment_pct: fc > 0 ? Math.round(act / fc * 100) : null };
    });
    const tA = accRows.reduce((s, r) => s + r.act_units, 0), tF = accRows.reduce((s, r) => s + r.fc_units, 0), tE = accRows.reduce((s, r) => s + Math.abs(r.fc_units - r.act_units), 0);
    const overall = { matched_rows: accRows.length, fc_units: tF, act_units: tA,
      bias_pct: tA > 0 ? Math.round((tF - tA) / tA * 100) : null, wmape_pct: tA > 0 ? Math.round(tE / tA * 100) : null, attainment_pct: tF > 0 ? Math.round(tA / tF * 100) : null };

    // plan-vs-run-rate (always available): forward forecast monthly avg vs trailing complete-month actual avg
    const ra = (await pool.query(`SELECT upper(country) co, channel ch, sum(units) u FROM planner.sales_actuals
        WHERE month >= date_trunc('month',current_date) - ($1||' months')::interval AND month < date_trunc('month',current_date) GROUP BY 1,2`, [rr])).rows;
    const rf = (await pool.query(`SELECT upper(split_part(warehouse,'_',1)) co,
        CASE WHEN upper(channel)='FBA' THEN 'FBA' WHEN upper(channel)='B2B' THEN 'B2B' ELSE 'DTC' END ch, sum(units) u FROM planner.forecast_outputs
        WHERE month >= date_trunc('month',current_date) AND month < date_trunc('month',current_date) + interval '12 months' GROUP BY 1,2`)).rows;
    const A = {}, F = {}; ra.forEach(r => { A[r.co + '|' + r.ch] = Number(r.u) || 0; }); rf.forEach(r => { F[r.co + '|' + r.ch] = Number(r.u) || 0; });
    const rrows = Array.from(new Set(Object.keys(A).concat(Object.keys(F)))).sort().map(k => { const [co, ch] = k.split('|'); const aAvg = (A[k] || 0) / rr, fAvg = (F[k] || 0) / 12;
      return { country: co, channel: ch, actual_avg: Math.round(aAvg), forecast_avg: Math.round(fAvg), variance_pct: aAvg > 0 ? Math.round((fAvg - aAvg) / aAvg * 100) : (fAvg > 0 ? null : 0) }; });

    res.json({ ok: true, level, lag, window: win, snapshots: { runs: Number(snap.runs) || 0, sku_runs: Number(snap.sku_runs) || 0, last_at: snap.last_at },
      accuracy: { overall, rows: accRows }, runrate: { months: rr, rows: rrows } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// ── Forecast export by country (CSV download · email · DriveHQ upload) ───────────────────────────────────
const FC_EXPORT_COUNTRIES = ['UK', 'US', 'EU', 'AU', 'CA'];
// Per-country forecast CSV in the "Forecast Analysis" layout (63 cols, two header rows):
//   SKU, Country Category, MonthsStock, FC-M1..12 (DTC), P-M1..12 (purchase — left blank for now),
//   G-M1..12 (left blank), FBA-M1..12, B2B-M1..12. Row 2 carries the actual month dates for each block.
// Source = planner.forecast_outputs (the editable SKU plan); country = warehouse prefix (uk_/us_/eu_/au_/ca_).
const FC_MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// the 3PL label per country (the "Country Category" prefix) — adjust if a country's 3PL changes
const FC_3PL = { UK: 'UK ILG', US: 'US Geneva', EU: 'EU iFulfillment', AU: 'AU Coghlans', CA: 'CA Propack' };
async function forecastCountryCsv(country) {
  const co = String(country || '').toUpperCase();
  // 12 months starting this month
  const now = new Date(); const months = [];
  for (let i = 0; i < 12; i++) months.push(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1)));
  const ymKey = d => d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
  const dateLbl = d => '01-' + FC_MON[d.getUTCMonth()] + '-' + String(d.getUTCFullYear()).slice(2);
  const ymList = months.map(ymKey);
  const rows = (await pool.query(`SELECT sku, to_char(month,'YYYY-MM') ym, channel, sum(units) u
    FROM planner.forecast_outputs WHERE lower(split_part(warehouse,'_',1)) = lower($1)
      AND month >= date_trunc('month', current_date) AND month < date_trunc('month', current_date) + interval '12 months'
    GROUP BY sku, month, channel`, [co])).rows;
  if (!rows.length) return { csv: '', rowCount: 0 };
  // SKU → category (for the Country Category label)
  const cat = {}; (await pool.query(`SELECT sku, coalesce(category,'') c FROM planner.products`)).rows.forEach(r => { cat[r.sku] = r.c; });
  // current 3PL stock on hand for this country (warehouse {co}_3pl)
  const onhand = {}; (await pool.query(`SELECT sku, coalesce(available,0) a FROM planner.product_inventory WHERE lower(warehouse)=lower($1)`, [co + '_3pl'])).rows.forEach(r => { onhand[r.sku] = Number(r.a) || 0; });
  // P = purchase quantity per month from the buy plan (order_quantity by order_month for this country) — blank when none
  const buy = {}; (await pool.query(`SELECT sku, to_char(order_month,'YYYY-MM') ym, sum(order_quantity) q
    FROM planner.buy_plan WHERE lower(split_part(warehouse,'_',1)) = lower($1) AND order_month IS NOT NULL
    GROUP BY sku, order_month`, [co])).rows.forEach(r => { (buy[r.sku] = buy[r.sku] || {})[r.ym] = Number(r.q) || 0; });
  const map = {}, skus = [];
  rows.forEach(r => { if (!map[r.sku]) { map[r.sku] = {}; skus.push(r.sku); } const c = (map[r.sku][r.ym] = map[r.sku][r.ym] || { DTC: 0, FBA: 0, B2B: 0 }); c[r.channel] = Number(r.u) || 0; });
  skus.sort();
  const esc = v => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const span = pfx => ymList.map((_, i) => pfx + '-M' + (i + 1));   // FC-M1..FC-M12
  const codeRow = ['SKU', 'Country Category', 'MonthsStock'].concat(span('FC'), span('P'), span('G'), span('FBA'), span('B2B'));
  const dates = months.map(dateLbl);
  const labelRow = ['SKU Header', 'Country Category', 'MonthsStock'].concat(dates, dates, dates, dates, dates);
  const dataRows = skus.map(sku => {
    const get = (ym, ch) => { const c = map[sku][ym]; return c ? (c[ch] || 0) : 0; };
    const fc = ymList.map(ym => get(ym, 'DTC')), fba = ymList.map(ym => get(ym, 'FBA')), b2b = ymList.map(ym => get(ym, 'B2B'));
    // MonthsStock = whole months of cover the current 3PL on-hand gives against total monthly demand (DTC+FBA+B2B)
    let stock = onhand[sku] || 0, cover = 0;
    for (let i = 0; i < 12; i++) { const dem = fc[i] + fba[i] + b2b[i]; if (stock >= dem) { stock -= dem; cover++; } else break; }
    // P = buy-plan order qty per month (blank when no buy plan for that month)
    const p = ymList.map(ym => { const b = buy[sku] && buy[sku][ym]; return b ? b : ''; });
    const blank12 = ymList.map(() => '');   // G left blank (kept in the format)
    const cc = (FC_3PL[co] || co) + ' ' + (cat[sku] || '');
    return [esc(sku), esc(cc.trim()), cover].concat(fc, p, blank12, fba, b2b);
  });
  const csv = [codeRow, labelRow].concat(dataRows).map(r => r.join(',')).join('\n') + '\n';
  return { csv, rowCount: skus.length };
}
app.get('/api/forecast/country-csv/:country', async (req, res) => {
  try { const { csv } = await forecastCountryCsv(req.params.country);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="forecast_${String(req.params.country).toUpperCase()}_12mo.csv"`);
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/forecast/export-settings', async (req, res) => {
  try { res.json((await pool.query(`SELECT country, coalesce(email,'') email FROM planner.forecast_export_settings ORDER BY country`)).rows); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/forecast/export-settings/:country', async (req, res) => {
  const co = String(req.params.country || '').toUpperCase(), email = (req.body && req.body.email || '').trim();
  try { await pool.query(`INSERT INTO planner.forecast_export_settings (country,email,updated_at) VALUES ($1,$2,now())
    ON CONFLICT (country) DO UPDATE SET email=$2, updated_at=now()`, [co, email || null]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
function drivehqConfigured() { return !!(process.env.WEBDAV_BASE && process.env.DRIVEHQ_USER && process.env.DRIVEHQ_PASS); }
// email one country's CSV to its stored address (gated on RESEND_API_KEY; stubbed when absent)
async function emailForecastCountry(country) {
  const co = String(country).toUpperCase();
  const s = (await pool.query(`SELECT email FROM planner.forecast_export_settings WHERE country=$1`, [co])).rows[0];
  const email = s && s.email;
  if (!email) return { country: co, ok: false, reason: 'no email set' };
  const { csv, rowCount } = await forecastCountryCsv(co);
  if (!rowCount) return { country: co, ok: false, reason: 'no forecast rows for this country' };
  if (!process.env.RESEND_API_KEY) return { country: co, ok: false, reason: 'RESEND_API_KEY not set (email stubbed)', would_send_to: email, rows: rowCount };
  const r = await fetch('https://api.resend.com/emails', { method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.PORTAL_FROM || 'Dock & Bay <portal@dockandbay.com>', to: [email],
      subject: 'Dock & Bay forecast — ' + co + ' (next 12 months)',
      html: '<p>Attached is the latest 12-month forecast for <b>' + co + '</b> (DTC / FBA / B2B by SKU).</p>',
      attachments: [{ filename: 'forecast_' + co + '_12mo.csv', content: Buffer.from(csv).toString('base64') }] }) });
  if (!r.ok) return { country: co, ok: false, reason: 'Resend error ' + r.status + ': ' + (await r.text()).slice(0, 200) };
  return { country: co, ok: true, sent_to: email, rows: rowCount };
}
app.post('/api/forecast/email/:country', async (req, res) => { try { res.json(await emailForecastCountry(req.params.country)); } catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/forecast/email-all', async (req, res) => { try { const out = []; for (const c of FC_EXPORT_COUNTRIES) out.push(await emailForecastCountry(c)); res.json({ ok: true, results: out }); } catch (e) { res.status(500).json({ error: e.message }); } });
// upload one country's CSV to DriveHQ over WebDAV (HTTP PUT, Basic auth) — gated on WEBDAV_BASE/DRIVEHQ_USER/PASS.
// Mirrors the Apps Script routine: PUT {base}/{TARGET_FOLDER}/{filename}. Fixed filename → overwrites in place.
async function drivehqForecastCountry(country) {
  const co = String(country).toUpperCase();
  const { csv, rowCount } = await forecastCountryCsv(co);
  if (!rowCount) return { country: co, ok: false, reason: 'no forecast rows for this country' };
  if (!drivehqConfigured()) return { country: co, ok: false, reason: 'DriveHQ not configured (set WEBDAV_BASE / DRIVEHQ_USER / DRIVEHQ_PASS)' };
  const base = String(process.env.WEBDAV_BASE).replace(/\/+$/, '');
  const folder = String(process.env.TARGET_FOLDER || 'UPLOADED').replace(/^\/+|\/+$/g, '');
  const filename = 'forecast_' + co + '_12mo.csv';
  const url = [base, encodeURIComponent(folder), encodeURIComponent(filename)].join('/');
  const auth = Buffer.from(process.env.DRIVEHQ_USER + ':' + process.env.DRIVEHQ_PASS).toString('base64');
  try {
    const r = await fetch(url, { method: 'PUT', headers: { Authorization: 'Basic ' + auth, 'Content-Type': 'text/csv' }, body: csv, redirect: 'follow' });
    if (r.status < 200 || r.status >= 300) return { country: co, ok: false, reason: 'DriveHQ HTTP ' + r.status + ': ' + (await r.text()).slice(0, 200) };
    return { country: co, ok: true, url, rows: rowCount, bytes: Buffer.byteLength(csv) };
  } catch (e) { return { country: co, ok: false, reason: 'DriveHQ upload error: ' + e.message }; }
}
app.post('/api/forecast/drivehq/:country', async (req, res) => { try { res.json(await drivehqForecastCountry(req.params.country)); } catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/forecast/drivehq-all', async (req, res) => { try { const out = []; for (const c of FC_EXPORT_COUNTRIES) out.push(await drivehqForecastCountry(c)); res.json({ ok: true, results: out }); } catch (e) { res.status(500).json({ error: e.message }); } });
// Session middleware for /api/portal/* (except request-link). Sets req.portal = {email, suppliers:[names], supplierIds:[ids]}.
async function portalAuth(req, res, next) {
  try {
    const psid = cookieVal(req, 'psid');
    if (!psid) return res.status(401).json({ error: 'not signed in' });
    const s = (await pool.query(`SELECT email FROM planner.portal_sessions WHERE token=$1 AND expires_at>now()`, [psid])).rows[0];
    if (!s) return res.status(401).json({ error: 'session expired' });
    const sups = await portalSuppliers(s.email);
    if (!sups.length) return res.status(403).json({ error: 'no supplier linked to this account' });
    req.portal = { email: s.email, suppliers: sups.map(x => x.supplier_name), supplierIds: sups.map(x => x.supplier_id).filter(v => v != null) };
    next();
  } catch (e) { res.status(500).json({ error: e.message }); }
}
// Ownership guard: the PO must belong to one of the session's suppliers.
async function portalOwnsPO(req, po) {
  if (!po) return false;
  const r = (await pool.query(`SELECT supplier_name FROM planner.purchase_orders WHERE po=$1`, [po])).rows[0];
  return !!(r && req.portal.suppliers.includes(r.supplier_name));
}

app.get('/portal', async (req, res) => {
  try {
    if (req.query.token) {
      const t = (await pool.query(`SELECT email FROM planner.portal_magic_tokens WHERE token=$1 AND expires_at>now() AND used_at IS NULL`, [String(req.query.token)])).rows[0];
      if (t) {
        await pool.query(`UPDATE planner.portal_magic_tokens SET used_at=now() WHERE token=$1`, [String(req.query.token)]);
        const sups = await portalSuppliers(t.email);
        const psid = portalToken();
        await pool.query(`INSERT INTO planner.portal_sessions (token,email,supplier_id,expires_at) VALUES ($1,$2,$3, now()+interval '7 days')`,
          [psid, t.email, sups[0] ? sups[0].supplier_id : null]);
        const secure = req.headers['x-forwarded-proto'] === 'https';
        res.setHeader('Set-Cookie', `psid=${psid}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax${secure ? '; Secure' : ''}`);
        return res.redirect('/portal');   // strip the token from the URL
      }
      return res.redirect('/portal?e=expired');
    }
    res.set('content-type', 'text/html').send(DEV ? loadPortalPage() : PORTAL_PAGE);
  } catch (e) { res.status(500).send('portal error'); }
});

app.post('/api/portal/request-link', async (req, res) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  try {
    if (email) {
      const sups = await portalSuppliers(email);
      if (sups.length) {
        const tok = portalToken();
        await pool.query(`INSERT INTO planner.portal_magic_tokens (token,email,expires_at) VALUES ($1,$2, now()+interval '7 days')`, [tok, email]);
        const base = (req.headers['x-forwarded-proto'] ? req.headers['x-forwarded-proto'] + '://' : 'http://') + (req.headers['x-forwarded-host'] || req.headers.host);
        await sendMagicEmail(email, base + '/portal?token=' + tok);
      }
    }
    res.json({ ok: true });   // always ok — never reveal whether an email is registered
  } catch (e) { res.json({ ok: true }); }
});

app.post('/api/portal/logout', portalAuth, async (req, res) => {
  try { const psid = cookieVal(req, 'psid'); if (psid) await pool.query(`DELETE FROM planner.portal_sessions WHERE token=$1`, [psid]); } catch {}
  res.setHeader('Set-Cookie', 'psid=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
  res.json({ ok: true });
});

app.get('/api/portal/me', portalAuth, (req, res) => res.json({ email: req.portal.email, suppliers: req.portal.suppliers }));

// Shared portal renderer (generated from inject.html). Served to the supplier portal page.
let PORTAL_VIEW_JS = DEV ? null : (() => { try { return readFileSync(new URL('./supply/portal-view.js', import.meta.url), 'utf8'); } catch { return '/* portal-view.js missing */'; } })();
app.get('/portal-view.js', (req, res) => {
  res.set('content-type', 'application/javascript; charset=utf-8');
  // no-cache: the portal view changes often — always revalidate so suppliers never run a stale cached copy
  // (a stale copy was causing old full-reload behaviour to persist after an in-place fix was deployed)
  res.set('Cache-Control', 'no-cache, must-revalidate');
  res.send(DEV ? (() => { try { return readFileSync(new URL('./supply/portal-view.js', import.meta.url), 'utf8'); } catch { return '/* missing */'; } })() : PORTAL_VIEW_JS);
});
// Notes for the renderer's post-note refetch (path sid ignored — scoped to the session's supplier).
app.get('/api/portal/notes/:sid', portalAuth, async (req, res) => {
  try {
    if (!req.portal.supplierIds.length) return res.json([]);
    res.json((await pool.query(`SELECT id, po, author_kind, coalesce(author_email,'') author_email, body,
      to_char(created_at,'YYYY-MM-DD HH24:MI') created_at, read_at IS NOT NULL read
      FROM planner.supplier_notes WHERE supplier_id = ANY($1) ORDER BY created_at`, [req.portal.supplierIds])).rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Mark a note read/unread — only notes belonging to the session's supplier.
app.post('/api/portal/note-read/:id', portalAuth, async (req, res) => {
  try {
    const n = (await pool.query(`SELECT supplier_id FROM planner.supplier_notes WHERE id=$1`, [req.params.id])).rows[0];
    if (!n || req.portal.supplierIds.indexOf(n.supplier_id) < 0) return res.status(403).json({ error: 'not your note' });
    const read = !(req.body && req.body.read === false);
    await pool.query(`UPDATE planner.supplier_notes SET read_at=${read ? 'now()' : 'NULL'} WHERE id=$1`, [req.params.id]);
    res.json({ ok: true, read });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// Serve an uploaded invoice/doc — only if its PO belongs to the session's supplier.
app.get('/api/portal/attachment/:id', portalAuth, async (req, res) => {
  try {
    const r = (await pool.query(`SELECT po, filename, mime, data FROM planner.portal_attachments WHERE id=$1`, [req.params.id])).rows[0];
    if (!r || !(await portalOwnsPO(req, r.po) || await portalOwnsSampleRef(req, r.po))) return res.status(403).send('forbidden');
    res.setHeader('Content-Type', r.mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'inline; filename="' + (r.filename || 'file').replace(/"/g, '') + '"');
    res.send(r.data);
  } catch (e) { res.status(500).send('error'); }
});

// Full _ppData payload in the EXACT shape the shared portal renderer expects, scoped to the session's
// supplier(s). The PO rows reuse the admin purchase-orders calc verbatim (so figures are identical),
// with a supplier filter; everything else is filtered to those POs / supplier ids.
app.get('/api/portal/bootstrap', portalAuth, async (req, res) => {
  const names = req.portal.suppliers, ids = req.portal.supplierIds;
  const q = (sql, p) => pool.query(sql, p).then(r => r.rows);
  try {
    const pos = await q(POS_SQL_PORTAL, [names]);   // same calc as admin /api/supply/purchase-orders, filtered
    const poList = pos.map(p => p.po);
    const grab = (sql) => poList.length ? q(sql, [poList]) : Promise.resolve([]);
    const [lines, deps, lc, xd, ac, notes, subs, supSkus] = await Promise.all([
      grab(`SELECT l.po, l.sku, l.qty, l.cost_price, l.carton_qty
            FROM planner.purchase_order_lines l WHERE l.po = ANY($1) ORDER BY l.po, l.sku`),
      names.length ? q(`SELECT reference, amount, is_deposit, to_char(date_paid,'YYYY-MM-DD') date_paid,
            deposit_used, deposit_remaining FROM planner.deposits WHERE supplier_name = ANY($1) ORDER BY reference`, [names]).catch(() => []) : Promise.resolve([]),
      grab(`SELECT po, sku, actual_cost, amended_qty, is_added, final_cost, confirmed_at FROM planner.portal_line_costs WHERE po = ANY($1)`),
      grab(`SELECT po, sku, qty FROM planner.crossdock_shipments WHERE po = ANY($1)`),
      grab(`SELECT id, po, coalesce(description,'') description, qty, price FROM planner.portal_additional_costs WHERE po = ANY($1) ORDER BY id`),
      ids.length ? q(`SELECT id, po, author_kind, coalesce(author_email,'') author_email, body, to_char(created_at,'YYYY-MM-DD HH24:MI') created_at, read_at IS NOT NULL read FROM planner.supplier_notes WHERE supplier_id = ANY($1) ORDER BY created_at`, [ids]) : Promise.resolve([]),
      ids.length ? q(`SELECT id, po, kind, value, status, attachment_id, to_char(submitted_at,'YYYY-MM-DD') submitted_at, to_char(applied_at,'YYYY-MM-DD') applied_at, note FROM planner.supplier_submissions WHERE supplier_id = ANY($1) ORDER BY submitted_at DESC`, [ids]) : Promise.resolve([]),
      q(`SELECT sku, coalesce(product_name,'') product_name FROM planner.products WHERE coalesce(sku,'')<>'' AND (${names.map((_, i) => `coalesce(supplier_multiple_all,'') ILIKE '%'||$${i + 1}||'%'`).join(' OR ') || 'false'}) ORDER BY sku`, names).catch(() => []),
    ]);
    const byPo = (rows) => rows.reduce((m, r) => { (m[r.po] = m[r.po] || []).push(r); return m; }, {});
    const lb = byPo(lines), notesByPo = byPo(notes), subsByPo = byPo(subs), addByPo = byPo(ac);
    const costsByPo = {}; lc.forEach(x => { (costsByPo[x.po] = costsByPo[x.po] || {})[x.sku] = x; });
    const xdByPo = {}; xd.forEach(x => { (xdByPo[x.po] = xdByPo[x.po] || {})[x.sku] = x.qty; });
    const samples = names.length ? await q(`SELECT s.id, s.ref, coalesce(s.supplier_name,'') supplier_name,
        coalesce(s.recipient_company,'') recipient_company, trim(coalesce(s.first_name,'')||' '||coalesce(s.last_name,'')) recipient_name,
        coalesce(s.address_line1,'') address_line1, coalesce(s.address_line2,'') address_line2, coalesce(s.city,'') city,
        coalesce(s.region,'') region, coalesce(s.postcode,'') postcode, coalesce(s.country,'') country, coalesce(s.phone,'') phone,
        to_char(s.completion_date_required,'YYYY-MM-DD') completion_required, coalesce(s.purpose,'{}') purpose, coalesce(s.notes,'') notes,
        s.status, (s.accepted_at IS NOT NULL) accepted, coalesce(s.change_requested,false) change_requested, to_char(s.supplier_expected_completion,'YYYY-MM-DD') supplier_expected,
        coalesce(s.tracking_code,'') tracking_code, coalesce(s.carrier,'') carrier,
        (s.status NOT IN ('cancelled','complete') AND (coalesce(s.tracking_code,'')='' OR coalesce(s.change_requested,false)
           OR EXISTS (SELECT 1 FROM planner.supplier_charges c WHERE c.source_type='sample' AND c.source_ref=s.ref AND c.status='pending')
           OR EXISTS (SELECT 1 FROM planner.sample_notes n WHERE n.sample_id=s.id AND n.author_kind='internal' AND n.read_at IS NULL)
           OR EXISTS (SELECT 1 FROM planner.sample_notes n2 WHERE n2.sample_id=s.id AND n2.body LIKE 'Order shipped%' AND n2.created_at >= now() - interval '30 days'))) is_open,
        CASE
          WHEN s.status='cancelled' THEN 'Cancelled'
          WHEN s.status='complete' THEN 'Complete'
          WHEN coalesce(s.change_requested,false) THEN 'Change requested'
          WHEN (SELECT count(*) FROM planner.supplier_charges c WHERE c.source_type='sample' AND c.source_ref=s.ref AND c.status='pending')>0 THEN 'Charge to review'
          WHEN coalesce(s.tracking_code,'')<>'' THEN 'Shipped'
          WHEN s.accepted_at IS NOT NULL THEN 'In production'
          ELSE 'Awaiting supplier'
        END status_calc,
        coalesce((SELECT json_agg(json_build_object('sku',l.sku,'qty',l.qty) ORDER BY l.id) FROM planner.sample_request_lines l WHERE l.sample_id=s.id),'[]') lines,
        coalesce((SELECT json_agg(json_build_object('id',c.id,'freight_cost',c.freight_cost,'product_cost',c.product_cost,'status',c.status,'description',coalesce(c.description,'')) ORDER BY c.created_at) FROM planner.supplier_charges c WHERE c.source_type='sample' AND c.source_ref=s.ref),'[]') charges,
        (SELECT count(*) FROM planner.sample_notes n WHERE n.sample_id=s.id AND n.author_kind='internal' AND n.read_at IS NULL)::int unread_dnb,
        coalesce((SELECT json_agg(json_build_object('id',a.id,'filename',a.filename) ORDER BY a.uploaded_at) FROM planner.portal_attachments a WHERE a.category='sample' AND a.po=s.ref),'[]') attachments
        FROM planner.sample_requests s
        WHERE coalesce(s.supplier_name,'')=ANY($1) OR coalesce(s.supplier_id,-1)=ANY($2)
        ORDER BY s.created_at DESC`, [names, ids.length ? ids : [-1]]) : [];
    res.json({ pos, lb, sdep: deps, sid: ids[0] || null, supplierName: names.join(', '),
      notesByPo, subsByPo, costsByPo, supSkus, xdByPo, addByPo, samples });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PORTAL SAMPLES (supplier-scoped) ──────────────────────────────────────────
async function portalOwnsSample(req, id){ if(!id)return null;
  const r = await pool.query(`SELECT id, ref, coalesce(supplier_name,'') supplier_name, supplier_id, status FROM planner.sample_requests WHERE id=$1::bigint`, [id]);
  const s = r.rows[0]; if(!s) return null;
  const names = req.portal.suppliers||[], ids = (req.portal.supplierIds||[]).map(Number);
  if ((s.supplier_name && names.indexOf(s.supplier_name)>=0) || (s.supplier_id!=null && ids.indexOf(Number(s.supplier_id))>=0)) return s;
  return null; }
async function portalOwnsSampleRef(req, ref){ if(!ref) return false;
  const r = await pool.query(`SELECT supplier_name, supplier_id FROM planner.sample_requests WHERE ref=$1`, [ref]); const s = r.rows[0]; if(!s) return false;
  const names = req.portal.suppliers||[], ids = (req.portal.supplierIds||[]).map(Number);
  return (s.supplier_name && names.indexOf(s.supplier_name)>=0) || (s.supplier_id!=null && ids.indexOf(Number(s.supplier_id))>=0); }
app.post('/api/portal/sample-attachment', portalAuth, async (req, res) => {   // supplier uploads an attachment to a sample
  const b = req.body || {};
  try { const s = await portalOwnsSample(req, b.id); if(!s) return res.status(403).json({ error: 'not your sample' }); if(!b.data_base64) return res.status(400).json({ error: 'data_base64 required' });
    const buf = Buffer.from(String(b.data_base64).replace(/^data:[^;]+;base64,/, ''), 'base64');
    const r = await pool.query(`INSERT INTO planner.portal_attachments (po, supplier_id, filename, mime, byte_size, data, uploaded_by, category)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'sample') RETURNING id`, [s.ref, (req.portal.supplierIds||[])[0]||null, b.filename||'attachment', b.mime||'application/octet-stream', buf.length, buf, req.portal.email||'supplier']);
    res.json({ ok:true, id: r.rows[0].id }); }
  catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/portal/sample-attachment-remove', portalAuth, async (req, res) => {
  const id = req.body && req.body.att_id;
  try { const a = (await pool.query(`SELECT po, category FROM planner.portal_attachments WHERE id=$1`, [id])).rows[0];
    if(!a || a.category!=='sample' || !await portalOwnsSampleRef(req, a.po)) return res.status(403).json({ error: 'not allowed' });
    await pool.query(`DELETE FROM planner.portal_attachments WHERE id=$1`, [id]); res.json({ ok:true }); }
  catch (e) { res.status(500).json({ error: e.message }); } });
app.get('/api/portal/sample-notes/:id', portalAuth, async (req, res) => {
  try { const s = await portalOwnsSample(req, req.params.id); if(!s) return res.status(403).json({ error: 'not your sample' });
    res.json((await pool.query(`SELECT id, author_kind, coalesce(author_email,'') author_email, body, to_char(created_at,'YYYY-MM-DD HH24:MI') created_at, read_at IS NOT NULL read FROM planner.sample_notes WHERE sample_id=$1::bigint ORDER BY created_at`, [s.id])).rows); }
  catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/portal/sample-note-read/:id', portalAuth, async (req, res) => {   // supplier marks a D&B (internal) note read/unread
  try { const n = (await pool.query(`SELECT sr.supplier_name, sr.supplier_id, n.author_kind FROM planner.sample_notes n JOIN planner.sample_requests sr ON sr.id=n.sample_id WHERE n.id=$1::bigint`, [req.params.id])).rows[0];
    if(!n) return res.status(404).json({ error: 'not found' });
    const names = req.portal.suppliers||[], ids = (req.portal.supplierIds||[]).map(Number);
    if(!((n.supplier_name && names.indexOf(n.supplier_name)>=0) || (n.supplier_id!=null && ids.indexOf(Number(n.supplier_id))>=0))) return res.status(403).json({ error: 'not your note' });
    const read = !(req.body && req.body.read === false);
    await pool.query(`UPDATE planner.sample_notes SET read_at=${read?'now()':'NULL'} WHERE id=$1::bigint AND author_kind='internal'`, [req.params.id]);
    res.json({ ok: true, read }); }
  catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/portal/sample-accept', portalAuth, async (req, res) => {
  try { const s = await portalOwnsSample(req, req.body && req.body.id); if(!s) return res.status(403).json({ error: 'not your sample' });
    await pool.query(`UPDATE planner.sample_requests SET accepted_at=coalesce(accepted_at,now()), change_requested=false, updated_at=now() WHERE id=$1::bigint`, [s.id]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/portal/sample-update', portalAuth, async (req, res) => {   // supplier: expected completion / tracking / carrier
  const b = req.body || {};
  try { const s = await portalOwnsSample(req, b.id); if(!s) return res.status(403).json({ error: 'not your sample' });
    await maybeShippedNote(s.id, b, 'supplier', req.portal.email);
    patch(res, 'planner.sample_requests', 'id', s.id, { supplier_expected_completion:'date', tracking_code:'text', carrier:'text' }, b, 'bigint'); }
  catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/portal/sample-note', portalAuth, async (req, res) => {
  const b = req.body || {};
  try { const s = await portalOwnsSample(req, b.id); if(!s) return res.status(403).json({ error: 'not your sample' }); if(!b.body) return res.status(400).json({ error: 'body required' });
    const r = await pool.query(`INSERT INTO planner.sample_notes (sample_id, author_kind, author_email, body) VALUES ($1::bigint,'supplier',$2,$3) RETURNING id`, [s.id, req.portal.email||null, String(b.body)]); res.json({ id: r.rows[0].id }); }
  catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/portal/sample-charge', portalAuth, async (req, res) => {   // supplier creates a charge → admin accepts → Other Payment
  const b = req.body || {};
  try { const s = await portalOwnsSample(req, b.id); if(!s) return res.status(403).json({ error: 'not your sample' });
    const r = await pool.query(`INSERT INTO planner.supplier_charges (source_type, source_ref, supplier_name, freight_cost, product_cost, description, created_by)
      VALUES ('sample',$1,$2,$3,$4,$5,$6) RETURNING id`, [s.ref, s.supplier_name, Number(b.freight_cost)||0, Number(b.product_cost)||0, b.description||null, req.portal.email||'supplier']); res.json({ ok: true, id: r.rows[0].id }); }
  catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/portal/sample-create', portalAuth, async (req, res) => {   // supplier originates a sample request
  const b = req.body || {}; const names = req.portal.suppliers||[], ids = req.portal.supplierIds||[];
  const supName = names[0]||null, supId = ids[0]||null; const client = await pool.connect();
  try { await client.query('BEGIN');
    const ins = await client.query(`INSERT INTO planner.sample_requests (supplier_id, supplier_name, recipient_company, first_name, last_name, address_line1, address_line2, city, region, postcode, country, phone, completion_date_required, purpose, notes, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
      [supId, supName, b.recipient_company||null, b.first_name||null, b.last_name||null, b.address_line1||null, b.address_line2||null, b.city||null, b.region||null, b.postcode||null, (b.country||'').toUpperCase()||null, b.phone||null, b.completion_date_required||null, Array.isArray(b.purpose)?b.purpose:null, b.notes||null, req.portal.email||'supplier']);
    const id = ins.rows[0].id, ref = 'SR-'+id; await client.query(`UPDATE planner.sample_requests SET ref=$1 WHERE id=$2`, [ref, id]);
    for (const l of (Array.isArray(b.lines)?b.lines:[])) { if(!l||!l.sku) continue; await client.query(`INSERT INTO planner.sample_request_lines (sample_id, sku, qty) VALUES ($1,$2,$3)`, [id, String(l.sku).trim(), Math.round(Number(l.qty)||0)]); }
    await client.query('COMMIT'); res.json({ ok: true, id, ref });
  } catch (e) { await client.query('ROLLBACK').catch(()=>{}); res.status(500).json({ error: e.message }); } finally { client.release(); } });

app.get('/api/portal/shipment-charges/:ref', portalAuth, async (req, res) => {   // supplier: charges on a shipment they're on
  const names = req.portal.suppliers||[];
  try { const own = (await pool.query(`SELECT 1 FROM planner.purchase_orders WHERE shipment_ref=$1 AND supplier_name=ANY($2) LIMIT 1`, [req.params.ref, names])).rows[0];
    if(!own) return res.status(403).json({ error: 'not your shipment' });
    res.json((await pool.query(`SELECT id, freight_cost, product_cost, coalesce(description,'') description, status, to_char(created_at,'YYYY-MM-DD') created_at FROM planner.supplier_charges WHERE source_type='shipment' AND source_ref=$1 ORDER BY created_at`, [req.params.ref])).rows); }
  catch (e) { res.status(500).json({ error: e.message }); } });
app.post('/api/portal/shipment-charge', portalAuth, async (req, res) => {   // supplier creates a charge on a shipment
  const b = req.body||{}, names = req.portal.suppliers||[];
  if(!b.shipment_ref) return res.status(400).json({ error: 'shipment_ref required' });
  try { const own = (await pool.query(`SELECT 1 FROM planner.purchase_orders WHERE shipment_ref=$1 AND supplier_name=ANY($2) LIMIT 1`, [b.shipment_ref, names])).rows[0];
    if(!own) return res.status(403).json({ error: 'not your shipment' });
    const r = await pool.query(`INSERT INTO planner.supplier_charges (source_type, source_ref, supplier_name, freight_cost, product_cost, description, created_by)
      VALUES ('shipment',$1,$2,$3,$4,$5,$6) RETURNING id`, [b.shipment_ref, names[0]||null, Number(b.freight_cost)||0, Number(b.product_cost)||0, b.description||null, req.portal.email||'supplier']); res.json({ ok: true, id: r.rows[0].id }); }
  catch (e) { res.status(500).json({ error: e.message }); } });
// Direct to Client details — supplier approves the PO's packing & labelling requirements
app.post('/api/portal/dtc-accept', portalAuth, async (req, res) => {
  const po = req.body && req.body.po; const names = req.portal.suppliers||[];
  if(!po) return res.status(400).json({ error: 'po required' });
  try { const own = (await pool.query(`SELECT 1 FROM planner.purchase_orders WHERE po=$1 AND supplier_name=ANY($2) LIMIT 1`, [po, names])).rows[0];
    if(!own) return res.status(403).json({ error: 'not your PO' });
    await pool.query(`UPDATE planner.purchase_orders SET dtc_accepted_at=now(), dtc_accepted_by=$2 WHERE po=$1`, [po, req.portal.email||'supplier']);
    res.json({ ok:true }); } catch(e){ res.status(500).json({ error: e.message }); } });

// Everything the supplier sees — scoped server-side to their supplier(s).
app.get('/api/portal/data', portalAuth, async (req, res) => {
  try {
    const names = req.portal.suppliers, ids = req.portal.supplierIds;
    const pos = (await pool.query(
      `SELECT po.po, coalesce(po.status,'') status, coalesce(po.client,'') client, po.shipment_ref,
              po.supplier_ship_date, po.end_production_overide, po.supplier_invoice_total,
              coalesce(po.crossdock_skus,'') crossdock_skus, coalesce(po.supplier_name,'') supplier_name,
              -- the assigned shipment is consolidated under ANOTHER supplier's master PO → supplier needs shipment labels
              (coalesce(po.shipment_ref,'')<>'' AND coalesce((SELECT m.supplier_name FROM planner.purchase_orders m
                 WHERE m.po = coalesce((SELECT s.master_po FROM planner.shipments s WHERE s.shipment_ref=po.shipment_ref), po.shipment_ref)),'')
                 NOT IN ('', coalesce(po.supplier_name,''))) ship_other_supplier
       FROM planner.purchase_orders po WHERE po.supplier_name = ANY($1) ORDER BY po.po`, [names])).rows;
    const poList = pos.map(p => p.po);
    const grab = (sql) => poList.length ? pool.query(sql, [poList]).then(r => r.rows) : Promise.resolve([]);
    const [lines, lcs, xds, adds, notes, subs, supSkus] = await Promise.all([
      grab(`SELECT pol.po, pol.sku, pol.qty, pol.cost_price, coalesce(p.product_name_final,p.product_name,'') product_name
            FROM planner.purchase_order_lines pol LEFT JOIN planner.products p ON p.sku=pol.sku WHERE pol.po = ANY($1) ORDER BY pol.po, pol.sku`),
      grab(`SELECT po, sku, actual_cost, amended_qty, is_added, final_cost, confirmed_at FROM planner.portal_line_costs WHERE po = ANY($1)`),
      grab(`SELECT po, sku, qty FROM planner.crossdock_shipments WHERE po = ANY($1)`),
      grab(`SELECT id, po, coalesce(description,'') description, qty, price FROM planner.portal_additional_costs WHERE po = ANY($1) ORDER BY id`),
      ids.length ? pool.query(`SELECT id, po, author_kind, coalesce(author_email,'') author_email, body, to_char(created_at,'YYYY-MM-DD HH24:MI') created_at FROM planner.supplier_notes WHERE supplier_id = ANY($1) ORDER BY created_at`, [ids]).then(r => r.rows) : Promise.resolve([]),
      ids.length ? pool.query(`SELECT id, po, kind, value, status, attachment_id, to_char(submitted_at,'YYYY-MM-DD') submitted_at FROM planner.supplier_submissions WHERE supplier_id = ANY($1) ORDER BY submitted_at DESC`, [ids]).then(r => r.rows) : Promise.resolve([]),
      pool.query(`SELECT sku, coalesce(product_name,'') product_name FROM planner.products WHERE coalesce(sku,'')<>'' AND (${names.map((_, i) => `coalesce(supplier_multiple_all,'') ILIKE '%'||$${i + 1}||'%'`).join(' OR ') || 'false'}) ORDER BY sku`, names).then(r => r.rows).catch(() => []),
    ]);
    const by = (rows, k) => rows.reduce((m, r) => { (m[r[k]] = m[r[k]] || []).push(r); return m; }, {});
    const lcByPo = {}; lcs.forEach(x => { (lcByPo[x.po] = lcByPo[x.po] || {})[x.sku] = x; });
    const xdByPo = {}; xds.forEach(x => { (xdByPo[x.po] = xdByPo[x.po] || {})[x.sku] = x.qty; });
    res.json({ suppliers: names, pos, lines: by(lines, 'po'), lineCosts: lcByPo, crossdock: xdByPo,
      additionalCosts: by(adds, 'po'), notes: by(notes, 'po'), submissions: by(subs, 'po'), supplierSkus: supSkus });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Label/barcode assets for the portal (static fonts/logos — same files as the admin asset route).
app.get('/api/portal/asset/:name', (req, res) => {
  const files = { grs: ['grs-logo.png', 'image/png'], db: ['db-logo.png', 'image/png'],
    'gotham-book': ['gotham-book.ttf', 'font/ttf'], 'gotham-bold': ['gotham-bold.ttf', 'font/ttf'] };
  const a = files[req.params.name]; if (!a) return res.status(404).end();
  try { res.setHeader('content-type', a[1]); res.setHeader('cache-control', 'public, max-age=86400');
    res.end(readFileSync(new URL('./supply/assets/' + a[0], import.meta.url))); }
  catch (e) { res.status(404).end(); }
});
// Swatch image proxy — session-gated so it isn't an open proxy.
app.get('/api/portal/img', portalAuth, async (req, res) => {
  try {
    const u = String(req.query.url || ''); if (!/^https?:\/\//i.test(u)) return res.status(400).end();
    const r = await fetch(u); if (!r.ok) return res.status(502).end();
    res.setHeader('content-type', r.headers.get('content-type') || 'image/jpeg');
    res.setHeader('cache-control', 'public, max-age=86400');
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch (e) { res.status(500).end(); }
});
// Barcode label rows — only for SKUs that appear on THIS supplier's POs (intersect with owned SKUs).
app.get('/api/portal/label-data', portalAuth, async (req, res) => {
  try {
    const { po, prod, skus, batch } = req.query, names = req.portal.suppliers;
    let requested = [];
    if (skus) requested = String(skus).split(',').map(s => s.trim()).filter(Boolean);
    else if (po) { if (!await portalOwnsPO(req, po)) return res.status(403).json({ error: 'not your PO' });
      requested = (await pool.query(`SELECT sku FROM planner.purchase_order_lines WHERE po=$1`, [po])).rows.map(r => r.sku); }
    else if (prod) requested = (await pool.query(`SELECT DISTINCT l.sku FROM planner.purchase_order_lines l JOIN planner.purchase_orders p ON p.po=l.po WHERE p.prod_no=$1 AND p.supplier_name = ANY($2)`, [prod, names])).rows.map(r => r.sku);
    else if (batch) requested = (await pool.query(`SELECT DISTINCT l.sku FROM planner.purchase_order_lines l JOIN planner.purchase_orders p ON p.po=l.po WHERE p.batch_id=$1 AND p.supplier_name = ANY($2)`, [batch, names])).rows.map(r => r.sku);
    else return res.status(400).json({ error: 'po/prod/skus/batch required' });
    if (!requested.length) return res.json([]);
    const owned = new Set((await pool.query(`SELECT DISTINCT l.sku FROM planner.purchase_order_lines l JOIN planner.purchase_orders p ON p.po=l.po WHERE p.supplier_name = ANY($1)`, [names])).rows.map(r => r.sku));
    const finalSkus = requested.filter(s => owned.has(s));
    if (!finalSkus.length) return res.json([]);
    const rows = (await pool.query(`
      SELECT sl.sku, sl.barcode_sku_name, sl.barcode_carton_name, sl.barcode_inner_name,
        sl.size, coalesce(p.size_short, sl.size_short, '') size_short, sl.category, sl.carton_qty,
        sl.product_barcode, sl.carton_barcode, sl.inner_barcode, sl.grs_material, sl.swatch_url,
        sl.uk_carton_l, sl.uk_carton_w, sl.uk_carton_h, sl.uk_carton_wt,
        coalesce(p.supplier_multiple_all,'') supplier_multiple, p.uk_rt, p.us_rt, p.eu_rt, coalesce(p.product_name,'') product_name
      FROM planner.sku_labels sl LEFT JOIN planner.products p ON p.sku=sl.sku
      WHERE sl.sku = ANY($1) AND coalesce(sl.variant_type,'') NOT ILIKE 'set'
        AND coalesce(sl.product_barcode, sl.carton_barcode, sl.inner_barcode) IS NOT NULL
      ORDER BY sl.sku`, [finalSkus])).rows;
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Session-scoped write-backs (mirror the admin /api/supply/* logic, ownership-checked, submitted_by = session email)
const portalDeny = (res) => res.status(403).json({ error: 'that PO is not on your account' });
app.post('/api/portal/crossdock-qty', portalAuth, async (req, res) => {
  const b = req.body || {}; if (!b.po || !b.sku) return res.status(400).json({ error: 'po and sku required' });
  if (!await portalOwnsPO(req, b.po)) return portalDeny(res);
  try {
    const qty = (b.qty === '' || b.qty == null) ? null : Number(b.qty);
    await pool.query(`INSERT INTO planner.crossdock_shipments (po,sku,qty,submitted_by,submitted_at) VALUES ($1,$2,$3,$4,now())
      ON CONFLICT (po,sku) DO UPDATE SET qty=excluded.qty, submitted_by=excluded.submitted_by, submitted_at=now()`, [b.po, b.sku, qty, req.portal.email]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/portal/line-cost', portalAuth, async (req, res) => {
  const b = req.body || {}; if (!b.po || !b.sku) return res.status(400).json({ error: 'po and sku required' });
  if (!await portalOwnsPO(req, b.po)) return portalDeny(res);
  try {
    const num = v => (v === '' || v == null) ? null : Number(v);
    await pool.query(`INSERT INTO planner.portal_line_costs (po,sku,actual_cost,amended_qty,is_added,submitted_by,submitted_at) VALUES ($1,$2,$3,$4,$5,$6,now())
      ON CONFLICT (po,sku) DO UPDATE SET actual_cost=excluded.actual_cost, amended_qty=excluded.amended_qty,
        is_added=planner.portal_line_costs.is_added OR excluded.is_added, submitted_by=excluded.submitted_by, submitted_at=now()`,
      [b.po, b.sku, num(b.actual_cost), num(b.amended_qty), !!b.is_added, req.portal.email]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/portal/line-remove', portalAuth, async (req, res) => {
  const b = req.body || {}; if (!b.po || !b.sku) return res.status(400).json({ error: 'po and sku required' });
  if (!await portalOwnsPO(req, b.po)) return portalDeny(res);
  try { await pool.query(`DELETE FROM planner.portal_line_costs WHERE po=$1 AND sku=$2 AND is_added=true`, [b.po, b.sku]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/portal/additional-cost', portalAuth, async (req, res) => {
  const b = req.body || {}; const num = v => (v === '' || v == null) ? null : Number(v);
  try {
    if (b.id) {
      const r = (await pool.query(`SELECT po FROM planner.portal_additional_costs WHERE id=$1`, [b.id])).rows[0];
      if (!r || !await portalOwnsPO(req, r.po)) return portalDeny(res);
      await pool.query(`UPDATE planner.portal_additional_costs SET description=$2, qty=$3, price=$4, submitted_by=$5, submitted_at=now() WHERE id=$1`,
        [b.id, b.description || '', num(b.qty), num(b.price), req.portal.email]);
      return res.json({ ok: true, id: b.id });
    }
    if (!b.po) return res.status(400).json({ error: 'po required' });
    if (!await portalOwnsPO(req, b.po)) return portalDeny(res);
    const r = await pool.query(`INSERT INTO planner.portal_additional_costs (po,description,qty,price,submitted_by) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [b.po, b.description || '', num(b.qty), num(b.price), req.portal.email]);
    res.json({ ok: true, id: r.rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/portal/additional-cost-remove', portalAuth, async (req, res) => {
  const id = req.body && req.body.id; if (!id) return res.status(400).json({ error: 'id required' });
  try {
    const r = (await pool.query(`SELECT po FROM planner.portal_additional_costs WHERE id=$1`, [id])).rows[0];
    if (!r || !await portalOwnsPO(req, r.po)) return portalDeny(res);
    await pool.query(`DELETE FROM planner.portal_additional_costs WHERE id=$1`, [id]); res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/portal/note', portalAuth, async (req, res) => {
  const b = req.body || {}; if (!b.po || !String(b.body || '').trim()) return res.status(400).json({ error: 'po and body required' });
  if (!await portalOwnsPO(req, b.po)) return portalDeny(res);
  try {
    const sid = req.portal.supplierIds[0] || null;
    await pool.query(`INSERT INTO planner.supplier_notes (po,supplier_id,author_email,author_kind,body) VALUES ($1,$2,$3,'supplier',$4)`,
      [b.po, sid, req.portal.email, String(b.body).trim()]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/portal/upload', portalAuth, async (req, res) => {
  const b = req.body || {}; if (!b.po || !b.data_base64) return res.status(400).json({ error: 'po and data_base64 required' });
  if (!await portalOwnsPO(req, b.po)) return portalDeny(res);
  try {
    const buf = Buffer.from(String(b.data_base64).replace(/^data:[^;]+;base64,/, ''), 'base64');
    const sid = req.portal.supplierIds[0] || null;
    const r = await pool.query(`INSERT INTO planner.portal_attachments (po,supplier_id,filename,mime,byte_size,data,uploaded_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [b.po, sid, b.filename || 'invoice', b.mime || 'application/octet-stream', buf.length, buf, req.portal.email]);
    res.json({ id: r.rows[0].id, byte_size: buf.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/portal/submit', portalAuth, async (req, res) => {
  const b = req.body || {}; if (!b.po) return res.status(400).json({ error: 'po required' });
  if (!await portalOwnsPO(req, b.po)) return portalDeny(res);
  const sid = req.portal.supplierIds[0] || null, by = req.portal.email, out = { staged: [], applied: [] };
  try {
    const stage = async (kind, value, attId) => {
      if (value == null || value === '') return;
      await pool.query(`UPDATE planner.supplier_submissions SET status='superseded' WHERE po=$1 AND kind=$2 AND status='pending'`, [b.po, kind]);
      await pool.query(`INSERT INTO planner.supplier_submissions (supplier_id,po,kind,value,attachment_id,status,submitted_by) VALUES ($1,$2,$3,$4,$5,'pending',$6)`,
        [sid, b.po, kind, String(value), attId || null, by]);
      out.staged.push(kind);
    };
    await stage('completion_date', b.completion_date);
    await stage('invoice_value', b.invoice_value, b.invoice_attachment_id);
    if ((b.tracking != null && b.tracking !== '') || (b.carrier != null && b.carrier !== '')) {
      const sh = (await pool.query(`SELECT shipment_ref FROM planner.purchase_orders WHERE po=$1`, [b.po])).rows[0];
      const ref = b.shipment_ref || (sh && sh.shipment_ref);
      if (ref) {
        const sets = [], vals = []; let i = 1;
        if (b.tracking != null && b.tracking !== '') { sets.push(`carrier_ref=$${i++}`); vals.push(b.tracking); }
        if (b.carrier != null && b.carrier !== '') { sets.push(`carrier=$${i++}`); vals.push(b.carrier); }
        vals.push(ref);
        await pool.query(`UPDATE planner.shipments SET ${sets.join(',')}, updated_at=now() WHERE shipment_ref=$${i}`, vals);
        await pool.query(`INSERT INTO planner.supplier_submissions (supplier_id,po,shipment_ref,kind,value,status,submitted_by,applied_by,applied_at) VALUES ($1,$2,$3,'tracking',$4,'applied',$5,$5,now())`,
          [sid, b.po, ref, JSON.stringify({ tracking: b.tracking || null, carrier: b.carrier || null }), by]);
        out.applied.push('tracking → ' + ref);
      } else {
        await pool.query(`INSERT INTO planner.supplier_submissions (supplier_id,po,kind,value,status,submitted_by,note) VALUES ($1,$2,'tracking',$3,'pending',$4,'no shipment assigned yet')`,
          [sid, b.po, JSON.stringify({ tracking: b.tracking || null, carrier: b.carrier || null }), by]);
        out.staged.push('tracking');
      }
    }
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Local dev: listen. On Vercel (serverless) the platform imports `app` instead.
if (!process.env.VERCEL) {
  app.listen(8124, () => console.log('rehost (live DATA + FC_CURRENT + save) on :8124'));
}
export default app;
