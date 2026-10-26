// v28.483 (Ben): Connect routes regression test (HORIZON side of the Connect app, contracts.md 1.1 to 1.4).
// Needs a running SANDBOX server whose CONNECT_SHARED_SECRET equals HZ_TEST_CONNECT_SECRET (or the CONNECT_SHARED_SECRET in ./.env).
//   HZ_TEST_BASE=http://127.0.0.1:8125
//   HZ_TEST_PO / HZ_TEST_ORDER / HZ_TEST_SKU / HZ_TEST_CLIENT_EMAIL   real refs in that sandbox (defaults below)
//   HZ_TEST_WRITES=1   also run the flows that write to the SANDBOX database: grant / remove a test person's Connect tick
//                      (CONFIG > Permissions API) and revoke / restore that test person. Cleans up after itself.
// Assertions are made with the same algorithm as Connect's src/lib/assertion.ts (v1.<payload>.<HMAC-SHA256>).
const http = require('http'), zlib = require('zlib'), crypto = require('crypto'), fs = require('fs'), path = require('path');
const E = process.env, BASE = new URL(E.HZ_TEST_BASE || 'http://127.0.0.1:8125');
let SECRET = E.HZ_TEST_CONNECT_SECRET;
if (!SECRET) { try { const m = /^CONNECT_SHARED_SECRET=(.*)$/m.exec(fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8')); if (m) SECRET = m[1].trim().replace(/^["']|["']$/g, ''); } catch (_) {} }
if (!SECRET || SECRET.length < 32) { console.error('set HZ_TEST_CONNECT_SECRET (32+ chars, same as the server CONNECT_SHARED_SECRET)'); process.exit(2); }
const PO = E.HZ_TEST_PO || 'PO-57UKLX3', ORDER = E.HZ_TEST_ORDER || 'SO51793', SKU = E.HZ_TEST_SKU || 'TOWLB-CAB-LG-ORANG-R', CLIENT = E.HZ_TEST_CLIENT_EMAIL || 'hello@thealoftshop.com';
const ADMIN = 'ben@dockandbay.com', TESTER = 'connect-test@dockandbay.com', NOBODY = 'connect-nobody@dockandbay.com';
let fails = 0, passes = 0; const show = !!E.HZ_TEST_SHOW;
const ok = (cond, msg) => { if (cond) passes++; else { fails++; console.log('FAIL: ' + msg); } };
function assertion(email, act, o) { o = o || {}; const now = o.now != null ? o.now : Math.floor(Date.now() / 1000);
  const p = { sub: email.toLowerCase(), aud: o.aud || 'horizon', iat: now, exp: now + (o.ttl != null ? o.ttl : 60), jti: o.jti || crypto.randomUUID(), act: act || 'lookup' };
  const body = Buffer.from(JSON.stringify(p)).toString('base64url');
  return 'v1.' + body + '.' + crypto.createHmac('sha256', o.secret || SECRET).update('v1.' + body).digest('base64url'); }
function req(method, p, { body, auth, headers } = {}) {
  return new Promise((res, rej) => {
    const h = Object.assign({ 'accept-encoding': 'gzip' }, headers || {}); if (auth) h.authorization = auth;
    let data = null; if (body !== undefined) { data = JSON.stringify(body); h['content-type'] = 'application/json'; }
    const t0 = Date.now();
    const r = http.request({ host: BASE.hostname, port: BASE.port, path: p, method, headers: h }, (resp) => {
      const ch = []; resp.on('data', (c) => ch.push(c)); resp.on('end', () => {
        let b = Buffer.concat(ch); if (resp.headers['content-encoding'] === 'gzip' && b.length) b = zlib.gunzipSync(b);
        let j = null; try { j = b.length ? JSON.parse(b.toString('utf8')) : null; } catch (_) {}
        res({ status: resp.statusCode, json: j, text: b.toString('utf8'), ms: Date.now() - t0 });
      });
    });
    r.on('error', rej); r.setTimeout(120000, () => r.destroy(new Error('timeout'))); if (data) r.write(data); r.end();
  });
}
const call = (route, body, email, act, o) => req('POST', route, { body, auth: 'Connect ' + assertion(email, act, o) });
const keys = (o, ks, what) => ks.forEach(k => ok(o && Object.prototype.hasOwnProperty.call(o, k), what + ' has key ' + k));
const out = (label, r) => { if (show) console.log('\n## ' + label + ' (' + r.status + ', ' + r.ms + ' ms)\n' + JSON.stringify(r.json, null, 1)); };

(async () => {
  // ── 401 bad_assertion ──
  let r = await req('POST', '/api/connect/resolve', { body: {} });
  ok(r.status === 401 && r.json && r.json.error === 'bad_assertion', 'no header -> 401 bad_assertion (got ' + r.status + ')');
  r = await req('POST', '/api/connect/resolve', { body: {}, auth: 'Connect ' + assertion(ADMIN, 'lookup', { secret: 'x'.repeat(40) }) });
  ok(r.status === 401 && /signature/.test(r.json.message), 'wrong secret -> 401 (' + (r.json && r.json.message) + ')');
  r = await call('/api/connect/resolve', {}, ADMIN, 'lookup', { now: Math.floor(Date.now() / 1000) - 120 });
  ok(r.status === 401 && /expired/.test(r.json.message), 'expired -> 401 (' + (r.json && r.json.message) + ')');
  r = await call('/api/connect/resolve', {}, ADMIN, 'lookup', { ttl: 600 });
  ok(r.status === 401 && /lifetime/.test(r.json.message), 'lifetime > 60 s -> 401 (' + (r.json && r.json.message) + ')');
  r = await call('/api/connect/resolve', {}, ADMIN, 'lookup', { aud: 'imagebank' });
  ok(r.status === 401 && /audience/.test(r.json.message), 'wrong aud -> 401 (' + (r.json && r.json.message) + ')');
  r = await call('/api/connect/resolve', {}, 'someone@gmail.com', 'lookup');
  ok(r.status === 401 && /Dock & Bay/.test(r.json.message), 'outside domain -> 401 (' + (r.json && r.json.message) + ')');
  r = await call('/api/connect/resolve', {}, ADMIN, 'revoke');
  ok(r.status === 401 && /action/.test(r.json.message), 'revoke assertion on a lookup route -> 401 (' + (r.json && r.json.message) + ')');
  r = await call('/api/identity/revoke', {}, ADMIN, 'lookup');
  ok(r.status === 401 && /action/.test(r.json.message), 'lookup assertion on /api/identity/revoke -> 401 (' + (r.json && r.json.message) + ')');
  const one = assertion(ADMIN, 'lookup');
  r = await req('POST', '/api/connect/resolve', { body: {}, auth: 'Connect ' + one }); ok(r.status === 200, 'first use -> 200 (got ' + r.status + ')');
  r = await req('POST', '/api/connect/resolve', { body: {}, auth: 'Connect ' + one }); ok(r.status === 401 && /replayed/.test(r.json.message), 'same jti again -> 401 replayed (' + (r.json && r.json.message) + ')');
  r = await req('POST', '/api/connect/resolve', { body: {}, auth: 'Bearer ' + one }); ok(r.status === 401, 'Bearer scheme -> 401');
  // ── 403 no_access ──
  r = await call('/api/connect/search', { q: SKU }, NOBODY, 'lookup');
  ok(r.status === 403 && r.json && r.json.error === 'no_access', 'unticked person -> 403 no_access (got ' + r.status + ')'); out('403 unticked', r);

  // ── 1.1 resolve (super admin) ──
  r = await call('/api/connect/resolve', { pos: [PO, 'PO-NOTREAL1'], orders: [ORDER, 'SO0000001'], skus: [SKU, 'READ-ONLY'], clientEmail: CLIENT }, ADMIN, 'lookup'); out('resolve', r);
  ok(r.status === 200, 'resolve 200 (got ' + r.status + ' ' + r.text.slice(0, 200) + ')');
  if (r.json) { keys(r.json, ['pos', 'orders', 'skus', 'client'], 'resolve');
    ok(r.json.pos.length === 1 && r.json.pos[0].ref === PO, 'resolve keeps only the real PO');
    ok(r.json.orders.length === 1 && r.json.orders[0].ref === ORDER, 'resolve keeps only the real order');
    ok(r.json.skus.length === 1 && r.json.skus[0].ref === SKU, 'resolve keeps only the real SKU');
    ok(r.json.client && r.json.client.ref && r.json.client.label, 'resolve finds the client by contact email'); }
  r = await call('/api/connect/resolve', { clientEmail: 'nobody-here@example.com' }, ADMIN, 'lookup');
  ok(r.status === 200 && r.json.client === null, 'unknown client email -> client null');

  // ── 1.2 search ──
  for (const q of [SKU, PO, ORDER, 'cabana']) {
    r = await call('/api/connect/search', { q, limit: 5 }, ADMIN, 'lookup'); out('search ' + q, r);
    ok(r.status === 200 && Array.isArray(r.json.hits) && r.json.hits.length <= 5, 'search ' + q + ' 200, at most limit');
    if (r.json && r.json.hits && r.json.hits[0]) { keys(r.json.hits[0], ['kind', 'ref', 'label', 'sub'], 'search hit'); ok(['po', 'order', 'sku', 'client'].includes(r.json.hits[0].kind), 'hit kind valid'); }
  }
  r = await call('/api/connect/search', { q: SKU }, ADMIN, 'lookup'); ok(r.json.hits[0] && r.json.hits[0].ref === SKU, 'exact SKU first');
  r = await call('/api/connect/search', { q: ORDER }, ADMIN, 'lookup'); ok(r.json.hits[0] && r.json.hits[0].kind === 'order' && r.json.hits[0].ref === ORDER, 'exact order first');

  // ── 1.3 lookup: every key present ──
  const want = { po: ['ref', 'supplier', 'status', 'exFactory', 'eta', 'shipment', 'lines', 'units', 'payment', 'horizonUrl'],
    order: ['number', 'reference', 'channel', 'client', 'orderedAt', 'state', 'shipments', 'horizonUrl', 'fulfilUrl'],
    sku: ['sku', 'name', 'stock', 'nextInbound', 'horizonUrl'], client: ['ref', 'name', 'email', 'recentOrders', 'horizonUrl', 'fulfilUrl'] };
  const res1 = await call('/api/connect/resolve', { clientEmail: CLIENT }, ADMIN, 'lookup');
  const clientRef = res1.json && res1.json.client ? res1.json.client.ref : CLIENT;
  for (const [kind, ref] of [['po', PO], ['order', ORDER], ['sku', SKU], ['client', clientRef]]) {
    r = await call('/api/connect/lookup', { kind, ref }, ADMIN, 'lookup'); out('lookup ' + kind + ' ' + ref, r);
    ok(r.status === 200 && r.json.kind === kind, 'lookup ' + kind + ' 200 (got ' + r.status + ' ' + r.text.slice(0, 200) + ')');
    if (r.json && r.json.card) keys(r.json.card, want[kind], kind + ' card');
  }
  r = await call('/api/connect/lookup', { kind: 'po', ref: PO }, ADMIN, 'lookup');
  if (r.json && r.json.card) { keys(r.json.card.payment, ['state', 'paidPct'], 'po payment'); if (r.json.card.shipment) keys(r.json.card.shipment, ['ref', 'status', 'eta'], 'po shipment'); }
  r = await call('/api/connect/lookup', { kind: 'sku', ref: SKU }, ADMIN, 'lookup');
  if (r.json && r.json.card) { keys(r.json.card.stock, ['UK', 'US', 'AU', 'EU'], 'sku stock'); if (r.json.card.nextInbound) keys(r.json.card.nextInbound, ['po', 'warehouse', 'qty', 'eta'], 'sku nextInbound'); }
  r = await call('/api/connect/lookup', { kind: 'order', ref: ORDER }, ADMIN, 'lookup');
  if (r.json && r.json.card) { keys(r.json.card.client, ['ref', 'name'], 'order client'); (r.json.card.shipments || []).forEach(s => { keys(s, ['ref', 'state', 'carrier', 'packages'], 'order shipment'); (s.packages || []).forEach(p => keys(p, ['tracking', 'url'], 'package')); }); }
  r = await call('/api/connect/lookup', { kind: 'client', ref: clientRef }, ADMIN, 'lookup');
  if (r.json && r.json.card) { ok(r.json.card.recentOrders.length <= 5, 'client recentOrders at most 5'); r.json.card.recentOrders.forEach(o => keys(o, ['number', 'orderedAt', 'state'], 'recent order')); }
  r = await call('/api/connect/lookup', { kind: 'po', ref: 'PO-NOTREAL1' }, ADMIN, 'lookup'); ok(r.status === 404 && r.json.error === 'not_found', 'unknown PO -> 404 not_found');
  r = await call('/api/connect/lookup', { kind: 'invoice', ref: 'X' }, ADMIN, 'lookup'); ok(r.status === 400 && r.json.error === 'bad_request', 'bad kind -> 400');

  // ── tick, revoke, restore (sandbox writes) ──
  if (E.HZ_TEST_WRITES === '1') {
    const perm = (on, client) => req('POST', '/api/config/permissions', { body: { email: TESTER, connect_access: on, client_access: !!client } });
    r = await perm(true); ok(r.status === 200, 'grant Connect tick to ' + TESTER + ' (got ' + r.status + ' ' + r.text.slice(0, 120) + ')');
    r = await call('/api/connect/search', { q: SKU }, TESTER, 'lookup'); ok(r.status === 200, 'ticked person -> 200 (got ' + r.status + ')');
    // Claude connector honours the block, and revoke deletes the person's connector tokens. Needs HZ_TEST_MCP_TOKEN: a raw access token
    // already stored (hashed) in planner.mcp_tokens for TESTER, with TESTER's Claude connector ticked.
    if (E.HZ_TEST_MCP_TOKEN) {
      const mcp = () => req('POST', '/mcp', { body: { jsonrpc: '2.0', id: 1, method: 'tools/list' }, auth: 'Bearer ' + E.HZ_TEST_MCP_TOKEN });
      r = await mcp(); ok(r.status === 200, 'connector token works before revoke (got ' + r.status + ')');
      r = await call('/api/identity/revoke', {}, TESTER, 'revoke'); ok(r.status === 200, 'revoke for connector test');
      r = await mcp(); ok(r.status === 401, 'connector refused after revoke (got ' + r.status + ')');
      r = await call('/api/identity/restore', {}, TESTER, 'restore'); ok(r.status === 200, 'restore after connector test');
      r = await mcp(); ok(r.status === 401, 'deleted connector token stays dead after restore (person must reconnect) (got ' + r.status + ')');
    }
    r = await call('/api/identity/revoke', { email: TESTER }, TESTER, 'revoke'); out('revoke', r); ok(r.status === 200 && r.json.ok === true, 'revoke -> {ok:true}');
    r = await call('/api/identity/revoke', { email: TESTER }, TESTER, 'revoke'); ok(r.status === 200 && r.json.ok === true, 'revoke again (idempotent) -> {ok:true}');
    r = await call('/api/connect/search', { q: SKU }, TESTER, 'lookup'); out('403 blocked', r); ok(r.status === 403 && /signed out/.test(r.json.message), 'blocked person -> 403 no_access although ticked');
    r = await call('/api/identity/restore', { email: TESTER }, TESTER, 'restore'); out('restore', r); ok(r.status === 200 && r.json.ok === true, 'restore -> {ok:true}');
    r = await call('/api/identity/restore', { email: TESTER }, TESTER, 'restore'); ok(r.status === 200 && r.json.ok === true, 'restore again (idempotent) -> {ok:true}');
    r = await call('/api/connect/search', { q: SKU }, TESTER, 'lookup'); ok(r.status === 200, 'restored person keeps the tick they had -> 200 (got ' + r.status + ')');
    // v28.484 (Ben): order and client data need the CLIENT grant as well as the Connect tick (TESTER is ticked, CLIENT off here)
    r = await call('/api/connect/resolve', { pos: [PO], orders: [ORDER], skus: [SKU], clientEmail: CLIENT }, TESTER, 'lookup'); out('resolve without CLIENT', r);
    ok(r.status === 200 && r.json.pos.length === 1 && r.json.skus.length === 1, 'no CLIENT: resolve still gives POs and SKUs');
    ok(r.json && Array.isArray(r.json.orders) && r.json.orders.length === 0 && r.json.client === null, 'no CLIENT: resolve omits orders and client');
    r = await call('/api/connect/search', { q: ORDER }, TESTER, 'lookup'); ok(r.status === 200 && !r.json.hits.some(h => h.kind === 'order' || h.kind === 'client'), 'no CLIENT: search has no order or client hits');
    r = await call('/api/connect/search', { q: 'shop', limit: 25 }, TESTER, 'lookup'); ok(r.status === 200 && !r.json.hits.some(h => h.kind === 'order' || h.kind === 'client'), 'no CLIENT: name search has no client hits');
    for (const [kind, ref] of [['order', ORDER], ['client', clientRef]]) { r = await call('/api/connect/lookup', { kind, ref }, TESTER, 'lookup'); out('lookup ' + kind + ' without CLIENT', r);
      ok(r.status === 403 && r.json.error === 'no_access', 'no CLIENT: lookup ' + kind + ' -> 403 no_access (got ' + r.status + ')'); }
    for (const [kind, ref] of [['po', PO], ['sku', SKU]]) { r = await call('/api/connect/lookup', { kind, ref }, TESTER, 'lookup'); ok(r.status === 200, 'no CLIENT: lookup ' + kind + ' still 200 (got ' + r.status + ')'); }
    r = await perm(true, true); ok(r.status === 200, 'grant CLIENT to ' + TESTER);
    r = await call('/api/connect/lookup', { kind: 'order', ref: ORDER }, TESTER, 'lookup'); ok(r.status === 200, 'with CLIENT: lookup order 200 (got ' + r.status + ')');
    r = await call('/api/connect/resolve', { orders: [ORDER], clientEmail: CLIENT }, TESTER, 'lookup'); ok(r.status === 200 && r.json.orders.length === 1 && r.json.client, 'with CLIENT: resolve gives the order and client');
    r = await call('/api/connect/search', { q: ORDER }, TESTER, 'lookup'); ok(r.status === 200 && r.json.hits.some(h => h.kind === 'order'), 'with CLIENT: search has the order hit');
    r = await perm(false); r = await call('/api/connect/search', { q: SKU }, TESTER, 'lookup'); ok(r.status === 403, 'untick -> refused at once (got ' + r.status + ')');
    await req('DELETE', '/api/config/permissions/' + encodeURIComponent(TESTER));
  } else console.log('(HZ_TEST_WRITES not set: tick / revoke / restore flows skipped)');

  console.log((fails ? 'FAILED' : 'OK') + ': ' + passes + ' passed, ' + fails + ' failed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
