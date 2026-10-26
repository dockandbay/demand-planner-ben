"""Generates workflow C (Ben 27-Oct-26): every 30 minutes, UK ILG shipments of orders with a personalisation
line (PERSONALISE_1_3 / PERSONALISE_4_12) must carry ILG Order Class = Ecom VAS (shipment metafield
fuse_order_class). Not yet with ILG: set it to Ecom VAS (guarded sub-workflow), read back, email. Already with
ILG: email an alert once (ILG must be told). Same Settings / dryRun / allowProdWrite pattern as A and B.

TEMPORARY band-aid: Fulfil's automation rule reads the "Personalised" SO comment, which Shopify Flow adds after
import, so it can miss. Remove this workflow once Fulfil fixes the rule.

usage: python3 -I build_vas_check.py   -> writes workflow_C.json here
Read-only Python twin for checking results: Claude Analyses/vas_check/vas_check.py
"""
import json
import os

from build_workflows import (ERROR_WORKFLOW_ID, HERE, chain, code, fulfil_get, fulfil_search_read, gmail,
                             if_branches, if_node, merge, node, schedule, settings, sticky)

C_SETTINGS = {
    "tenant": "SANDBOX",
    "baseUrl": "https://dockandbay-sandbox.fulfil.io/api/v2",
    "dryRun": False,  # sandbox write test 27-Oct-26; PROD writes still blocked by allowProdWrite
    "allowProdWrite": False,
    "lookbackHours": 720,  # sandbox write test only (old test data); 1 on PROD: new shipments only
    "warehouseCode": "UKILG",
    "personaliseCodes": ["PERSONALISE_1_3", "PERSONALISE_4_12"],
    "orderClassField": "fuse_order_class",
    "vasChoiceName": "Ecom VAS",
    "emailTo": "ben@dockandbay.com",
    "emailToProd": "gabriella@dockandbay.com,rose@dockandbay.com,alexandria@dockandbay.com,sarah@dockandbay.com,diviyaj@dockandbay.com,ben@dockandbay.com",
}

C_DECIDE = r"""
const S = $('Settings').first().json;
const all = n => $(n).all().map(i => i.json).filter(j => j && j.id !== undefined);
const field = all('Read order class field')[0];
if (!field) throw new Error('metafield ' + S.orderClassField + ' on stock.shipment.out not found');
const choices = {}; for (const c of all('Read class choices')) choices[c.id] = c.name;
const vas = Number(Object.keys(choices).find(k => choices[k] === S.vasChoiceName));
if (!vas) throw new Error('choice "' + S.vasChoiceName + '" not found on ' + S.orderClassField);
const orders = {}; for (const o of all('Read orders')) for (const sh of (o.shipments || [])) orders[sh] = o;
const cls = {}; for (const m of all('Read order class values')) cls[Number(String(m.resource).split(',')[1])] = m;
const fixes = [], alerts = [];
let ok = 0;
const pers = new Set(all('Read personalised lines').map(l => l.sale));
const ships = all('Read new shipments').filter(s => (s.sales || []).some(x => pers.has(x)));
for (const s of ships) {
  const m = cls[s.id];
  if (m && m.value_choice === vas) { ok++; continue; }
  const o = orders[s.id] || {};
  const row = { shipmentId: s.id, shipment: s.number, order: o.number || '', reference: s.order_references || o.reference || '',
                state: s.state, tpl: s.tpl_status || '', current: m ? (choices[m.value_choice] || String(m.value_choice)) : '(blank)',
                valueId: m ? m.id : null, fieldId: field.id, vas };
  if (!['done', 'packed'].includes(s.state) && [null, undefined, '', 'waiting'].includes(s.tpl_status)) fixes.push(row);
  else alerts.push(row);
}
// Alert each already-sent shipment once (static data); fixes are idempotent and always reported.
const store = $getWorkflowStaticData('global');
store.alerted = store.alerted || {};
const newAlerts = alerts.filter(a => !store.alerted[a.shipmentId]);
if (!S.dryRun) for (const a of newAlerts) store.alerted[a.shipmentId] = new Date().toISOString();
return [{ json: { tenant: S.tenant, dryRun: S.dryRun, fixes, newAlerts, ok, checked: ships.length,
                  hasFixes: fixes.length > 0, sendEmail: fixes.length > 0 || newAlerts.length > 0 } }];
"""

C_SPLIT = r"""
const S = $('Settings').first().json;
return $('Decide').first().json.fixes.map(f => ({ json: f.valueId
  ? { tenant: S.tenant, method: 'PUT', path: '/model/metafield.value/write', body: [[f.valueId], { value_choice: f.vas }],
      allow_prod_write: S.allowProdWrite === true, tag: f }
  : { tenant: S.tenant, method: 'POST', path: '/model/metafield.value',
      body: [{ field: f.fieldId, resource: 'stock.shipment.out,' + f.shipmentId, value_choice: f.vas }],
      allow_prod_write: S.allowProdWrite === true, tag: f } }));
"""

