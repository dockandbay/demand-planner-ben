# UK ILG: Europe destinations get NETCOURIER DPD EU Road (Ben 27-Oct-26). Before this, non-UK shipments out of ILG
# reached Snap with no shipping method (rules 77/78/94/95 only cover Amazon.co.uk). Creates the rule inactive,
# reads it back, then activates. Also fixes CS64030 (EU retail to CH, carrier ifulfillment, sending_error).
# Ledgered to ../pp_bom_flip/ledger_live.jsonl. Rollback: set rule inactive (or delete it); CS64030 old values in ledger.
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../pp_bom_flip"))
from pp_bom_flip import Fulfil
f = Fulfil("live", True, True); f.run_id = "ilg-europe-dpd-rule"
UKILG, NETCOURIER, DPD_EU_ROAD = 206, 7, 667
NAME = "UKILG Carrier Selection - Europe DPD EU Road"
CODES = ["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL",
         "PT","RO","SK","SI","ES","SE","CH","LI","NO","IS"]
cty = {c["code"]: c["id"] for c in f.search_read("country.country", [["code","in",CODES]], ["code"])}
assert len(cty) == len(CODES), set(CODES) - set(cty)
if f.search_read("fulfil.automation.rule", [["name","=",NAME],["active","in",[True,False]]], ["id"]):
    sys.exit("rule already exists")
rid = f.create("fulfil.automation.rule", {"name": NAME, "active": False, "applies_to": "stock.shipment.out",
      "triggers_on": "stock.shipment.out.wait", "filter": "matching", "sequence": 10})
f.create("fulfil.automation.rule.condition", {"rule": rid, "type": "and", "parameter": "warehouse", "operator": "is", "value_warehouse": UKILG})
for c in CODES:
    f.create("fulfil.automation.rule.condition", {"rule": rid, "type": "or", "parameter": "destination_country",
             "operator": "is", "value_destination_country": cty[c]})
f.create("fulfil.automation.rule.action", {"rule": rid, "action": "change_carrier_on_shipment",
         "value_carrier": NETCOURIER, "value_carrier_service": DPD_EU_ROAD})
C = f.search_read("fulfil.automation.rule.condition", [["rule","=",rid]], ["type","condition_blurb"])
A = f.search_read("fulfil.automation.rule.action", [["rule","=",rid]], ["action_blurb"])
print("rule", rid, "conditions", len(C), "actions", [a["action_blurb"]["title"] for a in A])
print("  and:", [c["condition_blurb"]["title"] for c in C if c["type"] == "and"])
print("  or :", len([c for c in C if c["type"] == "or"]), "countries")
assert len(C) == 1 + len(CODES) and len(A) == 1 and "DPD EU Road" in A[0]["action_blurb"]["title"]
f.write("fulfil.automation.rule", [rid], {"active": True}, note="activate after read-back")
print("active:", f.search_read("fulfil.automation.rule", [["id","=",rid]], ["active"]))
# CS64030: EU retail order to CH via UK ILG carried the EU 3PL carrier (ifulfillment) and failed to send
f.write("stock.shipment.out", [64030], {"carrier": NETCOURIER, "carrier_service": DPD_EU_ROAD}, note="EU retail to CH via UK ILG had ifulfillment carrier")
f.write("stock.shipment.out", [64030], {"tpl_status": "waiting"}, note="re-queue for ILG push after carrier fix")
print(f.search_read("stock.shipment.out", [["id","=",64030]], ["number","carrier","carrier_service","tpl_status","state"]))
