"""READ ONLY Amazon check (Ben 28-Oct-26): what Amazon says each failed-import order is worth (item price, tax,
shipping, promotions), to compare with Fulfil's "Order total mismatch".

SP-API credentials live only in n8n, so this creates a TEMPORARY n8n workflow (webhook -> SP-API core sub-workflow
GET /orders/v0/orders/{id}/orderItems), calls it once, then deactivates and archives it. Nothing is written to Amazon
or Fulfil. Usage: python3 -I amazon_order_amounts_check.py [--set NAME] [--status] [order ids...]
  --set failed27oct (default) | ticket96673 (Fulfil ticket: 16 Oct UK orders with wrong VAT) | provisional (44 stuck)
  --status  read the order header (OrderStatus, fulfilment channel, dates) instead of the item lines
Output: table on screen + ../../Claude Analyses/n8n_pp_automation/amazon_order_amounts.json
"""
import json, os, secrets, sys, urllib.request, uuid
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from deploy import req, BASE

SETS = {"ticket96673": [
    "206-4284510-8277166", "203-7533800-0944337", "206-5907884-3298762", "026-1495147-0274759", "202-1846773-9421110",
    "205-7534023-1128364", "026-2765429-8006746", "205-4879272-4276305", "206-1159522-1166703", "202-1471226-5387551",
    "205-7296790-6677128", "204-7833274-4125905", "202-1182211-7781108", "026-2401275-7268321", "202-1043540-0308309",
    "205-9473603-3980324"],
  "provisional": [
    "302-1384098-1922701", "112-7984895-3500211", "203-3289064-9573922", "026-9539138-1252325", "202-6920887-8201124",
    "204-7167877-5788323", "205-4957171-2043500", "206-4356607-5241947", "206-4024370-5485956", "202-3959062-4065931",
    "206-1758039-1879509", "204-5598673-1844325", "205-4867453-4821143", "205-9771697-0911567", "203-1847208-9749962",
    "113-6320930-1509026", "113-0500211-5829017", "113-6866828-8367439", "113-4605153-1191444", "113-1571712-9557066",
    "205-2503645-4485132", "206-5332698-6795554", "204-9558412-4593150", "205-1973774-7220300", "205-8321832-2303503",
    "205-9880732-0756312", "203-0064520-5542753", "203-9452963-3861145", "203-1978767-2701128", "026-6683770-1259520",
    "206-5714304-3026714", "203-3354464-9022741", "204-5452208-5464361", "203-6992903-4958726", "404-6366012-1505949",
    "114-3969817-5192249", "111-0478570-7147458", "503-0857646-9315854", "204-9743040-8074744", "114-0723053-7542666",
    "402-8370874-9425130", "111-0111785-8425819", "113-8847949-7208253", "114-8207897-5268218"]}
args = sys.argv[1:]
STATUS = "--status" in args
SET = args[args.index("--set") + 1] if "--set" in args else "failed27oct"
ids_given = [a for a in args if a[:1].isdigit()]
ORDERS = ids_given or SETS.get(SET) or [
    "028-8185696-1957919", "303-9673762-6880319", "302-9748957-6339562", "026-6482394-7533150", "202-7791547-6779557",
    "250-7798192-0913424", "203-0125023-3758713", "026-0759469-0009960", "026-4060243-2176339", "205-2692688-6689129",
    "402-4904684-4395566", "206-3630052-4536323", "205-1633505-0453149", "202-1227546-9240347", "204-7587254-4483557",
    "026-3777023-6947547", "205-7995486-0033115", "206-4282178-4369164", "204-5443313-0704360"]

tmpl = next(n for n in req("GET", "/workflows/HripqQEwqtvdLQ6q")["nodes"] if n["name"] == "Orders: get order items")
gi = json.loads(json.dumps(tmpl)); gi.update({"id": str(uuid.uuid4()), "name": "Get order items", "position": [440, 0]})
if STATUS:
    gi["parameters"]["workflowInputs"]["value"]["path"] = "={{ '/orders/v0/orders/' + encodeURIComponent($json.orderId) }}"
gi["parameters"]["mode"] = "each"  # one SP-API call per order (a single batched call returned only one result)
path = "claude-amz-order-check-" + secrets.token_hex(8)
split = ("const ids = " + json.dumps(ORDERS) + ";\n"
         "return ids.map(id => ({ json: { orderId: id, region: /^(250|503)-/.test(id) ? 'AU' : /^1\\d\\d-/.test(id) ? 'NA' : 'EU' } }));")
