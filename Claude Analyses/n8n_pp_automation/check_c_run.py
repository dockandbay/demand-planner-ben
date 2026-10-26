"""Wait for the next finished execution of workflow C after a given time and print per-node item counts,
the Decide summary and the email subject. usage: python3 -I check_c_run.py <utc iso start>"""
import json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from deploy_c import req, ids  # noqa
start = sys.argv[1]
for _ in range(60):
    ex = req("GET", f"/executions?workflowId={ids['C']}&limit=5&includeData=true").get("data", [])
    ex = [e for e in ex if e.get("startedAt", "") >= start and e.get("finished") is not None and e.get("status") not in ("running", "waiting", "new")]
    if ex:
        e = ex[0]; print("execution", e["id"], e["status"], e["startedAt"], e.get("stoppedAt"))
        rd = e["data"]["resultData"]
        if rd.get("error"): print("ERROR", rd["error"].get("message"), rd["error"].get("node", {}).get("name") if isinstance(rd["error"].get("node"), dict) else "")
        for n, runs in rd["runData"].items():
            items = runs[-1].get("data", {}).get("main", [[]])
            cnt = [len(b or []) for b in items]
            err = runs[-1].get("error", {}).get("message") if runs[-1].get("error") else ""
            print(f"  {n:<32} items {cnt} {err}")
        for n in ("Decide", "Build email"):
            if n in rd["runData"]:
                j = rd["runData"][n][-1]["data"]["main"][0][0]["json"]
                print(n, json.dumps({k: (v if not isinstance(v, list) else f"{len(v)} rows: " + ", ".join(r.get("shipment", "") for r in v[:10])) for k, v in j.items() if k != "html"})[:1500])
        break
    time.sleep(20)
else:
    print("no finished execution yet")
