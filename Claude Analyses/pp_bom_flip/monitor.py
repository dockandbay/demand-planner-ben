"""Read-only check: did orders for the kits we changed explode the way the BOM order said they should?

For every sale line of a changed kit created since --since (default: last check, saved in
monitor_state.json), compares the actual explosion on the order (PP line vs single lines) with
the BOM that was first at that time according to ledger_live.jsonl. Prints a report and appends
it to monitor_log.md.

usage: python3 -I monitor.py [--since 2026-10-21T07:20:00] [--no-save]
"""
import argparse
import datetime
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from pp_bom_flip import Fulfil, LINK  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("--since")
ap.add_argument("--no-save", action="store_true")
args = ap.parse_args()

state_path = os.path.join(HERE, "monitor_state.json")
state = json.load(open(state_path)) if os.path.exists(state_path) else {}
since = args.since or state.get("last_check") or "2026-10-21T07:20:00"
now = datetime.datetime.now().replace(microsecond=0)

# Timeline per kit from the ledger: when did it become PP-first / singles-first?
ledger = [json.loads(l) for l in open(os.path.join(HERE, "ledger_live.jsonl"))]
timeline = {}
for e in ledger:
    m = re.match(r"(?:revert [^:]+: )?([A-Z]{2}-[A-Z0-9-]+): (PP|singles) first", e.get("note", ""))
    if e["op"] == "write" and m:
        kit, first = m.group(1), m.group(2)
        if e["run"].startswith("revert-"):
            first = "singles" if first == "PP" else "PP"
        # Ledger times are local; Fulfil create_date is UTC.
        at_utc = datetime.datetime.fromisoformat(e["at"]).astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
        events = timeline.setdefault(kit, [])
        if not events or events[-1] != (at_utc, first):
            events.append((at_utc, first))
kits = sorted(timeline)


def expected(kit, when):
    first = "singles"  # before we touched it
    for at, f in sorted(timeline.get(kit, [])):
        if at <= when:
            first = f
    return first


f = Fulfil("live", apply=False)
prods = {p["code"]: p for p in f.search_read("product.product", [["code", "in", kits]], ["code"])}
kit_by_id = {p["id"]: c for c, p in prods.items()}
links = f.search_read(LINK, [["product", "in", list(kit_by_id)]], ["product", "bom"])
inputs = f.search_read("production.bom.input", [["bom", "in", [l["bom"] for l in links]]], ["bom", "product"])
comp = {}
for l in links:
    ins = [i["product"] for i in inputs if i["bom"] == l["bom"]]
    comp.setdefault(l["product"], {})["pp" if len(ins) == 1 else "singles"] = set(ins)

# --since and the saved last_check are local time (this Mac is on AEDT); Fulfil filters in UTC.
since_utc = datetime.datetime.fromisoformat(since).astimezone(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
kit_lines = f.search_read("sale.line", [["product", "in", list(kit_by_id)], ["create_date", ">=", since_utc]],
                          ["sale", "product", "quantity"])
sales = {s["id"]: s for s in f.search_read("sale.sale", [["id", "in", list({l["sale"] for l in kit_lines})]],
                                           ["number", "reference", "state", "create_date", "lines", "shipments"])} if kit_lines else {}
all_lines = f.search_read("sale.line", [["sale", "in", list(sales)]], ["sale", "product", "quantity"]) if sales else []

results = []
for kl in kit_lines:
    sale = sales[kl["sale"]]
    kit = kit_by_id[kl["product"]]
    created = sale["create_date"]["iso_string"][:19]
    others = [l for l in all_lines if l["sale"] == sale["id"] and l["id"] != kl["id"]]
    pp_ids = comp.get(kl["product"], {}).get("pp", set())
    single_ids = comp.get(kl["product"], {}).get("singles", set())
    if any(l["product"] in pp_ids for l in others):
        actual = "PP"
    elif single_ids and all(any(l["product"] == s for l in others) for s in single_ids):
        actual = "singles"
    else:
        actual = "not exploded yet" if sale["state"] in ("draft", "quotation", "provisional") else "unknown"
    exp = expected(kit, created)
    ok = actual == exp or actual == "not exploded yet"
    note = ""
    if actual == "PP" and sale["shipments"]:
        mv = f.search_read("stock.move", [["shipment", "in", ["stock.shipment.out," + str(s) for s in sale["shipments"]]],
                                          ["product", "in", list(pp_ids)]], ["state"])
        note = "PP move " + ",".join(sorted({m["state"] for m in mv})) if mv else ""
    results.append({"sale": sale["number"], "ref": sale["reference"], "state": sale["state"], "created": created,
                    "kit": kit, "qty": kl["quantity"], "expected": exp, "actual": actual, "ok": ok, "note": note})

bad = [r for r in results if not r["ok"]]
lines = [f"## Check {now.isoformat(sep=' ')} (orders since {since})", "",
         f"Kits monitored: {len(kits)}. Orders with those kits: {len(results)}. "
         + ("ALL AS EXPECTED." if not bad else f"**{len(bad)} NOT AS EXPECTED.**"), ""]
if results:
    lines += ["| Order | Ref | State | Created (UTC) | Kit | Qty | Expected | Actual | Note |", "|---|---|---|---|---|---|---|---|---|"]
    for r in sorted(results, key=lambda r: r["created"]):
        flag = "" if r["ok"] else " ❌"
        lines.append(f"| {r['sale']} | {r['ref']} | {r['state']} | {r['created'][5:16]} | {r['kit']} | {r['qty']:g} | {r['expected']} | {r['actual']}{flag} | {r['note']} |")
lines.append("")
report = "\n".join(lines)
print(report)
with open(os.path.join(HERE, "monitor_log.md"), "a") as fh:
    fh.write(report + "\n")
if not args.no_save:
    tmp = state_path + ".tmp"
    with open(tmp, "w") as fh:
        json.dump({"last_check": now.isoformat()}, fh)
    os.replace(tmp, state_path)
