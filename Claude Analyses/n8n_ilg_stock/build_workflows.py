"""ILG stock report + stocktake n8n workflows (Ben 28-Oct-26, HORIZON v28.553). Same pattern as n8n_pp_automation (Diviyaj's):
Settings node -> reads -> Code decides -> writes ONLY through the guarded 'Fulfil | Request (sub-workflow)' -> read back -> report.

  D  Ops | ILG stock report import (hourly)   POST HORIZON /api/cron/ilg-stock-import (HORIZON reads ops@ and stores the newest report)
  E  Fulfil | ILG stocktake                    on HORIZON's webhook (user pressed Send) + a 15-minute sweep: claim queued rebaselines,
                                               create one stock count per batch in the ILG warehouse's Storage Zone (guarded write),
                                               complete + confirm it, read it back, post the result to HORIZON.

usage: python3 -I build_workflows.py [--prod-e]   -> workflow_D.json / workflow_E.json
Start state for E: tenant SANDBOX, allowProdWrite false, test mode allowed (webhook body {"test_batch": {...}} on SANDBOX only, no HORIZON
claim / result). Going live = tenant PROD, PROD read credential, allowProdWrite true (Ben approves). The HORIZON secret is NOT in these files:
deploy.py copies it at deploy time from the existing 'Horizon — Preorders sync' workflow (placeholder __HZ_SECRET__).
"""
import json
import os
import uuid

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, "../n8n_pp_automation/reference/subworkflow_call_params.json")
SANDBOX_CRED = {"httpHeaderAuth": {"id": "EDrfRZJRHfhBe2fB", "name": "Fulfil SANDBOX"}}
PROD_CRED = {"httpHeaderAuth": {"id": "j9m8FVwKL7nvn8Lk", "name": "Fulfil PROD"}}
ERROR_WORKFLOW_ID = "ZdyI9BvD5vlGlHR7"
HZ = "https://horizon.dockandbay.com"


def node(name, ntype, version, params, x, y, creds=None, once=False, on_error=None):
    n = {"id": str(uuid.uuid5(uuid.NAMESPACE_URL, "dnb-ilg/" + name)), "name": name, "type": ntype,
         "typeVersion": version, "position": [x, y], "parameters": params}
    if creds:
        n["credentials"] = creds
    if once:
        n["executeOnce"] = True
    if on_error:
        n["onError"] = on_error
    return n


def schedule(name, cron, x, y):
    return node(name, "n8n-nodes-base.scheduleTrigger", 1.2, {"rule": {"interval": [{"field": "cronExpression", "expression": cron}]}}, x, y)


def settings(obj, x, y):
    return node("Settings", "n8n-nodes-base.set", 3.4, {"mode": "raw", "jsonOutput": json.dumps(obj, indent=2), "options": {}}, x, y)


def code(name, js, x, y, each=False):
    p = {"jsCode": js}
    if each:
        p["mode"] = "runOnceForEachItem"
    return node(name, "n8n-nodes-base.code", 2, p, x, y)


def fulfil_read(name, model, body_expr, x, y):
    """PUT search_read per item; full response so an array body stays ONE item (keeps item pairing)."""
    return node(name, "n8n-nodes-base.httpRequest", 4.4, {
        "method": "PUT", "url": "={{ $('Settings').first().json.baseUrl }}/model/" + model + "/search_read",
        "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth",
        "sendBody": True, "specifyBody": "json", "jsonBody": body_expr,
        "options": {"timeout": 60000, "response": {"response": {"fullResponse": True}}},
    }, x, y, creds=SANDBOX_CRED)


def guarded(name, x, y):
    return node(name, "n8n-nodes-base.executeWorkflow", 1.3, json.load(open(REF)), x, y, on_error="continueRegularOutput")


def if_ok(name, expr, x, y):
    return node(name, "n8n-nodes-base.if", 2.2, {"conditions": {
        "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "loose", "version": 2},
        "conditions": [{"id": str(uuid.uuid5(uuid.NAMESPACE_URL, "ilg-if/" + name)), "leftValue": expr, "rightValue": "",
                        "operator": {"type": "boolean", "operation": "true", "singleValue": True}}],
        "combinator": "and"}, "options": {}}, x, y)


def sticky(name, text, x, y, w=560, h=320):
    return node(name, "n8n-nodes-base.stickyNote", 1, {"content": text, "width": w, "height": h}, x, y)


def link(conns, a, b, out=0):
    c = conns.setdefault(a, {"main": []})
    while len(c["main"]) <= out:
        c["main"].append([])
    c["main"][out].append({"node": b, "type": "main", "index": 0})


