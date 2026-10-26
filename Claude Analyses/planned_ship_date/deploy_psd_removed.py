# 27-Oct-26 (Ben approved): remove planned ship date from all 7 order_import functions and unlink fn49 from EU retail.
# Old code is in live_after_pers_fix/; every write is ledgered in pp_bom_flip/ledger_live.jsonl (run psd-removed-live).
import sys, os, datetime
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(H, "../pp_bom_flip"))
from pp_bom_flip import Fulfil
w = Fulfil("live", True, True); w.run_id = "psd-removed-live"
for fn in [1, 3, 36, 37, 44, 48]:
    new = open(os.path.join(H, f"live_psd_removed/fn{fn}.py")).read()
    w._log({"op": "write", "model": "dx_function", "id": fn, "field": "code", "old": f"live_after_pers_fix/fn{fn}.py",
            "new": f"live_psd_removed/fn{fn}.py", "note": "remove planned ship date"})
    w._req("PUT", "/model/dx_function/write", [[fn], {"code": new}])
    got = w.search_read("dx_function", [["id", "=", fn]], ["code"])[0]["code"]
    print(fn, "verified" if got.strip() == new.strip() else "READBACK MISMATCH", flush=True)
w.write("sale.channel", [7], {"order_customization_function": None}, note="unlink fn49 (EU retail planned ship date only)")
print("channel 7:", w.search_read("sale.channel", [["id", "=", 7]], ["order_customization_function"])[0])
open(os.path.join(H, "psd_removed_deploy_time"), "w").write(datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"))
