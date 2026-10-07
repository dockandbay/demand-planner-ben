// v28.186 (Ben): supplier portal SECURITY regression test (deep dive 07-Oct-26: C1, C2, H3, M5, M6, M8, M9).
// Needs a running SANDBOX server and three portal sessions (rows in planner.portal_sessions) for different suppliers, where MASTER
// supplies the master PO of a shared shipment SHIP and RIDER has a PO aboard it; OTHER is on neither.
//   HZ_TEST_BASE=http://127.0.0.1:8164
//   HZ_TEST_PSID_MASTER / HZ_TEST_PSID_RIDER / HZ_TEST_PSID_OTHER   session tokens
//   HZ_TEST_SHIP            shared shipment ref (e.g. PO-53AUXR1)
//   HZ_TEST_ATT_MASTER_DOC  a PO document (invoice) on the MASTER's master PO
//   HZ_TEST_ATT_MASTER_TL   a PO-timeline file on the master PO that is NOT attached to a shipment note
//   HZ_TEST_ATT_SHIP_TL     a shipment-timeline file attached to a note on SHIP
//   HZ_TEST_ATT_RIDER_OWN   a document on one of RIDER's own POs
//   HZ_TEST_ATT_OTHER       a document on one of OTHER's POs;   HZ_TEST_OTHER_PO = one of OTHER's POs
//   HZ_TEST_PRODUCT_MINE / HZ_TEST_PRODUCT_NOT_MINE   product-dev refs owned / not owned by OTHER (swatch route)
//   HZ_TEST_WRITES=1        also run the legitimate WRITE flows (sandbox only: posts notes / a charge / sets the master's shipment
//                           status to its current value); clean up afterwards. Without it only refused writes are attempted.
//   HZ_TEST_PSID_SIGNOUT    optional disposable session: proves Sign out deletes it (the token is unusable afterwards)
const http = require('http'), zlib = require('zlib');
const E = process.env, BASE = new URL(E.HZ_TEST_BASE || 'http://127.0.0.1:8164');
const need = ['HZ_TEST_PSID_MASTER', 'HZ_TEST_PSID_RIDER', 'HZ_TEST_PSID_OTHER', 'HZ_TEST_SHIP', 'HZ_TEST_ATT_MASTER_DOC', 'HZ_TEST_ATT_SHIP_TL', 'HZ_TEST_ATT_OTHER', 'HZ_TEST_OTHER_PO'];
const miss = need.filter((k) => !E[k]);   // v28.200 (Ben): the supplier checks run when all of these are set; the client order-thread checks need their own (below)
const SUP = !miss.length, CP = !!(E.HZ_TEST_CSID_CLIENT && E.HZ_TEST_CSID_SELF && E.HZ_TEST_CSID_OTHER && E.HZ_TEST_CP_ORDER);
if (!SUP && !CP) { console.error('set ' + miss.join(', ') + ' (supplier portal) and / or HZ_TEST_CSID_CLIENT, HZ_TEST_CSID_SELF, HZ_TEST_CSID_OTHER, HZ_TEST_CP_ORDER (client portal); see header'); process.exit(2); }
const M = 'psid=' + E.HZ_TEST_PSID_MASTER, Rd = 'psid=' + E.HZ_TEST_PSID_RIDER, O = 'psid=' + E.HZ_TEST_PSID_OTHER, SHIP = E.HZ_TEST_SHIP;
let fails = 0, passes = 0;
const ok = (cond, msg) => { if (cond) passes++; else { fails++; console.log('FAIL: ' + msg); } };
function req(method, path, { cookie, body, headers, form } = {}) {
  return new Promise((res, rej) => {
    const h = Object.assign({ 'accept-encoding': 'gzip' }, headers || {}); if (cookie) h.cookie = cookie;
    let data = null; if (form) { data = new URLSearchParams(form).toString(); h['content-type'] = 'application/x-www-form-urlencoded'; } else if (body !== undefined) { data = JSON.stringify(body); h['content-type'] = 'application/json'; }
    const t0 = Date.now();
    const r = http.request({ host: BASE.hostname, port: BASE.port, path, method, headers: h }, (resp) => {
      const ch = []; resp.on('data', (c) => ch.push(c)); resp.on('end', () => {
        let b = Buffer.concat(ch); if (resp.headers['content-encoding'] === 'gzip' && b.length) b = zlib.gunzipSync(b);
        let j = null; try { j = b.length ? JSON.parse(b.toString('utf8')) : null; } catch (_) {}
        res({ status: resp.statusCode, json: j, text: b.toString('utf8'), headers: resp.headers, ms: Date.now() - t0 });
      });
    });
    r.on('error', rej); r.setTimeout(120000, () => r.destroy(new Error('timeout'))); if (data) r.write(data); r.end();
  });
}
const get = (p, o) => req('GET', p, o), post = (p, body, o) => req('POST', p, Object.assign({ body }, o || {}));
const internal = (t) => /relation "|column "|syntax error|violates|duplicate key|invalid input syntax|file:\/\/|\/Users\/|node_modules|\n\s+at /i.test(String(t || ''));
async function supplierChecks() {
  // sessions valid and distinct
  const me = {}; for (const [k, c] of [['M', M], ['R', Rd], ['O', O]]) { const r = await get('/api/portal/me', { cookie: c }); ok(r.status === 200, k + ' session valid'); me[k] = (r.json && r.json.suppliers) || []; }
  ok(me.M.join() !== me.R.join() && me.R.join() !== me.O.join(), 'precondition: three different suppliers');

  // ── C1: a rider on the shared shipment can NOT open the master's PO documents; participants CAN open shipment-timeline files
  const att = (id, c) => get('/api/portal/attachment/' + id, { cookie: c });
  ok((await att(E.HZ_TEST_ATT_MASTER_DOC, Rd)).status === 403, 'C1: rider downloading the master PO invoice -> 403');
  ok((await att(E.HZ_TEST_ATT_MASTER_DOC, O)).status === 403, 'C1: outsider downloading the master PO invoice -> 403');
  ok((await att(E.HZ_TEST_ATT_MASTER_DOC, M)).status === 200, 'C1: master downloads its own invoice -> 200');
  if (E.HZ_TEST_ATT_MASTER_TL) { ok((await att(E.HZ_TEST_ATT_MASTER_TL, Rd)).status === 403, 'C1: rider opening a master PO-timeline file (not a shipment file) -> 403');
    ok((await att(E.HZ_TEST_ATT_MASTER_TL, M)).status === 200, 'C1: master opens its own PO-timeline file -> 200'); }
  ok((await att(E.HZ_TEST_ATT_SHIP_TL, Rd)).status === 200, 'C1: rider opens a shipment-timeline file -> 200');
  ok((await att(E.HZ_TEST_ATT_SHIP_TL, M)).status === 200, 'C1: master opens a shipment-timeline file -> 200');
  ok((await att(E.HZ_TEST_ATT_SHIP_TL, O)).status === 403, 'C1: outsider opening a shipment-timeline file -> 403');
  if (E.HZ_TEST_ATT_RIDER_OWN) { ok((await att(E.HZ_TEST_ATT_RIDER_OWN, Rd)).status === 200, 'rider downloads its own PO document -> 200');
    ok((await att(E.HZ_TEST_ATT_RIDER_OWN, M)).status === 403, 'master can NOT open the rider\'s own PO document -> 403'); }
  ok((await att(E.HZ_TEST_ATT_OTHER, O)).status === 200, 'outsider downloads its own document -> 200');
  ok((await att(E.HZ_TEST_ATT_OTHER, M)).status === 403, 'another supplier\'s document -> 403');
  ok((await att('999999999', O)).status === 403, 'unknown attachment id -> 403 (no existence oracle)');
  ok((await att('abc', O)).status === 403, 'malformed attachment id -> 403');
  const dl = await get('/api/portal/attachment/' + E.HZ_TEST_ATT_OTHER + '?download=1', { cookie: O });
  ok(dl.status === 200 && /attachment/.test(String(dl.headers['content-disposition'] || '')), '?download=1 serves as a download');

  // ── C2: the staff routes refuse a portal session; the portal twins are scoped
  const staffH = { referer: BASE.origin + '/portal' };
  for (const p of ['/api/supply/portal-attachment/' + E.HZ_TEST_ATT_OTHER, '/api/product/doc/' + E.HZ_TEST_ATT_OTHER, '/api/product/doc/' + E.HZ_TEST_ATT_OTHER + '/thumb', '/api/product/swatch/' + encodeURIComponent(E.HZ_TEST_PRODUCT_MINE || 'X')]) {
    const r = await get(p, { cookie: O, headers: staffH }); ok(r.status === 401 || r.status === 403, 'C2: portal cookie on staff ' + p.split('/').slice(0, 4).join('/') + ' -> 401/403 (got ' + r.status + ')');
    const r2 = await get(p, { cookie: O }); ok(r2.status === 401 || r2.status === 403, 'C2: portal cookie, no referer, on staff ' + p.split('/').slice(0, 4).join('/') + ' -> 401/403 (got ' + r2.status + ')');
  }
  const sdtc = await post('/api/supply/dtc-shipment', { po: E.HZ_TEST_OTHER_PO, cartons: 1 }, { cookie: O, headers: staffH });
  ok(sdtc.status === 401 || sdtc.status === 403, 'C2: portal cookie on staff POST /api/supply/dtc-shipment -> 401/403 (got ' + sdtc.status + ')');
  const pdtc = await post('/api/portal/dtc-shipment', { po: E.HZ_TEST_OTHER_PO, cartons: 1 }, { cookie: M });
  ok(pdtc.status === 403, 'C2: portal DTC write on another supplier\'s PO -> 403 (got ' + pdtc.status + ')');
  ok((await post('/api/portal/dtc-shipment', { po: E.HZ_TEST_OTHER_PO, cartons: 1 })).status === 401, 'C2: portal DTC write with no session -> 401');
  if (E.HZ_TEST_PRODUCT_MINE) ok((await get('/api/portal/product-swatch/' + encodeURIComponent(E.HZ_TEST_PRODUCT_MINE), { cookie: O })).status === 200, 'C2: own product swatch via the portal route -> 200');
  if (E.HZ_TEST_PRODUCT_NOT_MINE) ok((await get('/api/portal/product-swatch/' + encodeURIComponent(E.HZ_TEST_PRODUCT_NOT_MINE), { cookie: O })).status === 403, 'C2: another supplier\'s product swatch -> 403');

  // ── H3: one shipment rule. Master (consolidator) and rider may read notes / charges; outsider may not. Rider can not set shipment fields.
  for (const [k, c, want] of [['master', M, 200], ['rider', Rd, 200], ['outsider', O, 403]]) {
    ok((await get('/api/portal/shipment-notes/' + encodeURIComponent(SHIP), { cookie: c })).status === want, 'H3: ' + k + ' shipment notes -> ' + want);
    ok((await get('/api/portal/shipment-charges/' + encodeURIComponent(SHIP), { cookie: c })).status === want, 'H3: ' + k + ' shipment charges -> ' + want);
  }
  const rs = await post('/api/portal/shipment/' + encodeURIComponent(SHIP), { status: 'Shipping' }, { cookie: Rd });
  ok(rs.status === 403, 'H3/M9: rider setting the shared shipment to Shipping -> 403 (got ' + rs.status + ')');
  ok((await post('/api/portal/shipment/' + encodeURIComponent(SHIP), { departure_date: '2030-01-01' }, { cookie: Rd })).status === 403, 'H3/M9: rider changing the ship date -> 403');
  ok((await post('/api/portal/shipment/' + encodeURIComponent(SHIP), { carrier: 'X' }, { cookie: O })).status === 403, 'H3: outsider updating the shipment -> 403');

  // ── M8: notes may only reference the caller's own files
  ok((await post('/api/portal/shipment-note', { shipment_ref: SHIP, body: 'v28186 test (should be refused)', attachment_id: E.HZ_TEST_ATT_OTHER }, { cookie: Rd })).status === 403, 'M8: shipment note with a foreign attachment id -> 403');
  ok((await post('/api/portal/shipment-note', { shipment_ref: SHIP, body: 'v28186 test (should be refused)', attachment_id: E.HZ_TEST_ATT_MASTER_DOC }, { cookie: Rd })).status === 403, 'M8: rider note pointing at the master invoice -> 403');
  ok((await post('/api/portal/note', { po: E.HZ_TEST_OTHER_PO, body: 'v28186 test (should be refused)', attachment_id: E.HZ_TEST_ATT_MASTER_DOC }, { cookie: O })).status === 403, 'M8: PO note with a foreign attachment id -> 403');
  ok((await post('/api/portal/submit', { po: E.HZ_TEST_OTHER_PO, invoice_attachment_id: E.HZ_TEST_ATT_MASTER_DOC }, { cookie: O })).status === 403, 'M8: submit with a foreign invoice attachment id -> 403');

  // ── M5: magic links (read-only checks). Unknown / malformed tokens never sign in; request-link answers known and unknown alike.
  const g = await get('/portal?token=' + 'ab'.repeat(24)); ok(g.status === 302 && /e=expired/.test(String(g.headers.location || '')), 'M5: unknown token GET -> redirect to expired');
  const pr = await req('POST', '/api/portal/redeem', { form: { token: 'ab'.repeat(24) } }); ok(pr.status === 303 && /e=expired/.test(String(pr.headers.location || '')) && !/psid=[0-9a-f]/.test(String(pr.headers['set-cookie'] || '')), 'M5: unknown token redeem -> expired, no session cookie');
  const known = await post('/api/portal/request-link', { email: 'factory@lixin.test' }), unknown = await post('/api/portal/request-link', { email: 'nobody-' + Date.now() + '@example.invalid' });
  ok(known.status === unknown.status && known.text === unknown.text, 'M5d: request-link identical response for known vs unknown email');
  ok(Math.abs(known.ms - unknown.ms) < 600 && known.ms >= 1700 && unknown.ms >= 1700, 'M5d: request-link timing window (known ' + known.ms + ' ms, unknown ' + unknown.ms + ' ms)');

  // ── M6: no raw error text to suppliers (a bad numeric id used to reach Postgres)
  const bad = await post('/api/portal/sample-note', { id: 'not-a-number', body: 'x' }, { cookie: O });
  ok(!internal(bad.text), 'M6: portal error body carries no SQL / stack / path (got ' + bad.status + ')');

  // ── legitimate WRITE flows (sandbox only)
  if (E.HZ_TEST_WRITES === '1') {
    const mn = await post('/api/portal/shipment-note', { shipment_ref: SHIP, body: 'v28186 test: consolidator note' }, { cookie: M }); ok(mn.status === 200, 'H3: consolidator posts a shipment note -> 200');
    const rn = await post('/api/portal/shipment-note', { shipment_ref: SHIP, body: 'v28186 test: rider note with the shipment file', attachment_id: E.HZ_TEST_ATT_SHIP_TL }, { cookie: Rd }); ok(rn.status === 200, 'H3/M8: rider posts a note referencing a shipment-timeline file -> 200');
    // M9: the master's message is now not the latest; the rider's is. The master can not delete the rider's latest note.
    if (rn.json && rn.json.id) { const del = await post('/api/portal/shipment-note-delete/' + rn.json.id, {}, { cookie: M }); ok(del.status === 403, 'M9: master deleting the rider\'s note -> 403 (got ' + del.status + ')'); }
    const ch = await post('/api/portal/shipment-charge', { shipment_ref: SHIP, freight_cost: 1, description: 'v28186 test charge' }, { cookie: M }); ok(ch.status === 200, 'H3: consolidator adds a shipment charge -> 200');
    const rc = await get('/api/portal/shipment-charges/' + encodeURIComponent(SHIP), { cookie: Rd }); ok(rc.status === 200 && Array.isArray(rc.json) && !rc.json.some((x) => x.description === 'v28186 test charge'), 'H3: rider does not see the master\'s charge');
    const mc = await get('/api/portal/shipment-charges/' + encodeURIComponent(SHIP), { cookie: M }); ok(mc.status === 200 && Array.isArray(mc.json) && mc.json.some((x) => x.description === 'v28186 test charge'), 'H3: master sees its own charge');
    const ms = await post('/api/portal/shipment/' + encodeURIComponent(SHIP), { carrier: 'FLEXPORT' }, { cookie: M }); ok(ms.status === 200, 'H3: master updates a shipment-level field -> 200 (got ' + ms.status + ')');
  }
  if (E.HZ_TEST_PSID_SIGNOUT) {
    const c = 'psid=' + E.HZ_TEST_PSID_SIGNOUT;
    ok((await get('/api/portal/me', { cookie: c })).status === 200, 'M5e: sign-out session valid before');
    const so = await post('/api/portal/logout', {}, { cookie: c }); ok(so.status === 200 && /psid=;/.test(String(so.headers['set-cookie'] || '')), 'M5e: sign out clears the cookie');
    await new Promise((r) => setTimeout(r, 200));
    ok((await get('/api/portal/me', { cookie: c })).status === 401, 'M5e: the signed-out token no longer works');
  }
  // ── v28.189 (Ben, M2 / M9): Dock & Bay's shipment messages are read PER SUPPLIER. Needs HZ_TEST_SHIP_UNREAD_NOTE = an internal note on
  // a shipment both MASTER and RIDER see in their Shipment Plan (HZ_TEST_SHIP_UNREAD_REF, default SHIP) that neither has read (sandbox:
  // insert one, delete it after) and HZ_TEST_WRITES=1 (the rider marks it read).
  if (E.HZ_TEST_WRITES === '1' && E.HZ_TEST_SHIP_UNREAD_NOTE) {
    const nid = Number(E.HZ_TEST_SHIP_UNREAD_NOTE), SR = E.HZ_TEST_SHIP_UNREAD_REF || SHIP;
    const unread = async (c) => { const b = await get('/api/portal/bootstrap?fresh=1', { cookie: c }); const s = ((b.json && b.json.shipmentPlan) || []).find((x) => x.shipment_ref === SR); return s ? s.unread_dnb : null; };
    const inbox = async (c) => ((await get('/api/portal/unread-messages', { cookie: c })).json || []).some((x) => x.type === 'shipment' && Number(x.note_id) === nid);
    ok((await unread(M)) >= 1 && (await unread(Rd)) >= 1, 'M2: the new D&B shipment note is unread for master and rider');
    ok(await inbox(M) && await inbox(Rd), 'M2: it is in both Inboxes');
    ok((await post('/api/portal/shipment-notes-read', { shipment_ref: SR, upto_id: nid }, { cookie: O })).status === 403, 'M2: an outsider can not mark it read -> 403');
    ok((await post('/api/portal/shipment-notes-read', { shipment_ref: SR, upto_id: nid }, { cookie: Rd })).status === 200, 'M2: rider views the shipment (marks read) -> 200');
    ok((await unread(Rd)) === 0 && !(await inbox(Rd)), 'M2: read for the rider (badge 0, gone from its Inbox)');
    ok((await unread(M)) >= 1 && await inbox(M), 'M2/M9: STILL unread for the master (a rider\'s view no longer clears it for everyone)');
  }

  // ── v28.190 (Ben, H4): a supplier removes its OWN draft PO document (the button used to post to a route that did not exist). Needs
  // HZ_TEST_WRITES=1 and HZ_TEST_RIDER_PO (one of RIDER's POs): uploads a tiny file, checks the stored type, removes it.
  if (E.HZ_TEST_WRITES === '1' && E.HZ_TEST_RIDER_PO) {
    const up = await post('/api/portal/upload', { po: E.HZ_TEST_RIDER_PO, filename: 'v28190 test.pdf', mime: 'application/pdf', data_base64: Buffer.from('%PDF-1.4 test').toString('base64'), category: 'Packing list' }, { cookie: Rd });
    ok(up.status === 200 && up.json && up.json.id, 'H4: rider uploads a document to its own PO');
    if (up.json && up.json.id) {
      const b = await get('/api/portal/po-detail?pos=' + encodeURIComponent(E.HZ_TEST_RIDER_PO), { cookie: Rd });
      const doc = (((b.json && b.json.docsByPo) || {})[E.HZ_TEST_RIDER_PO] || []).find((x) => String(x.id) === String(up.json.id));
      ok(doc && doc.category === 'Packing list' && doc.mine === true, 'the chosen document type is stored (was always "invoice") and flagged as the supplier\'s own');
      ok((await post('/api/portal/doc-remove', { id: up.json.id }, { cookie: M })).status === 403, 'H4: another supplier can not remove it -> 403');
      const rm = await post('/api/portal/doc-remove', { id: up.json.id }, { cookie: Rd }); ok(rm.status === 200 && rm.json && rm.json.deleted === 1, 'H4: the rider removes its own draft document -> 200, deleted');
      ok((await get('/api/portal/attachment/' + up.json.id, { cookie: Rd })).status === 403, 'H4: the removed document is gone');
    }
    ok((await post('/api/portal/doc-remove', { id: E.HZ_TEST_ATT_MASTER_DOC }, { cookie: Rd })).status === 403, 'H4: removing the master\'s document -> 403');
  }

  // ── v28.191 (Ben, H6): suppliers competing on ONE product-dev item. Needs HZ_TEST_PSID_COMPETITOR (a session of another supplier with
  // its own development request on HZ_TEST_SHARED_ITEM), HZ_TEST_OTHER_SAMPLE_VERSION (a sample version of OTHER's request on that item)
  // and HZ_TEST_OTHER_REQUEST (OTHER's request id on it). Refused writes only, unless HZ_TEST_WRITES=1 (OTHER posts one product note).
  if (E.HZ_TEST_PSID_COMPETITOR && E.HZ_TEST_SHARED_ITEM && E.HZ_TEST_OTHER_SAMPLE_VERSION) {
    const C = 'psid=' + E.HZ_TEST_PSID_COMPETITOR, item = E.HZ_TEST_SHARED_ITEM, ver = E.HZ_TEST_OTHER_SAMPLE_VERSION;
    ok((await get('/api/portal/product-item/' + encodeURIComponent(item), { cookie: C })).status === 200, 'H6: the competitor can open the shared item (it has its own request)');
    ok((await post('/api/portal/product-sample/' + ver + '/status', { supplier_status: 'cancelled' }, { cookie: C })).status === 403, 'H6: competitor changing OTHER\'s sample version status -> 403');
    ok((await post('/api/portal/product-sample/' + ver + '/meta', { sample_sizes: [], sampled_aspects: [] }, { cookie: C })).status === 403, 'H6: competitor editing OTHER\'s sample version -> 403');
    ok((await post('/api/portal/product-sample/' + ver + '/assign', { mode: 'not_shipped' }, { cookie: C })).status === 403, 'H6: competitor assigning OTHER\'s sample version -> 403');
    if (E.HZ_TEST_OTHER_REQUEST) ok((await post('/api/portal/product-sample', { item_ref: item, request_id: E.HZ_TEST_OTHER_REQUEST, colour_verified: true, quality_verified: true, sampled_aspects: ['product'] }, { cookie: C })).status === 403, 'H6: competitor creating a sample version on OTHER\'s request -> 403');
    const pi = await get('/api/portal/product-item/' + encodeURIComponent(item), { cookie: C });
    const others = [].concat(...(((pi.json && pi.json.components) || []).map((c) => c.req_suppliers || [])));
    const meC = ((await get('/api/portal/me', { cookie: C })).json || {}).suppliers || [], meO = ((await get('/api/portal/me', { cookie: O })).json || {}).suppliers || [];
    ok(!others.some((n) => meO.includes(n)), 'H6: the competitor never sees OTHER\'s supplier name on components (got ' + [...new Set(others)].join(', ') + ')');
    ok(!((pi.json && pi.json.samples) || []).some((s) => meO.includes(s.supplier)), 'H6: the competitor sees none of OTHER\'s sample versions');
    if (E.HZ_TEST_WRITES === '1') {
      ok((await post('/api/portal/product-note', { ref: item, body: 'v28191 test: OTHER\'s private product note' }, { cookie: O })).status === 200, 'H6: OTHER posts a product note');
      const cn = (await get('/api/portal/product-notes/' + encodeURIComponent(item), { cookie: C })).json || [];
      ok(!cn.some((n) => /v28191 test/.test(n.body || '')), 'H6: the competitor does NOT see OTHER\'s note (was product-wide)');
      const on = (await get('/api/portal/product-notes/' + encodeURIComponent(item), { cookie: O })).json || [];
      ok(on.some((n) => /v28191 test/.test(n.body || '')), 'H6: OTHER sees its own note');
    }
    void meC;
  }

  // ── v28.188 (Ben, H7): health capture. The session route still needs a session; the login-page route takes no session but only
  // the allowed kinds (a 'metric' row is dropped), at most 20 events, and never answers with an error page.
  const tx = { 'content-type': 'text/plain' };
  ok((await req('POST', '/api/portal/health/client-events', { body: [{ kind: 'client_error', message: 'v28187 test' }] })).status === 401, 'H7: session capture route without a session -> 401');
  const le = await req('POST', '/api/portal/health/login-events', { headers: tx, body: undefined, form: undefined }).catch(() => null);
  const le2 = await new Promise((res) => { const h = { 'content-type': 'text/plain' }; const data = JSON.stringify([{ kind: 'client_error', message: 'v28187 test: login page error', path: '/portal' }, { kind: 'metric', message: 'v28187 test: not allowed' }]);
    const r = http.request({ host: BASE.hostname, port: BASE.port, path: '/api/portal/health/login-events', method: 'POST', headers: h }, (resp) => { const ch = []; resp.on('data', (c) => ch.push(c)); resp.on('end', () => { let j = null; try { j = JSON.parse(Buffer.concat(ch).toString('utf8')); } catch (_) {} res({ status: resp.statusCode, json: j }); }); });
    r.on('error', () => res({ status: 0 })); r.write(data); r.end(); });
  ok(le2.status === 202 && le2.json && le2.json.accepted === 1, 'H7: login-page capture without a session -> 202, only the allowed kind accepted (got ' + le2.status + ' ' + JSON.stringify(le2.json) + ')');
  ok(!le || le.status === 400 || le.status === 202, 'H7: login-page capture with an empty body never errors (got ' + (le && le.status) + ')');

}
// ── v28.200 (Ben): CLIENT PORTAL messages + documents per order (order threads). Needs three client sessions (rows in planner.client_sessions,
// e.g. minted with POST /api/client/users/:uid/magic then GET /client?token=…): CLIENT = a scope 'client' user of client A, SELF = a
// scope 'self' user of the SAME client A, OTHER = a user of a different client B; and HZ_TEST_CP_ORDER = an order key ('F<fulfil_id>' or
// 'P<client_orders.id>') visible to client A that is NOT one of SELF's own orders. Optional: HZ_TEST_CP_ORDER_SELF (one of SELF's own
// orders), HZ_TEST_CP_ORDER_OTHER (an order of client B that client A can not see). Refusals only, unless HZ_TEST_WRITES=1: then staff
// (the sandbox has no login gate) and the client post messages / documents; delete the created threads afterwards (the test prints them).
async function clientOrderThreadChecks() {
  const CC = 'csid=' + E.HZ_TEST_CSID_CLIENT, CS = 'csid=' + E.HZ_TEST_CSID_SELF, CO = 'csid=' + E.HZ_TEST_CSID_OTHER, K = E.HZ_TEST_CP_ORDER;
  const me = {}; for (const [k, c] of [['C', CC], ['S', CS], ['O', CO]]) { const r = await get('/api/cp/me', { cookie: c }); ok(r.status === 200, 'cp: ' + k + ' session valid'); me[k] = r.json || {}; }
  const A = me.C.client && me.C.client.id, B = me.O.client && me.O.client.id;
  ok(A && A === (me.S.client && me.S.client.id) && B && B !== A, 'cp precondition: CLIENT and SELF share client A, OTHER is client B');
  ok(me.C.user && me.C.user.scope !== 'self' && me.S.user && me.S.user.scope === 'self', 'cp precondition: CLIENT is scope client, SELF is scope self');
  const P = (k) => '/api/cp/order-thread/' + encodeURIComponent(k);
  const pdf = (name) => ({ filename: name, mime: 'application/pdf', data_base64: Buffer.from('%PDF-1.4 v28200 test ' + name).toString('base64') });
  // refusals (always)
  ok((await get('/api/cp/order-threads')).status === 401, 'cp: order counts without a session -> 401');
  ok((await get(P(K))).status === 401, 'cp: order thread without a session -> 401');
  ok((await post(P(K) + '/post', { body: 'v28200 test (should be refused)' })).status === 401, 'cp: order post without a session -> 401');
  ok((await get(P(K), { cookie: CO })).status === 403, 'cp: another client opening the order thread -> 403');
  ok((await post(P(K) + '/post', { body: 'v28200 test (should be refused)' }, { cookie: CO })).status === 403, 'cp: another client posting on the order -> 403');
  ok((await get(P(K), { cookie: CS })).status === 403, 'cp: scope self user opening an order that is not theirs -> 403');
  ok((await post(P(K) + '/post', { body: 'v28200 test (should be refused)' }, { cookie: CS })).status === 403, 'cp: scope self user posting on an order that is not theirs -> 403');
  ok((await get(P('X1'), { cookie: CC })).status === 403 && (await get(P('F1x'), { cookie: CC })).status === 403, 'cp: malformed order key -> 403');
  ok((await get(P(K), { cookie: CC })).status === 200, 'cp: CLIENT opens the order thread -> 200');
  for (const [c, who] of [[CC, 'CLIENT'], [CO, 'OTHER']]) { const r = await get('/api/cp/order-threads', { cookie: c }); ok(r.status === 200 && r.json && typeof r.json.counts === 'object', 'cp: ' + who + ' order counts -> 200'); }
  if (E.HZ_TEST_CP_ORDER_OTHER) ok((await get(P(E.HZ_TEST_CP_ORDER_OTHER), { cookie: CC })).status === 403, 'cp: client A opening client B\'s order thread -> 403');
  if (E.HZ_TEST_WRITES !== '1') return;
  // ── write flow (sandbox) ──
  const created = new Set();
  const counts = async (c) => ((await get('/api/cp/order-threads', { cookie: c })).json || {}).counts || {};
  const unreadMe = async (c) => ((await get('/api/cp/me', { cookie: c })).json || {}).unread;
  const sumThreads = async (c) => (((await get('/api/cp/threads', { cookie: c })).json || {}).threads || []).reduce((s, t) => s + (t.unread_client || 0), 0);
  const s1 = await post('/api/client/order-thread/' + encodeURIComponent(K) + '/post', { client_id: A, body: 'v28200 test: staff message on the order', attachments: [pdf('v28200 staff doc.pdf')] });
  ok(s1.status === 200 && s1.json && s1.json.thread_id && s1.json.files === 1, 'staff posts a message + document on the order -> 200, thread created, 1 file');
  const T = s1.json && s1.json.thread_id; if (T) created.add(T);
  let ct = (await counts(CC))[K] || {};
  ok(ct.msgs >= 1 && ct.files >= 1 && ct.unread >= 1 && ct.thread_id === T, 'CLIENT My orders counts show the message, the document and unread (' + JSON.stringify(ct) + ')');
  const u0 = await unreadMe(CC); ok(u0 >= 1 && u0 === await sumThreads(CC), 'nav badge (/me unread) = sum of the Messages list unread (' + u0 + ')');
  const th = ((await get('/api/cp/threads', { cookie: CC })).json || {}).threads || [];
  ok(th.some((t) => t.id === T && t.order_key && t.order_ref), 'the order thread is in CLIENT Messages, tagged with the order ref');
  ok(!(((await get('/api/cp/threads', { cookie: CS })).json || {}).threads || []).some((t) => t.id === T), 'the order thread is NOT in the scope self user\'s Messages');
  ok(!(((await get('/api/cp/threads', { cookie: CO })).json || {}).threads || []).some((t) => t.id === T), 'the order thread is NOT in the other client\'s Messages');
  const v = await get(P(K), { cookie: CC }); const docs = (v.json && v.json.documents) || [];
  ok(v.status === 200 && (v.json.messages || []).some((m) => /v28200 test: staff message/.test(m.body || '')) && docs.length >= 1, 'CLIENT reads the order thread (message + document listed)');
  ct = (await counts(CC))[K] || {}; ok(ct.unread === 0, 'unread clears on the order once read (' + ct.unread + ')');
  ok(await unreadMe(CC) === u0 - 1 || await unreadMe(CC) < u0, 'nav badge drops after reading');
  const D1 = docs[0] && docs[0].id;
  ok((await get('/api/cp/attachment/' + D1, { cookie: CC })).status === 200, 'CLIENT downloads the order document -> 200');
  ok((await get('/api/cp/attachment/' + D1, { cookie: CS })).status === 403, 'scope self user downloading the order document -> 403');
  ok((await get('/api/cp/attachment/' + D1, { cookie: CO })).status === 403, 'another client downloading the order document -> 403');
  ok((await get('/api/cp/attachment/' + D1)).status === 401, 'order document without a session -> 401');
  ok((await get('/api/cp/threads/' + T, { cookie: CS })).status === 403, 'scope self user opening the order thread by id (Messages) -> 403');
  ok((await post('/api/cp/threads/' + T + '/reply', { body: 'v28200 test (should be refused)' }, { cookie: CS })).status === 403, 'scope self user replying on it in Messages -> 403');
  ok((await get('/api/cp/threads/' + T, { cookie: CO })).status === 403, 'another client opening the thread by id -> 403');
  // client replies with a document -> staff sees it unread in Orders + Messages
  const c1 = await post(P(K) + '/post', { body: 'v28200 test: client reply with a document', attachments: [pdf('v28200 client doc.pdf')] }, { cookie: CC });
  ok(c1.status === 200 && c1.json && c1.json.thread_id === T && c1.json.files === 1, 'CLIENT replies with a document on the order -> same thread');
  const sc = (((await get('/api/client/order-threads?client_id=' + A)).json || {}).counts || {})[K] || {};
  ok(sc.unread >= 1 && sc.files >= 2, 'staff CLIENT > Orders counts: unread from the client + 2 documents (' + JSON.stringify(sc) + ')');
  const sm = (((await get('/api/client/threads?kind=order&client_id=' + A)).json || {}).threads || []).find((t) => t.id === T);
  ok(sm && sm.unread_ops >= 1 && sm.order_ref, 'staff CLIENT > Messages lists the order thread unread, tagged');
  const dr = await get('/api/client/order-thread/' + encodeURIComponent(K) + '?client_id=' + A);
  ok(dr.status === 200 && dr.json.header && dr.json.thread && dr.json.thread.id === T && (dr.json.documents || []).length >= 2, 'staff order drawer: header, thread, documents');
  ok(((((await get('/api/client/order-threads?client_id=' + A)).json || {}).counts || {})[K] || {}).unread === 0, 'staff unread clears on view');
  // internal note + document: staff only
  const iN = await post('/api/client/order-thread/' + encodeURIComponent(K) + '/post', { client_id: A, body: 'v28200 test: INTERNAL staff note', internal: true, attachments: [pdf('v28200 internal.pdf')] });
  ok(iN.status === 200, 'staff posts an internal note + document');
  const cv = await get(P(K), { cookie: CC });
  ok(!(cv.json.messages || []).some((m) => /INTERNAL/.test(m.body || '')) && !(cv.json.documents || []).some((d) => /internal/.test(d.filename || '')), 'the client never sees the internal note or document');
  ok(((await counts(CC))[K] || {}).unread === 0, 'an internal note is not unread for the client');
  const idoc = ((((await get('/api/client/order-thread/' + encodeURIComponent(K) + '?client_id=' + A)).json || {}).documents) || []).find((d) => d.internal);
  ok(idoc && (await get('/api/cp/attachment/' + idoc.id, { cookie: CC })).status === 403, 'CLIENT downloading the internal document -> 403');
  ok(idoc && (await get('/api/client/attachment/' + idoc.id)).status === 200, 'staff downloads the internal document -> 200');
  // replying in Messages = replying on the order
  const mr = await post('/api/cp/threads/' + T + '/reply', { body: 'v28200 test: reply from Messages' }, { cookie: CC });
  ok(mr.status === 200 && ((((await get('/api/client/order-thread/' + encodeURIComponent(K) + '?client_id=' + A)).json || {}).messages) || []).some((m) => /reply from Messages/.test(m.body || '')), 'a reply in Messages lands on the order');
  if (E.HZ_TEST_CP_ORDER_SELF) { const KS = E.HZ_TEST_CP_ORDER_SELF;
    const p = await post(P(KS) + '/post', { body: 'v28200 test: rep message on own order' }, { cookie: CS }); ok(p.status === 200, 'scope self user posts on their OWN order -> 200'); if (p.json && p.json.thread_id) created.add(p.json.thread_id);
    ok((await get(P(KS), { cookie: CS })).status === 200, 'scope self user reads their own order thread -> 200');
    ok((await get(P(KS), { cookie: CC })).status === 200, 'the client-scope colleague sees the rep\'s order thread -> 200');
    ok((await get(P(KS), { cookie: CO })).status === 403, 'another client opening the rep\'s order thread -> 403'); }
  if (E.HZ_TEST_CP_ORDER_OTHER) { const KO = E.HZ_TEST_CP_ORDER_OTHER;
    const p = await post('/api/client/order-thread/' + encodeURIComponent(KO) + '/post', { client_id: B, body: 'v28200 test: staff message to client B' }); ok(p.status === 200, 'staff posts on client B\'s order'); if (p.json && p.json.thread_id) created.add(p.json.thread_id);
    ok((await get(P(KO), { cookie: CO })).status === 200, 'client B reads its own order thread -> 200');
    ok((await get(P(KO), { cookie: CC })).status === 403, 'client A (agent) opening client B\'s order thread -> 403');
    if (p.json && p.json.thread_id) ok((await get('/api/cp/threads/' + p.json.thread_id, { cookie: CC })).status === 403, 'client A opening client B\'s thread by id -> 403'); }
  console.log('v28200 test threads created (delete after): ' + [...created].join(','));
}
(async () => {
  if (SUP) await supplierChecks(); else console.log('supplier portal checks skipped (set ' + miss.join(', ') + ')');
  if (CP) await clientOrderThreadChecks(); else console.log('client portal order-thread checks skipped (set HZ_TEST_CSID_CLIENT / _SELF / _OTHER and HZ_TEST_CP_ORDER)');
  console.log((fails ? 'FAILED' : 'OK') + ': ' + passes + ' checks passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
