# Watches live imports after the personalised +1 fix (26-Oct-26). Puts a channel's previous function back
# (live_before_pers_fix/) on any blocked import; prints the first 2 orders per channel. Read-only except reverts.
import sys, os, time, datetime
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(H, "../pp_bom_flip"))
from pp_bom_flip import Fulfil
since = open(os.path.join(H, "pers_fix_deploy_time")).read().strip()
CH = {5: ("UK retail", 48), 6: ("US retail", 1), 7: ("EU retail", 49), 8: ("AU retail", 3),
      9: ("UK wholesale", 44), 10: ("US wholesale", 37), 11: ("EU wholesale", 36)}
f = Fulfil("live", False); reverted = set(); seen = {}
def d(x): return x.get("iso_string", "")[:16] if isinstance(x, dict) else x
def revert(ch, why):
    w = Fulfil("live", True, True); w.run_id = "psd-pers-fix-autorevert"; label, fn = CH[ch]
    w._log({"op": "write", "model": "dx_function", "id": fn, "field": "code", "old": "live_after_pers_fix",
            "new": f"live_before_pers_fix/fn{fn}.py", "note": f"auto-revert {label}: " + why})
    w._req("PUT", "/model/dx_function/write", [[fn], {"code": open(os.path.join(H, f"live_before_pers_fix/fn{fn}.py")).read()}])
    reverted.add(ch); print(datetime.datetime.utcnow().strftime("%H:%M"), "AUTO-REVERTED", label, why, flush=True)
for i in range(120):
    S = f.search_read("sale.sale", [["channel", "in", list(CH)], ["create_date", ">=", since]],
                      ["reference", "channel", "state", "exceptions", "create_date", "metadata", "shipments"])
    for s in S:
        if s["channel"] in reverted: continue
        if s["state"] == "failed" or (s["state"] == "draft" and s["exceptions"]):
            revert(s["channel"], f"{s['reference']} {s['state']}"); continue
        if s["id"] in seen or s["state"] in ("draft", "quotation"): continue
        if len([x for x in seen.values() if x == s["channel"]]) >= 2: continue
        seen[s["id"]] = s["channel"]
        sh = f.search_read("stock.shipment.out", [["id", "in", s["shipments"]]], ["number", "planned_date"]) if s["shipments"] else []
        print(f"{CH[s['channel']][0]:<13} {s['reference']:<14} {s['state']:<11} created {d(s['create_date'])}Z shipments {[(x['number'], d(x['planned_date'])) for x in sh]} err {(s.get('metadata') or {}).get('planned_ship_date_error')}", flush=True)
    if {5, 6, 8} <= set(seen.values()) and i >= 10: break
    time.sleep(30)
print("done; channels with orders:", sorted({CH[c][0] for c in seen.values()}), "reverted:", [CH[c][0] for c in reverted], flush=True)
