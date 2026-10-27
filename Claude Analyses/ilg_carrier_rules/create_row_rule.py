# UK ILG: rest-of-world destinations get NETCOURIER DHL (Ben 27-Oct-26). Companion to rule 102 (Europe -> DPD EU Road).
# Fulfil has no "destination country is not" precedent in our rules, so this lists every country except the UK,
# Channel Islands, Isle of Man and the 31 rule-102 countries as OR conditions. Creates inactive, reads back, activates.
# Ledgered to ../pp_bom_flip/ledger_live.jsonl. Rollback: set the rule inactive.
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../pp_bom_flip"))
from pp_bom_flip import Fulfil
f = Fulfil("live", True, True); f.run_id = "ilg-row-dhl-rule"
UKILG, NETCOURIER, DHL = 206, 7, 668
NAME = "UKILG Carrier Selection - Rest of World DHL"
EXCLUDE = ["GB","JE","GG","IM",
           "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL",
           "PT","RO","SK","SI","ES","SE","CH","LI","NO","IS"]
allc = f.search_read("country.country", [], ["code"])
row = sorted((c for c in allc if c["code"] and c["code"] not in EXCLUDE), key=lambda c: c["code"])
assert len({c["code"] for c in allc} & set(EXCLUDE)) == len(EXCLUDE)
if f.search_read("fulfil.automation.rule", [["name","=",NAME],["active","in",[True,False]]], ["id"]):
    sys.exit("rule already exists")
rid = f.create("fulfil.automation.rule", {"name": NAME, "active": False, "applies_to": "stock.shipment.out",
      "triggers_on": "stock.shipment.out.wait", "filter": "matching", "sequence": 10})
f.create("fulfil.automation.rule.condition", {"rule": rid, "type": "and", "parameter": "warehouse", "operator": "is", "value_warehouse": UKILG})
for c in row:
    f.create("fulfil.automation.rule.condition", {"rule": rid, "type": "or", "parameter": "destination_country",
             "operator": "is", "value_destination_country": c["id"]})
f.create("fulfil.automation.rule.action", {"rule": rid, "action": "change_carrier_on_shipment",
         "value_carrier": NETCOURIER, "value_carrier_service": DHL})
C = f.search_read("fulfil.automation.rule.condition", [["rule","=",rid]], ["type","condition_blurb"])
A = f.search_read("fulfil.automation.rule.action", [["rule","=",rid]], ["action_blurb"])
print("rule", rid, "conditions", len(C), "actions", [a["action_blurb"]["title"] for a in A])
print("  and:", [c["condition_blurb"]["title"] for c in C if c["type"] == "and"])
print("  or :", len([c for c in C if c["type"] == "or"]), "countries")
assert len(C) == 1 + len(row) and len(A) == 1 and "DHL" in A[0]["action_blurb"]["title"]
f.write("fulfil.automation.rule", [rid], {"active": True}, note="activate after read-back")
print("active:", f.search_read("fulfil.automation.rule", [["id","=",rid]], ["active"]))
