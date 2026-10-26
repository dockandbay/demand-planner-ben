"""Release personalised shipments held by the +5 planned date (Ben approved 26-Oct-26).

Step 1: set ILG order class (metafield fuse_order_class, field 74) to Ecom VAS (choice 46) where it is Ecom.
Step 2: set planned_date to today so the 3PL push picks the shipments up.
Every write goes to ledger_live.jsonl in this folder (old value read back first) so it can be reverted.
usage: python3 -I release.py --confirm-live [--only CS62482]
"""
import argparse
import datetime
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "pp_bom_flip"))
import pp_bom_flip  # noqa: E402

pp_bom_flip.HERE = HERE  # ledger lives in this folder, not the BOM flip one

SHIPMENTS = ["CS62482", "CS62524", "CS62705", "CS62756", "CS62849", "CS63160", "CS63177",
             "CS63264", "CS63522", "CS63606", "CS63805", "CS63405", "CS63532", "CS63858"]
ORDER_CLASS_FIELD, ECOM, ECOM_VAS = 74, 44, 46
TODAY = "2026-10-26"

ap = argparse.ArgumentParser()
ap.add_argument("--confirm-live", action="store_true")
ap.add_argument("--only", nargs="*")
args = ap.parse_args()
f = pp_bom_flip.Fulfil("live", apply=True, confirm_live=args.confirm_live)

ships = f.search_read("stock.shipment.out", [["number", "in", args.only or SHIPMENTS]],
                      ["number", "state", "planned_date", "tpl_status", "order_references"])
for s in ships:
    if s["state"] != "assigned" or s["tpl_status"] != "waiting":
        print(s["number"], "skipped: state", s["state"], "tpl", s["tpl_status"])
        continue
    oc = f.search_read("metafield.value", [["resource", "=", "stock.shipment.out,%d" % s["id"]],
                                          ["field", "=", ORDER_CLASS_FIELD]], ["value_choice"])
    if oc and oc[0]["value_choice"] == ECOM and s["order_references"].startswith("UK-"):
        f.write("metafield.value", [oc[0]["id"]], {"value_choice": ECOM_VAS},
                note=s["number"] + " " + s["order_references"] + ": ILG order class Ecom -> Ecom VAS")
        print(s["number"], "order class -> Ecom VAS")
    f.write("stock.shipment.out", [s["id"]], {"planned_date": TODAY},
            note=s["number"] + " " + s["order_references"] + ": release personalised shipment held by +5 planned date")
    print(s["number"], s["order_references"], "planned date", s["planned_date"], "->", TODAY)
