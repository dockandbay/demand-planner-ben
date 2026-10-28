"""READ ONLY Amazon check (Ben 28-Oct-26): what Amazon says each failed-import order is worth (item price, tax,
shipping, promotions), to compare with Fulfil's "Order total mismatch".

SP-API credentials live only in n8n, so this creates a TEMPORARY n8n workflow (webhook -> SP-API core sub-workflow
GET /orders/v0/orders/{id}/orderItems), calls it once, then deactivates and archives it. Nothing is written to Amazon
or Fulfil. Usage: python3 -I amazon_order_amounts_check.py [order ids...]  (defaults to the 27-Oct failed orders)
Output: table on screen + ../../Claude Analyses/n8n_pp_automation/amazon_order_amounts.json
"""
import json, os, secrets, sys, urllib.request, uuid
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from deploy import req, BASE

ORDERS = sys.argv[1:] or [
    "028-8185696-1957919", "303-9673762-6880319", "302-9748957-6339562", "026-6482394-7533150", "202-7791547-6779557",
    "250-7798192-0913424", "203-0125023-3758713", "026-0759469-0009960", "026-4060243-2176339", "205-2692688-6689129",
    "402-4904684-4395566", "206-3630052-4536323", "205-1633505-0453149", "202-1227546-9240347", "204-7587254-4483557",
    "026-3777023-6947547", "205-7995486-0033115", "206-4282178-4369164", "204-5443313-0704360"]

tmpl = next(n for n in req("GET", "/workflows/HripqQEwqtvdLQ6q")["nodes"] if n["name"] == "Orders: get order items")
gi = json.loads(json.dumps(tmpl)); gi.update({"id": str(uuid.uuid4()), "name": "Get order items", "position": [440, 0]})
gi["parameters"]["mode"] = "each"  # one SP-API call per order (a single batched call returned only one result)
path = "claude-amz-order-check-" + secrets.token_hex(8)
split = ("const ids = " + json.dumps(ORDERS) + ";\n"
         "return ids.map(id => ({ json: { orderId: id, region: id.startsWith('250-') ? 'AU' : 'EU' } }));")
collect = """const pick = j => (j.data && j.data.payload) || (j.body && j.body.payload) || (j.response && j.response.payload) || j.payload || {};
return $input.all().map(it => ({ json: { orderId: String(it.json.path || '').split('/')[4] || '?', ok: it.json.ok,
  items: (pick(it.json).OrderItems || []).map(o => ({ sku: o.SellerSKU, qty: o.QuantityOrdered, price: o.ItemPrice, tax: o.ItemTax,
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
           "parameters": {"jsCode": collect}}],
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

json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "amazon_order_amounts.json"), "w"), indent=1)
amt = lambda m: float((m or {}).get("Amount") or 0)
print(f"{'Amazon order':22}{'items':>8}{'item tax':>10}{'ship':>7}{'ship tax':>9}{'promo':>8}{'TOTAL':>9}  SKUs")
for o in out:
    its = o.get("items") or []
    if not its:
        print(o["orderId"], "NO ITEMS", o.get("raw")); continue
    p, t, s, st = (sum(amt(i.get(k)) for i in its) for k in ("price", "tax", "ship", "shipTax"))
    pr = sum(amt(i.get("promo")) + amt(i.get("promoTax")) for i in its)
    print(f"{o['orderId']:22}{p:>8.2f}{t:>10.2f}{s:>7.2f}{st:>9.2f}{-pr:>8.2f}{p + s - pr:>9.2f}  {', '.join(i['sku'] or '?' for i in its)}")