# ── D: hourly import ───────────────────────────────────────────────────────────────────────────────────────────────────
D_SETTINGS = {"horizonUrl": HZ, "secret": "__HZ_SECRET__"}
D_CALL = r"""
const S = $('Settings').first().json;
const r = await this.helpers.httpRequest({ method: 'POST', url: S.horizonUrl + '/api/cron/ilg-stock-import', headers: { 'x-webhook-secret': S.secret }, body: {}, json: true, timeout: 120000 });
// imported: a new report was stored; skipped: the newest one is already in; reason: nothing found in ops@ (normal until ~19:40 UK)
return [{ json: r }];
"""


def build_d():
    nodes = [
        sticky("About", "## Ops | ILG stock report import (hourly)\nHORIZON reads the newest **DOCKBAY Daily Stock Report** from **ops@** (Gmail connector, read only) and stores it once. "
               "ILG sends it once a day (~19:30 UK); this checks every hour at :07.\nHORIZON ▸ Buy & Move ▸ Inventory ▸ Manage 3PL ▸ UK (ILG). Built by Claude for Ben, 28-Oct-26.", -380, -260, 520, 220),
        schedule("Every hour :07", "7 * * * *", 0, 0),
        settings(D_SETTINGS, 220, 0),
        code("Import latest report", D_CALL, 440, 0),
    ]
    conns = {}
    link(conns, "Every hour :07", "Settings"); link(conns, "Settings", "Import latest report")
    return {"name": "Ops | ILG stock report import (hourly)", "nodes": nodes, "connections": conns,
            "settings": {"executionOrder": "v1", "errorWorkflow": ERROR_WORKFLOW_ID}}


# ── E: stocktake ───────────────────────────────────────────────────────────────────────────────────────────────────────
E_SETTINGS = {"tenant": "SANDBOX", "baseUrl": "https://dockandbay-sandbox.fulfil.io/api/v2", "allowProdWrite": False,
              "horizonUrl": HZ, "secret": "__HZ_SECRET__", "lostFoundId": 10, "allowTestBatch": True,
              "horizonEnabled": False}   # False until HORIZON v28.553 + migration 399 are live: the sweep then does nothing
