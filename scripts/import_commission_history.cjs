// v28.322: one-off import of the commission PAID_HISTORY sheet (CSV export) into planner.commission_paid_history (migration 363).
// Usage: node scripts/import_commission_history.cjs "<path to csv>" [--db <DATABASE_URL env name, default DATABASE_URL>] [--replace]
// Re-running without --replace refuses when sheet rows already exist (no double import). The CSV is not kept in git (customer names).
const fs = require('fs'); const { Client } = require('pg');
const args = process.argv.slice(2), file = args.find(a => !a.startsWith('--')), dbEnv = (args[args.indexOf('--db') + 1] && args.includes('--db')) ? args[args.indexOf('--db') + 1] : 'DATABASE_URL', replace = args.includes('--replace');
if (!file) { console.error('usage: node scripts/import_commission_history.cjs <csv> [--db ENV_NAME] [--replace]'); process.exit(1); }
try { process.loadEnvFile('.env'); } catch (_) {}
function parseCsv(t) { const out = []; let row = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) { const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(f); out.push(row); row = []; f = ''; } else f += c; }
  if (f !== '' || row.length) { row.push(f); out.push(row); } return out; }
const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = n => String(n).padStart(2, '0'), s = v => { v = String(v == null ? '' : v).trim(); return v === '' ? null : v; };
function period(v) { const m = /^([A-Za-z]{3})-(\d{2})$/.exec(String(v || '').trim()); return m && MON[m[1].toLowerCase()] ? '20' + m[2] + '-' + pad(MON[m[1].toLowerCase()]) + '-01' : null; }
function ok(y, mo, d) { return mo >= 1 && mo <= 12 && d >= 1 && d <= new Date(Date.UTC(+y, mo, 0)).getUTCDate() ? y + '-' + pad(mo) + '-' + pad(d) : null; }
function day(v, per) {   // every format seen in the sheet; per = the payment month (YYYY-MM-01) for dates written without a year
  v = String(v || '').trim().replace(/\s+/g, ' '); let m;
  const yr = y => (String(y).length === 2 ? '20' + y : String(y)), mon = t => MON[String(t).slice(0, 3).toLowerCase()];
  const noYear = (mo, d) => { if (!per) return null; const py = +per.slice(0, 4), pm = +per.slice(5, 7); return ok(String(mo > pm ? py - 1 : py), mo, d); };
  if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(v))) { const us = ok(yr(m[3]), +m[1], +m[2]), uk = ok(yr(m[3]), +m[2], +m[1]);
    // the sheet mixes M/D and D/M: when both read as valid dates, take the one on or before the end of the payment month (an invoice is paid
    // after it is issued; '3/1/2022' paid in Jan-22 = 3 Jan, not 1 Mar), the later of the two if both fit; else the US reading
    if (us && uk && us !== uk && per) { const lim = new Date(Date.UTC(+per.slice(0, 4), +per.slice(5, 7), 0)).toISOString().slice(0, 10), fit = [us, uk].filter(d => d <= lim).sort(); if (fit.length) return fit[fit.length - 1]; }
    return us || uk; }   // M/D/Y (US), else D/M
  if ((m = /^(\d{1,2})[- ]([A-Za-z]{3,})[- ,]+(\d{2}|\d{4})$/.exec(v)) && mon(m[2])) return ok(yr(m[3]), mon(m[2]), +m[1]);   // 5-June-26, 11-Jul-2024, 01 Jan 2022
  if ((m = /^([A-Za-z]{3,})[- ](\d{1,2}),? (\d{4})$/.exec(v)) && mon(m[1])) return ok(m[3], mon(m[1]), +m[2]);                   // Jan 5, 2024
  if ((m = /^(\d{1,2})[- ]([A-Za-z]{3,})$/.exec(v)) && mon(m[2])) return noYear(mon(m[2]), +m[1]);                               // 19-Mar
  if ((m = /^(\d{1,2})\/(\d{1,2})$/.exec(v))) return noYear(+m[1], +m[2]) || noYear(+m[2], +m[1]);                                 // 1/26
  if ((m = /^(\d{2},?\d{3})(\.0+)?$/.exec(v))) { const n = Number(m[1].replace(',', '')); if (n > 30000 && n < 60000) return new Date(Date.UTC(1899, 11, 30) + n * 864e5).toISOString().slice(0, 10); }   // Excel serial
  return null; }
