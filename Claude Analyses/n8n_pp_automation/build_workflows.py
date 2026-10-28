"""Generates the two n8n workflows (Ben 23-Oct-26), following Diviyaj's CUSTOM-LOGO pattern:
Settings node (tenant + dryRun) -> paginated Fulfil reads -> Code decides -> preview email (dry run) or
writes via the guarded 'Fulfil | Request (sub-workflow)' + read-back verify + report email.

  A  Ops | Order health check (hourly)         read only; emails NEW unprocessed orders
  B  Fulfil | PP prepack BOM flip (hourly)     flips kit BOM sequence by PP stock

usage: python3 -I build_workflows.py            -> writes workflow_A.json / workflow_B.json here
Start state: tenant SANDBOX, dryRun true, allowProdWrite false. Going live = Diviyaj changes Settings
(tenant, baseUrl) and the read credential to Fulfil PROD, then sets allowProdWrite true.
"""
import json
import os
import uuid

HERE = os.path.dirname(os.path.abspath(__file__))
SANDBOX_CRED = {"httpHeaderAuth": {"id": "EDrfRZJRHfhBe2fB", "name": "Fulfil SANDBOX"}}
GMAIL_CRED = {"gmailOAuth2": {"id": "G2zKu9oStGcK5OKK", "name": "OPS Email"}}
SUBWORKFLOW_ID = "lztERpCZ72lSQx6V"
ERROR_WORKFLOW_ID = "ZdyI9BvD5vlGlHR7"
PREPACK_MAP = json.load(open(os.path.join(HERE, "../pp_bom_flip/prepack_map.json")))


def node(name, ntype, version, params, x, y, creds=None, once=False):
    n = {"id": str(uuid.uuid5(uuid.NAMESPACE_URL, "dnb-pp/" + name)), "name": name, "type": ntype,
         "typeVersion": version, "position": [x, y], "parameters": params}
    if creds:
        n["credentials"] = creds
    if once:
        n["executeOnce"] = True
    return n


def schedule(name, cron, x, y):
    return node(name, "n8n-nodes-base.scheduleTrigger", 1.2,
                {"rule": {"interval": [{"field": "cronExpression", "expression": cron}]}}, x, y)


def settings(obj, x, y):
    return node("Settings", "n8n-nodes-base.set", 3.4, {"mode": "raw", "jsonOutput": json.dumps(obj, indent=2), "options": {}}, x, y)


def fulfil_get(name, model, fields, filter_expr, x, y):
    """Paginated GET /model/<model> (500 per page), same shape as Diviyaj's Ops Hub reads."""
    qp = [{"name": "fields", "value": fields}, {"name": "per_page", "value": "500"}, {"name": "page", "value": "1"}]
    if filter_expr:
        qp.append({"name": "filter", "value": filter_expr})
    return node(name, "n8n-nodes-base.httpRequest", 4.4, {
        "url": "={{ $('Settings').first().json.baseUrl }}/model/" + model,
        "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth",
        "sendQuery": True, "queryParameters": {"parameters": qp},
        "sendHeaders": True, "headerParameters": {"parameters": [{"name": "Accept", "value": "application/json"}]},
        "options": {"pagination": {"pagination": {
            "parameters": {"parameters": [{"name": "page", "value": "={{ $pageCount + 1 }}"}]},
            "paginationCompleteWhen": "other", "completeExpression": "={{ $response.body.length < 500 }}",
            "limitPagesFetched": True, "maxRequests": 100, "requestInterval": 250}}, "timeout": 60000},
    }, x, y, creds=SANDBOX_CRED, once=True)


def fulfil_search_read(name, model, body_expr, x, y):
    """Single PUT search_read (<= 500 rows), for filters too long for a URL."""
    return node(name, "n8n-nodes-base.httpRequest", 4.4, {
        "method": "PUT", "url": "={{ $('Settings').first().json.baseUrl }}/model/" + model + "/search_read",
        "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth",
        "sendBody": True, "specifyBody": "json", "jsonBody": body_expr, "options": {"timeout": 60000},
    }, x, y, creds=SANDBOX_CRED, once=True)


