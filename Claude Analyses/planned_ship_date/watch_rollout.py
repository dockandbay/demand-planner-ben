# Live rollout watcher (22-Oct-26). Auto-reverts a channel's function on any blocked import; logs each channel's
# first orders with line dates + shipment planned date. Read-only except reverts.
import sys,os,json,time,datetime
H=os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0,os.path.join(H,"../pp_bom_flip"))
from pp_bom_flip import Fulfil
R=json.load(open(os.path.join(H,"rollout.json"))); idx={m['fn']:m for m in json.load(open(os.path.join(H,"live_functions/index.json")))}
since=min(R['time'],open(os.path.join(H,"fn44_deploy_time")).read().strip())
CH={6:("US retail",1),8:("AU retail",3),10:("US wholesale",37),11:("EU wholesale",36),7:("EU retail",R['eu_fn']),9:("UK wholesale",44)}
f=Fulfil("live",False); reverted=set(); seen={}
def d(x): return (x or {}).get('iso_string','')[:16] if isinstance(x,dict) else x
def revert(ch,why):
    w=Fulfil("live",True,True); w.run_id="psd-rollout-autorevert"; label,fn=CH[ch]
    if ch==7:
        w.write("sale.channel",[7],{"order_customization_function":None},note="auto-revert EU retail: "+why)
    else:
        w._log({"op":"write","model":"dx_function","id":fn,"field":"code","old":"rollout candidate","new":f"fn{fn}_v{idx[fn]['version']}.py","note":f"auto-revert {label}: "+why})
        w._req("PUT","/model/dx_function/write",[[fn],{"code":open(os.path.join(H,f"live_functions/fn{fn}_v{idx[fn]['version']}.py")).read()}])
    reverted.add(ch); print(datetime.datetime.utcnow().strftime("%H:%M"),"AUTO-REVERTED",label,why,flush=True)
for i in range(120):
    S=f.search_read("sale.sale",[["channel","in",list(CH)],["create_date",">=",since]],["reference","channel","state","exceptions","create_date","metadata","shipments"])
    for s in S:
        if s['channel'] in reverted: continue
        if s['state']=='failed' or (s['state']=='draft' and s['exceptions']):
            revert(s['channel'],f"{s['reference']} {s['state']}"); continue
        if s['id'] in seen or s['state'] in ('draft','quotation'): continue
        if len([x for x in seen.values() if x==s['channel']])>=2: continue
        seen[s['id']]=s['channel']
        ls=f.search_read("sale.line",[["sale","=",s['id']],["type","=","line"]],["shipping_date"])
        sh=f.search_read("stock.shipment.out",[["id","in",s['shipments']]],["number","planned_date"]) if s['shipments'] else []
        print(f"{CH[s['channel']][0]:<13} {s['reference']:<14} {s['state']:<11} created {d(s['create_date'])}Z lines {[d(l['shipping_date']) for l in ls]} shipments {[(x['number'],d(x['planned_date'])) for x in sh]} err {(s.get('metadata') or {}).get('planned_ship_date_error')}",flush=True)
    if {6,8,7} <= set(seen.values()) and i>=10: break
    time.sleep(30)
print("done; channels with orders:",sorted({CH[c][0] for c in seen.values()}),"reverted:",[CH[c][0] for c in reverted],flush=True)
