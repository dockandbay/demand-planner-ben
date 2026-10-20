"""PP prepack BOM flip: ship the prepack when the warehouse has it, singles when it does not.

Fulfil always explodes a kit with its lowest-sequence BOM (it ignores stock; proven in sandbox
20-Oct-26, support ticket being raised). So we choose the BOM ourselves by setting the sequence:
  PP available at the kit's warehouse >= threshold  ->  "1 x PP" BOM at sequence 10, singles at 20
  otherwise                                         ->  singles BOM at sequence 10, "1 x PP" at 20

Mapping: Horizon planner.prepack_map (PP sku -> set sku), exported to prepack_map.json.
Kits:    <market>-<set sku> for UK/US/EU/AU, each checked at its market warehouse.

THIS VERSION: writes are SANDBOX ONLY. --env live is a read-only dry run.

usage:
  python3 -I pp_bom_flip.py --env sandbox|live                    dry run (report only)
  python3 -I pp_bom_flip.py --env sandbox --apply [--setup]       write to sandbox
  --setup also creates missing "1 x PP" BOMs and deactivates PP's own built-on-the-fly BOM.
"""
import argparse
import csv
import datetime
import json
import math
import os
import subprocess
import sys
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ENV_FILE = "/Users/home/Documents/CLAUDE/horizon-demand-and-supply-planner/.env"

MARKET_WAREHOUSE_CODES = {
    "UK": ["UKILG"],
    "US": ["USGENEVA_STD", "USGENEVA-STD"],
    "EU": ["EUIFUL"],
    "AU": ["AUCOGHLANS"],
}
SEQ_FIRST, SEQ_SECOND = 10, 20
LINK = "product.product-production.bom"


