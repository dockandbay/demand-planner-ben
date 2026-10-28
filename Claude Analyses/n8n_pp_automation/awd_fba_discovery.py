"""READ ONLY discovery (Ben 28-Oct-26): Amazon AWD -> FBA US shipments that have no internal shipment in Fulfil.

AWD creates its FBA replenishment shipments already SHIPPED, so Fulfil's FBA import never sees them and US AWD
(Fulfil warehouse 36) is never reduced. This lists every US FBA inbound shipment updated since go-live, keeps those
shipped from an AWD site (ShipFromAddress IUSP / IUSJ, same rule as Diviyaj's 'Open shipment audit'), pulls their
items, and checks Fulfil for an internal shipment with that reference.

SP-API credentials live only in n8n, so this creates a TEMPORARY n8n workflow (webhook -> SP-API core sub-workflow,
GET only), calls it per page / per shipment, then deactivates and archives it. Nothing is written to Amazon or Fulfil.
Usage: python3 -I awd_fba_discovery.py [--since 2026-09-20]
Output: table on screen + awd_fba_discovery.json (input for the backfill dry run)
"""
import json, os, secrets, sys, time, urllib.parse, urllib.request, uuid
print = __import__("functools").partial(print, flush=True)
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "../pp_bom_flip"))
from deploy import req, BASE
from pp_bom_flip import Fulfil

SINCE = sys.argv[sys.argv.index("--since") + 1] if "--since" in sys.argv else "2026-09-20"
US = "ATVPDKIKX0DER"
AWD_SITES = ["IUSP", "IUSJ"]

tmpl = next(n for n in req("GET", "/workflows/HripqQEwqtvdLQ6q")["nodes"] if n["name"] == "Orders: get order items")
core = json.loads(json.dumps(tmpl))
core.update({"id": str(uuid.uuid4()), "name": "SP-API GET", "position": [440, 0]})
core["parameters"]["workflowInputs"]["value"].update({
    "region": "NA", "method": "GET",
    "path": "={{ $('Webhook').first().json.query.path }}",
    "query": "={{ JSON.parse($('Webhook').first().json.query.q || '{}') }}"})
hook = "claude-awd-discovery-" + secrets.token_hex(8)
wf = {"name": "TEMP Claude | AWD to FBA discovery [READ ONLY]", "settings": {"executionOrder": "v1"},
      "nodes": [
          {"id": str(uuid.uuid4()), "name": "Webhook", "type": "n8n-nodes-base.webhook", "typeVersion": 2, "position": [0, 0],
           "webhookId": str(uuid.uuid4()),
           "parameters": {"httpMethod": "GET", "path": hook, "responseMode": "lastNode", "responseData": "firstEntryJson", "options": {}}},
          {"id": str(uuid.uuid4()), "name": "Only GET fba inbound", "type": "n8n-nodes-base.code", "typeVersion": 2, "position": [220, 0],
           "parameters": {"jsCode": "const p = String($json.query.path || '');\nif (!p.startsWith('/fba/inbound/v0/shipment')) throw new Error('read-only proxy: path not allowed');\nreturn [{ json: {} }];"}},
          core],
      "connections": {"Webhook": {"main": [[{"node": "Only GET fba inbound", "type": "main", "index": 0}]]},
                      "Only GET fba inbound": {"main": [[{"node": "SP-API GET", "type": "main", "index": 0}]]}}}

URL = BASE.split("/api/v1")[0] + "/webhook/" + hook


def spapi(path, q):
    for attempt in range(4):
        u = URL + "?" + urllib.parse.urlencode({"path": path, "q": json.dumps(q)})
        with urllib.request.urlopen(u, timeout=120) as r:
            out = json.loads(r.read())
        if out.get("ok"):
            body = out.get("response") or out.get("data") or out.get("body") or {}
            return body.get("payload") or {}
        if "429" in json.dumps(out) or "QuotaExceeded" in json.dumps(out):
            time.sleep(3 * (attempt + 1)); continue
        raise RuntimeError(json.dumps(out)[:400])
    raise RuntimeError("throttled")


