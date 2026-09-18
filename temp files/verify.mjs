import 'dotenv/config'; import fs from 'fs';
const AUTH=process.env.CIN7_AUTH, B='https://api.cin7.com/api/v1/SalesOrders';
const all=JSON.parse(fs.readFileSync('temp files/cin7_sweep_all.json','utf8'));
const DTC=new Set([5051,27889,27890]);
const upd=all.filter(o=>!DTC.has(Number(o.branchId)));
// verify a spread: earliest month, a mid one, latest
const picks=[upd.find(o=>o.month==='2025-04'), upd.find(o=>o.month==='2026-07'), upd[upd.length-1]].filter(Boolean);
for(const p of picks){
  const o=(await (await fetch(B+'?where='+encodeURIComponent('id='+p.id)+'&rows=1&fields=id,reference,invoiceDate,dispatchedDate,total',{headers:{Authorization:AUTH}})).json())[0];
  const match = o && o.invoiceDate && String(o.invoiceDate)===String(o.dispatchedDate);
  console.log(p.reference+' ('+p.month+'): invoiceDate='+String(o&&o.invoiceDate).slice(0,10)+' dispatch='+String(o&&o.dispatchedDate).slice(0,10)+' -> '+(match?'MATCH ✓':'MISMATCH'));
  await new Promise(r=>setTimeout(r,1200));
}
