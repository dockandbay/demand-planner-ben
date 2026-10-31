// v28.603 (Ben 31-Oct-26): CLIENT > B2B forecast, the pure calculations (no database). Spec: docs/specs/b2b-forecast.md.
// Used by server.mjs (routes, Chief feed, CSV feed), scripts/import-b2b-forecast.mjs and tests/b2b-forecast.cjs, so the
// numbers are identical everywhere.
//   value_gbp   = value_source / rate(currency, ship date else order date), rates = local currency per 1 GBP from
//                 app_settings.fx_rates by financial year (FY starts March), then usd_gbp_rate for USD. Never a
//                 hard-coded rate: no rate = "no FX rate", left out of totals.
//   receipts    = value_gbp x pct per payment, in the due month; UK Wholesale x 1.2 (VAT). Not cancelled, not paid.
//   pnl_revenue = value_gbp (net) in the ship month. Not cancelled.
//   production  = unconfirmed, not cancelled: value_gbp x cogs (0.45) -> 30% order month, 70% ship month.

export const B2B_TYPES = ['UK Wholesale', 'US Wholesale', 'EU Wholesale', 'International Distributor', 'AU Distributor'];
export const B2B_CURRENCIES = ['GBP', 'USD', 'EUR', 'AUD', 'CAD'];
export const B2B_STATUSES = ['forecast', 'confirmed', 'shipped', 'invoiced', 'paid', 'cancelled'];
export const B2B_COGS_DEFAULT = 0.45;
export const B2B_UK_VAT = 1.2;

const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = n => String(n).padStart(2, '0');
const yr = y => (y < 100 ? 2000 + y : y);
function okDate(y, m, d) { const t = new Date(Date.UTC(y, m - 1, d)); return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d; }

// Parse the sheet's mixed date formats: 06-Oct-26, 20 April 27, 11/20/25 (US m/d/yy), 2026-10-06, a Date, or a Sheets
// serial number. Returns 'YYYY-MM-DD', '' for blank, or null when it can't be read (the caller flags it, never guesses).
export function b2bParseDate(v) {
  if (v == null) return '';
  if (v instanceof Date) return isNaN(v) ? null : v.toISOString().slice(0, 10);
  const s = String(v).trim(); if (!s) return '';
  let m;
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s))) return okDate(+m[1], +m[2], +m[3]) ? m[1] + '-' + pad(m[2]) + '-' + pad(m[3]) : null;
  if ((m = /^(\d{1,2})[\s\-\/.]+([A-Za-z]{3,})\.?[\s\-\/.,]+(\d{2,4})$/.exec(s))) {
    const mo = MON[m[2].slice(0, 3).toLowerCase()], y = yr(+m[3]); return mo && okDate(y, mo, +m[1]) ? y + '-' + pad(mo) + '-' + pad(m[1]) : null; }
  if ((m = /^([A-Za-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{2,4})$/.exec(s))) {
    const mo = MON[m[1].slice(0, 3).toLowerCase()], y = yr(+m[3]); return mo && okDate(y, mo, +m[2]) ? y + '-' + pad(mo) + '-' + pad(m[2]) : null; }
  if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s))) {   // the sheet's slash dates are US style (11/20/25)
    const y = yr(+m[3]); return okDate(y, +m[1], +m[2]) ? y + '-' + pad(m[1]) + '-' + pad(m[2]) : null; }
  if (/^\d{5}$/.test(s)) { const t = new Date(Date.UTC(1899, 11, 30) + Number(s) * 86400000); return t.toISOString().slice(0, 10); }
  return null;
}
export const b2bDateSuspect = iso => !!iso && (+iso.slice(0, 4) < 2024 || +iso.slice(0, 4) > 2028);

export function b2bNum(v) { if (v == null || v === '') return null; if (typeof v === 'number') return v;
  const s = String(v).replace(/[£$€,\s]|AUD|USD|EUR|GBP|CAD/gi, ''); if (!s) return null; const n = Number(s); return isFinite(n) ? n : null; }
export function b2bPct(v) { if (v == null || v === '') return null; if (typeof v === 'number') return v <= 1.5 && v > 0 ? v * 100 : v;
  const s = String(v).trim(); const n = Number(s.replace('%', '')); if (!isFinite(n)) return null; return /%/.test(s) ? n : (n <= 1.5 && n > 0 ? n * 100 : n); }

// FY key for a date: Dock & Bay's financial year starts 1 March ("2026" = Mar-26 to Feb-27).
export const b2bFy = iso => { const y = +iso.slice(0, 4), m = +iso.slice(5, 7); return String(m >= 3 ? y : y - 1); };