class Fulfil:
    def __init__(self, env, apply, confirm_live=False):
        # Live writes approved by Ben 21-Oct-26 (setup + twice-daily flips, UK/US/EU).
        if apply and env == "live" and not confirm_live:
            sys.exit("live writes need --confirm-live")
        values = {}
        for raw in open(ENV_FILE):
            if "=" in raw and not raw.lstrip().startswith("#"):
                key, _, val = raw.strip().partition("=")
                values[key] = val.strip().strip("'\"")
        prefix = "FULFIL_SANDBOX_" if env == "sandbox" else "FULFIL_LIVE_"
        sub = values[prefix + "SUBDOMAIN"]
        if env == "sandbox" and sub != "dockandbay-sandbox":
            sys.exit("sandbox subdomain mismatch, refusing")
        self.base = "https://" + sub + ".fulfil.io/api/v2"
        self.key = values[prefix + "API_KEY"]
        self.apply = apply
        self.env = env
        self.run_id = datetime.datetime.now().strftime("%Y-%m-%d_%H%M%S")

    def _req(self, method, path, body=None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(self.base + path, data=data, method=method,
                                     headers={"X-API-KEY": self.key, "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            text = resp.read().decode()
        return json.loads(text) if text else None

    def search_read(self, model, domain, fields):
        out, offset = [], 0
        while True:
            page = self._req("PUT", f"/model/{model}/search_read", [domain, offset, 500, None, fields])
            out += page
            if len(page) < 500:
                return out
            offset += 500

    def warehouse_locations(self, warehouse_id):
        seen, frontier = [warehouse_id], [warehouse_id]
        while frontier:
            kids = [l["id"] for l in self.search_read("stock.location", [["parent", "in", frontier]], ["id"])]
            frontier = [k for k in kids if k not in seen]
            seen += frontier
        return seen

    def available_by_moves(self, product_ids, warehouse_id):
        # Live's quantity_available with a location context returns 0 for every product over the
        # API (checked 20-Oct-26), so derive stock from moves: done in - done out - open outgoing.
        locs = self.warehouse_locations(warehouse_id)
        stock = {pid: 0.0 for pid in product_ids}
        base = [["product", "in", product_ids]]
        for sign, domain in (
                (1, [["state", "=", "done"], ["to_location", "in", locs], ["from_location", "not in", locs]]),
                (-1, [["state", "=", "done"], ["from_location", "in", locs], ["to_location", "not in", locs]]),
                (-1, [["state", "in", ["draft", "waiting", "assigned"]], ["from_location", "in", locs], ["to_location", "not in", locs]])):
            for m in self.search_read("stock.move", base + domain, ["product", "quantity"]):
                stock[m["product"]] += sign * float(m["quantity"] or 0)
        return stock

    # Every write is recorded in ledger_<env>.jsonl BEFORE it is sent, with the old value read
    # back from Fulfil, so revert.py can undo any run. A failed write is marked so revert skips it.
    def _log(self, entry):
        entry.update({"run": self.run_id, "env": self.env, "at": datetime.datetime.now().isoformat(timespec="seconds")})
        with open(os.path.join(HERE, f"ledger_{self.env}.jsonl"), "a") as fh:
            fh.write(json.dumps(entry) + "\n")

    def write(self, model, ids, values, note=""):
        if not self.apply:
            return "dry-run"
        old = {r["id"]: r for r in self._req("PUT", f"/model/{model}/read", [ids, list(values)])}
        for rid in ids:
            for field, new in values.items():
                self._log({"op": "write", "model": model, "id": rid, "field": field,
                           "old": old.get(rid, {}).get(field), "new": new, "note": note})
        try:
            self._req("PUT", f"/model/{model}/write", [ids, values])
        except Exception as exc:
            self._log({"op": "write_failed", "model": model, "ids": ids, "error": str(exc)[:300], "note": note})
            raise
        return "written"

    def create(self, model, values, note=""):
        if not self.apply:
            return None
        new_id = self._req("POST", f"/model/{model}", [values])[0]["id"]
        self._log({"op": "create", "model": model, "id": new_id, "values": values, "note": note})
        return new_id

    def delete(self, model, ids, note=""):
        if not self.apply:
            return "dry-run"
        old = self._req("PUT", f"/model/{model}/read", [ids, ["product", "bom", "sequence"]]) if model == LINK else []
        self._log({"op": "delete", "model": model, "ids": ids, "old": old, "note": note})
        self._req("PUT", f"/model/{model}/delete", [ids])
        return "deleted"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--env", choices=["sandbox", "live"], required=True)
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--setup", action="store_true")
    ap.add_argument("--confirm-live", action="store_true")
    ap.add_argument("--markets", default="UK,US,EU,AU")
    ap.add_argument("--kits", default="", help="comma list of kit SKUs to limit the run to")
    ap.add_argument("--min-pp", type=float, default=1, help="PP first when at least this many available (Ben 21-Oct-26: 1, clear all prepack stock)")
    ap.add_argument("--cover-days", type=float, default=0, help="optionally also require PP to cover this many days of kit sales")
    args = ap.parse_args()

    f = Fulfil(args.env, args.apply, args.confirm_live)
    markets = [m.strip() for m in args.markets.split(",")]
    pmap = json.load(open(os.path.join(HERE, "prepack_map.json")))
    only_kits = {k.strip() for k in args.kits.split(",") if k.strip()}
    if only_kits:
        markets = sorted({k.split("-", 1)[0] for k in only_kits})
        pmap = [r for r in pmap if any(m + "-" + r["set"] in only_kits for m in markets)]

    warehouses = {}
    for market in markets:
        recs = f.search_read("stock.location", [["type", "=", "warehouse"], ["code", "in", MARKET_WAREHOUSE_CODES[market]]], ["code"])
        if recs:
            warehouses[market] = recs[0]["id"]

    pp_codes = [r["pp"] for r in pmap]
    kit_codes = [m + "-" + r["set"] for r in pmap for m in markets]
    products = {p["code"]: p for p in f.search_read(
        "product.product", [["code", "in", pp_codes + kit_codes]], ["code"])}

    kit_ids = [products[c]["id"] for c in kit_codes if c in products]
    pp_ids = [products[c]["id"] for c in pp_codes if c in products]
    links = f.search_read(LINK, [["product", "in", kit_ids]], ["product", "bom", "sequence"])
    pp_links = f.search_read(LINK, [["product", "in", pp_ids]], ["product", "bom"])
    bom_ids = sorted({l["bom"] for l in links + pp_links})
    boms = {b["id"]: b for b in f.search_read("production.bom", [["id", "in", bom_ids]], ["active", "is_built_on_the_fly"])}
    inputs = {}
    for i in f.search_read("production.bom.input", [["bom", "in", bom_ids]], ["bom", "product", "quantity"]):
        inputs.setdefault(i["bom"], []).append((i["product"], float(i["quantity"])))

    pp_stock = {market: f.available_by_moves(pp_ids, wh) for market, wh in warehouses.items()}

    since = (datetime.date.today() - datetime.timedelta(days=28)).isoformat()
    sold = {}
    for line in f.search_read("sale.line", [["product", "in", kit_ids], ["sale.sale_date", ">=", since],
                                            ["sale.state", "not in", ["cancel", "draft", "failed"]]], ["product", "quantity"]):
        sold[line["product"]] = sold.get(line["product"], 0) + float(line["quantity"] or 0)

    rows = []
    for r in pmap:
        pp = products.get(r["pp"])
        for market in markets:
            kit_code = market + "-" + r["set"]
            if only_kits and kit_code not in only_kits:
                continue
            kit = products.get(kit_code)
            row = {"kit": kit_code, "pp": r["pp"], "market": market}
            rows.append(row)
            if not kit or not pp or market not in warehouses:
                row["action"] = "skip: " + ("kit" if not kit else "PP" if not pp else "warehouse") + " not in Fulfil"
                continue
            kit_links = [l for l in links if l["product"] == kit["id"] and boms.get(l["bom"], {}).get("active")]
            pp_link = next((l for l in kit_links if inputs.get(l["bom"]) == [(pp["id"], 1.0)]), None)
            single_links = [l for l in kit_links if l is not pp_link]
            row["singles_bom"] = ",".join(str(l["bom"]) for l in single_links)
            if not single_links:
                row["action"] = "skip: no singles BOM on kit"
                continue
            pp_own_active = [l["bom"] for l in pp_links if l["product"] == pp["id"]
                             and boms.get(l["bom"], {}).get("active") and boms[l["bom"]].get("is_built_on_the_fly")]

            avail = pp_stock[market][pp["id"]]
            threshold = max(args.min_pp, math.ceil(args.cover_days * sold.get(kit["id"], 0) / 28.0))
            want_pp = avail >= threshold
            row.update({"pp_available": avail, "kit_sold_28d": sold.get(kit["id"], 0), "threshold": threshold})
            notes = []

            if want_pp and (pp_link is None or pp_own_active):
                if pp_own_active:
                    notes.append("PP own BOM off " + str(pp_own_active) + " (" + f.write("production.bom", pp_own_active, {"active": False}, note=f"{r['pp']} own BOM off (setup for {kit_code})") + ")"
                                 if args.setup else "needs setup: PP own BOM active " + str(pp_own_active))
                    if args.setup and f.apply:
                        for b in pp_own_active:
                            boms[b]["active"] = False
                if pp_link is None:
                    if args.setup and f.apply:
                        new_bom = f.create("production.bom", {
                            "name": kit_code + " from PP",
                            "is_built_on_the_fly": True,
                            "inputs": [["create", [{"product": pp["id"], "quantity": 1, "uom": 1}]]],
                            "outputs": [["create", [{"product": kit["id"], "quantity": 1, "uom": 1}]]]},
                            note=f"1 x PP BOM for {kit_code}")
                        link_id = f.create(LINK, {"product": kit["id"], "bom": new_bom, "sequence": SEQ_SECOND}, note=f"link PP BOM to {kit_code}")
                        pp_link = {"id": link_id, "bom": new_bom, "sequence": SEQ_SECOND}
                        notes.append("created PP BOM " + str(new_bom))
                    else:
                        notes.append("needs setup: create '1 x PP' BOM")
                if pp_link is None or (pp_own_active and not (args.setup and f.apply)):
                    want_pp = False
                    notes.append("kept singles")

            first = pp_link if want_pp else single_links[0]
            changes = [(l, SEQ_FIRST if l is first else SEQ_SECOND) for l in ([pp_link] if pp_link else []) + single_links]
            # A kit with only its singles BOM needs no ordering.
            changes = [(l, t) for l, t in changes if l["sequence"] != t] if pp_link else []
            row["now_first"] = "PP" if want_pp else "singles"
            if changes:
                result = [f.write(LINK, [l["id"]], {"sequence": t}, note=f"{kit_code}: {'PP' if want_pp else 'singles'} first (PP avail {avail:g}, threshold {threshold:g}), BOM {l['bom']}") for l, t in changes][0]
                notes.append("set " + row["now_first"] + " first (" + result + ")")
            row["action"] = "; ".join(notes) or "no change"

    stamp = datetime.datetime.now().strftime("%Y-%m-%d_%H%M")
    log_dir = os.path.join(HERE, "runs")
    os.makedirs(log_dir, exist_ok=True)
    log = os.path.join(log_dir, f"{stamp}_{args.env}_{'apply' if f.apply else 'dryrun'}.csv")
    cols = ["kit", "pp", "market", "pp_available", "kit_sold_28d", "threshold", "now_first", "action", "singles_bom"]
    with open(log, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)

    def count(pred):
        return sum(1 for r in rows if pred(r))
    print(f"env={args.env} apply={f.apply} setup={args.setup} warehouses={warehouses}")
    print(f"kits checked {count(lambda r: 'pp_available' in r)}, skipped {count(lambda r: r['action'].startswith('skip'))}; "
          f"PP first {count(lambda r: r.get('now_first') == 'PP')}, singles first {count(lambda r: r.get('now_first') == 'singles')}; "
          f"sequence changes {count(lambda r: 'first (' in r['action'])}, needs setup {count(lambda r: 'needs setup' in r['action'])}")
    for r in rows:
        if "first (" in r["action"] or "setup" in r["action"] or "created" in r["action"]:
            print(f"  {r['kit']:<32} PP avail {r.get('pp_available'):>6} thr {r.get('threshold'):>3}  {r['action']}")
    print("log:", log)
    if f.apply:
        subprocess.run([sys.executable, "-I", os.path.join(HERE, "changes_doc.py"), args.env], check=False)


if __name__ == "__main__":
    main()
