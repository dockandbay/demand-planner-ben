"""Read-only prototype of the n8n VAS check (Ben 27-Oct-26): UK ILG shipments of orders with a
personalisation line (PERSONALISE_1_3 / PERSONALISE_4_12) must have ILG Order Class = Ecom VAS.
usage: python3 -I vas_check.py [live|sandbox] [lookback_days]"""
import datetime
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "pp_bom_flip"))
from pp_bom_flip import Fulfil  # noqa: E402

env = sys.argv[1] if len(sys.argv) > 1 else "live"
days = int(sys.argv[2]) if len(sys.argv) > 2 else 14
f = Fulfil(env, False)
since = (datetime.datetime.utcnow() - datetime.timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")
field = f.search_read("metafield.field", [["code", "=", "fuse_order_class"], ["model_name", "=", "stock.shipment.out"]], ["choices"])[0]
choices = {c["id"]: c["name"] for c in f.search_read("metafield.field.choice", [["id", "in", field["choices"]]], ["name"])}
vas = [k for k, v in choices.items() if v == "Ecom VAS"][0]
wh = f.search_read("stock.location", [["code", "=", "UKILG"], ["type", "=", "warehouse"]], ["id"])[0]["id"]
prods = [p["id"] for p in f.search_read("product.product", [["code", "in", ["PERSONALISE_1_3", "PERSONALISE_4_12"]]], ["id"])]
lines = f.search_read("sale.line", [["product", "in", prods], ["create_date", ">=", since]], ["sale"])
sales = f.search_read("sale.sale", [["id", "in", list({l["sale"] for l in lines})]], ["number", "reference", "shipments"])
ship_ids = [s for x in sales for s in x["shipments"]]
ships = f.search_read("stock.shipment.out", [["id", "in", ship_ids], ["warehouse", "=", wh], ["state", "!=", "cancel"]],
                      ["number", "state", "tpl_status", "order_references"])
mv = f.search_read("metafield.value", [["field", "=", field["id"]], ["resource", "in", ["stock.shipment.out,%d" % s["id"] for s in ships]]],
                   ["resource", "value_choice"])
cls = {int(m["resource"].split(",")[1]): m for m in mv}
ok = fix = alert = 0
for s in sorted(ships, key=lambda x: x["number"]):
    m = cls.get(s["id"])
    cur = choices.get(m["value_choice"]) if m else None
    if m and m["value_choice"] == vas:
        ok += 1
        continue
    can_fix = s["state"] not in ("done", "packed") and s["tpl_status"] in (None, "waiting")
    fix += can_fix
    alert += not can_fix
    print(f"{s['number']} {s['order_references']:<12} {s['state']:<9} tpl {s['tpl_status']} class {cur} -> {'FIX' if can_fix else 'ALERT (already with ILG)'}")
print(f"{env}: {len(lines)} personalised lines since {since[:10]}, {len(ships)} UK ILG shipments, {ok} Ecom VAS, {fix} to fix, {alert} alert")