def code(name, js, x, y, once=False):
    return node(name, "n8n-nodes-base.code", 2, {"jsCode": js}, x, y, once=once)


def gmail(name, to_expr, subject_expr, html_expr, x, y):
    return node(name, "n8n-nodes-base.gmail", 2.2, {"sendTo": to_expr, "subject": subject_expr, "message": html_expr,
                                                     "options": {"appendAttribution": False}}, x, y, creds=GMAIL_CRED)


def if_node(name, expr, x, y):
    return node(name, "n8n-nodes-base.if", 2.2, {"conditions": {
        "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "loose", "version": 2},
        "conditions": [{"id": str(uuid.uuid5(uuid.NAMESPACE_URL, name)), "leftValue": expr, "rightValue": "",
                        "operator": {"type": "boolean", "operation": "true", "singleValue": True}}],
        "combinator": "and"}, "options": {}}, x, y)


def sticky(name, text, x, y, w=520, h=300):
    return node(name, "n8n-nodes-base.stickyNote", 1, {"content": text, "width": w, "height": h}, x, y)


def chain(*names):
    c = {}
    for a, b in zip(names, names[1:]):
        c.setdefault(a, {"main": [[]]})["main"][0].append({"node": b, "type": "main", "index": 0})
    return c


def merge(*conns):
    out = {}
    for c in conns:
        for k, v in c.items():
            if k in out:
                for i, branch in enumerate(v["main"]):
                    while len(out[k]["main"]) <= i:
                        out[k]["main"].append([])
                    out[k]["main"][i] += branch
            else:
                out[k] = json.loads(json.dumps(v))
    return out


def if_branches(if_name, true_to, false_to=None):
    return {if_name: {"main": [[{"node": true_to, "type": "main", "index": 0}] if true_to else [],
                               [{"node": false_to, "type": "main", "index": 0}] if false_to else []]}}


