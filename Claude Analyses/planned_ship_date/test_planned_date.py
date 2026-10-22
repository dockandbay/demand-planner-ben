"""Local tests for the generated planned-ship-date functions, run under a restricted builtins dict that mimics
Fulfil's function runtime, with the clock frozen at chosen UTC moments. Exit code 1 on any failure."""
import builtins
import copy
import datetime as real_dt
import json
import os
import sys
import types

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from planned_date_block import CONFIGS, inject  # noqa: E402

LIVE = os.path.join(HERE, "live_functions")
MISSING = ("any", "all", "sum", "min", "max", "sorted", "next", "enumerate", "zip", "map", "filter",
           "ValueError", "KeyError", "TypeError", "IndexError", "__import__")
fails = 0


def frozen_datetime_module(utc_now):
    class FakeDateTime(real_dt.datetime):
        @classmethod
        def utcnow(cls):
            return utc_now
    mod = types.ModuleType("datetime")
    mod.datetime, mod.date, mod.timedelta = FakeDateTime, real_dt.date, real_dt.timedelta
    return mod


def run(code, order, utc_now):
    real_mod = sys.modules["datetime"]
    sys.modules["datetime"] = frozen_datetime_module(utc_now)
    try:
        safe = {k: getattr(builtins, k) for k in dir(builtins) if k not in MISSING}
        # `from x import y` needs __import__; Fulfil allows datetime imports, so give a datetime-only importer.
        safe["__import__"] = lambda name, *a, **k: sys.modules[name] if name == "datetime" else (_ for _ in ()).throw(ImportError(name))
        ns = {"__builtins__": safe}
        exec(compile(code, "fn", "exec"), ns)
        return ns["order_import"](copy.deepcopy(order))
    finally:
        sys.modules["datetime"] = real_mod


def order(pers=False, line_date=None, start=None):
    line = {"sku": "TOWLB-CAB-LG-NAVY-R", "quantity": 1, "unit_price": "10", "tax_lines": [], "metadata": {}}
    if pers:
        line["metadata"] = {"Personalisation": "BEN"}
        line["product_options"] = [{"code": "personalisation", "value": "BEN"}]
    if line_date:
        line["shipping_date"] = line_date
    o = {"sale_lines": [line], "shipping_lines": [], "metadata": {}}
    if start:
        o["shipping_start_date"] = start
    return o


def check(name, got, want):
    global fails
    ok = got == want
    fails += not ok
    print(("  PASS " if ok else "  FAIL ") + name + ("" if ok else f"   got {got}  want {want}"))


def ship(r):
    return r["sale_lines"][0].get("shipping_date")


