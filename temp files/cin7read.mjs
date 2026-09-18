import 'dotenv/config';
const AUTH = process.env.CIN7_AUTH;
const BASE='https://api.cin7.com/api/v1/SalesOrders';
const FIELDS='id,reference,customerOrderNo,company,branchId,stage,status,isVoid,dispatchedDate,invoiceDate,total';
const where = "DispatchedDate>='2026-08-01T00:00:00Z' AND DispatchedDate<='2026-08-31T23:59:59Z' AND InvoiceDate IS NULL";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let page=1, out=[], calls=0;
while(page<=200){
  const url=BASE+'?rows=250&page='+page+'&fields='+FIELDS+'&where='+encodeURIComponent(where);
  const r=await fetch(url,{headers:{Authorization:AUTH,'content-type':'application/json'}});
  calls++;
  if(r.status>=400){ console.log('HTTP '+r.status+': '+(await r.text()).slice(0,160)); break; }
  let arr=[]; try{arr=await r.json();}catch(e){}
  if(!Array.isArray(arr)||!arr.length)break;
  out=out.concat(arr);
  if(arr.length<250)break;
  page++; await sleep(400);
}
const cands = out.filter(o=> !o.isVoid && o.dispatchedDate && (!o.invoiceDate||String(o.invoiceDate).trim()===''));
console.log('matches (dispatched Aug 2026, blank invoice, not void):', cands.length, '('+calls+' calls, '+out.length+' raw)');
const byBranch={}, byStage={}; let tot=0;
cands.forEach(o=>{ byBranch[o.branchId]=(byBranch[o.branchId]||0)+1; byStage[o.stage||'?']=(byStage[o.stage||'?']||0)+1; tot+=Number(o.total)||0; });
console.log('by branchId:', JSON.stringify(byBranch));
console.log('by stage:', JSON.stringify(byStage));
console.log('total value:', Math.round(tot));
console.log('sample (first 15):');
cands.slice(0,15).forEach(o=>console.log('  ', o.reference, '| br='+o.branchId, '| '+o.stage, '| disp='+String(o.dispatchedDate).slice(0,10), '| '+(o.company||'').slice(0,24), '| '+(Number(o.total)||0)));
import('fs').then(fs=>fs.writeFileSync('temp files/cin7_aug_candidates.json', JSON.stringify(cands.map(o=>({id:o.id,reference:o.reference,branchId:o.branchId,stage:o.stage,dispatchedDate:String(o.dispatchedDate).slice(0,10),total:o.total})))));
console.log('saved to temp files/cin7_aug_candidates.json');
