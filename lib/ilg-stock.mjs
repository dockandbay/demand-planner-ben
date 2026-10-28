// v28.553 (Ben 28-Oct-26): ILG "DOCKBAY Daily Stock Report" (ops@ inbox, ~19:30 daily) → Manage 3PL ▸ UK, split by owner, compared with
// Fulfil, and a ticked rebaseline (one Fulfil stock count per ILG warehouse) that the n8n stocktake flow writes when a user asks.
// Pure helpers + the Fulfil comparison; server.mjs wires routes, Gmail (ops@ slot) and storage (migration 399).
import { readXls } from './xls-read.mjs';

// Report owner → HORIZON pool → Fulfil warehouse (looked up by NAME: sandbox and live ids differ).
export const ILG_POOLS = {
  UK:    { owner: 'DOCKBAY',    label: 'UK ILG',                 warehouse: 'UK ILG' },
  UK_NG: { owner: 'DOCKFBA',    label: 'UK Non GRS (ILG - FBA)', warehouse: 'ILG - FBA' },
  UK_VD: { owner: 'DOCKVENDOR', label: 'UK Vendor (John Lewis)', warehouse: 'ILG - VENDOR' },
};
export const ILG_FILE_RE = /DOCKBAY_DAILYSTOCKREPORT_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})/i;
export const ILG_GMAIL_Q = 'subject:("Daily Stock Report") has:attachment newer_than:4d';

// Europe/London wall time → UTC ISO (BST = last Sunday of March 01:00 UTC to last Sunday of October 01:00 UTC)
function londonToUtc(y, mo, d, h, mi) {
  const lastSun = (yy, m) => { const t = new Date(Date.UTC(yy, m + 1, 0)); return t.getUTCDate() - t.getUTCDay(); };
  const utcGuess = Date.UTC(y, mo - 1, d, h, mi);
  const bstStart = Date.UTC(y, 2, lastSun(y, 2), 1), bstEnd = Date.UTC(y, 9, lastSun(y, 9), 1);
  const bst = utcGuess - 3600000 >= bstStart && utcGuess - 3600000 < bstEnd;
  return new Date(utcGuess - (bst ? 3600000 : 0)).toISOString();
}
export function ilgReportAt(filename) {
  const m = ILG_FILE_RE.exec(String(filename || '')); if (!m) return null;
  return londonToUtc(+m[1], +m[2], +m[3], +m[4], +m[5]);
}
// .xls buffer → [{owner, sku, description, barcode, status, physical, free}]
export function parseIlgReport(buf) {
  const sh = readXls(buf)[0]; if (!sh || !sh.rows.length) throw new Error('the report has no rows');
  const hdr = sh.rows[0].map(h => String(h || '').trim().toLowerCase());
  const col = (n) => hdr.indexOf(n), ci = { owner: col('owner'), sku: col('sku code'), desc: col('description'), bc: col('barcode'), st: col('status'), ph: col('physical stock'), fr: col('free stock') };
  const miss = Object.entries({ Owner: ci.owner, 'SKU Code': ci.sku, 'Physical Stock': ci.ph }).filter(([, i]) => i < 0).map(([k]) => k);
  if (miss.length) throw new Error('column(s) not found: ' + miss.join(', ') + ' (headers: ' + sh.rows[0].join(', ') + ')');
  const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; };
  return sh.rows.slice(1).map(r => ({ owner: String(r[ci.owner] || '').trim().toUpperCase(), sku: String(r[ci.sku] || '').trim(), description: ci.desc >= 0 ? String(r[ci.desc] || '') : '',
    barcode: ci.bc >= 0 ? String(r[ci.bc] || '') : '', status: ci.st >= 0 ? String(r[ci.st] || '').trim() : '', physical: num(r[ci.ph]), free: ci.fr >= 0 ? num(r[ci.fr]) : 0 }))
    .filter(r => r.owner && r.sku);
}
// one pool's report lines → { sku: { physical, free, statuses: {Good: n, ...}, description } }
export function ilgPoolReport(rows, pool) {
  const owner = ILG_POOLS[pool].owner, out = {};
  rows.forEach(r => { if (r.owner !== owner) return; const o = out[r.sku] || (out[r.sku] = { physical: 0, free: 0, statuses: {}, description: r.description });
    o.physical += r.physical; o.free += r.free; o.statuses[r.status || '?'] = (o.statuses[r.status || '?'] || 0) + r.physical; });
  return out;
}

