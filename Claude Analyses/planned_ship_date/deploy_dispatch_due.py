# 27-Oct-26 (Ben approved): create sale-order metafield dispatch_due (date), deploy the Dispatch Due block to the
# 7 order_import functions and relink fn49 to EU retail. Old code is in live_psd_removed/; ledger run dispatch-due-live.
import sys, os, datetime
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(H, "../pp_bom_flip"))
from pp_bom_flip import Fulfil
w = Fulfil("live", True, True); w.run_id = "dispatch-due-live"
ex = w.search_read("metafield.field", [["code", "=", "dispatch_due"]], ["id"])
mf = ex[0]["id"] if ex else w.create("metafield.field", {"code": "dispatch_due", "name": "Dispatch Due", "type": "date",
                                                          "model_name": "sale.sale",
                                                          "description": "Dispatch SLA: +1 retail, +5 personalised, +3 wholesale business days (set by order import functions)"},
                                      note="Dispatch Due metafield")
print("metafield", w.search_read("metafield.field", [["id", "=", mf]], ["code", "name", "type", "model_name"]), flush=True)
for fn in [1, 3, 36, 37, 44, 48, 49]:
    new = open(os.path.join(H, f"live_dispatch_due/fn{fn}.py")).read()
    old = "EU retail stub (unlinked)" if fn == 49 else f"live_psd_removed/fn{fn}.py"
    w._log({"op": "write", "model": "dx_function", "id": fn, "field": "code", "old": old,
            "new": f"live_dispatch_due/fn{fn}.py", "note": "add Dispatch Due metafield"})
    w._req("PUT", "/model/dx_function/write", [[fn], {"code": new}])
    got = w.search_read("dx_function", [["id", "=", fn]], ["code"])[0]["code"]
    print(fn, "verified" if got.strip() == new.strip() else "READBACK MISMATCH", flush=True)
w.write("sale.channel", [7], {"order_customization_function": 49}, note="relink fn49 (EU retail Dispatch Due)")
print("channel 7:", w.search_read("sale.channel", [["id", "=", 7]], ["order_customization_function"])[0])
open(os.path.join(H, "dispatch_due_deploy_time"), "w").write(datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"))
