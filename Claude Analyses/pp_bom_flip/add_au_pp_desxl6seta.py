"""One-off (Ben 21-Oct-26): create PP-TOWLB-DES-XL-6SETA in live Fulfil (copied from sibling
PP-TOWLB-DES-XL-4SETA, weight 3.0 kg) and count 1 unit into AU Coghlans (company 3).
Every write is logged to ledger_live.jsonl. Dry run unless --apply --confirm-live.
"""
import argparse
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from pp_bom_flip import Fulfil  # noqa: E402

CODE = "PP-TOWLB-DES-XL-6SETA"
COGHLANS_STORAGE = 27  # "Coghlan's - Storage Zone" under AUCOGHLANS (28)
AU_COMPANY = 3

ap = argparse.ArgumentParser()
ap.add_argument("--apply", action="store_true")
ap.add_argument("--confirm-live", action="store_true")
args = ap.parse_args()
f = Fulfil("live", args.apply, args.confirm_live)
f.run_id = "add-au-pp-" + f.run_id

existing = f.search_read("product.product", [["code", "=", CODE], ["active", "in", [True, False]]], ["id"])
if existing:
    sys.exit(f"{CODE} already exists: {existing}")

template = {"name": CODE, "account_category": 17, "accounts_category": True, "taxes_category": True}
variant = {"code": CODE, "default_uom": 1, "purchase_uom": 1, "sale_uom": 1, "type": "goods",
           "cost_price_method": "average", "country_of_origin": 44, "fulfil_strategy": "ship",
           "is_declarable": True, "purchasable": True, "sellable": True, "safety_stock_days": 10,
           "use_list_price_as_customs_value": True, "use_name_as_customs_description": True,
           "description": "BeachTwl XL 6 Set A*", "variant_name": "BeachTwl XL 6 Set A*",
           "long_description": "BeachTwl XL 6 Set A*", "weight": 3.0, "weight_uom": 2}
print("template:", template)
print("variant:", variant)
if not f.apply:
    sys.exit("dry run: nothing written")

tid = f.create("product.template", template, note=f"create template {CODE} (Ben 21-Oct-26)")
pid = f.create("product.product", dict(variant, template=tid), note=f"create product {CODE} 3.0 kg")
print("created template", tid, "product", pid)

inv = f.create("stock.inventory", {
    "location": COGHLANS_STORAGE, "company": AU_COMPANY, "type": "cycle", "empty_quantity": "keep",
    "reference": f"{CODE}: add 1 unit at Coghlans (Ben 21-Oct-26)",
    "lines": [["create", [{"product": pid, "quantity": 1, "expected_quantity": 0, "uom": 1}]]]},
    note=f"stock count +1 {CODE} at AU Coghlans")
for method in ("complete", "confirm"):
    f._req("PUT", f"/model/stock.inventory/{method}", [[inv]])
state = f.search_read("stock.inventory", [["id", "=", inv]], ["state"])[0]["state"]
f._log({"op": "note", "model": "stock.inventory", "id": inv, "note": f"count {inv} state {state}"})
print("stock count", inv, "state", state)
