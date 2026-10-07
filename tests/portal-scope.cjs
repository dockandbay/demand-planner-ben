// v28.175 (Ben): portal data scoping guard for the shared portal caches (perf roadmap #5).
// The supplier / client portals now serve per-identity transforms of SHARED base caches. This test proves two different portal
// users get disjoint, correctly scoped data, warm or cold, and that a cached payload never crosses identities (incl. via ETag/304).
// Needs a running server (sandbox) and two session cookies per portal (rows in planner.portal_sessions / planner.client_sessions):
//   HZ_TEST_BASE=http://127.0.0.1:8152 HZ_TEST_PSID_A=… HZ_TEST_PSID_B=… HZ_TEST_CSID_A=… HZ_TEST_CSID_B=… node tests/portal-scope.cjs
// Supplier A and B must be linked to different suppliers; client A and B to different client accounts. Read-only (GETs only).
const http = require('http'), zlib = require('zlib');
const BASE = new URL(process.env.HZ_TEST_BASE || 'http://127.0.0.1:8152');
const PA = process.env.HZ_TEST_PSID_A, PB = process.env.HZ_TEST_PSID_B, CA = process.env.HZ_TEST_CSID_A, CB = process.env.HZ_TEST_CSID_B;
if (!PA || !PB || !CA || !CB) { console.error('set HZ_TEST_PSID_A / _B and HZ_TEST_CSID_A / _B (see header)'); process.exit(2); }
let fails = 0, passes = 0;
const ok = (cond, msg) => { if (cond) passes++; else { fails++; console.log('FAIL: ' + msg); } };
function get(path, headers) {
  return new Promise((res, rej) => {
    const r = http.request({ host: BASE.hostname, port: BASE.port, path, headers: Object.assign({ 'accept-encoding': 'gzip' }, headers || {}) }, (resp) => {
      const ch = []; resp.on('data', (c) => ch.push(c)); resp.on('end', () => {
        let b = Buffer.concat(ch); if (resp.headers['content-encoding'] === 'gzip' && b.length) b = zlib.gunzipSync(b);
        let j = null; try { j = b.length ? JSON.parse(b.toString('utf8')) : null; } catch (_) {}
        res({ status: resp.statusCode, json: j, text: b.toString('utf8'), etag: resp.headers.etag || null });
      });
    });
    r.on('error', rej); r.setTimeout(180000, () => r.destroy(new Error('timeout'))); r.end();
  });
}
const sub = (a, b) => [...a].every((x) => b.has(x));
const disjoint = (a, b) => [...a].every((x) => !b.has(x));
function checkSupplierPayload(tag, d, names) {
  const nm = new Set(names);
  ok(d && Array.isArray(d.pos), tag + ': payload has pos');
  if (!d || !Array.isArray(d.pos)) return new Set();
  const pos = new Set(d.pos.map((p) => p.po));
  ok(d.pos.every((p) => nm.has(p.supplier_name)), tag + ': every PO belongs to the session suppliers');
  ok(d.supplierName === names.join(', '), tag + ': supplierName is the session\'s own');
  for (const k of ['lb', 'costsByPo', 'xdByPo', 'addByPo', 'approvedByPo', 'docsByPo'])   // PO-keyed follow-ons: only the payload's own POs
    ok(sub(new Set(Object.keys(d[k] || {})), pos), tag + ': ' + k + ' keyed only by own POs');
  // notesByPo / subsByPo are fetched by supplier id (they also carry product refs / FUTURE POs): checked against the OTHER user's POs below
  const lower = new Set(names.map((n) => String(n).toLowerCase()));
  ok((d.shipmentPlan || []).every((s) => (s.suppliers || []).some((n) => lower.has(String(n).toLowerCase()))), tag + ': shipment plan only shipments the supplier is on');
  ok((d.samples || []).every((s) => !s.supplier_name || nm.has(s.supplier_name)), tag + ': samples are own');
  ok((d.products || []).every((p) => nm.has(p.supplier)), tag + ': product requests are own');
  return pos;
}
(async () => {
  // ── supplier portal ──
  const meA = await get('/api/portal/me', { cookie: 'psid=' + PA }), meB = await get('/api/portal/me', { cookie: 'psid=' + PB });
  ok(meA.status === 200 && meB.status === 200, 'supplier sessions valid');
  const nA = (meA.json && meA.json.suppliers) || [], nB = (meB.json && meB.json.suppliers) || [];
  ok(nA.length && nB.length && disjoint(new Set(nA), new Set(nB)), 'precondition: the two supplier users are linked to different suppliers');
  for (const q of ['', '?includeArchived=1']) {
    const a1 = await get('/api/portal/bootstrap' + q, { cookie: 'psid=' + PA });
    const b1 = await get('/api/portal/bootstrap' + q, { cookie: 'psid=' + PB });
    const a2 = await get('/api/portal/bootstrap' + q, { cookie: 'psid=' + PA });   // warm, after B was built from the same shared bases
    const posA = checkSupplierPayload('A' + q, a1.json, nA), posB = checkSupplierPayload('B' + q, b1.json, nB);
    checkSupplierPayload('A warm' + q, a2.json, nA);
    ok(disjoint(posA, posB), 'supplier PO sets are disjoint' + q);
    for (const k of ['notesByPo', 'subsByPo']) {
      ok(disjoint(new Set(Object.keys((a1.json && a1.json[k]) || {})), posB), 'A ' + k + ' never holds a B PO' + q);
      ok(disjoint(new Set(Object.keys((b1.json && b1.json[k]) || {})), posA), 'B ' + k + ' never holds an A PO' + q);
    }
    ok(a1.text === a2.text, 'A cold and warm payloads identical' + q);
    if (a1.etag && a1.text !== b1.text) { const x = await get('/api/portal/bootstrap' + q, { cookie: 'psid=' + PB, 'if-none-match': a1.etag }); ok(x.status === 200 && x.text === b1.text, 'B presenting A\'s ETag gets B\'s own 200, never a 304' + q); }
  }
  // v28.189 (Ben, deep dive H2): completed POs are light rows; their detail comes from /api/portal/po-detail, which must answer ONLY the
  // caller's own POs (another supplier's PO numbers are silently left out) and only key its maps by the returned POs.
  {
    const bA = await get('/api/portal/bootstrap', { cookie: 'psid=' + PA }), bB = await get('/api/portal/bootstrap', { cookie: 'psid=' + PB });
    const slimA = ((bA.json && bA.json.pos) || []).filter((p) => p.__slim).map((p) => p.po).slice(0, 40), allB = ((bB.json && bB.json.pos) || []).map((p) => p.po).slice(0, 40);
    ok(((bA.json && bA.json.pos) || []).every((p) => !p.__slim || /complete/i.test(p.status || '')), 'only completed POs are light rows');
    if (slimA.length) {
      const dA = await get('/api/portal/po-detail?skus=all&pos=' + encodeURIComponent(slimA.join(',')), { cookie: 'psid=' + PA });
      ok(dA.status === 200 && dA.json && dA.json.pos.length === slimA.length && dA.json.pos.every((p) => nA.includes(p.supplier_name)), 'A gets the detail of its own light POs');
      const own = new Set(dA.json.pos.map((p) => p.po));
      for (const k of ['lb', 'costsByPo', 'xdByPo', 'addByPo', 'approvedByPo', 'docsByPo']) ok(sub(new Set(Object.keys(dA.json[k] || {})), own), 'po-detail ' + k + ' keyed only by the returned POs');
      const dB = await get('/api/portal/po-detail?skus=lines&pos=' + encodeURIComponent(slimA.join(',')), { cookie: 'psid=' + PB });
      ok(dB.status === 200 && dB.json && dB.json.pos.length === 0 && !Object.keys(dB.json.lb || {}).length && !Object.keys(dB.json.docsByPo || {}).length, 'B asking for A\'s POs gets nothing');
      const mix = await get('/api/portal/po-detail?pos=' + encodeURIComponent(slimA.concat(allB).join(',')), { cookie: 'psid=' + PB });
      ok(mix.status === 200 && mix.json.pos.every((p) => nB.includes(p.supplier_name)), 'a mixed list returns only the caller\'s POs');
    }
    ok((await get('/api/portal/po-detail?pos=' + encodeURIComponent(slimA.join(',')))).status === 401, 'po-detail needs a session');
    const pA = await get('/api/portal/payments', { cookie: 'psid=' + PA }); ok(pA.status === 200 && Array.isArray(pA.json && pA.json.payments), 'payments route answers the caller');
    const sA = await get('/api/portal/samples', { cookie: 'psid=' + PA }); ok(sA.status === 200 && (sA.json.samples || []).every((s) => !s.supplier_name || nA.includes(s.supplier_name)), 'samples route: own samples only');
  }
  // v28.186 (Ben, deep dive C1 / C2): the portal's own file + swatch routes serve only the caller's records, and the staff routes
  // the portal used to call refuse a portal session (with or without a /portal referer).
  {
    const bA = await get('/api/portal/bootstrap', { cookie: 'psid=' + PA }), bB = await get('/api/portal/bootstrap', { cookie: 'psid=' + PB });
    const ids = (d) => [].concat(...Object.values((d && d.docsByPo) || {})).map((x) => x.id).filter(Boolean).slice(0, 6);
    const idsA = ids(bA.json), idsB = ids(bB.json);
    for (const [mine, theirs, who, ck] of [[idsA, idsB, 'A', PA], [idsB, idsA, 'B', PB]]) {
      for (const id of mine.slice(0, 3)) ok((await get('/api/portal/attachment/' + id, { cookie: 'psid=' + ck })).status === 200, who + ' opens own PO document ' + id);
      for (const id of theirs.slice(0, 3)) ok((await get('/api/portal/attachment/' + id, { cookie: 'psid=' + ck })).status === 403, who + ' is refused the other supplier\'s document ' + id);
    }
    const prods = (d) => ((d && d.products) || []).map((p) => p.ref).filter(Boolean).slice(0, 3);
    for (const ref of prods(bA.json)) { const a = await get('/api/portal/product-swatch/' + encodeURIComponent(ref), { cookie: 'psid=' + PA }); ok(a.status === 200 || a.status === 404, 'A own product swatch ' + ref + ' (got ' + a.status + ')');
      if (!prods(bB.json).includes(ref)) ok((await get('/api/portal/product-swatch/' + encodeURIComponent(ref), { cookie: 'psid=' + PB })).status === 403, 'B is refused A\'s product swatch ' + ref); }
    const anyId = idsA[0] || idsB[0] || 1;
    for (const p of ['/api/supply/portal-attachment/' + anyId, '/api/product/doc/' + anyId, '/api/product/swatch/X'])
      for (const h of [{ cookie: 'psid=' + PA }, { cookie: 'psid=' + PA, referer: BASE.origin + '/portal' }]) {
        const r = await get(p, h); ok(r.status === 401 || r.status === 403, 'staff route ' + p.split('/').slice(0, 4).join('/') + ' refuses a portal session' + (h.referer ? ' (portal referer)' : '') + ' (got ' + r.status + ')'); }
  }
  // no session / forged session / proxy identity headers never authenticate
  const em = (meA.json && meA.json.email) || 'factory@lixin.test';
  for (const [h, why] of [[{}, 'no cookie'], [{ cookie: 'psid=forged-token-1234567890' }, 'forged psid'],
    [{ 'x-portal-email': em, 'x-user-email': em, 'x-forwarded-email': em, 'x-auth-request-email': em }, 'proxy email headers']]) {
    const r = await get('/api/portal/bootstrap', h); ok(r.status === 401, 'supplier bootstrap rejects ' + why + ' (got ' + r.status + ')');
  }
  // ── client portal ──
  const cA = await get('/api/cp/me', { cookie: 'csid=' + CA }), cB = await get('/api/cp/me', { cookie: 'csid=' + CB });
  ok(cA.status === 200 && cB.status === 200, 'client sessions valid');
  const clA = cA.json && cA.json.client, clB = cB.json && cB.json.client;
  ok(clA && clB && clA.id !== clB.id, 'precondition: the two client users belong to different client accounts');
  for (const p of ['/api/cp/orders', '/api/cp/prices', '/api/cp/line-sheet', '/api/cp/stock', '/api/cp/commission']) {
    const a1 = await get(p, { cookie: 'csid=' + CA }), b1 = await get(p, { cookie: 'csid=' + CB }), a2 = await get(p, { cookie: 'csid=' + CA });
    ok(a1.status === a2.status && a1.text === a2.text, p + ': A is served A\'s own payload again after B (no cross-identity cache hit)');
    if (a1.status === 200 && b1.status === 200 && a1.text !== b1.text && a1.etag) { const x = await get(p, { cookie: 'csid=' + CB, 'if-none-match': a1.etag }); ok(x.status === 200 && x.text === b1.text, p + ': B presenting A\'s ETag gets B\'s own 200'); }
    if (p === '/api/cp/orders' && a1.json && b1.json) { const ia = new Set(a1.json.orders.map((o) => String(o.id))), ib = new Set(b1.json.orders.map((o) => String(o.id))); ok(disjoint(ia, ib), p + ': order ids disjoint between the two clients'); }
    if (p === '/api/cp/prices' && a1.json) ok(a1.json.currency === clA.currency || (a1.json.code && a1.json.code === clA.price_list), p + ': A gets its own price list / currency');
    if (p === '/api/cp/line-sheet' && a1.json && a1.status === 200) ok(a1.json.market === clA.market && a1.json.currency === clA.currency, p + ': A gets its own market / currency');
  }
  // v28.200 (Ben): messages + documents per order. The counts and the thread list are live per identity: every counted order is one of
  // the caller's own orders (okey from its own /api/cp/orders), thread lists never cross clients, and A is served A's own answer after B.
  {
    const oA = await get('/api/cp/orders', { cookie: 'csid=' + CA }), oB = await get('/api/cp/orders', { cookie: 'csid=' + CB });
    const keysA = new Set(((oA.json && oA.json.orders) || []).map((o) => o.okey)), keysB = new Set(((oB.json && oB.json.orders) || []).map((o) => o.okey));
    ok(((oA.json && oA.json.orders) || []).every((o) => /^[FP]\d+$/.test(o.okey || '')), '/api/cp/orders: every order carries its order key (okey)');
    const tA = await get('/api/cp/order-threads', { cookie: 'csid=' + CA }), tB = await get('/api/cp/order-threads', { cookie: 'csid=' + CB }), tA2 = await get('/api/cp/order-threads', { cookie: 'csid=' + CA });
    if (tA.status === 200) { ok(sub(new Set(Object.keys(tA.json.counts || {})), keysA), '/api/cp/order-threads: A counts keyed only by A\'s own orders'); ok(tA.text === tA2.text, '/api/cp/order-threads: A served A\'s own answer again after B'); }
    if (tB.status === 200) ok(sub(new Set(Object.keys(tB.json.counts || {})), keysB), '/api/cp/order-threads: B counts keyed only by B\'s own orders');
    const hA = await get('/api/cp/threads', { cookie: 'csid=' + CA }), hB = await get('/api/cp/threads', { cookie: 'csid=' + CB });
    if (hA.status === 200 && hB.status === 200) {
      ok(hA.json.threads.every((t) => t.client_id === clA.id) && hB.json.threads.every((t) => t.client_id === clB.id), '/api/cp/threads: each list holds only its own client\'s threads');
      ok(disjoint(new Set(hA.json.threads.map((t) => t.id)), new Set(hB.json.threads.map((t) => t.id))), '/api/cp/threads: thread ids disjoint between the two clients');
      ok(hA.json.threads.filter((t) => t.order_key).every((t) => keysA.has(t.okey) || keysA.has(t.order_key)), '/api/cp/threads: A\'s order threads are all on A\'s own orders');
      for (const t of hB.json.threads.slice(0, 3)) ok((await get('/api/cp/threads/' + t.id, { cookie: 'csid=' + CA })).status === 403, 'A opening B\'s thread ' + t.id + ' -> 403');
      for (const t of hB.json.threads.filter((x) => x.order_key).slice(0, 3)) ok((await get('/api/cp/order-thread/' + encodeURIComponent(t.okey || t.order_key), { cookie: 'csid=' + CA })).status === 403, 'A opening B\'s order thread ' + (t.okey || t.order_key) + ' -> 403');
    }
    const meA = await get('/api/cp/me', { cookie: 'csid=' + CA });
    if (hA.status === 200 && meA.status === 200) ok(meA.json.unread === hA.json.threads.reduce((s, t) => s + (t.unread_client || 0), 0), '/api/cp/me unread = the sum over A\'s Messages list');
  }
  for (const [h, why] of [[{}, 'no cookie'], [{ cookie: 'csid=forged-token-1234567890' }, 'forged csid'], [{ 'x-client-email': 'x@y.z', 'x-user-email': 'x@y.z' }, 'proxy email headers']]) {
    const r = await get('/api/cp/orders', h); ok(r.status === 401, 'client orders rejects ' + why + ' (got ' + r.status + ')');
    for (const p of ['/api/cp/order-threads', '/api/cp/order-thread/F1']) { const x = await get(p, h); ok(x.status === 401, p + ' rejects ' + why + ' (got ' + x.status + ')'); }   // v28.200
  }
  console.log((fails ? 'FAILED' : 'OK') + ': ' + passes + ' checks passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
