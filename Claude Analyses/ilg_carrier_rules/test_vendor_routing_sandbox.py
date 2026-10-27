# SANDBOX ONLY (Ben 27-Oct-26): does a sale.sale rule accept "warehouse is UK ILG" as a condition?
# Creates the routing rule in sandbox, then 4 test orders on dockandbay-uk-ws, confirms them and reads the warehouse:
#   JL on UK ILG -> expect ILG - VENDOR; Waitrose on UK ILG -> expect ILG - VENDOR;
#   JL on China Port -> expect China Port (untouched); other customer on UK ILG -> expect UK ILG.
# Test orders are cancelled afterwards where Fulfil allows. Ledgered to ../pp_bom_flip/ledger_sandbox.jsonl.
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../pp_bom_flip"))
from pp_bom_flip import Fulfil
f = Fulfil("sandbox", True); f.run_id = "sandbox-vendor-routing-test"
loc = {l["code"]: l["id"] for l in f.search_read("stock.location", [["code", "in", ["UKILG", "ILG-VENDOR", "CHP"]]], ["code"])}
UKILG, VENDOR, CHP = loc["UKILG"], loc["ILG-VENDOR"], loc["CHP"]
JL, WAITROSE, CHANNEL = 84736, 84730, 9
NAME = "Key Accounts - John Lewis/Waitrose - Route UK ILG to ILG-VENDOR"

rule = f.search_read("fulfil.automation.rule", [["name", "=", NAME], ["active", "in", [True, False]]], ["id"])
if rule:
    rid = rule[0]["id"]
else:
    rid = f.create("fulfil.automation.rule", {"name": NAME, "active": False, "applies_to": "sale.sale",
                   "triggers_on": "sale.sale.confirm", "filter": "matching", "sequence": 10})
    f.create("fulfil.automation.rule.condition", {"rule": rid, "type": "and", "parameter": "warehouse", "operator": "is", "value_warehouse": UKILG})
    for p in (JL, WAITROSE):
        f.create("fulfil.automation.rule.condition", {"rule": rid, "type": "or", "parameter": "customer", "operator": "is", "value_customer": p})
    f.create("fulfil.automation.rule.action", {"rule": rid, "action": "set_warehouse", "value_warehouse": VENDOR})
    f.write("fulfil.automation.rule", [rid], {"active": True}, note="sandbox test")
for c in f.search_read("fulfil.automation.rule.condition", [["rule", "=", rid]], ["type", "parameter", "value_warehouse", "condition_blurb"]):
    print("cond", c["type"], c["parameter"], c["value_warehouse"], c["condition_blurb"]["title"])
for a in f.search_read("fulfil.automation.rule.action", [["rule", "=", rid]], ["action_blurb"]):
    print("action", a["action_blurb"]["title"])

prod = f.search_read("product.product", [["code", "like", "TEATWL-%"]], ["code", "default_uom"])[0]
other = f.search_read("sale.sale", [["channel", "=", CHANNEL], ["party", "not in", [JL, WAITROSE]]], ["party"])[-1]["party"]
addr = lambda p: f.search_read("party.address", [["party", "=", p]], ["id"])[0]["id"]
cases = [("JL on UK ILG", JL, UKILG, VENDOR), ("Waitrose on UK ILG", WAITROSE, UKILG, VENDOR),
         ("JL on China Port", JL, CHP, CHP), ("Other on UK ILG", other, UKILG, UKILG)]
names = {UKILG: "UK ILG", VENDOR: "ILG - VENDOR", CHP: "China Port"}
for label, party, wh, expect in cases:
    a = addr(party)
    sid = f.create("sale.sale", {"party": party, "channel": CHANNEL, "warehouse": wh, "invoice_address": a,
                   "shipment_address": a, "reference": "CLAUDE TEST vendor routing",
                   "lines": [["create", [{"product": prod["id"], "quantity": 1, "unit": prod["default_uom"], "unit_price": "10", "warehouse": wh}]]]},
                   note="sandbox test order")
    try:
        f._req("PUT", "/model/sale.sale/quote", [[sid]])
        f._req("PUT", "/model/sale.sale/confirm", [[sid]])
    except Exception as e:
        print(label, "workflow error:", str(getattr(e, "read", lambda: b"")() or e)[:300])
    s = f.search_read("sale.sale", [["id", "=", sid]], ["number", "state", "warehouse", "lines"])[0]
    lw = {l["warehouse"] for l in f.search_read("sale.line", [["sale", "=", sid]], ["warehouse"])}
    ok = s["warehouse"] == expect and lw == {expect}
    print(f"{label:22} {s['number']:9} {s['state']:11} order wh {names.get(s['warehouse'], s['warehouse'])}, lines {[names.get(w, w) for w in lw]}, expected {names[expect]}: {'PASS' if ok else 'FAIL'}")
    try:
        f._req("PUT", "/model/sale.sale/cancel", [[sid]])
    except Exception:
        pass
