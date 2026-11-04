// v28.553 (Ben 28-Oct-26): ILG "DOCKBAY Daily Stock Report" (ops@ inbox, ~19:30 daily) → Manage 3PL ▸ UK, split by owner, compared with
// Fulfil, and a ticked rebaseline (one Fulfil stock count per ILG warehouse) that the n8n stocktake flow writes when a user asks.
// Pure helpers + the Fulfil comparison; server.mjs wires routes, Gmail (ops@ slot) and storage (migration 399).
import { readXls } from './xls-read.mjs';

// Report owner → HORIZON pool → Fulfil warehouse (looked up by NAME: sandbox and live ids differ).
// v28.682 (Ben 04-Nov-26): the same report → compare → rebaseline for US Geneva. A pool belongs to a site (ILG = the UK DOCKBAY report,
// GENEVA = the Geneva CSV from reports@geneva10.com); for Geneva the "owner" is the CSV VersionID (STD = US Geneva STD, FBA = US Non GRS).
export const ILG_POOLS = {
  UK:    { site: 'ILG',    owner: 'DOCKBAY',    label: 'UK ILG',                    warehouse: 'UK ILG' },
  UK_NG: { site: 'ILG',    owner: 'DOCKFBA',    label: 'UK Non GRS (ILG - FBA)',    warehouse: 'ILG - FBA' },
  UK_VD: { site: 'ILG',    owner: 'DOCKVENDOR', label: 'UK Vendor (John Lewis)',    warehouse: 'ILG - VENDOR' },
  US:    { site: 'GENEVA', owner: 'STD',        label: 'US Geneva',                 warehouse: 'US Geneva STD' },
  US_NG: { site: 'GENEVA', owner: 'FBA',        label: 'US Non GRS (Geneva FBA)',   warehouse: 'US Geneva FBA' },
};
export const ILG_SITES = { ILG: { label: 'ILG', tz: 'Europe/London' }, GENEVA: { label: 'Geneva', tz: 'America/Chicago' } };
export const ilgPoolsOf = (site) => Object.keys(ILG_POOLS).filter(k => ILG_POOLS[k].site === site);
export const ILG_COMPANY_ID = 1;   // [UK] Dock & Bay Ltd (the ILG warehouses and US Geneva STD / FBA all belong to UK in Fulfil)
// Geneva: two daily CSVs ~17:00 US Central. WithOutOfStock lists every SKU incl. zeros (preferred); the Daily report lists only non-zero rows.
export const GENEVA_FILE_RE = /^(DockandBayInventoryWithOutOfStock|DockAndBayDailyInventoryReport)\.csv$/i;
export const GENEVA_GMAIL_Q = 'from:reports@geneva10.com subject:(DockandBayInventoryWithOutOfStock OR DockAndBayDailyInventoryReport) has:attachment newer_than:4d';
function csvRows(text) {   // quoted CSV → array of arrays (handles "" escapes and commas / newlines inside quotes)
  const out = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) { const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; continue; }
    if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some(v => v !== '')) out.push(row); row = []; }
    else cur += c; }
  row.push(cur); if (row.some(v => v !== '')) out.push(row); return out;
}
// Geneva CSV buffer → [{owner (VersionID), sku, description, barcode, status, physical, free}] (same shape as the ILG rows)
export function parseGenevaReport(buf) {
  const rows = csvRows(String(buf).replace(/^﻿/, '')); if (rows.length < 2) throw new Error('the report has no rows');
  const hdr = rows[0].map(h => String(h || '').trim().toLowerCase()), col = (...n) => { for (const x of n) { const i = hdr.indexOf(x); if (i >= 0) return i; } return -1; };
  const ci = { sku: col('itemid'), ver: col('versionid'), desc: col('descr', 'shortdescr'), ph: col('balanceqty', 'onhand'), fr: col('availableqty', 'available') };
  const miss = Object.entries({ ItemID: ci.sku, VersionID: ci.ver, 'BalanceQty / OnHand': ci.ph }).filter(([, i]) => i < 0).map(([k]) => k);
  if (miss.length) throw new Error('column(s) not found: ' + miss.join(', ') + ' (headers: ' + rows[0].join(', ') + ')');
  const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; };
  return rows.slice(1).map(r => ({ owner: String(r[ci.ver] || '').trim().toUpperCase(), sku: String(r[ci.sku] || '').trim(), description: ci.desc >= 0 ? String(r[ci.desc] || '') : '',
    barcode: '', status: 'Good', physical: num(r[ci.ph]), free: ci.fr >= 0 ? num(r[ci.fr]) : 0 })).filter(r => r.owner && r.sku);
}
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
  // v28.554: quantities are per company in Fulfil; pin UK (id 1 on live and sandbox) so a key whose default company is AU still reads UK stock
  const ctx = (ids) => '?context=' + encodeURIComponent(JSON.stringify({ locations: ids, company: ILG_COMPANY_ID }));
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
  // v28.671 (Ben, GIFT-BOX-BEAUTY-CHRYBMB: a true-up moved 400 from UK ILG to ILG - VENDOR in Fulfil after the report and "Set to" said 800):
  // moves between the ILG warehouses (UK ILG / ILG - FBA / ILG - VENDOR) are book moves inside the same building, so they are not "moved since":
  // the report already shows where ILG holds the stock, and Fulfil now is compared with it directly.
  const sibIds = new Set();
  for (const k of Object.keys(ILG_POOLS)) { if (k === pool || ILG_POOLS[k].site !== P.site) continue;   // v28.682: siblings = same site (Geneva STD / FBA)
    try { const sw = (await fulfilFetch('PUT', '/model/stock.location/search_read', [[['type', '=', 'warehouse'], ['name', '=', ILG_POOLS[k].warehouse]], 0, 2, null, ['id']]))[0];
      if (sw) { sibIds.add(sw.id); (await fulfilFetch('PUT', '/model/stock.location/search_read', [[['parent', 'child_of', [sw.id]]], 0, 500, null, ['id']])).forEach(l => sibIds.add(l.id)); } } catch (_) { /* a missing sibling warehouse just means no exclusion */ } }
  // net moves since the report: done moves written after report_at with one end inside the warehouse
  const since = {}, byId = {}; Object.entries(prod).forEach(([c, p]) => { byId[p.id] = c; });
  const after = String(reportAtIso).replace('Z', '').slice(0, 19);
  let off = 0; const mvAll = [];
  for (let page = 0; page < 40; page++) {
    const mv = await fulfilFetch('PUT', '/model/stock.move/search_read', [[['state', '=', 'done'], ['write_date', '>', after],
      ['OR', ['from_location', 'in', Array.from(inWh)], ['to_location', 'in', Array.from(inWh)]]], off, 500, null, ['product', 'from_location', 'to_location', 'quantity', 'internal_quantity', 'shipment']]);
    mvAll.push(...mv);
    if (mv.length < 500) break; off += 500;
  }
  // a true-up between ILG warehouses runs as an internal shipment through Transit (UK ILG → Transit → ILG - VENDOR): skip moves of internal
  // shipments whose both ends are ILG warehouses, as well as direct moves to / from a sibling ILG warehouse
  const isIds = [...new Set(mvAll.map(m => String(m.shipment || '')).filter(x => /^stock\.shipment\.internal,\d+$/.test(x)).map(x => Number(x.split(',')[1])))], bookIs = new Set();
  if (isIds.length && sibIds.size) { const allIlg = new Set([...inWh, ...sibIds]);
    for (let i = 0; i < isIds.length; i += 300) (await fulfilFetch('PUT', '/model/stock.shipment.internal/search_read', [[['id', 'in', isIds.slice(i, i + 300)]], 0, 300, null, ['id', 'from_location', 'to_location']]))
      .forEach(x => { if (allIlg.has(x.from_location) && allIlg.has(x.to_location)) bookIs.add('stock.shipment.internal,' + x.id); }); }
  // v28.686 (Ben: "once figures update it should ... remove them from discrepancies"): a stock count (ours or anyone's) books its change
  // against Lost and Found. That correction is about stock the report already shows, so it is not "moved since": skip moves to / from Lost and Found.
  const lostFound = new Set(); try { (await fulfilFetch('PUT', '/model/stock.location/search_read', [[['type', '=', 'lost_found']], 0, 20, null, ['id']])).forEach(l => lostFound.add(l.id)); } catch (_) { lostFound.add(10); }
  mvAll.forEach(m => { const fi = inWh.has(m.from_location), ti = inWh.has(m.to_location); if (fi === ti) return;
    if (lostFound.has(fi ? m.to_location : m.from_location)) return;   // v28.686: a count adjustment, not a move
    if (sibIds.has(fi ? m.to_location : m.from_location) || bookIs.has(String(m.shipment || ''))) return;   // v28.671: ILG to ILG book move, not stock in or out
    const code = byId[m.product]; if (!code) return; const q = Number(m.internal_quantity != null ? m.internal_quantity : m.quantity) || 0; since[code] = (since[code] || 0) + (ti ? q : -q); });
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
