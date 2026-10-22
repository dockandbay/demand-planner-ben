# Watches sandbox UK retail imports after the self-test deploy. Reverts fn1 on the first failed/blocked import;
# stops after 3 orders carry psd_test metadata. Read-only except the revert.
import sys,os,json,time
sys.path.insert(0,os.path.join(os.path.dirname(os.path.abspath(__file__)),"../pp_bom_flip"))
from pp_bom_flip import Fulfil
H=os.path.dirname(os.path.abspath(__file__))
since=open(os.path.join(H,"deploy_time")).read().strip()
f=Fulfil("sandbox",False)
def revert(why):
    w=Fulfil("sandbox",True); w.run_id="psd-selftest-revert"
    w._log({"op":"write","model":"dx_function","id":1,"field":"code","old":"selftest","new":"sandbox_fn1_original.py","note":"auto-revert: "+why})
    w._req("PUT","/model/dx_function/write",[[1],{"code":open(os.path.join(H,"sandbox_fn1_original.py")).read()}])
    print("REVERTED:",why)
for i in range(240):
    S=f.search_read("sale.sale",[["channel","=",5],["create_date",">=",since]],["reference","state","exceptions","metadata"])
    bad=[s for s in S if s['state']=='failed' or (s['state']=='draft' and s['exceptions'])]
    if bad: revert("blocked imports "+str([(s['reference'],s['state']) for s in bad])); sys.exit(0)
    ok=[s for s in S if any(k.startswith('psd_test_') for k in (s.get('metadata') or {}))]
    if len(ok)>=3:
        for s in ok: print(s['reference'],s['state'],{k:v for k,v in s['metadata'].items() if k.startswith('psd_') or k=='planned_ship_date_error'})
        print("other orders:",[(s['reference'],s['state']) for s in S if s not in ok]); sys.exit(0)
    time.sleep(30)
print("timeout; orders so far:",[(s['reference'],s['state']) for s in S])