# ---------------------------------------------------------------------------------------------------------
# A: order health check
A_DECIDE = r"""
const S = $('Settings').first().json;
const channels = {};
for (const c of $('Read channels').all()) channels[c.json.id] = c.json;
const whs = {};
for (const w of $('Read warehouses').all()) whs[w.json.id] = w.json.name;
const excBySale = {};
for (const e of $('Read open exceptions').all()) {
  if (!e.json.sale) continue;
  (excBySale[e.json.sale] = excBySale[e.json.sale] || []).push(String(e.json.log || e.json.rec_name || '').slice(0, 200));
}
const host = S.baseUrl.replace(/\/api\/v2\/?$/, '');
const now = Date.now();
const graceMs = S.graceMinutes * 60000;
// Amazon (or other marketplace) ships these, so a stuck order only affects records, not the customer.
const marketplaceShips = name => /^Amazon (FBA|MCF)/i.test(name || '');

function triage(p) {
  const ex = p.exception;
  const mm = ex.match(/total mismatch found (\d+(?:\.\d+)?) instead of (\d+(?:\.\d+)?)/i);
  const sku = (ex.match(/Product ([^(\s]+)\(/) || [])[1];
  let action;
  if (mm && Math.abs(Number(mm[2]) - Number(mm[1])) <= S.roundingTolerance) {
    action = `Rounding difference (${mm[1]} vs ${mm[2]}). Open the order, accept or adjust the total, then retry.`;
    return { priority: 3, action };
  }
  if (mm) action = `Tax missing at import (${mm[1]} found, Amazon total ${mm[2]}). Open the order, retry the import; if it fails again add it to the Fulfil support ticket.`;
  else if (/Product NULL/i.test(ex)) action = 'A line has no SKU on the channel order. Map the line to a product in Fulfil, then retry.';
  else if (sku) action = `SKU ${sku} does not exist in Fulfil. Create or map the product, then retry the order.`;
  else if (p.reason === 'confirmed, no shipment') action = 'Confirmed but no shipment was created. Check stock and warehouse, then process the order.';
  else if (p.reason === 'draft' || p.reason === 'quotation') action = `Order is stuck in ${p.reason}. Open it and confirm/process it${ex ? ' after fixing the exception' : ''}.`;
  else action = 'Open the order, read the exception, fix and retry.';
  return { priority: p.marketplace ? 2 : 1, action };
}

const problems = [];
for (const it of $('Read recent orders').all()) {
  const s = it.json;
  const ch = channels[s.channel] || {};
  if (!S.integratedSources.includes(ch.source)) continue;
  const created = Date.parse(String(s.create_date && s.create_date.iso_string || s.create_date) + 'Z');
  if (isNaN(created) || now - created < graceMs) continue;
  let reason = null;
  if (['draft', 'quotation', 'failed'].includes(s.state)) reason = s.state;
  else if (s.state === 'confirmed' && !(s.shipments || []).length) reason = 'confirmed, no shipment';
  if (excBySale[s.id] && !reason) reason = 'open exception';
  if (!reason) continue;
  const warehouse = whs[s.warehouse] || '';
  const p = { id: s.id, number: s.number || '', reference: s.reference || '', channel: ch.name || String(s.channel),
              warehouse, marketplace: marketplaceShips(warehouse), state: s.state, reason,
              created: new Date(created).toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
              exception: (excBySale[s.id] || []).join(' | '), link: `${host}/client/#/model/sale.sale/${s.id}` };
  Object.assign(p, triage(p));
  problems.push(p);
}
// Email when there is anything NEW (kept in workflow static data; resolved ones drop out). The email lists
// everything outstanding, with new ones flagged, so one email is the full to-do list.
const store = $getWorkflowStaticData('global');
store.seen = store.seen || {};
const current = {};
let fresh = 0;
for (const p of problems) {
  p.isNew = !store.seen[p.id];
  if (p.isNew) fresh++;
  current[p.id] = store.seen[p.id] || new Date().toISOString();
}
store.seen = current;
problems.sort((a, b) => a.priority - b.priority || (a.created < b.created ? -1 : 1));
return [{ json: { tenant: S.tenant, problems, fresh, outstanding: problems.length,
                  sendEmail: fresh > 0 || S.emailWhenClean, scanned: $('Read recent orders').all().length } }];
"""

A_HTML = r"""
const d = $json;
const S = $('Settings').first().json;
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const P = {
  1: { label: 'URGENT: customer waiting', colour: '#c62828', note: 'Orders we ship ourselves (3PL). They cannot ship until fixed. Fix today.' },
  2: { label: 'ACTION TODAY: records only', colour: '#ef6c00', note: 'Amazon has shipped or will ship these. Fix so Fulfil stock, invoices and reporting are right.' },
  3: { label: 'LOW: minor', colour: '#757575', note: 'Small rounding differences. Fix when convenient.' },
};
const counts = { 1: 0, 2: 0, 3: 0 };
d.problems.forEach(p => counts[p.priority]++);
const th = 'style="text-align:left;background:#f2f2f2"';
let body = '';
for (const k of [1, 2, 3]) {
  const list = d.problems.filter(p => p.priority === k);
  if (!list.length) continue;
  const rows = list.map(p => `<tr><td><a href="${p.link}">${esc(p.reference || p.number || p.id)}</a>${p.isNew ? ' <b style="color:#c62828">NEW</b>' : ''}</td><td>${esc(p.channel)}</td><td>${esc(p.warehouse)}</td><td>${esc(p.reason)}</td><td>${esc(p.created)}</td><td>${esc(p.action)}</td><td style="color:#666">${esc(p.exception)}</td></tr>`).join('');
  body += `<h3 style="color:${P[k].colour};margin:18px 0 4px">${P[k].label} (${list.length})</h3><p style="margin:0 0 6px">${P[k].note}</p>
<table border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse;font-family:Arial;font-size:12px"><tr><th ${th}>Order (opens Fulfil)</th><th ${th}>Channel</th><th ${th}>Ships from</th><th ${th}>Problem</th><th ${th}>Created</th><th ${th}>Action</th><th ${th}>Fulfil message</th></tr>${rows}</table>`;
}
const pre = S.approvalMode ? '<p style="background:#fff3cd;padding:6px"><b>PREVIEW for approval</b>: sent to Ben only. Once approved it goes to the ops team.</p>' : '';
const html = `<div style="font-family:Arial;font-size:13px">${pre}<p><b>${d.outstanding} order(s) need action</b>: ${counts[1]} urgent, ${counts[2]} today, ${counts[3]} low. ${d.fresh} new since the last email. Orders on Shopify, Amazon, Faire and TikTok older than ${S.graceMinutes} minutes that failed to import, are stuck in draft/quotation, are confirmed with no shipment, or have an open exception. Click the order to open it in Fulfil.</p>${body}<p style="color:#666;font-size:11px">Hourly check, emails only when something new appears. Tenant ${esc(d.tenant)}.</p></div>`;
const subject = `${counts[1] ? 'URGENT ' : ''}Orders need action: ${counts[1]} urgent, ${counts[2]} today, ${counts[3]} low (${d.fresh} new)`;
return [{ json: { subject: (S.approvalMode ? '[PREVIEW] ' : '') + subject, html } }];
"""

