#!/usr/bin/env python3
"""Sandbox-only reload of planner.deposits from Ben's working DEPOSITS-and-OTHER CSV.
Live deposits come from the ERP via n8n — this just seeds the sandbox with realistic data.
TRUNCATEs and reloads; reference is no longer the key (surrogate id), so blanks/dups are fine.
Emits SQL to stdout (no DB driver needed) — pipe to psql."""
import csv, datetime

CSV = '/Users/bm/Downloads/WORKING - DEPOSITS and OTHER.csv'

def pdate(s):
    s = (s or '').strip()
    if not s:
        return None
    for fmt in ('%d-%b-%y', '%d-%b-%Y', '%Y-%m-%d'):
        try:
            return datetime.datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None

def pnum(s):
    s = (s or '').strip().replace(',', '')
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None

def q(v):  # SQL literal
    if v is None:
        return 'NULL'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"

out = ['BEGIN;', 'TRUNCATE planner.deposits RESTART IDENTITY;']
for x in csv.DictReader(open(CSV)):
    vals = [
        (x['DEPOSIT REF'].strip() or None),
        (x['SUPPLIER'].strip() or None),
        (x['PROD #'].strip() or None),
        (x['COUNTRY'].strip() or None),
        (x['DESCRIPTION'].strip() or None),
        x['DEPOSIT?'].strip().upper() == 'TRUE',
        pnum(x['AMOUNT']),
        pdate(x['DATE DUE']),
        pdate(x['DATE LIKELY PAY']),
        pdate(x['ESTIMATED PAY DATE']),
        pdate(x['DATE PAID']),
        pnum(x['XERO FX']),
        (x['XERO ACCOUNT CODE'].strip() or None),
    ]
    out.append(
        "INSERT INTO planner.deposits (reference,supplier_name,prod_no,country,description,"
        "is_deposit,amount,date_due,date_likely_pay,estimated_pay_date,date_paid,xero_fx,"
        "xero_account_code) VALUES (" + ",".join(q(v) for v in vals) + ");")
out.append('COMMIT;')
print("\n".join(out))
