#!/usr/bin/env python3
"""Sandbox load of SKU_CHILD availability flags + AWD/weight/retail into planner.products.
Prod gets this via n8n from Airtable; here we emit UPDATEs from the CSV. Pipe to psql."""
import csv
CSV='/Users/bm/Downloads/SKU_CHILD-Grid view (3).csv'
AV=['available_uk_dtc','available_uk_fba','available_uk_b2b','available_us_dtc','available_us_fba',
    'available_us_b2b','available_eu_dtc','available_eu_fba','available_eu_b2b','available_au_dtc',
    'available_au_fba','available_ca_fba']
def num(v):
    v=(v or '').strip().replace(',','')
    try: return repr(float(v))
    except: return 'NULL'
def q(v):
    v=(v or '').strip()
    return "'"+v.replace("'","''")+"'" if v else 'NULL'
rows=list(csv.DictReader(open(CSV)))
skcol=list(rows[0].keys())[0]  # first col = SKU (has BOM)
out=['BEGIN;']
for r in rows:
    sku=(r[skcol] or '').strip()
    if not sku: continue
    sets=[c+'='+('true' if (r.get(c,'') or '').strip().upper()=='TRUE' else 'false') for c in AV]
    sets.append('awd_us='+num(r.get('inventory_us_awd')))
    sets.append('prod_weight_uk='+num(r.get('prod_weight_uk')))
    for col,src in [('uk_rt','uk_rt'),('us_rt','us_rt'),('eu_rt','eu_rt'),('au_rt','au_rt'),('ca_rt','ca_rt')]:
        sets.append(col+'='+num(r.get(src)))
    out.append('UPDATE planner.products SET '+', '.join(sets)+' WHERE sku='+q(sku)+';')
out.append('COMMIT;')
print('\n'.join(out))