A_SETTINGS = {
    "tenant": "SANDBOX",
    "baseUrl": "https://dockandbay-sandbox.fulfil.io/api/v2",
    "lookbackHours": 48,
    "graceMinutes": 30,
    "integratedSources": ["cms_shopify", "amazon_mws", "faire", "tiktok"],
    "alertEmailTo": "ben@dockandbay.com",
    "emailWhenClean": False,
    "roundingTolerance": 0.10,
    "approvalMode": True,
}

A_SINCE = "={{ JSON.stringify([[\"create_date\",\">=\",$now.minus({hours: $('Settings').first().json.lookbackHours}).toUTC().toFormat('yyyy-MM-dd HH:mm:ss')]%s]) }}"


A_CRON_NAME, A_CRON = "Hourly (:52)", "52 * * * *"


def build_a():
    nodes = [
        sticky("About", "## Order health check (hourly)\nRead only. Flags orders on integrated channels (Shopify, Amazon, Faire, TikTok) older than `graceMinutes` that are draft / quotation / failed, confirmed with no shipment, or carry an open exception. Emails only NEW problems (static data remembers what was sent).\n\nBuilt by Claude for Ben 23-Oct-26. Starts on SANDBOX. To go live: Settings tenant/baseUrl = PROD and switch the 3 read nodes to the Fulfil PROD credential.", -40, -300),
        schedule(A_CRON_NAME, A_CRON, 0, 0),
        settings(A_SETTINGS, 220, 0),
        fulfil_get("Read channels", "sale.channel", "name,source", None, 440, 0),
        fulfil_get("Read warehouses", "stock.location", "name", "={{ JSON.stringify([[\"type\",\"=\",\"warehouse\"]]) }}", 550, 160),
        fulfil_get("Read recent orders", "sale.sale", "number,reference,state,channel,warehouse,create_date,shipments",
                   A_SINCE % ",[\"state\",\"in\",[\"draft\",\"quotation\",\"failed\",\"confirmed\"]]", 660, 0),
        fulfil_get("Read open exceptions", "channel.exception", "sale,log",
                   A_SINCE % ",[\"is_resolved\",\"=\",false]", 880, 0),
        code("Find problems", A_DECIDE, 1100, 0, once=True),
        if_node("New problems?", "={{ $json.sendEmail }}", 1320, 0),
        code("Build email", A_HTML, 1540, -100),
        gmail("Email unprocessed orders", "={{ $('Settings').first().json.alertEmailTo }}", "={{ $json.subject }}", "={{ $json.html }}", 1760, -100),
    ]
    conns = merge(chain(A_CRON_NAME, "Settings", "Read channels", "Read warehouses", "Read recent orders", "Read open exceptions",
                        "Find problems", "New problems?"),
                  if_branches("New problems?", "Build email"), chain("Build email", "Email unprocessed orders"))
    return {"name": "Ops | Order health check (hourly) [SANDBOX]", "nodes": nodes, "connections": conns,
            "settings": {"executionOrder": "v1", "errorWorkflow": ERROR_WORKFLOW_ID}}


