"""Runs the fixed live functions under the restricted runtime harness from test_planned_date.py and checks a
personalised order gets the same planned date as a plain one (26-Oct-26 fix). Exit 1 on any failure."""
import datetime as dt
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import test_planned_date as T  # noqa: E402  (its module-level tests also run on import)

fails = 0
CASES = [dt.datetime(2026, 10, 26, 11, 0), dt.datetime(2026, 10, 24, 12, 0), dt.datetime(2026, 10, 30, 20, 0)]
for fn in [1, 3, 36, 37, 44, 48, 49]:
    code = open(os.path.join(HERE, "live_after_pers_fix", f"fn{fn}.py")).read()
    for now in CASES:
        plain = T.run(code, T.order(), now)
        pers = T.run(code, T.order(pers=True), now)
        p, q = plain["sale_lines"][0].get("shipping_date"), pers["sale_lines"][0].get("shipping_date")
        err = (pers.get("metadata") or {}).get("planned_ship_date_error")
        ok = p == q and p is not None and not err
        fails += not ok
        print(f"fn{fn} {now:%a %d-%b %H:%M}Z plain {p} personalised {q} {'OK' if ok else 'FAIL ' + str(err)}")
print("FAILURES", fails)
sys.exit(1 if fails or T.fails else 0)
