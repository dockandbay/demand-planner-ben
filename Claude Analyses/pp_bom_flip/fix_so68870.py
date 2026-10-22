"""One-off (Ben 22-Oct-26): SO68870 has a PP-TEATWL-MD-5SET-CULDEL line with no stock (oversold).
Option B: add the kit's 5 singles (linked to the kit line, same tax/warehouse), process, THEN cancel the
PP line (cancelling first would cancel the whole order). Every step is logged to ledger_live.jsonl."""
import json, os, sys, urllib.request, urllib.error
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from pp_bom_flip import Fulfil
SALE, KIT_LINE, PP_LINE = 300187, 607341, 607345
SINGLES = [(259, "9.38"), (260, "9.38"), (261, "9.38"), (258, "9.37"), (264, "9.37")]  # DINPRTY CTCHDAY GRTFROM KTCHDISC SHRIMP
f = Fulfil("live", True, True); f.run_id = "fix-so68870-" + f.run_id

def sale():
    return f._req("PUT", "/model/sale.sale/read", [[SALE], ["state", "untaxed_amount", "tax_amount", "total_amount", "shipments", "lines"]])[0]
s0 = sale(); print("before:", s0["state"], s0["untaxed_amount"]["decimal"], s0["tax_amount"]["decimal"], s0["total_amount"]["decimal"], "shipments", s0["shipments"])
assert s0["state"] == "processing" and s0["total_amount"]["decimal"] == "56.26", "order not in expected state"
existing = f.search_read("sale.line", [["sale", "=", SALE], ["product", "in", [p for p, _ in SINGLES]]], ["id"])
assert not existing, f"singles already on order: {existing}"

for pid, price in SINGLES:
    lid = f.create("sale.line", {"sale": SALE, "product": pid, "quantity": 1, "unit": 1, "warehouse": 206, "parent": KIT_LINE,
                                 "origin": f"sale.line,{KIT_LINE}", "delivery_mode": "ship", "taxes": [["add", [3]]],
                                 "unit_price": {"__class__": "Decimal", "decimal": price}, "description": "Culinary Delights set (singles, replaces PP line)"},
                   note=f"SO68870 add single product {pid} @ {price} (replaces oversold PP line)")
    print("added line", lid, pid, price)
new = f.search_read("sale.line", [["sale", "=", SALE], ["product", "in", [p for p, _ in SINGLES]]], ["amount"])
net = sum(float(l["amount"]["decimal"]) for l in new)
print("new lines net:", round(net, 2))
if round(net, 2) != 46.88:
    sys.exit("STOP: new lines do not total 46.88; PP line NOT cancelled")

f._req("PUT", "/model/sale.sale/process", [[SALE]])
f._log({"op": "note", "model": "sale.sale", "id": SALE, "note": "SO68870 processed to create shipment for singles"})
s1 = sale(); print("after add+process:", s1["state"], s1["untaxed_amount"]["decimal"], "shipments", s1["shipments"])
if s1["state"] != "processing":
    sys.exit("STOP: order not processing after adding lines; PP line NOT cancelled")

def call(path, body):
    req = urllib.request.Request(f.base + path, data=json.dumps(body).encode(), method="PUT", headers={"X-API-KEY": f.key, "Content-Type": "application/json"})
    try: return json.loads(urllib.request.urlopen(req, timeout=120).read().decode() or "null")
    except urllib.error.HTTPError as e: return {"HTTP": e.code, "body": e.read().decode()[:400]}
ctx = {"active_id": SALE, "active_ids": [SALE], "active_model": "sale.sale"}
sid = call("/wizard/sale.wizard_order_modification/create", [{}])[0]
d = call("/wizard/sale.wizard_order_modification/execute", [sid, {}, "action", ctx])["view"]["defaults"]
a = {k: v for k, v in d.items() if "." not in k}; a.update({"action": "cancel_line", "line": PP_LINE})
f._log({"op": "cancel_line", "model": "sale.line", "id": PP_LINE, "note": "SO68870 cancel oversold PP-TEATWL-MD-5SET-CULDEL line (after singles added)"})
print("cancel PP line:", call("/wizard/sale.wizard_order_modification/execute", [sid, {"action": a}, "check_shipment", ctx]))
s2 = sale(); print("after:", s2["state"], s2["untaxed_amount"]["decimal"], s2["tax_amount"]["decimal"], s2["total_amount"]["decimal"], "shipments", s2["shipments"])
for sh in f.search_read("stock.shipment.out", [["id", "in", s2["shipments"]]], ["number", "state", "tpl_status", "on_hold"]):
    print("  shipment", sh)