# ---------------------------------------------------------------------------------------------------------
# B: PP prepack BOM flip
B_MAP = "const map = " + json.dumps(PREPACK_MAP) + r""";
const S = $('Settings').first().json;
const markets = Object.keys(S.markets);
const kits = [];
for (const r of map) for (const m of markets) kits.push({ kit: m + '-' + r.set, pp: r.pp, market: m });
const codes = Array.from(new Set(map.map(r => r.pp).concat(kits.map(k => k.kit))));
return [{ json: { kits, codes } }];
"""

B_DECIDE = r"""
const S = $('Settings').first().json;
const kits = $('Prepack map').first().json.kits;
const all = n => $(n).all().map(i => i.json);
const locs = all('Read locations'), prods = all('Read products'), links = all('Read BOM links');
const boms = {}; for (const b of all('Read BOMs')) boms[b.id] = b;
const inputs = {}; for (const i of all('Read BOM inputs')) (inputs[i.bom] = inputs[i.bom] || []).push(i);
const moves = all('Read PP moves');
const byCode = {}; for (const p of prods) byCode[p.code] = p;

// Market warehouses and their location subtrees
const children = {};
for (const l of locs) if (l.parent) (children[l.parent] = children[l.parent] || []).push(l.id);
const subtree = id => { const out = new Set([id]); const st = [id];
  while (st.length) { const x = st.pop(); for (const c of (children[x] || [])) if (!out.has(c)) { out.add(c); st.push(c); } } return out; };
const wh = {};
for (const m of Object.keys(S.markets)) { const w = locs.find(l => l.type === 'warehouse' && S.markets[m].includes(l.code)); if (w) wh[m] = subtree(w.id); }

// PP available per market = done in - done out - open outgoing (live's location-context quantity reads 0 over the API)
const avail = {};
for (const mv of moves) {
  for (const m of Object.keys(wh)) {
    const T = wh[m], inTo = T.has(mv.to_location), inFrom = T.has(mv.from_location);
    let q = 0;
    if (mv.state === 'done' && inTo && !inFrom) q = mv.quantity;
    else if (mv.state === 'done' && inFrom && !inTo) q = -mv.quantity;
    else if (['draft', 'waiting', 'assigned'].includes(mv.state) && inFrom && !inTo) q = -mv.quantity;
    if (q) { const k = m + '|' + mv.product; avail[k] = (avail[k] || 0) + q; }
  }
}

const changes = [], needsSetup = [], rows = [];
for (const k of kits) {
  const kit = byCode[k.kit], pp = byCode[k.pp];
  if (!kit || !pp || !wh[k.market]) continue;
  const kitLinks = links.filter(l => l.product === kit.id && boms[l.bom] && boms[l.bom].active);
  const ppLink = kitLinks.find(l => { const ins = inputs[l.bom] || []; return ins.length === 1 && ins[0].product === pp.id && Number(ins[0].quantity) === 1; });
  const singles = kitLinks.filter(l => l !== ppLink);
  if (!singles.length) continue;
  const ppOwnActive = links.some(l => l.product === pp.id && boms[l.bom] && boms[l.bom].active && boms[l.bom].is_built_on_the_fly);
  const a = avail[k.market + '|' + pp.id] || 0;
  let wantPP = a >= S.minPP;
  if (wantPP && (!ppLink || ppOwnActive)) { needsSetup.push({ kit: k.kit, pp: k.pp, ppAvailable: a, missing: !ppLink ? "'1 x PP' BOM" : 'PP own BOM still active' }); wantPP = false; }
  rows.push({ kit: k.kit, ppAvailable: a, first: wantPP ? 'PP' : 'singles' });
  if (!ppLink) continue;
  const first = wantPP ? ppLink : singles[0];
  for (const l of [ppLink].concat(singles)) {
    const target = l === first ? 10 : 20;
    if (l.sequence !== target) changes.push({ linkId: l.id, kit: k.kit, bom: l.bom, isPP: l === ppLink, oldSequence: l.sequence, newSequence: target,
                                               ppAvailable: a, direction: wantPP ? 'PP first' : 'singles first' });
  }
}
const truncated = ['Read PP moves', 'Read BOM inputs', 'Read BOM links', 'Read locations'].filter(n => all(n).length >= 50000);
return [{ json: { tenant: S.tenant, dryRun: S.dryRun, changes, needsSetup, truncated,
                  ppFirst: rows.filter(r => r.first === 'PP').length, singlesFirst: rows.filter(r => r.first === 'singles').length,
                  sendPreview: changes.length > 0 || S.alwaysEmailPreview } }];
"""