const fdate = (v) => v && typeof v === 'object' && v.iso_string ? v.iso_string : v;
// Fulfil (REST v2, Tryton models) for one pool: warehouse + child locations by name, product ids, on-hand now for the warehouse and its
// Storage Zone, and the net done moves into / out of the warehouse since the report time (write_date, UTC).
export async function ilgFulfilSnapshot(fulfilFetch, pool, skus, reportAtIso) {
  const P = ILG_POOLS[pool];
  const wh = (await fulfilFetch('PUT', '/model/stock.location/search_read', [[['type', '=', 'warehouse'], ['name', '=', P.warehouse]], 0, 2, null, ['id', 'name', 'storage_location']]))[0];
  if (!wh) throw new Error('Fulfil warehouse "' + P.warehouse + '" not found');
  const locs = (await fulfilFetch('PUT', '/model/stock.location/search_read', [[['parent', 'child_of', [wh.id]]], 0, 500, null, ['id']])).map(l => l.id);
  const inWh = new Set(locs.concat([wh.id]));
  const ctx = (ids) => '?context=' + encodeURIComponent(JSON.stringify({ locations: ids }));
  const prod = {}, uniq = Array.from(new Set(skus));
  for (let i = 0; i < uniq.length; i += 300) {
    const part = uniq.slice(i, i + 300);
    (await fulfilFetch('PUT', '/model/product.product/search_read' + ctx([wh.id]), [[['code', 'in', part]], 0, part.length + 10, null, ['id', 'code', 'quantity']]))
      .forEach(p => { prod[p.code] = { id: p.id, wh_now: Number(p.quantity) || 0 }; });
    (await fulfilFetch('PUT', '/model/product.product/search_read' + ctx([wh.storage_location]), [[['code', 'in', part]], 0, part.length + 10, null, ['id', 'code', 'quantity']]))
      .forEach(p => { if (prod[p.code]) prod[p.code].storage_now = Number(p.quantity) || 0; });
  }
  // SKUs Fulfil holds in this warehouse that the report does not list (ILG says 0)
  const extra = [];
  try { (await fulfilFetch('PUT', '/model/product.product/search_read' + ctx([wh.id]), [[['quantity', '!=', 0], ['code', 'not in', uniq.length ? uniq : ['-']]], 0, 500, null, ['id', 'code', 'quantity']]))
      .forEach(p => { if (p.code) { prod[p.code] = { id: p.id, wh_now: Number(p.quantity) || 0 }; extra.push(p.code); } }); } catch (_) { /* the quantity searcher is optional */ }
  if (extra.length) { const st = await fulfilFetch('PUT', '/model/product.product/search_read' + ctx([wh.storage_location]), [[['code', 'in', extra]], 0, extra.length + 10, null, ['code', 'quantity']]);
    st.forEach(p => { if (prod[p.code]) prod[p.code].storage_now = Number(p.quantity) || 0; }); }
  // net moves since the report: done moves written after report_at with one end inside the warehouse
  const since = {}, byId = {}; Object.entries(prod).forEach(([c, p]) => { byId[p.id] = c; });
  const after = String(reportAtIso).replace('Z', '').slice(0, 19);
  let off = 0;
  for (let page = 0; page < 40; page++) {
    const mv = await fulfilFetch('PUT', '/model/stock.move/search_read', [[['state', '=', 'done'], ['write_date', '>', after],
      ['OR', ['from_location', 'in', Array.from(inWh)], ['to_location', 'in', Array.from(inWh)]]], off, 500, null, ['product', 'from_location', 'to_location', 'quantity', 'internal_quantity']]);
    mv.forEach(m => { const fi = inWh.has(m.from_location), ti = inWh.has(m.to_location); if (fi === ti) return;
      const code = byId[m.product]; if (!code) return; const q = Number(m.internal_quantity != null ? m.internal_quantity : m.quantity) || 0; since[code] = (since[code] || 0) + (ti ? q : -q); });
    if (mv.length < 500) break; off += 500;
  }
  return { warehouse_id: wh.id, storage_id: wh.storage_location, products: prod, moved_since: since, extra };
}
// report + Fulfil → comparison rows. fulfil_at_report = on hand now − net moves since; diff = report − that; set_to = Storage Zone now + diff
export function ilgCompare(rep, snap) {
  const rows = [], codes = new Set(Object.keys(rep).concat(snap.extra || []));
  codes.forEach(sku => { const r = rep[sku], p = snap.products[sku], mv = snap.moved_since[sku] || 0;
    const report = r ? r.physical : 0, whNow = p ? p.wh_now : null, atRep = whNow == null ? null : whNow - mv;
    const diff = atRep == null ? null : report - atRep, stNow = p ? (p.storage_now || 0) : null;
    rows.push({ sku, description: r ? r.description : '', in_report: !!r, in_fulfil: !!p, product_id: p ? p.id : null, report, free: r ? r.free : 0, statuses: r ? r.statuses : {},
      fulfil_now: whNow, moved_since: mv, fulfil_at_report: atRep, diff, storage_now: stNow, set_to: (diff == null || stNow == null) ? null : stNow + diff }); });
  return rows.sort((a, b) => Math.abs(b.diff || 0) - Math.abs(a.diff || 0) || a.sku.localeCompare(b.sku));
}
