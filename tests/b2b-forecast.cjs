// v28.603: CLIENT > B2B forecast acceptance tests (docs/specs/b2b-forecast.md section 12). Pure calculations only,
// rates as on live app_settings.fx_rates (31-Oct-26). Run: node tests/b2b-forecast.cjs
const path = require('path');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS  ' + m); } else { fail++; console.log('  FAIL  ' + m); } };
const near = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1 : tol);
(async () => {
  const L = await import(path.join(__dirname, '..', 'lib', 'b2b_forecast.mjs'));
  const FY = { USD: 1.344789, EUR: 1.154638, AUD: 1.9, CAD: 1.855467 };
  const fx = { 2026: FY, 2027: FY }, today = '2026-10-31';
  const sum = (c, kind, month) => c.lines.filter(l => l.kind === kind && l.month === month).reduce((s, l) => s + l.amount_gbp, 0);
  const sumL = (c, kind, month) => c.lines.filter(l => l.kind === kind && l.month === month).reduce((s, l) => s + (l.amount_local || 0), 0);

  // 1. Carnival CCRU28821-1
  const carn = { id: 1, value_source: 247000, currency: 'USD', order_type: 'US Wholesale', entity: 'UK', confirmed: true, status: 'confirmed', order_date: '2026-08-01', ship_date: '2026-10-15', payment_terms: 'N30', payments: [{ seq: 1, due_date: '2026-12-15', pct: 100 }] };
  const c1 = L.b2bCalc(carn, fx, null, today);
  ok(near(sum(c1, 'receipt', '2026-12'), 247000 / 1.344789), '1 Carnival Dec-26 receipt = ' + sum(c1, 'receipt', '2026-12') + ' (spec ~183,780 at 1.344)');
  ok(near(sum(c1, 'receipt', '2026-12'), 183780, 300), '1 Carnival within 300 of the spec figure');
  ok(c1.lines.find(l => l.kind === 'receipt').confirmed === true, '1 Carnival receipt tagged confirmed');

  // 2. John Lewis SS27
  const jl = { id: 2, value_source: 376000, currency: 'GBP', order_type: 'UK Wholesale', entity: 'UK', confirmed: true, status: 'confirmed', order_date: '2026-09-24', ship_date: '2027-02-20', payments: [{ seq: 1, due_date: '2027-04-20', pct: 100 }] };
  const c2 = L.b2bCalc(jl, fx, null, today);
  ok(near(sum(c2, 'receipt', '2027-04'), 451200, 0.01), '2 John Lewis Apr-27 receipt 451,200 (x1.2 VAT)');
  ok(near(sum(c2, 'pnl_revenue', '2027-02'), 376000, 0.01), '2 John Lewis Feb-27 P&L revenue 376,000 (net)');

  // 3. Trailfinders: 30% dated, 70% undated
  const tf = { id: 3, value_source: 106992, currency: 'GBP', order_type: 'UK Wholesale', entity: 'UK', confirmed: true, status: 'confirmed', order_date: '2026-09-25', ship_date: '2027-01-25', payment_terms: '30% deposit and Net 30 on the remainder', payments: [{ seq: 1, due_date: '2026-10-06', pct: 30 }, { seq: 2, due_date: null, pct: 70 }] };
  const c3 = L.b2bCalc(tf, fx, null, today);
  ok(near(sum(c3, 'receipt', '2026-10'), 38517.12, 0.01), '3 Trailfinders Oct-26 receipt 38,517');
  ok(L.b2bChecks(tf, { today, calc: c3 }).some(x => x.code === 'pay_no_date' && x.sev === 'red'), '3 Trailfinders red check for the undated 70%');

  // 4. Promo Distro Jan: unconfirmed production cost 30/70
  const pd = { id: 4, value_source: 271400, currency: 'USD', order_type: 'International Distributor', entity: 'UK', confirmed: false, status: 'forecast', bucket: true, order_date: '2026-09-15', ship_date: '2027-01-15', payment_terms: '30% deposit, 70% net30 from cargo ready date', payments: [{ seq: 1, due_date: '2026-09-15', pct: 30 }, { seq: 2, due_date: '2027-02-15', pct: 70 }] };
  const c4 = L.b2bCalc(pd, fx, null, today), g4 = 271400 / 1.344789;
  ok(near(sum(c4, 'production_cost', '2026-09'), g4 * 0.45 * 0.3), '4 Promo Distro Sep-26 production = 30% of value x 0.45');
  ok(near(sum(c4, 'production_cost', '2027-01'), g4 * 0.45 * 0.7), '4 Promo Distro Jan-27 production = 70%');
  ok(L.b2bChecks(pd, { today, calc: c4 }).some(x => x.code === 'unconf_pay_passed'), '4 Promo Distro amber: payment date passed while unconfirmed');
  ok(!L.b2bCalc(Object.assign({}, pd, { confirmed: true }), fx, null, today).lines.some(l => l.kind === 'production_cost'), '4 confirmed orders have no production cost line');

  // 5. AU Distro Jan: AUD stays AUD for the AU entity, deposit check
  const au = { id: 5, value_source: 109051, currency: 'AUD', order_type: 'AU Distributor', entity: 'AU', confirmed: false, status: 'forecast', order_date: '2026-10-15', ship_date: '2027-01-15', payment_terms: '25% deposit, pay rest to ship', payments: [{ seq: 1, due_date: '2027-02-15', pct: 100 }] };
  const c5 = L.b2bCalc(au, fx, null, today);
  ok(near(sumL(c5, 'receipt', '2027-02'), 109051, 0.01), '5 AU Distro Feb-27 receipt 109,051 AUD local');
  ok(near(sum(c5, 'receipt', '2027-02'), 109051 / 1.9), '5 AU Distro GBP for group totals at AUD 1.9');
  ok(L.b2bChecks(au, { today, calc: c5 }).some(x => x.code === 'deposit_one_pay'), '5 AU Distro amber: deposit terms, one payment');

  // 5b. A bucket 30+ days past its ship date with no actual orders matched gets an amber check; matched, it does not
  const bk = { id: 7, value_source: 200000, currency: 'GBP', order_type: 'UK Wholesale', entity: 'UK', confirmed: false, bucket: true, status: 'forecast', order_date: '2026-06-15', ship_date: '2026-09-15', payments: [{ seq: 1, due_date: '2026-11-15', pct: 100 }] };
  ok(L.b2bChecks(bk, { today, calc: L.b2bCalc(bk, fx, null, today) }).some(x => x.code === 'no_actual'), '5b bucket past ship date, nothing matched: amber');
  ok(!L.b2bChecks(bk, { today, calc: L.b2bCalc(bk, fx, null, today), fulfil: { any: true, shipped: true } }).some(x => x.code === 'no_actual'), '5b bucket with matched orders: no check');

  // 6. FX: never the workbook's wrong rates; a missing rate drops the row and raises red
  const usd = L.b2bCalc({ value_source: 1000, currency: 'USD', payments: [], ship_date: '2026-12-01' }, fx, null, today);
  const eur = L.b2bCalc({ value_source: 1000, currency: 'EUR', payments: [], ship_date: '2026-12-01' }, fx, null, today);
  ok(![1.883, 1.873, 1.32].includes(usd.fx_rate) && ![1.883, 1.873, 1.32].includes(eur.fx_rate), '6 USD / EUR rates are not 1.883 / 1.873 / 1.32');
  const miss = { value_source: 1000, currency: 'CAD', order_type: 'US Wholesale', entity: 'UK', confirmed: true, status: 'confirmed', ship_date: '2030-01-01', payments: [{ seq: 1, due_date: '2030-02-01', pct: 100 }] };
  const c6 = L.b2bCalc(miss, fx, null, today);
  ok(c6.value_gbp == null && c6.lines.length === 0, '6 no FX rate: no value, no lines (out of totals)');
  ok(L.b2bChecks(miss, { today, calc: c6 }).some(x => x.code === 'no_fx' && x.sev === 'red'), '6 no FX rate: red check');
  ok(L.b2bCalc(Object.assign({}, miss, { currency: 'USD' }), fx, 1.3, today).fx_source === 'usd_gbp_rate', '6 USD falls back to usd_gbp_rate only when fx_rates has no year');

  // 7. Sheet parsing: example rows skipped, mixed dates, flags
  const text = ['Client\tReference / Note / Order Number\tTYPE\tOrder Value (NET, EX TAX)\tCurrency\tOrder Confirmed\tOrder Date\tPayment Terms\tShip Date\tPayment 1 Date\tPayment 1 %\tPayment 2 Date\tPayment 2 %',
    'NEXT\tSS26 buy\tUK Wholesale\t100,000\tGBP\tFALSE\t30-Aug-25\tPayment on receipt\t19-Nov-25\t01-Jan-26\t100%\t01-Jan-26\t0%',
    '\tEXAMPLES ABOVE - Fill below\t\t\t\tFALSE\t\t\t\t\t\t\t',
    'WKC\tCobrand\tUS Wholesale\t15,000\tUSD\tTRUE\t06-Nov-25\tPrepay\t1/1/26\t11/20/25\t100%\t\t',
    'Sweet Pineapple\tSS26 / USWS-18013\tUS Wholesale\t12,067\tUSD\tTRUE\t23-Oct-25\tDue at shipping\t01-Feb-36\t01-Feb-26\t100%\t\t',
    'John Lewis SS27\t\tUK Wholesale\t376,000\tGBP\tTRUE\t24-Sep-26\tN60\t20-Feb-27\t20 April 27\t100%\t\t',
    'Carnival Cruise\tCCRU28821-1\tUS Wholesale\t247,000\tUSD\tTRUE\t01-Aug-26\tN30\t15-Oct-26\t15-Dec-26\t100%\t\t',
    'UK Jan Key Accounts\t\tUK Wholesale\t200,000\tGBP\tFALSE\t15-Sep-26\tN60\t15-Jan-27\t15-Mar-27\t100%\t\t',
    '\t\t\t\t\tFALSE\t\t\t\t\t\t\t'].join('\n');
  const P = L.b2bParseSheet(L.b2bSplitText(text));
  ok(P.rows.length === 5, '7 parse: 5 rows after the examples (got ' + P.rows.length + ')');
  ok(P.rows[0].client_label === 'WKC' && P.rows[0].ship_date === '2026-01-01' && P.rows[0].payments[0].due_date === '2025-11-20', '7 parse: US slash dates (1/1/26, 11/20/25)');
  ok(P.rows[2].payments[0].due_date === '2027-04-20', '7 parse: "20 April 27"');
  ok(P.flagged.some(r => r.client_label === 'Sweet Pineapple'), '7 parse: ship 01-Feb-36 flagged');
  ok(P.rows[3].fulfil_order_refs[0] === 'CCRU28821-1', '7 parse: order-number reference copied to fulfil_order_refs');
  ok(P.rows[4].bucket === true && P.rows[3].bucket === false, '7 parse: "UK Jan Key Accounts" with no reference = bucket');
  ok(L.b2bParseDate('31-Feb-26') === null && L.b2bParseDate('garbage') === null, '7 parse: impossible dates return null (flagged, never guessed)');

  // CSV round trip: decimals, 2-payment limit
  const csv = L.b2bCsv([Object.assign({ client_label: 'Trailfinders', reference: '' }, tf), Object.assign({ client_label: 'X', payments: [1, 2, 3].map(s => ({ seq: s, due_date: '2027-01-01', pct: 33.333 })) }, { id: 9, value_source: 1, currency: 'GBP', order_type: 'UK Wholesale', confirmed: true, status: 'confirmed' })]);
  ok(/Trailfinders,,UK Wholesale,106992,GBP,TRUE,2026-09-25,.*,2027-01-25,2026-10-06,0\.3,,0\.7/.test(csv.csv), '8 CSV row as the sheet (pct as decimals)');
  ok(csv.skipped.length === 1 && csv.skipped[0] === 9, '8 CSV skips orders with more than 2 payments');

  console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