U = real_dt.datetime  # UTC moments
CASES = {
    # fn: list of (name, order kwargs, utc now, expected first-line date or None for untouched)
    1: [("Wed 10:00 CT retail -> Thu", {}, U(2026, 10, 21, 15), "2026-10-22"),
        ("Fri retail -> Mon", {}, U(2026, 10, 23, 15), "2026-10-26"),
        ("Sat retail -> Tue", {}, U(2026, 10, 24, 15), "2026-10-27"),
        ("Thu 22:00 CT is still Thu (03:00 UTC Fri) -> Fri", {}, U(2026, 10, 23, 3), "2026-10-23"),
        ("Wed before Thanksgiving -> Fri", {}, U(2026, 11, 25, 15), "2026-11-27"),
        ("personalised Wed -> +5 = next Wed", {"pers": True}, U(2026, 10, 21, 15), "2026-10-28"),
        ("later preorder line date kept", {"line_date": "2027-02-01"}, U(2026, 10, 21, 15), "2027-02-01")],
    3: [("Thu 10:00 Sydney retail -> Fri", {}, U(2026, 10, 21, 23), "2026-10-23"),
        ("01:00 Fri Sydney (14:00 UTC Thu) counts as Fri -> Mon", {}, U(2026, 10, 22, 14), "2026-10-26"),
        ("Mon before Australia Day (Tue 26 Jan 27) -> Wed", {}, U(2027, 1, 24, 23), "2027-01-27"),
        ("Thu before Good Friday 2027 -> Tue (Fri + Mon holidays)", {}, U(2027, 3, 24, 23), "2027-03-30"),
        ("personalised -> +5", {"pers": True}, U(2026, 10, 21, 23), "2026-10-29")],
    36: [("EU wholesale Wed -> +3 = Mon", {}, U(2026, 10, 21, 9), "2026-10-26"),
         ("EU wholesale over Ascension (Thu 6 May 27): Wed 5 -> Tue 11", {}, U(2027, 5, 5, 9), "2027-05-11"),
         ("EU wholesale over German Unity Day (Mon 3 Oct 22 style: Fri 2 Oct 26 -> Wed 7; 3 Oct 26 is Sat)", {}, U(2026, 10, 2, 9), "2026-10-07"),
         ("future ship date on order -> untouched", {"start": "2026-12-01", "line_date": "2026-12-01"}, U(2026, 10, 21, 9), "2026-12-01"),
         ("wholesale + personalised -> +5", {"pers": True}, U(2026, 10, 21, 9), "2026-10-28")],
    37: [("US wholesale Wed -> +3 = Mon", {}, U(2026, 10, 21, 15), "2026-10-26"),
         ("US wholesale Mon before Thanksgiving week: Mon 23 Nov -> Fri 27", {}, U(2026, 11, 23, 15), "2026-11-27"),
         ("no order date set and no line date -> set", {}, U(2026, 10, 21, 15), "2026-10-26")],
    44: [("UK wholesale Wed -> +3 = Mon", {}, U(2026, 10, 21, 9), "2026-10-26"),
         ("UK wholesale Thu 24 Dec 26 -> Thu 31 Dec (25 Fri, 28 Mon Boxing obs.)", {}, U(2026, 12, 24, 9), "2026-12-31"),
         ("BST end night: 00:30 UTC Sun 25 Oct = 01:30 BST Sun, counts from Mon -> Thu 29", {}, U(2026, 10, 25, 0, 30), "2026-10-29"),
         ("future ship date on order -> untouched", {"start": "2027-02-01", "line_date": "2027-02-01"}, U(2026, 10, 21, 9), "2027-02-01")],
}

index = {m["fn"]: m for m in json.load(open(os.path.join(LIVE, "index.json")))}
out_dir = os.path.join(HERE, "candidates")
os.makedirs(out_dir, exist_ok=True)
for fn, cfg in CONFIGS.items():
    base = open(os.path.join(LIVE, f"fn{fn}_v{index[fn]['version']}.py")).read()
    code = inject(base, cfg)
    open(os.path.join(out_dir, f"fn{fn}_candidate.py"), "w").write(code)
    print(f"fn {fn} {cfg['label']} ({cfg['tz']}, {cfg['holidays']}):")
    for name, kw, now, want in CASES.get(fn, []):
        r = run(code, order(**kw), now)
        check(name, ship(r), want)
        if r.get("metadata", {}).get("planned_ship_date_error"):
            check(name + " (no error noted)", r["metadata"]["planned_ship_date_error"], None)
        if r.get("exceptions"):
            check(name + " (no order exception)", r["exceptions"], [])

# England holidays by rule vs the hand-checked list in live function 48 (2027-2031).
print("England holidays by rule vs function 48 list:")
fn48 = open(os.path.join(LIVE, "fn48_v78.py")).read()
listed = set()
for line in fn48.splitlines():
    s = line.strip()
    if s.startswith("date(20") and "#" in s:
        y, m, d = [int(x) for x in s[5:s.index(")")].split(",")]
        if y >= 2027:
            listed.add(real_dt.date(y, m, d))
probe = inject("def order_import(order_data):\n    return order_data", {"label": "probe", "tz": "Europe/London", "holidays": "England", "wholesale": False})
probe = probe.replace("            return hol\n", "            order_data['_hol_' + str(year)] = list(hol)\n            return hol\n")
got = set()
for y in range(2027, 2032):
    for mth in range(1, 13):
        r = run(probe, {"sale_lines": [], "metadata": {}}, U(y, mth, 15, 9))
        for k, v in r.items():
            if k.startswith("_hol_"):
                got |= set(v)
got = {d for d in got if 2027 <= d.year <= 2031}
check("2027-2031 England holidays match the function 48 list", sorted(got ^ listed), [])

print("ALL PASS" if not fails else f"{fails} FAILED")
sys.exit(1 if fails else 0)