B_PREVIEW = r"""
const d = $json;
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const rows = d.changes.map(c => `<tr><td>${esc(c.kit)}</td><td>${c.ppAvailable}</td><td>${esc(c.direction)}</td><td>BOM ${c.bom}${c.isPP ? ' (PP)' : ''}</td><td>${c.oldSequence} &rarr; ${c.newSequence}</td><td>${c.linkId}</td></tr>`).join('');
const setup = d.needsSetup.map(s => `<li>${esc(s.kit)}: ${s.ppAvailable} PP available, needs ${esc(s.missing)}</li>`).join('');
const html = `<p><b>DRY RUN, nothing written</b> (tenant ${esc(d.tenant)}). ${d.ppFirst} kits PP first, ${d.singlesFirst} singles first.</p>
<p>${d.changes.length} sequence change(s) this run would make:</p>
<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;font-family:Arial;font-size:12px"><tr><th>Kit</th><th>PP available</th><th>Direction</th><th>BOM</th><th>Sequence</th><th>Link id</th></tr>${rows}</table>
${setup ? '<p>Needs one-time setup (left on singles):</p><ul>' + setup + '</ul>' : ''}${d.truncated.length ? '<p><b>WARNING: reads may be truncated: ' + d.truncated.join(', ') + '</b></p>' : ''}`;
return [{ json: { subject: `PP BOM flip PREVIEW (${d.tenant}): ${d.changes.length} change(s)`, html } }];
"""

B_SPLIT = r"""
const S = $('Settings').first().json;
return $json.changes.map(c => ({ json: { tenant: S.tenant, method: 'PUT', path: '/model/product.product-production.bom/write',
  body: [[c.linkId], { sequence: c.newSequence }], allow_prod_write: S.allowProdWrite === true, tag: c } }));
"""

B_REPORT = r"""
const S = $('Settings').first().json;
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const after = {}; for (const l of $('Read back links').all()) after[l.json.id] = l.json.sequence;
const changes = $('Split changes').all().map(i => i.json.tag);
const rows = changes.map(c => { const ok = after[c.linkId] === c.newSequence;
  return `<tr><td>${esc(c.kit)}</td><td>${c.ppAvailable}</td><td>${esc(c.direction)}</td><td>BOM ${c.bom}${c.isPP ? ' (PP)' : ''}</td><td>${c.oldSequence} &rarr; ${c.newSequence}</td><td>${c.linkId}</td><td>${ok ? 'verified' : '<b>NOT VERIFIED (now ' + after[c.linkId] + ')</b>'}</td></tr>`; }).join('');
const failed = changes.filter(c => after[c.linkId] !== c.newSequence).length;
const html = `<p><b>${changes.length} sequence change(s) written</b> (tenant ${esc(S.tenant)}), ${failed} not verified.</p>
<p>To undo a change, set the link's sequence back to the old value (Products &gt; kit &gt; Bill of Materials).</p>
<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;font-family:Arial;font-size:12px"><tr><th>Kit</th><th>PP available</th><th>Direction</th><th>BOM</th><th>Sequence old &rarr; new</th><th>Link id</th><th>Check</th></tr>${rows}</table>`;
return [{ json: { subject: `PP BOM flip (${S.tenant}): ${changes.length} change(s)${failed ? ', ' + failed + ' NOT VERIFIED' : ''}`, html } }];
"""

