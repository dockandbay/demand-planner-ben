// v28.285 (Ben 12-Oct-26): one bank payment can be split across several Xero bills (the SUPPLIER-PAYMENT bill for the PO lines plus
// each "Other" payment's own bill, e.g. PO-DHL-XR-2026-07). The supplier-payment bill then carries $0 key lines at the top:
// the bank payment total, then one row per bill with its share (one $0 line item, rows separated by line breaks in its description),
// so whoever reconciles the bank line in Xero sees how it splits.
// Only when more than one bill is in play. Pure function: no I/O.
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fd = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? m[3] + '-' + MON[+m[2] - 1] + '-' + m[1].slice(2) : String(s || ''); };
const money = n => (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// bill: { number, amount, lines: [{ type, reference, amount }] }  (the supplier-payment bill and what it covers)
// others: [{ number, reference, description, amount }]           (the other bills paid by the same bank payment)
// opts: { ccy, date, accountCode }
export function paySplitKeyLines(bill, others, opts) {
  others = (others || []).filter(o => Math.abs(Number(o.amount) || 0) > 0.005);
  if (!others.length) return [];
  const ccy = (opts && opts.ccy) || 'USD', acct = opts && opts.accountCode;
  const total = (Number(bill.amount) || 0) + others.reduce((a, o) => a + (Number(o.amount) || 0), 0);
  const n = 1 + others.length;
  const L = d => Object.assign({ Description: d, Quantity: 1, UnitAmount: 0 }, acct ? { AccountCode: acct } : {});
  const out = [L('KEY: bank payment ' + fd(opts && opts.date) + ' of ' + ccy + ' ' + money(total) + ' is split across ' + n + ' Xero bills (match ' + (n === 2 ? 'both' : 'all ' + n) + ' to the one bank line):')];
  const pos = (bill.lines || []).filter(l => Math.abs(Number(l.amount) || 0) > 0.005);
  out.push(L('1. ' + bill.number + ' (this bill): ' + ccy + ' ' + money(bill.amount) + (pos.length ? ', made up of:' : '')));
  pos.forEach(l => out.push(L('    • ' + (l.reference || '') + ' ' + String(l.type || '').toLowerCase() + ': ' + ccy + ' ' + money(l.amount))));   // one PO per line (Ben)
  others.forEach((o, i) => out.push(L((i + 2) + '. ' + (o.number || o.reference) + ': ' + ccy + ' ' + money(o.amount) + (o.description && o.description !== o.reference ? ' (' + o.description + ')' : ''))));
  return [L(out.map(x => x.Description).join('\n'))];   // v28.286 (Ben): ONE $0 line, line breaks inside the description
}