// Rate = currency per 1 GBP. fx = app_settings.fx_rates object, usdLegacy = app_settings.usd_gbp_rate (number or null).
export function b2bRate(fx, cur, iso, usdLegacy) {
  if (cur === 'GBP') return { rate: 1, source: 'GBP' };
  const fy = b2bFy(iso), r = fx && fx[fy] && Number(fx[fy][cur]);
  if (r > 0) return { rate: r, source: 'fx_rates FY' + fy };
  if (cur === 'USD' && Number(usdLegacy) > 0) return { rate: Number(usdLegacy), source: 'usd_gbp_rate' };
  return null;
}

const ym = iso => (iso ? iso.slice(0, 7) : null);
const r2 = n => Math.round(n * 100) / 100;

// One order -> its GBP value and every phased line. o: {value_source, currency, order_type, entity, confirmed, status,
// order_date, ship_date, cogs_pct, payments:[{seq,due_date,pct}]} (dates 'YYYY-MM-DD'). today: 'YYYY-MM-DD' (rate date
// when the order has no dates at all).
export function b2bCalc(o, fx, usdLegacy, today) {
  const d = o.ship_date || o.order_date || today;
  const rt = b2bRate(fx, o.currency, d, usdLegacy);
  const out = { rate_date: d, fx_rate: rt ? rt.rate : null, fx_source: rt ? rt.source : null, value_gbp: null, lines: [] };
  if (!rt) return out;
  const v = Number(o.value_source) || 0, gbp = v / rt.rate; out.value_gbp = r2(gbp);
  const au = o.entity === 'AU';
  const audRt = au ? (o.currency === 'AUD' ? null : b2bRate(fx, 'AUD', d, usdLegacy)) : null;
  const audRate = !au ? null : o.currency === 'AUD' ? rt.rate : (audRt ? audRt.rate : null);
  const local = amt => (audRate ? r2(amt * audRate) : null);   // AU entity: GBP back to AUD (exact for AUD orders)
  const st = o.status || 'forecast', live = st !== 'cancelled', conf = !!o.confirmed;
  if (live && st !== 'paid') for (const p of (o.payments || [])) {
    const pct = Number(p.pct) || 0; if (!pct || !p.due_date) continue;
    const g = gbp * pct / 100 * (o.order_type === 'UK Wholesale' ? B2B_UK_VAT : 1);
    out.lines.push({ kind: 'receipt', month: ym(p.due_date), amount_gbp: r2(g), amount_local: local(gbp * pct / 100), confirmed: conf });
  }
  if (live && o.ship_date) out.lines.push({ kind: 'pnl_revenue', month: ym(o.ship_date), amount_gbp: r2(gbp), amount_local: local(gbp), confirmed: conf });
  if (live && !conf) {
    const cogs = o.cogs_pct != null && o.cogs_pct !== '' ? Number(o.cogs_pct) : B2B_COGS_DEFAULT, cost = gbp * cogs;
    if (o.order_date) out.lines.push({ kind: 'production_cost', month: ym(o.order_date), amount_gbp: r2(cost * 0.3), amount_local: local(cost * 0.3), confirmed: false });
    if (o.ship_date) out.lines.push({ kind: 'production_cost', month: ym(o.ship_date), amount_gbp: r2(cost * 0.7), amount_local: local(cost * 0.7), confirmed: false });
  }
  return out;
}

