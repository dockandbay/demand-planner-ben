# Read-only: prints the BOM state for one kit and its PP on live.
import json, subprocess, sys, os
S = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def fl(m, p, b): return json.loads(subprocess.run([S + '/fl.sh', m, p, json.dumps(b)], capture_output=True, text=True).stdout)
kit, pp = sys.argv[1], sys.argv[2]
prods = {p['code']: p for p in fl('PUT', '/model/product.product/search_read', [[["code", "in", [kit, pp]]], None, None, None, ["code", "built_on_the_fly_bom"]])}
for code in (kit, pp):
    p = prods[code]
    links = fl('PUT', '/model/product.product-production.bom/search_read', [[["product", "=", p['id']]], None, None, None, ["bom", "sequence"]])
    boms = {b['id']: b for b in fl('PUT', '/model/production.bom/search_read', [[["id", "in", [l['bom'] for l in links]]], None, None, None, ["name", "active"]])}
    ins = fl('PUT', '/model/production.bom.input/search_read', [[["bom", "in", list(boms)]], None, None, None, ["bom", "product", "quantity"]])
    names = {q['id']: q['code'] for q in fl('PUT', '/model/product.product/search_read', [[["id", "in", list({i['product'] for i in ins})]], None, None, None, ["code"]])}
    print(f"{code}  (id {p['id']})  BOM Fulfil will use: {p['built_on_the_fly_bom']}")
    for l in sorted(links, key=lambda l: (l['sequence'] is None, l['sequence'] or 0)):
        b = boms.get(l['bom'], {})
        comp = ", ".join(f"{names[i['product']]} x{i['quantity']:g}" for i in ins if i['bom'] == l['bom'])
        print(f"   BOM {l['bom']:<5} seq {str(l['sequence']):<5} active {str(b.get('active')):<5}  inputs: {comp[:110]}")
