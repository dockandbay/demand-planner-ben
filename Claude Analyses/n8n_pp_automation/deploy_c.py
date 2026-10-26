"""Create (or update) workflow C in n8n and activate it. Key from ../../.env, never printed."""
import json, os, sys, urllib.request
ENV = dict(l.strip().split("=", 1) for l in open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../.env")) if "=" in l and not l.startswith("#"))
BASE, KEY = ENV["N8N_API_URL"].strip('"'), ENV["N8N_API_KEY"].strip('"')
def req(method, path, body=None):
    r = urllib.request.Request(BASE + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                               headers={"X-N8N-API-KEY": KEY, "Content-Type": "application/json", "Accept": "application/json"})
    with urllib.request.urlopen(r, timeout=60) as resp:
        return json.loads(resp.read() or "{}")
H = os.path.dirname(os.path.abspath(__file__))
ids = json.load(open(os.path.join(H, "n8n_ids.json")))
if __name__ == "__main__":
    wf = json.load(open(os.path.join(H, "workflow_C.json")))
    if ids.get("C"):
        out = req("PUT", f"/workflows/{ids['C']}", wf)
    else:
        out = req("POST", "/workflows", wf); ids["C"] = out["id"]; json.dump(ids, open(os.path.join(H, "n8n_ids.json"), "w"))
    if "--activate" in sys.argv:
        req("POST", f"/workflows/{ids['C']}/activate")
    w = req("GET", f"/workflows/{ids['C']}")
    print(ids["C"], w["name"], "active", w["active"], "nodes", len(w["nodes"]))