E_CLAIM = r"""
const S = $('Settings').first().json;
const fromHook = $('Webhook').isExecuted;
let batchId = null;
if (fromHook) {
  const h = $('Webhook').first().json;
  if (String((h.headers || {})['x-webhook-secret'] || '') !== String(S.secret)) throw new Error('webhook: bad secret');
  const b = h.body || {};
  // test mode (SANDBOX only): run one synthetic batch without touching HORIZON
  if (b.test_batch) { if (S.tenant !== 'SANDBOX' || S.allowTestBatch !== true) throw new Error('test_batch is only allowed on SANDBOX');
    return [{ json: Object.assign({ test: true }, b.test_batch) }]; }
  batchId = b.batch_id || null;
}
if (S.horizonEnabled !== true) return [];
const r = await this.helpers.httpRequest({ method: 'POST', url: S.horizonUrl + '/api/cron/ilg-rebaseline/claim', headers: { 'x-webhook-secret': S.secret }, body: batchId ? { batch_id: batchId } : {}, json: true, timeout: 60000 });
return (r.batches || []).map(b => ({ json: b }));
"""
E_BUILD = r"""
const S = $('Settings').first().json, B = $('Claim batches').item.json;
const wh = (($('Read warehouse').item.json.body) || [])[0];
const prods = ($('Read products').item.json.body) || [];
const id = {}; prods.forEach(p => { id[String(p.code)] = p.id; });
const missing = B.lines.filter(l => id[l.sku] == null).map(l => l.sku);
if (!wh || !wh.storage_location) return { json: { ok: false, batch: B, error: 'Fulfil warehouse "' + B.warehouse + '" not found in ' + S.tenant } };
if (missing.length) return { json: { ok: false, batch: B, error: 'SKUs not in Fulfil ' + S.tenant + ': ' + missing.join(', ') } };
const lines = B.lines.map(l => ({ product: id[l.sku], quantity: Math.max(0, Number(l.set_to) || 0) }));
return { json: { ok: true, batch: B, storage: wh.storage_location,
  tenant: S.tenant, method: 'POST', path: '/model/stock.inventory', allow_prod_write: S.allowProdWrite === true, tag: { batch: B },
  body: [{ location: wh.storage_location, lost_found: S.lostFoundId, date: B.date, type: 'cycle', reason: B.reason, lines: [['create', lines]] }] } };
"""
E_COMPLETE = r"""
// state rides in tag (the sub-workflow echoes it); on an error item fall back to the paired input
const S = $('Settings').first().json, res = $json; let t = res.tag; if (!t) { try { t = { batch: $('Build count').item.json.batch }; } catch (e) { t = {}; } }
const cid = res && res.data && res.data[0] ? (res.data[0].id || res.data[0]) : null;
if (!res.ok || !cid) return { json: { ok: false, batch: t.batch, error: 'create failed: ' + JSON.stringify(res.error || res.data || res).slice(0, 400) } };
return { json: { ok: true, batch: t.batch, count_id: cid, tenant: S.tenant, method: 'PUT', path: '/model/stock.inventory/' + cid + '/complete', body: [[cid]], allow_prod_write: S.allowProdWrite === true, tag: { batch: t.batch, count_id: cid } } };
"""
E_CONFIRM = r"""
const S = $('Settings').first().json, res = $json; let prev = res.tag; if (!prev) { try { prev = $('Prep complete').item.json; } catch (e) { prev = {}; } }
if (!res.ok) return { json: { ok: false, batch: prev.batch, count_id: prev.count_id, error: 'complete failed (count ' + prev.count_id + ' left in draft): ' + JSON.stringify(res.error || res.data || res).slice(0, 400) } };
return { json: { ok: true, batch: prev.batch, count_id: prev.count_id, tenant: S.tenant, method: 'PUT', path: '/model/stock.inventory/' + prev.count_id + '/confirm', body: [[prev.count_id]], allow_prod_write: S.allowProdWrite === true, tag: { batch: prev.batch, count_id: prev.count_id } } };
"""
E_AFTER_CONFIRM = r"""
const res = $json; let prev = res.tag; if (!prev) { try { prev = $('Prep confirm').item.json; } catch (e) { prev = {}; } }
if (!res.ok) return { json: { ok: false, batch: prev.batch, count_id: prev.count_id, error: 'confirm failed (count ' + prev.count_id + ' completed, not done): ' + JSON.stringify(res.error || res.data || res).slice(0, 400) } };
return { json: { ok: true, batch: prev.batch, count_id: prev.count_id } };
"""
E_REPORT = r"""
// one result per batch back to HORIZON (skipped for a SANDBOX test batch)
const S = $('Settings').first().json, out = [];
for (const it of $input.all()) {
  const j = it.json; let result = { batch_id: j.batch && j.batch.id, ok: false, error: j.error || 'failed', count_id: j.count_id || null };
  if (j.ok && j.readback) {
    const hd = (j.readback.header || [])[0] || {}, ln = j.readback.lines || [];
    const done = hd.state === 'done';
    result = { batch_id: j.batch.id, ok: done, count_id: j.count_id, number: hd.number || String(j.count_id), readback: { state: hd.state, lines: ln.map(l => ({ product: l.product, expected: l.expected_quantity, counted: l.quantity })) },
      error: done ? null : 'count ' + j.count_id + ' is "' + hd.state + '" after confirm' };
  }
  if (!(j.batch && j.batch.test)) await this.helpers.httpRequest({ method: 'POST', url: S.horizonUrl + '/api/cron/ilg-rebaseline/result', headers: { 'x-webhook-secret': S.secret }, body: result, json: true, timeout: 60000 });
  out.push({ json: Object.assign({ tenant: S.tenant, test: !!(j.batch && j.batch.test) }, result) });
}
return out;
"""
E_JOIN_READBACK = r"""
const prev = $('After confirm').item.json;
return { json: Object.assign({}, prev, { readback: { header: $('Read count').item.json.body, lines: $json.body } }) };
"""


