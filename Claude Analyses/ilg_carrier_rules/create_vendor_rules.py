# John Lewis + Waitrose via ILG - VENDOR (Ben 27-Oct-26). Process: stock moves UK ILG -> ILG - VENDOR by internal
# shipment (rules 81/96 change owner to DOCKVENDOR), then the order ships from ILG - VENDOR.
# 1) Waitrose CS rule: copy of rule 88 (John Lewis) for Waitrose (party 84730): Order Class Wholesale, Owner DOCKVENDOR,
#    Route GB, Lane MAIN, carrier NETCOURIER "Hold to wait for collection instructions".
# 2) Routing rule on sale confirm: John Lewis or Waitrose orders on UK ILG -> ILG - VENDOR. Orders on China Port
#    (direct from factory) are left alone by the AND warehouse condition.
# Each rule is created inactive, read back, asserted, then activated. Ledgered to ../pp_bom_flip/ledger_live.jsonl.
# Rollback: set the rule inactive.
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../pp_bom_flip"))
from pp_bom_flip import Fulfil
f = Fulfil("live", True, True); f.run_id = "ilg-vendor-jl-waitrose-rules"
UKILG, VENDOR, JL, WAITROSE = 206, 214, 84736, 84730


def exists(name):
    return f.search_read("fulfil.automation.rule", [["name", "=", name], ["active", "in", [True, False]]], ["id"])


def readback(rid):
    C = f.search_read("fulfil.automation.rule.condition", [["rule", "=", rid]], ["type", "condition_blurb"])
    A = f.search_read("fulfil.automation.rule.action", [["rule", "=", rid]], ["action_blurb"])
    print("rule", rid)
    for c in C: print("  ", c["type"], c["condition_blurb"]["title"])
    for a in A: print("   ->", a["action_blurb"]["title"])
    return [(c["type"], c["condition_blurb"]["title"]) for c in C], [a["action_blurb"]["title"] for a in A]


# 1) Waitrose CS metafields + carrier (copy of 88)
NAME1 = "ILG CS: Waitrose Metafields & Carrier"
if exists(NAME1):
    print("exists:", NAME1)
else:
    src = f.search_read("fulfil.automation.rule", [["id", "=", 88]], ["applies_to", "triggers_on", "filter", "sequence"])[0]
    rid = f.create("fulfil.automation.rule", {"name": NAME1, "active": False, "applies_to": src["applies_to"],
                   "triggers_on": src["triggers_on"], "filter": src["filter"], "sequence": src["sequence"]})
    f.create("fulfil.automation.rule.condition", {"rule": rid, "type": "and", "parameter": "warehouse", "operator": "is", "value_warehouse": VENDOR})
    f.create("fulfil.automation.rule.condition", {"rule": rid, "type": "and", "parameter": "customer", "operator": "is", "value_customer": WAITROSE})
    for a in f.search_read("fulfil.automation.rule.action", [["rule", "=", 88]],
                           ["action", "value_metafield", "value_metafield_choice", "value_carrier", "value_carrier_service"]):
        vals = {"rule": rid, "action": a["action"]}
        for k in ("value_metafield", "value_metafield_choice", "value_carrier", "value_carrier_service"):
            if a[k]: vals[k] = a[k]
        f.create("fulfil.automation.rule.action", vals)
    C, A = readback(rid)
    assert ("and", "Customer is Waitrose") in C and ("and", "Warehouse is ILG - VENDOR") in C and len(C) == 2
    assert len(A) == 5 and any("Hold to wait" in t for t in A)
    f.write("fulfil.automation.rule", [rid], {"active": True}, note="activate after read-back")

# 2) Route John Lewis / Waitrose orders from UK ILG to ILG - VENDOR
NAME2 = "Key Accounts - John Lewis/Waitrose - Route UK ILG to ILG-VENDOR"
if exists(NAME2):
    print("exists:", NAME2)
else:
    rid = f.create("fulfil.automation.rule", {"name": NAME2, "active": False, "applies_to": "sale.sale",
                   "triggers_on": "sale.sale.confirm", "filter": "matching", "sequence": 10})
    f.create("fulfil.automation.rule.condition", {"rule": rid, "type": "and", "parameter": "warehouse", "operator": "is", "value_warehouse": UKILG})
    for p in (JL, WAITROSE):
        f.create("fulfil.automation.rule.condition", {"rule": rid, "type": "or", "parameter": "customer", "operator": "is", "value_customer": p})
    f.create("fulfil.automation.rule.action", {"rule": rid, "action": "set_warehouse", "value_warehouse": VENDOR})
    C, A = readback(rid)
    # stop (rule stays inactive) if Fulfil did not take the warehouse condition on a sale rule
    assert ("and", "Warehouse is UK ILG") in C, "warehouse condition not accepted on sale.sale; rule left INACTIVE"
    assert ("or", "Customer is John Lewis Ltd") in C and ("or", "Customer is Waitrose") in C and len(C) == 3
    assert A == ["Set warehouse on order (and lines) to ILG - VENDOR"]
    f.write("fulfil.automation.rule", [rid], {"active": True}, note="activate after read-back")

for n in (NAME1, NAME2):
    print(n, f.search_read("fulfil.automation.rule", [["name", "=", n], ["active", "in", [True, False]]], ["active"]))
