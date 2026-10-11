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
      if (inUnrec) { const d = asDate(first), amt = asNum(r[3]); if (d && amt != null) out.unreconciled.push({ date: d, description: (r[1] || '').trim(), reference: (r[2] || '').trim(), amount: amt }); continue; }
      if (inLines) { const d = asDate(first); if (!d) continue; const amt = asNum(r[6]); if (amt == null) continue;
        out.lines.push({ date: d, description: (r[1] || '').trim(), imported: asDate(r[2]), reference: (r[3] || '').trim(), reconciled: /^y/i.test((r[4] || '').trim()), source: (r[5] || '').trim(), amount: amt, balance: asNum(r[7]) }); }
    }
  });
  out.org = orgOf(out.company);
  if (!out.account) throw new Error('Not a Xero Bank Reconciliation export (no account name in row 4)');
  if (!out.unreconciled.length && !out.lines.length) throw new Error('No statement lines found: export the Bank Reconciliation report as Excel (not PDF)');
  return out;
}
