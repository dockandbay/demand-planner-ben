"""Read-only: every order line for a mapped set kit (UK/US/EU/AU) in a window, with how it exploded
(PP / singles / other) vs the BOM that was first at the time, and whether its shipment reached the 3PL.

usage: python3 -I set_orders_check.py --from 2026-10-20T20:20:00 [--to ...]   (times in UTC)
"""
import argparse
import collections
import datetime
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from pp_bom_flip import Fulfil, LINK  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("--from", dest="frm", required=True)
ap.add_argument("--to", default=None)
ap.add_argument("--detail", action="store_true")
args = ap.parse_args()

pmap = json.load(open(os.path.join(HERE, "prepack_map.json")))
kit_codes = [m + "-" + r["set"] for r in pmap for m in ("UK", "US", "EU", "AU")]
pp_of = {m + "-" + r["set"]: r["pp"] for r in pmap for m in ("UK", "US", "EU", "AU")}

ledger = [json.loads(l) for l in open(os.path.join(HERE, "ledger_live.jsonl"))]
timeline = collections.defaultdict(list)
for e in ledger:
    m = re.match(r"(?:revert [^:]+: )?([A-Z]{2}-[A-Z0-9-]+): (PP|singles) first", e.get("note", ""))
    if e["op"] == "write" and m:
        first = m.group(2)
        if e["run"].startswith("revert-"):
            first = "singles" if first == "PP" else "PP"
        at = datetime.datetime.fromisoformat(e["at"]).astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
        timeline[m.group(1)].append((at, first))


def expected(kit, when):
    first = "singles"
    for at, f in sorted(timeline.get(kit, [])):
        if at <= when:
            first = f
    return first


f = Fulfil("live", apply=False)
prods = {p["code"]: p["id"] for p in f.search_read("product.product", [["code", "in", kit_codes + list(set(pp_of.values()))]], ["code"])}
kit_by_id = {prods[c]: c for c in kit_codes if c in prods}
links = f.search_read(LINK, [["product", "in", list(kit_by_id)]], ["product", "bom"])
boms = {b["id"]: b for b in f.search_read("production.bom", [["id", "in", [l["bom"] for l in links]]], ["active"])}
inputs = collections.defaultdict(list)
for i in f.search_read("production.bom.input", [["bom", "in", list(boms)]], ["bom", "product"]):
    inputs[i["bom"]].append(i["product"])
singles_of = {}
for l in links:
    pp_id = prods.get(pp_of[kit_by_id[l["product"]]])
    if boms.get(l["bom"], {}).get("active") and inputs[l["bom"]] != [pp_id]:
        singles_of[l["product"]] = set(inputs[l["bom"]])

dom = [["product", "in", list(kit_by_id)], ["create_date", ">=", args.frm.replace("T", " ")]]
if args.to:
    dom.append(["create_date", "<", args.to.replace("T", " ")])
kit_lines = f.search_read("sale.line", dom, ["sale", "product", "quantity"])
sale_ids = sorted({l["sale"] for l in kit_lines})
sales = {s["id"]: s for s in f.search_read("sale.sale", [["id", "in", sale_ids]], ["number", "reference", "state", "create_date", "shipments", "warehouse", "channel"])} if sale_ids else {}
all_lines = f.search_read("sale.line", [["sale", "in", sale_ids]], ["sale", "product"]) if sale_ids else []
ship_ids = sorted({sh for s in sales.values() for sh in s["shipments"]})
ships = {s["id"]: s for s in f.search_read("stock.shipment.out", [["id", "in", ship_ids]],
         ["number", "state", "warehouse", "tpl_status", "sent_to_3pl_at", "acknowledged_by_3pl_at", "on_hold", "hold_reason"])} if ship_ids else {}
wh_code = {w["id"]: w["code"] for w in f.search_read("stock.location", [["type", "=", "warehouse"]], ["code"])}

rows = []
for kl in kit_lines:
    s = sales[kl["sale"]]
    kit = kit_by_id[kl["product"]]
    others = {l["product"] for l in all_lines if l["sale"] == s["id"] and l["id"] != kl["id"]}
    pp_id = prods.get(pp_of[kit])
    if pp_id in others:
        actual = "PP"
    elif singles_of.get(kl["product"]) and singles_of[kl["product"]] <= others:
        actual = "singles"
    elif s["state"] in ("draft", "quotation", "provisional"):
        actual = "not exploded yet"
    else:
        actual = "OTHER"
    exp = expected(kit, s["create_date"]["iso_string"][:19])
    shs = [ships[i] for i in s["shipments"] if i in ships]
    rows.append({
        "order": s["number"], "ref": s["reference"], "state": s["state"], "created": s["create_date"]["iso_string"][:16],
        "kit": kit, "qty": kl["quantity"], "expected": exp, "actual": actual,
        "ok": actual == exp or actual == "not exploded yet",
        "ship_wh": ",".join(sorted({wh_code.get(sh["warehouse"], str(sh["warehouse"])) for sh in shs})) or "-",
        "ship_state": ",".join(sorted({sh["state"] for sh in shs})) or "no shipment",
        "tpl": ",".join(sorted({str(sh["tpl_status"]) for sh in shs})) or "-",
        "sent": any(sh["sent_to_3pl_at"] for sh in shs),
        "hold": any(sh["on_hold"] for sh in shs),
    })

print(f"Window {args.frm} to {args.to or 'now'} UTC: {len(rows)} set lines on {len(sales)} orders")
print("Split:", dict(collections.Counter((r["expected"], r["actual"]) for r in rows)))
print("Shipment state:", dict(collections.Counter(r["ship_state"] for r in rows)))
print("3PL status:", dict(collections.Counter(r["tpl"] for r in rows)), "| sent_to_3pl_at set:", sum(r["sent"] for r in rows), "| on hold:", sum(r["hold"] for r in rows))
print("Warehouse:", dict(collections.Counter(r["ship_wh"] for r in rows)))
bad = [r for r in rows if not r["ok"]]
print("NOT AS EXPECTED:", len(bad))
for r in (rows if args.detail else bad):
    print(f"  {r['order']:<9} {r['ref']:<22} {r['created']} {r['kit']:<30} x{r['qty']:g} exp {r['expected']:<7} act {r['actual']:<8} "
          f"{r['ship_wh']:<14} {r['ship_state']:<10} tpl {r['tpl']:<12} sent {r['sent']} hold {r['hold']}")
