import 'dotenv/config'; import fs from 'fs';
const AUTH=process.env.CIN7_AUTH, B='https://api.cin7.com/api/v1/SalesOrders';
const cands=JSON.parse(fs.readFileSync('temp files/cin7_aug_candidates.json','utf8'));
const DTC=new Set([5051,27889,27890]);
const test = cands.filter(o=>!DTC.has(Number(o.branchId)) && Number(o.total)>0 && o.reference==='UK-895111')[0]
          || cands.filter(o=>!DTC.has(Number(o.branchId)) && Number(o.total)>0)[0];
console.log('TEST(normal):', test.reference, 'id='+test.id, 'branch='+test.branchId, 'listed total='+test.total);
const gr=await fetch(B+'?where='+encodeURIComponent('id='+test.id)+'&rows=1',{headers:{Authorization:AUTH}});
const before=(await gr.json())[0];
const snap=o=>({stage:o.stage,status:o.status,total:o.total,productTotal:o.productTotal,taxTotal:o.taxTotal,freightTotal:o.freightTotal,invoiceDate:o.invoiceDate,dispatchedDate:o.dispatchedDate});
console.log('BEFORE:', JSON.stringify(snap(before)));
await new Promise(r=>setTimeout(r,500));
const pr=await fetch(B,{method:'PUT',headers:{Authorization:AUTH,'content-type':'application/json'},body:JSON.stringify([{id:before.id, invoiceDate:String(before.dispatchedDate)}])});
console.log('PUT:', pr.status, (await pr.text()).slice(0,120));
await new Promise(r=>setTimeout(r,900));
const after=(await (await fetch(B+'?where='+encodeURIComponent('id='+test.id)+'&rows=1',{headers:{Authorization:AUTH}})).json())[0];
console.log('AFTER :', JSON.stringify(snap(after)));
const a=snap(before),b=snap(after),d=[]; Object.keys(a).forEach(k=>{if(JSON.stringify(a[k])!==JSON.stringify(b[k]))d.push(k+': '+JSON.stringify(a[k])+'->'+JSON.stringify(b[k]));});
console.log('CHANGED:', d.length?d.join(' ; '):'(none)');
