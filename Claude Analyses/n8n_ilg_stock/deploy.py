"""Create (or update) workflow D or E in n8n. The n8n API key comes from ../../.env and is never printed. The HORIZON x-webhook-secret
is copied at deploy time from the existing 'Horizon — Preorders sync' workflow (4PUj4kBcQaswZlKH), so it is never written to disk.
usage: python3 -I deploy.py D|E [--activate]"""
import json, os, sys, urllib.request
H = os.path.dirname(os.path.abspath(__file__))
ENV = dict(l.strip().split("=", 1) for l in open(os.path.join(H, "../../.env")) if "=" in l and not l.startswith("#"))
BASE, KEY = ENV["N8N_API_URL"].strip('"'), ENV["N8N_API_KEY"].strip('"')
SECRET_SOURCE = "4PUj4kBcQaswZlKH"


def req(method, path, body=None):
    r = urllib.request.Request(BASE + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                               headers={"X-N8N-API-KEY": KEY, "Content-Type": "application/json", "Accept": "application/json"})
    with urllib.request.urlopen(r, timeout=60) as resp:
        return json.loads(resp.read() or "{}")


def hz_secret():
    w = req("GET", f"/workflows/{SECRET_SOURCE}")
    for n in w["nodes"]:
        for p in ((n.get("parameters") or {}).get("headerParameters") or {}).get("parameters", []):
            if p.get("name") == "x-webhook-secret" and p.get("value"):
                return p["value"]
    raise SystemExit("could not find the HORIZON secret in " + SECRET_SOURCE)


if __name__ == "__main__":
    T = "E" if "E" in sys.argv[1:] else "D"
    ids_path = os.path.join(H, "n8n_ids.json")
    ids = json.load(open(ids_path)) if os.path.exists(ids_path) else {}
    wf = json.load(open(os.path.join(H, f"workflow_{T}.json")))
    sec = hz_secret()
    for n in wf["nodes"]:
        if n["name"] == "Settings":
            n["parameters"]["jsonOutput"] = n["parameters"]["jsonOutput"].replace("__HZ_SECRET__", sec)
    body = {k: wf[k] for k in ("name", "nodes", "connections", "settings")}
    if ids.get(T):
        out = req("PUT", f"/workflows/{ids[T]}", body)
    else:
        out = req("POST", "/workflows", body); ids[T] = out["id"]; json.dump(ids, open(ids_path, "w"), indent=1)
    if "--activate" in sys.argv:
        req("POST", f"/workflows/{ids[T]}/activate")
    w = req("GET", f"/workflows/{ids[T]}")
    print(ids[T], w["name"], "active", w["active"], "nodes", len(w["nodes"]))
