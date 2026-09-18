import 'dotenv/config'; import fs from 'fs';
const AUTH=process.env.CIN7_AUTH, B='https://api.cin7.com/api/v1/SalesOrders';
const cands=JSON.parse(fs.readFileSync('temp files/cin7_aug_candidates.json','utf8'));
const DTC=new Set([5051,27889,27890]);
const upd=cands.filter(o=>!DTC.has(Number(o.branchId)));
// pick the safest test: a zero-total US order if present, else the first
const test = upd.find(o=>o.reference==='US-2164213') || upd[0];
console.log('TEST order:', test.reference, 'id='+test.id, 'branch='+test.branchId, 'dispatch='+test.dispatchedDate);
// 1) read full current state
const gr=await fetch(B+'?where='+encodeURIComponent('id='+test.id)+'&rows=1', {headers:{Authorization:AUTH}});
const before=(await gr.json())[0];
if(!before){ console.log('could not read order'); process.exit(1); }
const snap=o=>({stage:o.stage,status:o.status,total:o.total,invoiceDate:o.invoiceDate,dispatchedDate:o.dispatchedDate,reference:o.reference,customerOrderNo:o.customerOrderNo,branchId:o.branchId,memberId:o.memberId,currencyCode:o.currencyCode,productTotal:o.productTotal,taxTotal:o.taxTotal,lineCount:(o.lineItems||[]).length});
console.log('BEFORE:', JSON.stringify(snap(before)));
const newInv = String(before.dispatchedDate); // invoice on the dispatch datetime
await new Promise(r=>setTimeout(r,500));
// 2) PUT just id + invoiceDate
const pr=await fetch(B, {method:'PUT', headers:{Authorization:AUTH,'content-type':'application/json'}, body:JSON.stringify([{id:before.id, invoiceDate:newInv}])});
const ptxt=await pr.text();
console.log('PUT status:', pr.status, '| resp:', ptxt.slice(0,200));
await new Promise(r=>setTimeout(r,800));
// 3) re-read
const gr2=await fetch(B+'?where='+encodeURIComponent('id='+test.id)+'&rows=1', {headers:{Authorization:AUTH}});
const after=(await gr2.json())[0];
console.log('AFTER :', JSON.stringify(snap(after)));
// diff
const a=snap(before), b=snap(after), diffs=[];
Object.keys(a).forEach(k=>{ if(JSON.stringify(a[k])!==JSON.stringify(b[k])) diffs.push(k+': '+JSON.stringify(a[k])+' -> '+JSON.stringify(b[k])); });
console.log('CHANGED FIELDS:', diffs.length?diffs.join(' ; '):'(none)');