collect_status = """const pick = j => (j.data && j.data.payload) || (j.body && j.body.payload) || (j.response && j.response.payload) || j.payload || {};
return $input.all().map(it => { const o = pick(it.json); return { json: { orderId: String(it.json.path || '').split('/')[4] || '?', ok: it.json.ok,
  status: o.OrderStatus, channel: o.FulfillmentChannel, market: o.SalesChannel, purchased: o.PurchaseDate, updated: o.LastUpdateDate,
  total: o.OrderTotal, latestShip: o.LatestShipDate, raw: it.json.ok ? undefined : JSON.stringify(it.json).slice(0, 300) } }; });"""
collect = """const pick = j => (j.data && j.data.payload) || (j.body && j.body.payload) || (j.response && j.response.payload) || j.payload || {};
return $input.all().map(it => ({ json: { orderId: String(it.json.path || '').split('/')[4] || '?', ok: it.json.ok,
  items: (pick(it.json).OrderItems || []).map(o => ({ sku: o.SellerSKU, qty: o.QuantityOrdered, price: o.ItemPrice, tax: o.ItemTax, promoIds: o.PromotionIds,
    ship: o.ShippingPrice, shipTax: o.ShippingTax, promo: o.PromotionDiscount, promoTax: o.PromotionDiscountTax })),
  raw: JSON.stringify(it.json).slice(0, 300) } }));"""
wf = {"name": "TEMP Claude | Amazon order amounts check [READ ONLY]", "settings": {"executionOrder": "v1"},
      "nodes": [
          {"id": str(uuid.uuid4()), "name": "Webhook", "type": "n8n-nodes-base.webhook", "typeVersion": 2, "position": [0, 0],
           "webhookId": str(uuid.uuid4()),
           "parameters": {"httpMethod": "GET", "path": path, "responseMode": "lastNode", "responseData": "allEntries", "options": {}}},
          {"id": str(uuid.uuid4()), "name": "Order list", "type": "n8n-nodes-base.code", "typeVersion": 2, "position": [220, 0],
           "parameters": {"jsCode": split}},
          gi,
          {"id": str(uuid.uuid4()), "name": "Collect", "type": "n8n-nodes-base.code", "typeVersion": 2, "position": [660, 0],
           "parameters": {"jsCode": collect_status if STATUS else collect}}],
      "connections": {"Webhook": {"main": [[{"node": "Order list", "type": "main", "index": 0}]]},
                      "Order list": {"main": [[{"node": "Get order items", "type": "main", "index": 0}]]},
                      "Get order items": {"main": [[{"node": "Collect", "type": "main", "index": 0}]]}}}

wid = req("POST", "/workflows", wf)["id"]
try:
    req("POST", f"/workflows/{wid}/activate")
    with urllib.request.urlopen(BASE.split("/api/v1")[0] + "/webhook/" + path, timeout=300) as r:
        out = json.loads(r.read())
    out = out if isinstance(out, list) else [out]
finally:
    req("POST", f"/workflows/{wid}/deactivate")
    try:
        req("POST", f"/workflows/{wid}/archive")
    except Exception:
        pass
    print("temporary workflow", wid, "deactivated")

json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), f"amazon_{SET}{'_status' if STATUS else ''}.json"), "w"), indent=1)
if STATUS:
    from collections import Counter
    print(Counter(o.get("status") for o in out))
    for o in out:
        t = o.get("total") or {}
        print(f"{o['orderId']:22}{str(o.get('status')):16}{str(o.get('channel')):5}{str(o.get('market')):16} bought {str(o.get('purchased'))[:10]} total {t.get('Amount', '-')} {t.get('CurrencyCode', '')}{'  ERR ' + o['raw'] if o.get('raw') else ''}")
    sys.exit()
amt = lambda m: float((m or {}).get("Amount") or 0)
print(f"{'Amazon order':22}{'items':>8}{'item tax':>10}{'ship':>7}{'ship tax':>9}{'promo':>8}{'TOTAL':>9}  SKUs")
for o in out:
    its = o.get("items") or []
    if not its:
        print(o["orderId"], "NO ITEMS", o.get("raw")); continue
    p, t, s, st = (sum(amt(i.get(k)) for i in its) for k in ("price", "tax", "ship", "shipTax"))
    pr = sum(amt(i.get("promo")) + amt(i.get("promoTax")) for i in its)
    print(f"{o['orderId']:22}{p:>8.2f}{t:>10.2f}{s:>7.2f}{st:>9.2f}{-pr:>8.2f}{p + s - pr:>9.2f}  {', '.join(i.get('sku') or '?' for i in its)}")