B_SETTINGS = {
    "tenant": "SANDBOX",
    "baseUrl": "https://dockandbay-sandbox.fulfil.io/api/v2",
    "dryRun": True,
    "allowProdWrite": False,
    "minPP": 1,
    "markets": {"UK": ["UKILG"], "US": ["USGENEVA_STD", "USGENEVA-STD"], "EU": ["EUIFUL"], "AU": ["AUCOGHLANS"]},
    "alertEmailTo": "ben@dockandbay.com",
    "alwaysEmailPreview": False,
}

IDS = "$('Read products').all().map(i => i.json.id)"
BOM_IDS = "Array.from(new Set($('Read BOM links').all().map(i => i.json.bom)))"
PP_IDS = "$('Read products').all().filter(i => i.json.code.startsWith('PP-')).map(i => i.json.id)"


def build_b():
    nodes = [
        sticky("About", "## PP prepack BOM flip (hourly)\nFulfil always explodes a kit with its lowest-sequence BOM, so each kit has a '1 x PP' BOM and a singles BOM; this sets which one is sequence 10 from PP stock at the kit's market warehouse (min `minPP`). Stock is derived from stock moves (live location-context quantities read 0 over the API).\n\nSafety: `dryRun` true = preview email only. Writes go through 'Fulfil | Request (sub-workflow)', which blocks PROD writes unless `allowProdWrite` is true. Every write is read back and emailed with old/new sequence (the revert record). One-time setup of new kits is NOT done here (reported only).\n\nBuilt by Claude for Ben 23-Oct-26, replaces the local pp_bom_flip.py run. Starts on SANDBOX. Go-live (Diviyaj): Settings tenant/baseUrl = PROD, read nodes to Fulfil PROD credential, dryRun false, allowProdWrite true.", -40, -360, 600, 360),
        schedule("Hourly (:47)", "47 * * * *", 0, 0),
        settings(B_SETTINGS, 220, 0),
        code("Prepack map", B_MAP, 440, 0, once=True),
        fulfil_search_read("Read products", "product.product",
                           "={{ JSON.stringify([[[\"code\",\"in\",$('Prepack map').first().json.codes]],0,500,null,[\"code\"]]) }}", 660, 0),
        fulfil_get("Read locations", "stock.location", "parent,code,type", None, 880, 0),
        fulfil_get("Read BOM links", "product.product-production.bom", "product,bom,sequence",
                   "={{ JSON.stringify([[\"product\",\"in\"," + IDS + "]]) }}", 1100, 0),
        fulfil_get("Read BOMs", "production.bom", "active,is_built_on_the_fly",
                   "={{ JSON.stringify([[\"id\",\"in\"," + BOM_IDS + "],[\"active\",\"in\",[true,false]]]) }}", 1320, 0),
        fulfil_get("Read BOM inputs", "production.bom.input", "bom,product,quantity",
                   "={{ JSON.stringify([[\"bom\",\"in\"," + BOM_IDS + "]]) }}", 1540, 0),
        fulfil_get("Read PP moves", "stock.move", "product,quantity,state,from_location,to_location",
                   "={{ JSON.stringify([[\"product\",\"in\"," + PP_IDS + "],[\"state\",\"in\",[\"done\",\"draft\",\"waiting\",\"assigned\"]]]) }}", 1760, 0),
        code("Decide changes", B_DECIDE, 1980, 0, once=True),
        if_node("Dry run?", "={{ $json.dryRun }}", 2200, 0),
        if_node("Anything to preview?", "={{ $json.sendPreview }}", 2420, -160),
        code("Build preview", B_PREVIEW, 2640, -160),
        gmail("Email preview", "={{ $('Settings').first().json.alertEmailTo }}", "={{ $json.subject }}", "={{ $json.html }}", 2860, -160),
        code("Split changes", B_SPLIT, 2420, 160),
        node("Write sequence (guarded)", "n8n-nodes-base.executeWorkflow", 1.3, json.load(open(os.path.join(HERE, "reference/subworkflow_call_params.json"))), 2640, 160),
        fulfil_get("Read back links", "product.product-production.bom", "sequence",
                   "={{ JSON.stringify([[\"id\",\"in\",$('Split changes').all().map(i => i.json.tag.linkId)]]) }}", 2860, 160),
        code("Build report", B_REPORT, 3080, 160, once=True),
        gmail("Email report", "={{ $('Settings').first().json.alertEmailTo }}", "={{ $json.subject }}", "={{ $json.html }}", 3300, 160),
    ]
    conns = merge(chain("Hourly (:47)", "Settings", "Prepack map", "Read products", "Read locations", "Read BOM links",
                        "Read BOMs", "Read BOM inputs", "Read PP moves", "Decide changes", "Dry run?"),
                  if_branches("Dry run?", "Anything to preview?", "Split changes"),
                  if_branches("Anything to preview?", "Build preview"),
                  chain("Build preview", "Email preview"),
                  chain("Split changes", "Write sequence (guarded)", "Read back links", "Build report", "Email report"))
    return {"name": "Fulfil | PP prepack BOM flip (hourly) [SANDBOX]", "nodes": nodes, "connections": conns,
            "settings": {"executionOrder": "v1", "errorWorkflow": ERROR_WORKFLOW_ID}}


