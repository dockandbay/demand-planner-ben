/**
 * Build orders_for_match.json from coghlans_parsed.json:
 *   [{ dok, src_month (YYYY-MM from effectiveDate), ref, amt (fulf+carrier) }]
 * plus prints a per-invoice source-month table for verification.
 */
const fs = require('fs');
const path = require('path');
const d = require('./coghlans_parsed.json');

const monthOf = s => {
  if (!s) return null;
  const t = new Date(s);
  if (isNaN(t)) return null;
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0');
};

const out = [];
const perInv = [];
for (const inv of d) {
  const sm = monthOf(inv.effectiveDate);
  let n = 0, amt = 0;
  for (const o of inv.orders) {
    const a = +( (o.fulfilment || 0) + (o.carrier || 0) ).toFixed(2);
    out.push({ dok: inv.dok, src_month: sm, ref: (o.ref || '').trim(), amt: a });
    n++; amt += a;
  }
  perInv.push({ dok: inv.dok, eff: inv.effectiveDate, src_month: sm, orders: n, reclassable: +amt.toFixed(2) });
}

fs.writeFileSync(path.join(__dirname, 'orders_for_match.json'), JSON.stringify(out));
console.log('dok        src_month  orders  reclassable$');
for (const r of perInv) console.log(`${r.dok}  ${r.src_month}    ${String(r.orders).padStart(5)}   ${r.reclassable}`);
console.log('\nTotal orders:', out.length, ' Total reclassable$:', +out.reduce((a, o) => a + o.amt, 0).toFixed(2));
console.log('Wrote orders_for_match.json');