// Checks on one order (section 6 + Fulfil). ctx: {today, client:{market,currency}|null, fulfil:{any, shipped, shipped_value, cancelled}|null,
// calc (b2bCalc result)}. Returns [{sev:'red'|'amber', code, text}].
export function b2bChecks(o, ctx) {
  const out = [], add = (sev, code, text) => out.push({ sev, code, text });
  const today = ctx.today, pays = (o.payments || []).filter(p => Number(p.pct) || p.due_date), st = o.status || 'forecast';
  if (st === 'cancelled') return out;
  const sum = pays.reduce((s, p) => s + (Number(p.pct) || 0), 0);
  if (!pays.length) add('red', 'no_payments', 'No payments: missing from cash');
  else if (Math.abs(sum - 100) > 0.01) add('red', 'pct_sum', 'Payments add up to ' + r2(sum) + '%, not 100%');
  if (pays.some(p => Number(p.pct) && !p.due_date)) add('red', 'pay_no_date', 'A payment has a % but no date: missing from cash');
  if (ctx.calc && ctx.calc.fx_rate == null) add('red', 'no_fx', 'No FX rate for ' + o.currency + ': left out of totals');
  const bad = (o.import_flags || []).map(f => f.field + ' "' + f.raw + '"');
  const sus = [['order_date', o.order_date], ['ship_date', o.ship_date]].concat(pays.map((p, i) => ['payment ' + (i + 1), p.due_date])).filter(x => b2bDateSuspect(x[1])).map(x => x[0] + ' ' + x[1]);
  if (bad.length || sus.length) add('red', 'bad_date', 'Date looks wrong: ' + bad.concat(sus).join(', '));
  if (!o.confirmed && pays.some(p => p.due_date && p.due_date < today)) add('amber', 'unconf_pay_passed', 'Unconfirmed, but a payment date has passed');
  const f = ctx.fulfil;
  if (!o.bucket && f && f.shipped && !o.confirmed) add('amber', 'shipped_unconfirmed', 'Fulfil shows it shipped, but the row is unconfirmed');
  if (!o.bucket && f && f.any && o.ship_date && o.ship_date < today && !f.shipped && !f.cancelled) add('amber', 'ship_passed', 'Ship date has passed, not shipped in Fulfil: move dates?');
  if (!o.bucket && f && f.shipped && ctx.calc && ctx.calc.value_gbp != null && f.shipped_value != null && f.shipped_value < Number(o.value_source) * 0.98)
    add('amber', 'part_shipped', 'Shipped ' + Math.round(f.shipped_value).toLocaleString('en-GB') + ' of ' + Math.round(Number(o.value_source)).toLocaleString('en-GB') + ' ' + o.currency);
  if (!o.bucket && o.confirmed && !(o.fulfil_order_refs || []).length && o.ship_date && _days(o.ship_date, today) > 14) add('amber', 'link_fulfil', 'Confirmed and 14+ days past ship date: link the Fulfil order');
  if ((o.bucket || !o.confirmed) && !(f && f.any) && o.ship_date && _days(o.ship_date, today) > 30) add('amber', 'no_actual', 'Ship date passed 30+ days ago and no actual orders matched: match them (row drawer) or close it');
  if (/deposit|pre[\s-]?pay|% *down|down[, ]/i.test(o.payment_terms || '') && !/^\s*pre[\s-]?pay\s*$/i.test(o.payment_terms || '') && pays.length < 2) add('amber', 'deposit_one_pay', 'Terms mention a deposit, but there is only one payment');
  if (o.order_date && pays.some(p => p.due_date && p.due_date < o.order_date)) add('amber', 'pay_before_order', 'A payment date is before the order date');
  const c = ctx.client;
  if (c) { const mk = String(c.market || '').toUpperCase(), wh = /^(UK|US|EU) Wholesale$/.exec(o.order_type || '');
    if ((wh && ['UK', 'US', 'EU'].includes(mk) && wh[1] !== mk) || (o.order_type === 'AU Distributor' && mk && mk !== 'AU') || (c.currency && c.currency !== o.currency))
      add('amber', 'type_mismatch', 'Order type or currency does not match the client (' + [mk, c.currency].filter(Boolean).join(', ') + ')'); }
  return out;
}
function _days(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 86400000); }

// Monthly feed rows: month x order_type x entity x confirmed x kind.
export function b2bSummary(orders) {
  const m = new Map();
  for (const o of orders) for (const l of (o.calc ? o.calc.lines : [])) {
    const k = [l.month, o.order_type, o.entity, l.confirmed, l.kind].join('|');
    let r = m.get(k); if (!r) m.set(k, r = { month: l.month, order_type: o.order_type, entity: o.entity, confirmed: l.confirmed, kind: l.kind, amount_gbp: 0, amount_local: o.entity === 'AU' ? 0 : null, _ids: new Set() });
    r.amount_gbp += l.amount_gbp; if (r.amount_local != null) r.amount_local += (l.amount_local || 0); r._ids.add(o.id);
  }
  return [...m.values()].map(r => ({ month: r.month, order_type: r.order_type, entity: r.entity, confirmed: r.confirmed, kind: r.kind,
    amount_gbp: r2(r.amount_gbp), amount_local: r.amount_local == null ? null : r2(r.amount_local), order_count: r._ids.size }))
    .sort((a, b) => a.month < b.month ? -1 : a.month > b.month ? 1 : (a.kind + a.order_type).localeCompare(b.kind + b.order_type));
}

// Looks like a Fulfil / EDI order number (JLEW11511-79, NEXT23106-14, CCRU28821-1, SO56508, USWS-17903).
export const b2bLooksLikeOrderRef = s => /^(SO\d{4,}|[A-Z]{3,5}\d{3,6}-\d+[A-Z]?|USWS-\d+)$/i.test(String(s || '').trim());