PROD_CRED = {"httpHeaderAuth": {"id": "j9m8FVwKL7nvn8Lk", "name": "Fulfil PROD"}}
B_PROD_SETTINGS = {"tenant": "PROD", "baseUrl": "https://dockandbay.fulfil.io/api/v2", "dryRun": False, "allowProdWrite": True}


def to_prod(wf, cfg_update):
    """Live version: PROD settings and read credential. B approved by Ben 27-Oct-26 (replaces the session cron)."""
    for n in wf["nodes"]:
        if n["name"] == "Settings":
            cfg = json.loads(n["parameters"]["jsonOutput"])
            cfg.update(cfg_update)
            n["parameters"]["jsonOutput"] = json.dumps(cfg, indent=2)
        if n.get("credentials", {}).get("httpHeaderAuth"):
            n["credentials"] = PROD_CRED
    wf["name"] = wf["name"].replace(" [SANDBOX]", "")
    return wf


if __name__ == "__main__":
    import sys
    b = to_prod(build_b(), B_PROD_SETTINGS) if "--prod-b" in sys.argv else build_b()
    # A live on PROD (Ben 28-Oct-26): read only, emails new stuck/failed orders
    if "--cron-a" in sys.argv:  # one-off run time for a preview, e.g. --cron-a "7 3 * * *"
        A_CRON = sys.argv[sys.argv.index("--cron-a") + 1]
    a_prod = {"tenant": "PROD", "baseUrl": "https://dockandbay.fulfil.io/api/v2"}
    if "--approved-a" in sys.argv:  # Ben approved the email format: send to the ops team
        a_prod.update({"approvalMode": False,
                       "alertEmailTo": "ben@dockandbay.com, support@dockandbay.com, alexandria@dockandbay.com, sarah@dockandbay.com"})
    a = to_prod(build_a(), a_prod) if "--prod-a" in sys.argv else build_a()
    for tag, wf in (("A", a), ("B", b)):
        json.dump(wf, open(os.path.join(HERE, f"workflow_{tag}.json"), "w"), indent=1)
        print(tag, wf["name"], len(wf["nodes"]), "nodes")
