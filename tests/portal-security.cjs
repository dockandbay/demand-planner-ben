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
const miss = need.filter((k) => !E[k]); if (miss.length) { console.error('set ' + miss.join(', ') + ' (see header)'); process.exit(2); }
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
(async () => {
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

  console.log((fails ? 'FAILED' : 'OK') + ': ' + passes + ' checks passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