wid = req("POST", "/workflows", wf)["id"]
ships, items = [], {}
try:
    req("POST", f"/workflows/{wid}/activate")
    q = {"QueryType": "DATE_RANGE", "MarketplaceId": US, "LastUpdatedAfter": SINCE + "T00:00:00Z",
         "ShipmentStatusList": "SHIPPED,IN_TRANSIT,DELIVERED,CHECKED_IN,RECEIVING,CLOSED",
         "LastUpdatedBefore": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() - 300))}
    seen_pages = set()
    while True:
        p = spapi("/fba/inbound/v0/shipments", q)
        ships += p.get("ShipmentData") or []
        if not p.get("NextToken") or p["NextToken"] in seen_pages or len(seen_pages) > 200:
            break
        seen_pages.add(p["NextToken"])
        q = {"QueryType": "NEXT_TOKEN", "MarketplaceId": US, "NextToken": p["NextToken"]}
        time.sleep(1)
    site = lambda s: str((s.get("ShipFromAddress") or {}).get("Name") or "").strip().upper()
    awd = [s for s in ships if site(s) in AWD_SITES]
    print(len(ships), "US shipments,", len(awd), "from AWD sites; reading items...")
    for s in awd:
        # Next pages of items come from /shipmentItems?QueryType=NEXT_TOKEN; re-calling the by-id path with the
        # token returns the same page forever (28-Oct-26). Stop on a repeated token as a backstop.
        its, seen = [], set()
        p = spapi(f"/fba/inbound/v0/shipments/{s['ShipmentId']}/items", {"MarketplaceId": US})
        while True:
            its += p.get("ItemData") or []
            tok = p.get("NextToken")
            if not tok or tok in seen or len(seen) > 50:
                break
            seen.add(tok)
            time.sleep(1)
            p = spapi("/fba/inbound/v0/shipmentItems", {"QueryType": "NEXT_TOKEN", "MarketplaceId": US, "NextToken": tok})
        items[s["ShipmentId"]] = [{"sku": i.get("SellerSKU"), "fnsku": i.get("FulfillmentNetworkSKU"),
                                   "shipped": i.get("QuantityShipped"), "received": i.get("QuantityReceived")} for i in its]
        time.sleep(1)
finally:
    req("POST", f"/workflows/{wid}/deactivate")
    try:
        req("POST", f"/workflows/{wid}/archive")
    except Exception:
        pass
    print("temporary workflow", wid, "deactivated")

f = Fulfil("live", False, False)
codes = {p["code"]: p["id"] for p in f.search_read("product.product", [["active", "in", [True, False]]], ["code"]) if p["code"]}
sites = {}
for s in ships:
    sites[(s.get("ShipFromAddress") or {}).get("Name")] = sites.get((s.get("ShipFromAddress") or {}).get("Name"), 0) + 1
print("US shipments updated since", SINCE, ":", len(ships), "| ship-from sites:", sites)
rows = []
for s in sorted([s for s in ships if str((s.get("ShipFromAddress") or {}).get("Name") or "").strip().upper() in AWD_SITES], key=lambda s: s["ShipmentName"] or ""):
    sid = s["ShipmentId"]
    hit = f.search_read("stock.shipment.internal", [["reference", "ilike", f"%{sid}%"]], ["number", "state"])
    its = items.get(sid, [])
    unmatched = [i["sku"] for i in its if i["sku"] not in codes and (i["sku"] or "").replace("US-", "", 1) not in codes]
    rows.append({"shipment": sid, "name": s.get("ShipmentName"), "status": s.get("ShipmentStatus"), "from": s["ShipFromAddress"]["Name"],
                 "to_fc": s.get("DestinationFulfillmentCenterId"), "items": its, "fulfil": hit, "unmatched_skus": unmatched})
    print(f"{sid:14} {str(s.get('ShipmentStatus')):10} {s['ShipFromAddress']['Name']:5} -> {str(s.get('DestinationFulfillmentCenterId')):5} "
          f"{len(its):>3} SKUs {sum(i['shipped'] or 0 for i in its):>6} shipped {sum(i['received'] or 0 for i in its):>6} received | "
          f"Fulfil: {', '.join(h['number'] + ' ' + h['state'] for h in hit) or 'MISSING'}{' | UNMATCHED ' + ', '.join(unmatched) if unmatched else ''}")
json.dump({"since": SINCE, "shipments": rows}, open(os.path.join(HERE, "awd_fba_discovery.json"), "w"), indent=1)
miss = [r for r in rows if not r["fulfil"]]
print(f"\nAWD-origin shipments: {len(rows)}; missing in Fulfil: {len(miss)}; units shipped missing: "
      f"{sum(i['shipped'] or 0 for r in miss for i in r['items'])}")