def build_e():
    nodes = [
        sticky("About", "## Fulfil | ILG stocktake\nHORIZON ▸ Manage 3PL ▸ UK (ILG): a user ticks SKUs and presses **Send to Fulfil**. HORIZON queues the rebaseline and calls this "
               "webhook; a 15-minute sweep also picks up anything queued.\nPer batch: one **stock count** in the ILG warehouse's **Storage Zone** (UK ILG / ILG - FBA / ILG - VENDOR, found by name), "
               "each SKU set to HORIZON's 'set to' (Storage Zone now + report difference). Complete + confirm, so Fulfil books the change to **Lost and Found**. "
               "All writes go through the guarded **Fulfil | Request (sub-workflow)** (PROD writes need allowProdWrite). Read back, result posted to HORIZON.\n"
               "Test (SANDBOX only): POST the webhook with {\"test_batch\": {id, warehouse, date, reason, lines:[{sku, set_to}]}}.\nBuilt by Claude for Ben, 28-Oct-26.", -420, -380, 640, 300),
        node("Webhook", "n8n-nodes-base.webhook", 2, {"httpMethod": "POST", "path": "ilg-stocktake", "responseMode": "onReceived", "options": {}}, 0, -120),
        schedule("Every 15 min", "*/15 * * * *", 0, 100),
        settings(E_SETTINGS, 220, 0),
        code("Claim batches", E_CLAIM, 440, 0),
        fulfil_read("Read warehouse", "stock.location", "={{ JSON.stringify([[['type','=','warehouse'],['name','=',$json.warehouse]],0,2,null,['id','name','storage_location']]) }}", 660, 0),
        fulfil_read("Read products", "product.product", "={{ JSON.stringify([[['code','in',$('Claim batches').item.json.lines.map(l => l.sku)]],0,1000,null,['id','code']]) }}", 880, 0),
        code("Build count", E_BUILD, 1100, 0, each=True),
        if_ok("Ready?", "={{ $json.ok }}", 1320, 0),
        guarded("Create count (guarded)", 1540, -80),
        code("Prep complete", E_COMPLETE, 1760, -80, each=True),
        if_ok("Created?", "={{ $json.ok }}", 1980, -80),
        guarded("Complete (guarded)", 2200, -160),
        code("Prep confirm", E_CONFIRM, 2420, -160, each=True),
        if_ok("Completed?", "={{ $json.ok }}", 2640, -160),
        guarded("Confirm (guarded)", 2860, -240),
        code("After confirm", E_AFTER_CONFIRM, 3080, -240, each=True),
        if_ok("Confirmed?", "={{ $json.ok }}", 3300, -240),
        fulfil_read("Read count", "stock.inventory", "={{ JSON.stringify([[['id','=',$json.count_id]],0,1,null,['id','number','state']]) }}", 3520, -320),
        fulfil_read("Read count lines", "stock.inventory.line", "={{ JSON.stringify([[['inventory','=',$('After confirm').item.json.count_id]],0,1000,null,['product','expected_quantity','quantity']]) }}", 3740, -320),
        code("Join read-back", E_JOIN_READBACK, 3960, -320, each=True),
        code("Report to HORIZON", E_REPORT, 4180, 0),
    ]
    conns = {}
    link(conns, "Webhook", "Settings"); link(conns, "Every 15 min", "Settings"); link(conns, "Settings", "Claim batches")
    link(conns, "Claim batches", "Read warehouse"); link(conns, "Read warehouse", "Read products"); link(conns, "Read products", "Build count")
    link(conns, "Build count", "Ready?"); link(conns, "Ready?", "Create count (guarded)", 0); link(conns, "Ready?", "Report to HORIZON", 1)
    link(conns, "Create count (guarded)", "Prep complete"); link(conns, "Prep complete", "Created?")
    link(conns, "Created?", "Complete (guarded)", 0); link(conns, "Created?", "Report to HORIZON", 1)
    link(conns, "Complete (guarded)", "Prep confirm"); link(conns, "Prep confirm", "Completed?")
    link(conns, "Completed?", "Confirm (guarded)", 0); link(conns, "Completed?", "Report to HORIZON", 1)
    link(conns, "Confirm (guarded)", "After confirm"); link(conns, "After confirm", "Confirmed?")
    link(conns, "Confirmed?", "Read count", 0); link(conns, "Confirmed?", "Report to HORIZON", 1)
    link(conns, "Read count", "Read count lines"); link(conns, "Read count lines", "Join read-back"); link(conns, "Join read-back", "Report to HORIZON")
    return {"name": "Fulfil | ILG stocktake [SANDBOX]", "nodes": nodes, "connections": conns,
            "settings": {"executionOrder": "v1", "errorWorkflow": ERROR_WORKFLOW_ID}}


def to_prod(wf):
    """Live version (only when Ben approves): PROD tenant + read credential, PROD writes allowed, no test batches."""
    for n in wf["nodes"]:
        if n["name"] == "Settings":
            cfg = json.loads(n["parameters"]["jsonOutput"])
            cfg.update({"tenant": "PROD", "baseUrl": "https://dockandbay.fulfil.io/api/v2", "allowProdWrite": True, "allowTestBatch": False, "horizonEnabled": True})
            n["parameters"]["jsonOutput"] = json.dumps(cfg, indent=2)
        if n.get("credentials", {}).get("httpHeaderAuth"):
            n["credentials"] = PROD_CRED
    wf["name"] = wf["name"].replace(" [SANDBOX]", "")
    return wf


if __name__ == "__main__":
    import sys
    e = to_prod(build_e()) if "--prod-e" in sys.argv else build_e()
    for tag, wf in (("D", build_d()), ("E", e)):
        json.dump(wf, open(os.path.join(HERE, f"workflow_{tag}.json"), "w"), indent=1)
    print("wrote workflow_D.json, workflow_E.json")
