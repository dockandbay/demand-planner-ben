"""Runs the Dispatch Due functions under the restricted runtime harness (test_planned_date.py) and checks the
metafield value, that shipping dates are untouched, and that a later shipping_start_date wins. Exit 1 on any failure."""
import datetime as dt
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import test_planned_date as T  # noqa: E402

WHOLESALE = {36, 37, 44}
# utc now -> (plain, personalised, wholesale); AU is a day ahead on the Friday-evening case
CASES = {
    dt.datetime(2026, 10, 26, 11, 0): {"*": ("2026-10-27", "2026-11-02", "2026-10-29")},
    dt.datetime(2026, 10, 24, 12, 0): {"*": ("2026-10-27", "2026-11-02", "2026-10-29")},
    dt.datetime(2026, 10, 30, 20, 0): {"*": ("2026-11-02", "2026-11-06", "2026-11-04"), 3: ("2026-11-03", "2026-11-09", None)},
}
fails = 0


def due(r):
    for m in r.get("metafields") or []:
        if m.get("code") == "dispatch_due":
            return m.get("value")


for fn in [1, 3, 36, 37, 44, 48, 49]:
    code = open(os.path.join(HERE, "live_dispatch_due", f"fn{fn}.py")).read()
    for now, exp in CASES.items():
        e = exp.get(fn, exp["*"])
        plain = T.run(code, T.order(), now)
        pers = T.run(code, T.order(pers=True), now)
        later = T.run(code, T.order(start="2026-12-15"), now)
        want = (e[2], e[1]) if fn in WHOLESALE else (e[0], e[1])
        got = (due(plain), due(pers), due(later))
        errs = [x for x in [(r.get("metadata") or {}).get("dispatch_due_error") for r in (plain, pers, later)] if x]
        untouched = plain["sale_lines"][0].get("shipping_date") is None and pers["sale_lines"][0].get("shipping_date") is None
        ok = got == (want[0], want[1], "2026-12-15") and not errs and untouched
        fails += not ok
        print(f"fn{fn} {now:%a %d-%b %H:%M}Z plain {got[0]} pers {got[1]} future-start {got[2]} {'OK' if ok else 'FAIL want ' + str(want) + ' ' + str(errs) + ' untouched=' + str(untouched)}")
print("FAILURES", fails)
sys.exit(1 if fails else 0)
