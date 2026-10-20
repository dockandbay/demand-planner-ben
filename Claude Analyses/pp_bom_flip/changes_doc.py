"""Rebuilds CHANGES_<env>.md from ledger_<env>.jsonl: every Fulfil change, newest run first, with how to undo it.

usage: python3 -I changes_doc.py live|sandbox
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
env = sys.argv[1]
path = os.path.join(HERE, f"ledger_{env}.jsonl")
entries = [json.loads(l) for l in open(path)] if os.path.exists(path) else []

runs = {}
for e in entries:
    runs.setdefault(e["run"], []).append(e)


def undo(e):
    if e["op"] == "write":
        return f"set `{e['field']}` back to `{e['old']}`"
    if e["op"] == "create":
        return "archive BOM (active = false)" if e["model"] == "production.bom" else "delete link"
    if e["op"] == "delete":
        return "recreate link " + json.dumps(e.get("old"))
    return "n/a"


out = [f"# PP BOM flip: Fulfil {env} change log", "",
       "Every change made by `pp_bom_flip.py` (and `revert.py`). Source of truth: "
       f"`ledger_{env}.jsonl`. Undo a run with `python3 -I revert.py --env {env} --run <run id> --apply"
       + (" --confirm-live" if env == "live" else "") + "` (dry run without `--apply`).", "",
       f"Total changes: {sum(1 for e in entries if e['op'] in ('write', 'create', 'delete'))} across {len(runs)} runs.", ""]
for run in sorted(runs, reverse=True):
    rows = runs[run]
    out += [f"## Run {run}", "", "| Time | What | Record | Change | Undo |", "|---|---|---|---|---|"]
    for e in rows:
        if e["op"] == "write":
            change = f"`{e['field']}`: `{e['old']}` -> `{e['new']}`"
            rec = f"{e['model']} {e['id']}"
        elif e["op"] == "create":
            change = "created"
            rec = f"{e['model']} {e['id']}"
        elif e["op"] == "delete":
            change = "deleted"
            rec = f"{e['model']} {e['ids']}"
        else:
            change = e["op"] + ": " + e.get("error", "")
            rec = f"{e.get('model')} {e.get('ids', e.get('id'))}"
        out.append(f"| {e['at'][11:16]} {e['at'][:10]} | {e.get('note', '')} | {rec} | {change} | {undo(e)} |")
    out.append("")
open(os.path.join(HERE, f"CHANGES_{env}.md"), "w").write("\n".join(out) + "\n")
print(f"CHANGES_{env}.md: {len(entries)} ledger entries, {len(runs)} runs")