function num(v) { v = String(v || '').trim(); if (!v || v === '-') return null; const neg = /^\(.*\)$/.test(v) || /^-/.test(v.replace(/[€$£\s]/g, '')); const n = Number(v.replace(/[^0-9.]/g, '')); return isFinite(n) && v.replace(/[^0-9]/g, '') ? (neg ? -n : n) : null; }
function rate(v) { v = String(v || '').trim(); if (!v) return null; const n = Number(v.replace(/[%\s]/g, '')); if (!isFinite(n)) return null; return /%/.test(v) ? n : (n <= 1 ? Math.round(n * 10000) / 100 : n); }
function status(v) { v = String(v || '').trim().toLowerCase(); if (!v) return null; if (v === 'paid') return 'paid'; if (v.startsWith('dup')) return 'duplicate'; if (v.startsWith('not')) return 'not_paid'; if (v.startsWith('cancel')) return 'cancelled'; return v; }
(async () => {
  const rows = parseCsv(fs.readFileSync(file, 'utf8').replace(/^﻿/, '')); const head = rows.shift();
  const data = rows.filter(r => r.some(x => String(x).trim())).map(r => { const g = i => r[i] == null ? '' : r[i]; const raw = {}; head.forEach((h, i) => { if (String(g(i)).trim()) raw[h || ('col' + i)] = g(i); });
    return [period(g(0)), s(g(0)), s(g(1)), s(g(2)), s(g(3)), s(g(4)), s(g(5)), s(g(6)), s(g(7)), day(g(8), period(g(0))), /€/.test(g(9) + g(11) + g(14)) ? 'EUR' : null, num(g(9)), rate(g(10)), num(g(11)), s(g(12)), status(g(13)), num(g(14)), s(g(15)), s(g(16)), s(g(17)), s(g(18)), s(g(21)), s(g(22)), s(g(23)), /^true$/i.test(String(g(24)).trim()) ? true : (/^false$/i.test(String(g(24)).trim()) ? false : null), 'sheet', JSON.stringify(raw)]; });
  const c = new Client({ connectionString: process.env[dbEnv], ssl: { rejectUnauthorized: false } }); await c.connect();
  try { const have = (await c.query(`SELECT count(*)::int n FROM planner.commission_paid_history WHERE source='sheet'`)).rows[0].n;
    if (have && !replace) { console.log('Already imported (' + have + ' sheet rows). Use --replace to reload.'); return; }
    await c.query('BEGIN'); if (replace) await c.query(`DELETE FROM planner.commission_paid_history WHERE source='sheet'`);
    const cols = ['period','period_label','rep_group','customer','city','state','zip','invoice_no','po_no','invoice_date','currency','commissionable','rate_pct','commission_due','credit_note','status','paid_amount','notes','shopify_po','notes2','difficulty','payment_code','past_payment_codes','past_payment_agency','different_agency','source','raw'];
    for (let i = 0; i < data.length; i += 500) { const ch = data.slice(i, i + 500);
      await c.query(`INSERT INTO planner.commission_paid_history (${cols.join(',')}, created_by) VALUES ` + ch.map((r, k) => '(' + r.map((_, n) => '$' + (k * cols.length + n + 1) + (cols[n] === 'raw' ? '::jsonb' : '')).join(',') + ",'import')").join(','), ch.flat()); }
    await c.query('COMMIT'); console.log('Imported ' + data.length + ' rows from ' + file.split('/').pop());
  } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; } finally { await c.end(); }
})().catch(e => { console.error('Import failed: ' + e.message); process.exit(1); });
