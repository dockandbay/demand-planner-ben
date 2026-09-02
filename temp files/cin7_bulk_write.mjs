import 'dotenv/config'; import fs from 'fs';
const AUTH=process.env.CIN7_AUTH, B='https://api.cin7.com/api/v1/SalesOrders';
const DTC=new Set([5051,27889,27890]);
const BR={5051:'Direct to Client',5052:'UK',5053:'UK',5055:'US Geneva',16288:'Amazon US',16289:'Amazon AU',16539:'?',17489:'AU',23087:'?',25073:'EU iFulfilment',27889:'JLEW',27890:'NEXT'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const all=JSON.parse(fs.readFileSync('temp files/cin7_sweep_all.json','utf8'));
const upd=all.filter(o=>!DTC.has(Number(o.branchId)));
const dtc=all.filter(o=>DTC.has(Number(o.branchId)));
const result={}; // id -> 'ok' | 'fail:reason'
const BATCH=50;
for(let i=0;i<upd.length;i+=BATCH){
  const chunk=upd.slice(i,i+BATCH);
  const body=chunk.map(o=>({id:o.id, invoiceDate:o.dispatchedDate}));
  let r; try{ r=await fetch(B,{method:'PUT',headers:{Authorization:AUTH,'content-type':'application/json'},body:JSON.stringify(body)});}catch(e){ chunk.forEach(o=>result[o.id]='fail:'+e.message); await sleep(1500); continue; }
  if(r.status===429){ console.log('429 at batch '+i+' — backing off 30s'); await sleep(30000); i-=BATCH; continue; }
  if(r.status>=400){ const t=(await r.text()).slice(0,150); chunk.forEach(o=>result[o.id]='fail:HTTP'+r.status); console.log('batch '+i+' HTTP '+r.status+' '+t); await sleep(1200); continue; }
  let arr=[]; try{arr=await r.json();}catch(e){}
  if(Array.isArray(arr)) arr.forEach(x=>{ result[x.id]= x.success? 'ok' : ('fail:'+JSON.stringify(x.errors||'?').slice(0,60)); });
  const okN=chunk.filter(o=>result[o.id]==='ok').length;
  process.stdout.write('  '+Math.min(i+BATCH,upd.length)+'/'+upd.length+' ('+okN+' ok this batch)\r');
  await sleep(1200);
}
const okAll=upd.filter(o=>result[o.id]==='ok'), failAll=upd.filter(o=>result[o.id]&&result[o.id]!=='ok');
console.log('\nUPDATED ok: '+okAll.length+' | failed: '+failAll.length);
if(failAll.length) console.log('failures sample:', failAll.slice(0,8).map(o=>o.reference+' '+result[o.id]).join(' | '));
// CSV (all rows)
function csvq(v){v=String(v==null?'':v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}
const head='Month,Action,Result,Branch,BranchId,Reference,CustomerOrderNo,Company,Stage,DispatchDate,InvoiceDateSet,Total,Currency';
const rows=all.map(o=>{ const isDtc=DTC.has(Number(o.branchId)); const action=isDtc?'DTC-REPORT-ONLY':'UPDATE'; const res=isDtc?'(excluded)':(result[o.id]||'not-run'); const invSet=isDtc?'':(res==='ok'?o.dispatchedDate.slice(0,10):''); 
  return [o.month,action,res,BR[o.branchId]||o.branchId,o.branchId,o.reference,o.customerOrderNo,o.company,o.stage,o.dispatchedDate.slice(0,10),invSet,o.total,o.currency].map(csvq).join(','); });
fs.writeFileSync('temp files/cin7_invoicedate_update_2025-03_to_2026-09.csv', head+'\n'+rows.join('\n'));
// DTC report csv
const dhead='Month,Branch,BranchId,Reference,CustomerOrderNo,Company,Stage,DispatchDate,Total,Currency';
const drows=dtc.map(o=>[o.month,BR[o.branchId]||o.branchId,o.branchId,o.reference,o.customerOrderNo,o.company,o.stage,o.dispatchedDate.slice(0,10),o.total,o.currency].map(csvq).join(','));
fs.writeFileSync('temp files/cin7_DTC_excluded_report.csv', dhead+'\n'+drows.join('\n'));
console.log('CSVs written: cin7_invoicedate_update_2025-03_to_2026-09.csv ('+all.length+' rows) + cin7_DTC_excluded_report.csv ('+dtc.length+' rows)');
