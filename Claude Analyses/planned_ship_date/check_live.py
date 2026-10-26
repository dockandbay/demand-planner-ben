# Read-only: compare live dx_function code and channel 7 link to live_after_pers_fix (27-Oct-26).
import sys, os
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(H, "../pp_bom_flip"))
from pp_bom_flip import Fulfil
f = Fulfil("live", False)
for r in f.search_read("dx_function", [["id", "in", [1, 3, 36, 37, 44, 48, 49]]], ["name", "code"]):
    exp = open(os.path.join(H, f"live_after_pers_fix/fn{r['id']}.py")).read()
    print(r["id"], r["name"], "MATCH" if r["code"].strip() == exp.strip() else "DIFFERS")
print(f.search_read("sale.channel", [["id", "in", [5, 6, 7, 8, 9, 10, 11]]], ["name", "order_customization_function"]))