// Sheet rows (columns C..O, 13 cells each) -> import records. Skips the header, the example rows above
// "EXAMPLES ABOVE - Fill below" and blank rows. Returns {rows, skipped, flagged}.
export function b2bParseSheet(cells) {
  const rows = [], skipped = []; let start = 0;
  const ix = cells.findIndex(r => /EXAMPLES ABOVE/i.test((r || []).join(' ')));
  if (ix >= 0) start = ix + 1; else if (cells.length && /^client$/i.test(String((cells[0] || [])[0] || '').trim())) start = 1;
  for (let i = start; i < cells.length; i++) {
    const c = (cells[i] || []).map(x => (x == null ? '' : String(x).trim()));
    const [client, ref, type, val, cur, conf, od, terms, sd, p1d, p1p, p2d, p2p] = c;
    if (!client && !val) { if (c.some(Boolean) && !/^(true|false)$/i.test(c.filter(Boolean).join(''))) skipped.push({ line: i + 1, why: 'no client or value' }); continue; }
    if (!client || b2bNum(val) == null) { skipped.push({ line: i + 1, why: !client ? 'no client' : 'no order value', client }); continue; }
    const t = B2B_TYPES.find(x => x.toLowerCase() === String(type).toLowerCase());
    if (!t) { skipped.push({ line: i + 1, why: 'unknown type "' + type + '"', client }); continue; }
    const cu = String(cur).toUpperCase(); if (!B2B_CURRENCIES.includes(cu)) { skipped.push({ line: i + 1, why: 'unknown currency "' + cur + '"', client }); continue; }
    const flags = [], dt = (field, raw) => { const v = b2bParseDate(raw); if (v === null) { flags.push({ field, raw }); return null; } return v || null; };
    const rec = { line: i + 1, client_label: client, reference: ref || null, order_type: t, entity: t === 'AU Distributor' ? 'AU' : 'UK', value_source: b2bNum(val), currency: cu,
      confirmed: /^(true|yes|y|1)$/i.test(conf), order_date: dt('order_date', od), payment_terms: terms || null, ship_date: dt('ship_date', sd), payments: [],
      fulfil_order_refs: b2bLooksLikeOrderRef(ref) ? [String(ref).trim()] : [] };
    rec.status = rec.confirmed ? 'confirmed' : 'forecast';
    [[p1d, p1p], [p2d, p2p]].forEach(([pd, pp], k) => { const pct = b2bPct(pp), due = dt('payment ' + (k + 1), pd);
      if (pct || due) rec.payments.push({ seq: k + 1, due_date: due, pct: pct || 0 }); });
    rec.bucket = !rec.reference && /\b(key accounts|distro)\b/i.test(client) && !rec.confirmed;
    rec.import_flags = flags.length ? flags : null; rows.push(rec);
  }
  return { rows, skipped, flagged: rows.filter(r => r.import_flags || [r.order_date, r.ship_date].concat(r.payments.map(p => p.due_date)).some(b2bDateSuspect)) };
}
// Tab-separated paste (Sheets / Excel) or CSV text -> 2D cells. Quoted cells may hold tabs, commas and new lines.
export function b2bSplitText(text) {
  const s = String(text || '').replace(/\r\n?/g, '\n'); const firstLine = s.split('\n')[0] || '';
  const sep = firstLine.includes('\t') ? '\t' : ','; const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < s.length; i++) { const ch = s[i];
    if (q) { if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
    if (ch === '"' && cell === '') { q = true; continue; }
    if (ch === sep) { row.push(cell); cell = ''; continue; }
    if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
    cell += ch; }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// The workbook CSV (same columns as B2B_DIRECT_FORECAST!C:O). Dates YYYY-MM-DD, percentages as decimals.
export function b2bCsv(orders) {
  const H = ['Client', 'Reference / Note / Order Number', 'TYPE', 'Order Value (NET, EX TAX)', 'Currency', 'Order Confirmed', 'Order Date', 'Payment Terms', 'Ship Date', 'Payment 1 Date', 'Payment 1 %', 'Payment 2 Date', 'Payment 2 %'];
  const esc = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const lines = [H.map(esc).join(',')], skipped = [];
  for (const o of orders) { if (o.status === 'cancelled') continue;
    const p = (o.payments || []).slice().sort((a, b) => a.seq - b.seq); if (p.length > 2) { skipped.push(o.id); continue; }
    const pc = x => (x == null || x === '' ? '' : String(Math.round(Number(x) * 1000) / 100000));
    lines.push([o.client_label, o.reference, o.order_type, o.value_source, o.currency, o.confirmed ? 'TRUE' : 'FALSE', o.order_date, o.payment_terms, o.ship_date,
      p[0] && p[0].due_date, p[0] && pc(p[0].pct), p[1] && p[1].due_date, p[1] && pc(p[1].pct)].map(esc).join(',')); }
  return { csv: lines.join('\n') + '\n', skipped };
}
