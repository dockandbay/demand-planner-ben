"""Backfill Amazon AWD -> FBA US shipments missing from Fulfil (Ben approved 28-Oct-26).

Input: awd_fba_discovery.json (from awd_fba_discovery.py). Only shipments created on/after US go-live (22-Sep-26)
and with no internal shipment in Fulfil carrying that FBA shipment ID. For each one it creates an internal shipment
US AWD (storage) -> Amazon FBA - US (storage) via Transit, reference = FBA shipment ID, lines = Amazon QuantityShipped,
then moves it to SHIPPED (wait, assign, pack, ship); if Amazon has received every unit (received >= shipped) it is also set DONE.
Every write is ledgered (../pp_bom_flip/ledger_<env>.jsonl). Rollback: cancel the internal shipment.

usage: python3 -I awd_fba_backfill.py --env sandbox|live [--apply] [--confirm-live] [--only FBA...]
Without --apply it is a dry run (prints what it would create).
"""
import datetime, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "../pp_bom_flip"))
from pp_bom_flip import Fulfil

a = sys.argv[1:]
ENV = a[a.index("--env") + 1]
APPLY = "--apply" in a
ONLY = a[a.index("--only") + 1].split(",") if "--only" in a else None
REPAIR = "--repair" in a  # 28-Oct-26: first run created empty shells (lines sent as `moves`, which is read-only)
NOTE = ("Created by the AWD to FBA automation in n8n from Amazon shipment {ref} (shipped from Amazon AWD). "
        "Talk to Diviyaj or Ben for any questions or feedback.")
GOLIVE = "2026-09-22"
f = Fulfil(ENV, APPLY, "--confirm-live" in a); f.run_id = "awd-fba-backfill"

wh = {w["code"]: w for w in f.search_read("stock.location", [["code", "in", ["USAWD", "AMZ_FBA_US"]]], ["code", "storage_location"])}
transit = f.search_read("stock.location", [["name", "=", "Transit"], ["type", "=", "storage"]], ["id"])
assert len(wh) == 2 and transit, (wh, transit)
SRC, DST, TRANSIT = wh["USAWD"]["storage_location"], wh["AMZ_FBA_US"]["storage_location"], transit[0]["id"]


def created(name):  # "FBA ASDN (10/03/2026 19:39)-SCK4" (US names are month first)
    m = re.search(r"\((\d{2})/(\d{2})/(\d{4})", name or "")
    return f"{m.group(3)}-{m.group(1)}-{m.group(2)}" if m else None


plan = []
for s in json.load(open(os.path.join(HERE, "awd_fba_discovery.json")))["shipments"]:
    c = created(s["name"])
    if ONLY and s["shipment"] not in ONLY:
        continue
    if not c or c < GOLIVE:
        continue
    existing = f.search_read("stock.shipment.internal", [["reference", "=", s["shipment"]]], ["number", "moves", "state"])
    shells = [e for e in existing if not e["moves"]]
    if [e for e in existing if e["moves"]]:
        print(s["shipment"], "already in Fulfil, skipped"); continue
    if shells and not REPAIR:
        print(s["shipment"], "only an EMPTY shell in Fulfil", [e["number"] for e in shells], "(use --repair)"); continue
    lines = []
    for i in s["items"]:
        p = f.search_read("product.product", [["code", "=", i["sku"]]], ["default_uom"])
        assert p, f"{s['shipment']}: SKU {i['sku']} not in Fulfil"
        lines.append({"product": p[0]["id"], "uom": p[0]["default_uom"], "sku": i["sku"], "qty": i["shipped"], "received": i["received"] or 0})
    full = all(l["received"] >= l["qty"] for l in lines)
    plan.append({"ref": s["shipment"], "created": c, "status": s["status"], "lines": lines, "target": "done" if full else "shipped",
                 "shells": shells})

print(f"{ENV} {'APPLY' if APPLY else 'DRY RUN'}: {len(plan)} internal shipment(s) US AWD ({SRC}) -> Amazon FBA - US ({DST}) via Transit ({TRANSIT})")
for p in plan:
    print(f"  {p['ref']} created {p['created']} Amazon {p['status']:10} -> Fulfil {p['target']:7} "
          f"{'(replaces empty ' + ','.join(x['number'] for x in p['shells']) + ') ' if p['shells'] else ''}| " +
          ", ".join(f"{l['sku']} x{l['qty']} (rcvd {l['received']})" for l in p["lines"]))
if not APPLY:
    sys.exit()

for p in plan:
    start = datetime.date.fromisoformat(p["created"])
    sid = f.create("stock.shipment.internal", {
        "reference": p["ref"], "from_warehouse": wh["USAWD"]["id"], "to_warehouse": wh["AMZ_FBA_US"]["id"],
        "from_location": SRC, "to_location": DST, "transit_location": TRANSIT,
        "planned_start_date": p["created"], "planned_date": str(start + datetime.timedelta(days=7)),  # receive = start + 7 (Ben)
        "lines": [["create", [{"product": l["product"], "uom": l["uom"], "quantity": l["qty"]} for l in p["lines"]]]]},
        note=f"AWD->FBA backfill {p['ref']} (Amazon {p['status']})")
    chk = f.search_read("stock.shipment.internal", [["id", "=", sid]], ["number", "lines", "moves"])[0]
    assert chk["lines"] and chk["moves"], f"{p['ref']}: {chk['number']} has no lines, stopping before any status change"
    f._req("PUT", "/model/stock.shipment.internal/add_comment", {"id": sid, "message": NOTE.format(ref=p["ref"])})
    for sh in p["shells"]:  # empty shell from the first run: can't be cancelled once shipped/done, so mark it void
        f.write("stock.shipment.internal", [sh["id"]], {"reference": "VOID " + p["ref"]}, note="empty shell, replaced")
        f._req("PUT", "/model/stock.shipment.internal/add_comment", {"id": sh["id"], "message":
               f"VOID: created empty in error on 28-Oct-26 (no lines, no stock moved). Replaced by {chk['number']}. Ignore this transfer."})
    steps = ["wait", "assign_force", "pack", "ship"] + (["receive", "done"] if p["target"] == "done" else [])
    for step in steps:
        f._log({"op": "action", "model": "stock.shipment.internal", "id": sid, "action": step, "note": p["ref"]})
        try:
            f._req("PUT", f"/model/stock.shipment.internal/{step}", [[sid]])
        except Exception as e:
            body = e.read()[:300] if hasattr(e, "read") else str(e)
            print(f"  {p['ref']}: step {step} failed: {body}"); break
    r = f.search_read("stock.shipment.internal", [["id", "=", sid]], ["number", "state", "reference"])[0]
    print(f"  {p['ref']}: {r['number']} {r['state']}  https://{'dockandbay' if ENV == 'live' else 'dockandbay-sandbox'}.fulfil.io/client/#/model/stock.shipment.internal/{sid}")
