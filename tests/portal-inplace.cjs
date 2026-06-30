// Regression guard for the supplier-portal in-place PO actions (no full-screen reload).
// Mounts the real supply/portal-view.js in jsdom, clicks "Approve Direct to Client details",
// and asserts the DOM updates in place (button → ✓ Approved, MANAGE badge −1, row stays open,
// no full reload). Run: `npm test`  (or `node tests/portal-inplace.cjs`).
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const pv = fs.readFileSync(path.join(__dirname, '..', 'supply', 'portal-view.js'), 'utf8');
const dom = new JSDOM('<!DOCTYPE html><body><div id="supply-root"><div id="root"></div></div></body>', { runScripts: 'dangerously' });
const { window } = dom;
const doc = window.document;

window.CSS = { escape: s => String(s).replace(/([^a-zA-Z0-9_-])/g, '\\$1') };
window.alert = () => {};
window.confirm = () => true;

const calls = [];
window.fetch = (url, opt) => {
  const method = (opt && opt.method) || 'GET';
  calls.push(method + ' ' + url);
  const body = (method === 'POST') ? { ok: true } : [];
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
};

const s = doc.createElement('script'); s.textContent = pv; doc.body.appendChild(s);
if (!window.DBPortalView) { console.error('FAIL: DBPortalView not defined'); process.exit(1); }

const po = {
  po: 'TESTPO1', status: 'PRODUCTION', progress: 'in_progress', production_status: 'in_production',
  prod_start: '2026-01-01', prod_end: '2026-03-01', ship: '', balance_due: '',
  require_confirmation: true, supplier_confirmed: '', supplier_confirmed_by: '',
  dtc_accepted_at: null, dtc_accepted_by: '',
  pack_polybags: true, pack_dnb_barcodes: true, pack_rfid_barcodes: false, pack_dnb_carton: true, pack_client_carton: false,
  pack_polybags_notes: '', pack_dnb_barcodes_notes: '', pack_rfid_barcodes_notes: '', pack_dnb_carton_notes: '', pack_client_carton_notes: '',
  pack_pallet_notes: '', pack_other_notes: '',
  sales_order_ref: 'SO-1', client_po_ref: 'CPO-1', client_requirements: 'handle with care',
  shipment: '', flexport_reference: '', flex_id: '', crossdock_skus: '', deposit_ref: '',
  start_dep: 0, start_assigned: null, start_date: '', completion: 0, completion_assigned: null, completion_date: '',
  balance_1_amount: null, balance_1_date: '', balance_owing: 0, value_used: 0, final_invoice: null,
  start_pct: 30, completion_pct: 40, balance_pct: 30, branch: 'UK B2B JLEW', country: 'UK',
};
const DATA = { pos: [po], lb: {}, sdep: [], sid: 1, notesByPo: {}, subsByPo: {}, costsByPo: {}, supSkus: [], xdByPo: {}, addByPo: {}, docsByPo: {}, samples: [], shipmentPlan: [] };
const EP = { dtcAccept: '/api/portal/dtc-accept', submit: '/api/portal/submit', shipmentChargesBase: '/api/portal/shipment-charges/', sampleNotesBase: '/api/portal/sample-notes/', notesBase: '/api/portal/notes/', noteReadBase: '/api/portal/note-read/', note: '/api/portal/note', labelData: '/api/portal/label-data' };

window.DBPortalView.mount({
  root: doc.getElementById('root'), ep: EP, by: 'tester', sid: 1, supplierName: 'XR Textile',
  getData: () => Promise.resolve(DATA), bc: { placeholder: true, note() {}, sheets() {}, crossdock() {} }, onChange() {},
});

const tick = () => new Promise(r => setTimeout(r, 0));
const q = sel => doc.querySelector(sel);

(async () => {
  await tick(); await tick();
  let pass = true; const chk = (name, cond) => { console.log((cond ? '  PASS  ' : '  FAIL  ') + name); if (!cond) pass = false; };

  const manage = q('.pp-exp');
  chk('PO grid rendered (MANAGE button present)', !!manage);
  if (!manage) { console.log('\nSOME CHECKS FAILED ❌'); process.exit(1); }
  const badgeBefore = manage.querySelector('.ex-badge') ? parseInt(manage.querySelector('.ex-badge').textContent, 10) : 0;

  // lazy: the expanded card must NOT be built until the row is expanded
  chk('Expanded card is lazy (not built before expand)', !q('.pptab[data-pt="dtc"]') && /Loading…/.test(q('tr[id^="pp-"]').innerHTML));

  manage.click(); await tick();
  const dtcTab = q('.pptab[data-pt="dtc"]');
  chk('DIRECT TO CLIENT DETAILS tab present', !!dtcTab);
  if (dtcTab) dtcTab.click(); await tick();

  const approveBtn = q('.pp-dtc-accept');
  chk('Approve button present before approving', !!approveBtn);
  if (approveBtn) { approveBtn.click(); await tick(); await tick(); await tick(); }

  const manage2 = q('.pp-exp');
  const badgeAfter = manage2 && manage2.querySelector('.ex-badge') ? parseInt(manage2.querySelector('.ex-badge').textContent, 10) : 0;
  chk('postJSON hit /api/portal/dtc-accept', calls.some(c => c.includes('/api/portal/dtc-accept')));
  chk('Approve button removed after approving', !q('.pp-dtc-accept'));
  chk('"✓ Approved" now shown', /✓ Approved/.test(q('#pp-body').innerHTML));
  chk('Row stayed expanded (NO full-screen reload)', !!q('.pptab[data-pt="dtc"]'));
  chk('MANAGE badge decremented by exactly 1 (' + badgeBefore + '→' + badgeAfter + ')', badgeAfter === badgeBefore - 1);

  console.log('\n' + (pass ? 'ALL CHECKS PASSED ✅' : 'SOME CHECKS FAILED ❌'));
  process.exit(pass ? 0 : 1);
})();
