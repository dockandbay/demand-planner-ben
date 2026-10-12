// v28.265 (Ben 12-Oct-26): parser for Xero's Bank Reconciliation report pack (Accounting > Reports > Bank Reconciliation > Export > Excel).
// Three tabs: "<account> Reconciliation Summary" (every UNRECONCILED statement line as at the report date), "Bank Statement" (every line in
// the period with a Reconciled Yes/No flag) and "Statement Exceptions". Xero's public API cannot return statement lines (confirmed by Xero
// support 12-Oct-26), so this file is the source for ACCOUNTS > Bank ageing > Statement lines. Read only; nothing is sent back to Xero.
import ExcelJS from 'exceljs';
const cellText = v => { if (v == null) return ''; if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') { if (v.richText) return v.richText.map(t => t.text).join(''); if (v.result != null) return cellText(v.result); if (v.text) return String(v.text); return ''; }
  return String(v); };
const asDate = s => { s = cellText(s).trim(); let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if (m) return s.slice(0, 10);
  m = /^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})$/.exec(s); if (m) { const mo = 'janfebmaraprmayjunjulaugsepoctnovdec'.indexOf(m[2].slice(0, 3).toLowerCase()) / 3; if (mo >= 0) return m[3] + '-' + String(mo + 1).padStart(2, '0') + '-' + m[1].padStart(2, '0'); }
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s); if (m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0'); return null; };
const asNum = s => { if (typeof s === 'number') return s; const t = cellText(s).replace(/[,\s£$€]/g, ''); if (!t || !/^-?\(?\d/.test(t)) return null; const neg = /^\(.*\)$/.test(t); const n = Number(t.replace(/[()]/g, '')); return isNaN(n) ? null : (neg ? -n : n); };
const orgOf = s => /pty/i.test(s) || /australia/i.test(s) ? 'au' : 'uk';
export async function parseXeroReconPack(buf) {
  const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf);
  const out = { org: null, company: '', account: '', as_at: null, period: null, unreconciled: [], lines: [], sheets: [] };
  wb.eachSheet(ws => {
    const rows = []; ws.eachRow({ includeEmpty: true }, (row, i) => { rows[i] = (row.values || []).slice(1).map(cellText); });
    const head = rows.slice(1, 6).map(r => (r || []).join(' ').trim());
    out.sheets.push(ws.name);
    if (!out.company && head[1]) out.company = head[1];
    if (!out.account && head[3]) out.account = head[3];
    const asAt = head.map(h => /^As at (.+)$/i.exec(h)).find(Boolean); if (asAt && !out.as_at) out.as_at = asDate(asAt[1]);
    const per = head.map(h => /^For the period (.+) to (.+)$/i.exec(h)).find(Boolean); if (per && !out.period) out.period = { from: asDate(per[1]), to: asDate(per[2]) };
    // Summary tab: section "Plus Unreconciled Statement Lines" ... "Total Unreconciled Statement Lines"
    let inUnrec = false, inLines = false;
    for (let i = 1; i < rows.length; i++) { const r = rows[i] || [], first = (r[0] || '').trim(), joined = r.join(' ').trim();
      if (/^Plus Unreconciled Statement Lines$/i.test(joined) || /^Unreconciled Statement Lines$/i.test(joined)) { inUnrec = true; continue; }
      if (/^Total Unreconciled Statement Lines/i.test(joined)) { inUnrec = false; continue; }
      if (/^Statement Lines$/i.test(joined)) { inLines = true; continue; }
      if (/^Closing Balance/i.test(joined)) { inLines = false; continue; }
      if (inUnrec) { const d = asDate(first), amt = asNum(r[3]); if (d && amt != null) out.unreconciled.push({ date: d, description: (r[1] || '').trim(), reference: canonRef(r[2]), amount: amt }); continue; }
      if (inLines) { const d = asDate(first); if (!d) continue; const amt = asNum(r[6]); if (amt == null) continue;
        out.lines.push({ date: d, description: (r[1] || '').trim(), imported: asDate(r[2]), reference: canonRef(r[3]), reconciled: /^y/i.test((r[4] || '').trim()), source: (r[5] || '').trim(), amount: amt, balance: asNum(r[7]) }); }
    }
  });
  out.org = orgOf(out.company);
  if (!out.account) throw new Error('Not a Xero Bank Reconciliation export (no account name in row 4)');
  if (!out.unreconciled.length && !out.lines.length) throw new Error('No statement lines found: export the Bank Reconciliation report as Excel (not PDF)');
  return out;
}

// v28.268 (Ben 12-Oct-26): Xero "Uncoded statement lines" report, All bank accounts, exported as CSV (Accounting > Bank accounts > menu >
// Uncoded statement lines). One block per bank account: "<name> (<code>)", the account number, a header
// "Date,Payee,Particulars | Reference | Code,Spent,Received,Tax,Your Comments", then one row per uncoded (unreconciled) statement line.
// An account with no rows is fully reconciled. Returns { as_at, accounts: [{ name, code, number, lines: [{ date, payee, reference, amount }] }] }.
function csvRow(line) { const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) { const c = line[i];
    if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c; }
  out.push(cur); return out; }
export function canonRef(s) {   // one key for both exports: "LOAN - 03253309 PAY" (reconciliation pack) = "PAY | LOAN - 03253309" (uncoded CSV)
  s = String(s || '').replace(/\r/g, '').trim();
  if (s.includes('|')) return s.split('|').map(x => x.trim()).filter(Boolean).join(' | ');
  const m = /^(.*\S)\s+([A-Z]{2,4})$/.exec(s); return m ? m[2] + ' | ' + m[1] : s;
}
export function parseXeroUncodedCsv(text, filename) {
  const L = String(text || '').replace(/^﻿/, '').split(/\r?\n/), accounts = [];
  const isHead = l => /^Date,Payee,/i.test(String(l || ''));
  for (let i = 0; i < L.length; i++) {
    if (!(i + 2 < L.length && isHead(L[i + 2]))) continue;
    const raw = L[i].trim(), m = /^(.*?)\s*\(([0-9]{2,4})\)$/.exec(raw);
    const acc = { name: m ? m[1].trim() : raw, raw, code: m ? m[2] : null, number: (L[i + 1] || '').trim(), lines: [] };
    let j = i + 3;
    for (; j < L.length; j++) { if (!L[j].trim()) { if (j + 3 < L.length && isHead(L[j + 3])) break; continue; } if (j + 2 < L.length && isHead(L[j + 2])) break;
      const c = csvRow(L[j]); const d = /^\d{4}-\d{2}-\d{2}$/.test(c[0]) ? c[0] : null; if (!d) continue;
      const num = v => { v = String(v || '').replace(/[,\s]/g, ''); return v === '' ? null : Number(v); };
      const spent = num(c[3]), rec = num(c[4]); const amount = (rec || 0) - (spent || 0);
      acc.lines.push({ date: d, payee: (c[1] || '').trim(), reference: canonRef(c[2]), amount: Math.round(amount * 100) / 100 }); }
    accounts.push(acc); i = j - 1;
  }
  if (!accounts.length) throw new Error('Not a Xero Uncoded statement lines export (no account blocks with a Date,Payee header)');
  const fd = /(\d{4}-\d{2}-\d{2})/.exec(String(filename || ''));
  return { as_at: fd ? fd[1] : new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' }), accounts };
}