C_EMAIL = r"""
const S = $('Settings').first().json;
const d = $('Decide').first().json;
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
let after = null;
try { after = {}; for (const m of $('Read back').all()) if (m.json.resource) after[Number(String(m.json.resource).split(',')[1])] = m.json.value_choice; }
catch (e) { after = null; }
const table = (rows, extra) => `<table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;font-family:Arial;font-size:12px">
<tr><th>Order</th><th>Reference</th><th>Shipment</th><th>State</th><th>3PL status</th><th>Order class was</th>${extra ? '<th>Result</th>' : ''}</tr>
${rows.map(r => `<tr><td>${esc(r.order)}</td><td>${esc(r.reference)}</td><td>${esc(r.shipment)}</td><td>${esc(r.state)}</td><td>${esc(r.tpl)}</td><td>${esc(r.current)}</td>${extra ? '<td>' + extra(r) + '</td>' : ''}</tr>`).join('')}</table>`;
let fixedOk = 0;
const result = r => { if (d.dryRun) return 'would set Ecom VAS';
  if (!after) return 'not checked';
  const good = after[r.shipmentId] === r.vas; if (good) fixedOk++; return good ? 'set to Ecom VAS (verified)' : '<b>NOT VERIFIED</b>'; };
let html = `<p><b>Reminder: the Fulfil VAS automation missed ${d.fixes.length + d.newAlerts.length} personalised UK order(s), this n8n flow is mopping up</b>${d.dryRun ? ' (DRY RUN, nothing written)' : ''}</p>
<p>Fulfil's automation should set ILG Order Class = Ecom VAS on every personalised UK ILG order. It is not working as expected, so this temporary n8n flow checks every 30 minutes and fixes any it missed before they go to ILG. Tenant ${esc(d.tenant)}: ${d.checked} shipments checked, ${d.ok} already Ecom VAS.</p>`;
if (d.fixes.length) html += `<p><b>${d.dryRun ? 'Would fix' : 'Fixed'}: ${d.fixes.length}</b> (not yet sent to ILG, ILG Order Class set to Ecom VAS)</p>` + table(d.fixes, result);
if (d.newAlerts.length) html += `<p><b>Already with ILG as non-VAS: ${d.newAlerts.length}</b>. Too late to change in Fulfil; ILG needs to be told to personalise these.</p>` + table(d.newAlerts);
html += `<p><b>Action</b><br>Each row is a case the Fulfil automation missed: please keep adding them to the Fulfil support ticket so they fix the rule (it reads the "Personalised" order comment, which Shopify Flow adds after import, so it can miss). This flow is temporary and will be removed once Fulfil's automation works.</p>`;
const failed = d.dryRun || !after ? 0 : d.fixes.length - fixedOk;
const n = d.fixes.length + d.newAlerts.length;
const subject = `${d.dryRun ? 'PREVIEW ' : ''}VAS mop-up - ${n} order${n === 1 ? '' : 's'}${failed ? ' (' + failed + ' NOT VERIFIED)' : ''}`;
const to = S.tenant === 'PROD' ? S.emailToProd : S.emailTo;
return [{ json: { subject, html, to } }];
"""

RESOURCES = "$('Read new shipments').all().filter(i => i.json.id !== undefined).map(i => 'stock.shipment.out,' + i.json.id)"
FIELD_ID = "($('Read order class field').first().json.id || 0)"


