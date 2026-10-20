"""Undo changes recorded in ledger_<env>.jsonl, newest first. Dry run unless --apply.

usage:
  python3 -I revert.py --env live --run 2026-10-21_093000            show what would be undone
  python3 -I revert.py --env live --run 2026-10-21_093000 --apply --confirm-live
  python3 -I revert.py --env live --all --apply --confirm-live       undo everything ever done
Reverts are themselves written to the ledger (run id "revert-<time>"), so a revert can be undone too.
"""
import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from pp_bom_flip import Fulfil, LINK  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("--env", choices=["sandbox", "live"], required=True)
ap.add_argument("--run", action="append", default=[])
ap.add_argument("--all", action="store_true")
ap.add_argument("--apply", action="store_true")
ap.add_argument("--confirm-live", action="store_true")
args = ap.parse_args()
if not args.run and not args.all:
    sys.exit("give --run <id> (repeatable) or --all")

entries = [json.loads(l) for l in open(os.path.join(HERE, f"ledger_{args.env}.jsonl"))]
failed = {(e["model"], tuple(e["ids"])) for e in entries if e["op"] == "write_failed"}
todo = [e for e in entries if e["op"] in ("write", "create", "delete")
        and (args.all or e["run"] in args.run) and not e["run"].startswith("revert-")]
todo = [e for e in todo if not (e["op"] == "write" and (e["model"], (e["id"],)) in failed)]

f = Fulfil(args.env, args.apply, args.confirm_live)
f.run_id = "revert-" + f.run_id
print(f"{'APPLY' if args.apply else 'DRY RUN'}: undoing {len(todo)} changes, newest first")
for e in reversed(todo):
    note = f"revert {e['run']}: {e.get('note', '')}"
    if e["op"] == "write":
        print(f"  {e['model']} {e['id']}: {e['field']} {e['new']} -> {e['old']}  ({e.get('note', '')})")
        f.write(e["model"], [e["id"]], {e["field"]: e["old"]}, note=note)
    elif e["op"] == "create" and e["model"] == "production.bom":
        print(f"  production.bom {e['id']}: archive  ({e.get('note', '')})")
        f.write("production.bom", [e["id"]], {"active": False}, note=note)
    elif e["op"] == "create" and e["model"] == LINK:
        print(f"  {LINK} {e['id']}: delete  ({e.get('note', '')})")
        f.delete(LINK, [e["id"]], note=note)
    elif e["op"] == "delete" and e["model"] == LINK:
        for old in e.get("old") or []:
            print(f"  {LINK}: recreate {old}")
            f.create(LINK, {"product": old["product"], "bom": old["bom"], "sequence": old["sequence"]}, note=note)
if args.apply:
    os.system(f'"{sys.executable}" -I "{os.path.join(HERE, "changes_doc.py")}" {args.env}')