def build_c():
    reads = [
        fulfil_get("Read order class field", "metafield.field", "choices",
                   "={{ JSON.stringify([[\"code\",\"=\",$('Settings').first().json.orderClassField],[\"model_name\",\"=\",\"stock.shipment.out\"]]) }}", 440, 0),
        fulfil_get("Read class choices", "metafield.field.choice", "name",
                   "={{ JSON.stringify([[\"id\",\"in\",$('Read order class field').first().json.choices || []]]) }}", 660, 0),
        fulfil_get("Read warehouse", "stock.location", "code",
                   "={{ JSON.stringify([[\"code\",\"=\",$('Settings').first().json.warehouseCode],[\"type\",\"=\",\"warehouse\"]]) }}", 880, 0),
        fulfil_get("Read personalisation products", "product.product", "code",
                   "={{ JSON.stringify([[\"code\",\"in\",$('Settings').first().json.personaliseCodes]]) }}", 1100, 0),
        fulfil_get("Read new shipments", "stock.shipment.out", "number,state,tpl_status,order_references,sales",
                   "={{ JSON.stringify([[\"create_date\",\">=\",$now.minus({hours: $('Settings').first().json.lookbackHours}).toUTC().toFormat('yyyy-MM-dd HH:mm:ss')],[\"warehouse\",\"=\",$('Read warehouse').first().json.id || 0],[\"state\",\"!=\",\"cancel\"]]) }}", 1320, 0),
        fulfil_search_read("Read personalised lines", "sale.line",
                           "={{ JSON.stringify([[[\"product\",\"in\",$('Read personalisation products').all().map(i => i.json.id).filter(x => x)],[\"sale\",\"in\",Array.from(new Set($('Read new shipments').all().flatMap(i => i.json.sales || [])))]],0,500,null,[\"sale\"]]) }}", 1540, 0),
        fulfil_search_read("Read orders", "sale.sale",
                           "={{ JSON.stringify([[[\"id\",\"in\",Array.from(new Set($('Read personalised lines').all().map(i => i.json.sale).filter(x => x)))]],0,500,null,[\"number\",\"reference\",\"shipments\"]]) }}", 1760, 0),
        fulfil_search_read("Read order class values", "metafield.value",
                           "={{ JSON.stringify([[[\"field\",\"=\"," + FIELD_ID + "],[\"resource\",\"in\"," + RESOURCES + "]],0,500,null,[\"resource\",\"value_choice\"]]) }}", 1980, 0),
    ]
    for r in reads:
        r["alwaysOutputData"] = True  # an empty read must not stop the run
    nodes = [
        sticky("About", "## Personalised UK ILG orders: VAS check (every 30 min)\nUK ILG shipments created in the last `lookbackHours` (1) whose order has a PERSONALISE_1_3 / PERSONALISE_4_12 line must have ILG Order Class = Ecom VAS. Not yet sent to ILG: set it (guarded sub-workflow) and read back. Already sent: alert once. Old orders are not looked at (Ben: they are sorted).\n\n**TEMPORARY band-aid** (Ben 27-Oct-26): the Fulfil automation rule reads the 'Personalised' SO comment, which Shopify Flow adds after import, so it can miss. Remove once Fulfil fixes the rule.\n\nIDs are looked up by code/name, so the same flow works on SANDBOX and PROD. Go-live (Diviyaj): Settings tenant/baseUrl = PROD, read nodes to Fulfil PROD credential, dryRun false, allowProdWrite true, lookbackHours 1. PROD emails go to emailToProd.", -40, -380, 620, 380),
        schedule("Every 30 min (:20, :50)", "20,50 * * * *", 0, 0),
        settings(C_SETTINGS, 220, 0),
    ] + reads + [
        code("Decide", C_DECIDE, 2200, 0, once=True),
        if_node("Anything to email?", "={{ $json.sendEmail }}", 2420, 0),
        if_node("Write fixes?", "={{ $json.hasFixes && !$json.dryRun }}", 2640, 0),
        code("Split fixes", C_SPLIT, 2860, -160, once=True),
        node("Set Ecom VAS (guarded)", "n8n-nodes-base.executeWorkflow", 1.3,
             json.load(open(os.path.join(HERE, "reference/subworkflow_call_params.json"))), 3080, -160),
        fulfil_search_read("Read back", "metafield.value",
                           "={{ JSON.stringify([[[\"field\",\"=\"," + FIELD_ID + "],[\"resource\",\"in\",$('Decide').first().json.fixes.map(f => 'stock.shipment.out,' + f.shipmentId)]],0,500,null,[\"resource\",\"value_choice\"]]) }}", 3300, -160),
        code("Build email", C_EMAIL, 3520, 0, once=True),
        gmail("Email team", "={{ $json.to }}", "={{ $json.subject }}", "={{ $json.html }}", 3740, 0),
    ]
    names = ["Every 30 min (:20, :50)", "Settings"] + [r["name"] for r in reads] + ["Decide", "Anything to email?"]
    conns = merge(chain(*names), if_branches("Anything to email?", "Write fixes?"),
                  if_branches("Write fixes?", "Split fixes", "Build email"),
                  chain("Split fixes", "Set Ecom VAS (guarded)", "Read back", "Build email", "Email team"))
    return {"name": "Fulfil | Personalised UK ILG VAS check (30 min) [SANDBOX]", "nodes": nodes, "connections": conns,
            "settings": {"executionOrder": "v1", "errorWorkflow": ERROR_WORKFLOW_ID}}


PROD_CRED = {"httpHeaderAuth": {"id": "j9m8FVwKL7nvn8Lk", "name": "Fulfil PROD"}}
PROD_SETTINGS = {"tenant": "PROD", "baseUrl": "https://dockandbay.fulfil.io/api/v2", "dryRun": False,
                 "allowProdWrite": True, "lookbackHours": 1}


def to_prod(wf):
    """Live version (Ben approved going live 27-Oct-26): PROD settings and read credential, 1-hour window."""
    for n in wf["nodes"]:
        if n["name"] == "Settings":
            cfg = json.loads(n["parameters"]["jsonOutput"])
            cfg.update(PROD_SETTINGS)
            n["parameters"]["jsonOutput"] = json.dumps(cfg, indent=2)
        if n.get("credentials", {}).get("httpHeaderAuth"):
            n["credentials"] = PROD_CRED
    wf["name"] = wf["name"].replace(" [SANDBOX]", "")
    return wf


if __name__ == "__main__":
    import sys
    wf = to_prod(build_c()) if "--prod" in sys.argv else build_c()
    json.dump(wf, open(os.path.join(HERE, "workflow_C.json"), "w"), indent=1)
    print("C", wf["name"], len(wf["nodes"]), "nodes")
