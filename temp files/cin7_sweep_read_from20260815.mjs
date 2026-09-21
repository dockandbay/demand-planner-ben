import 'dotenv/config'; import fs from 'fs';
const AUTH=process.env.CIN7_AUTH, B='https://api.cin7.com/api/v1/SalesOrders';
const FIELDS='id,reference,customerOrderNo,company,branchId,stage,status,isVoid,dispatchedDate,invoiceDate,total,currencyCode';
const DTC=new Set([5051,27889,27890]);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const where=`DispatchedDate>='2026-08-15T00:00:00Z' AND InvoiceDate IS NULL`;
let all=[], totalCalls=0, page=1;
while(page<=200){
  const url=B+'?rows=250&page='+page+'&fields='+FIELDS+'&where='+encodeURIComponent(where);
  let r; try{ r=await fetch(url,{headers:{Authorization:AUTH}}); }catch(e){ console.log('fetch err '+e.message); break; }
  totalCalls++;
  if(r.status===429){ console.log('429 — backing off 30s'); await sleep(30000); continue; }
  if(r.status>=400){ console.log('HTTP '+r.status+' '+(await r.text()).slice(0,160)); break; }
  let arr=[]; try{arr=await r.json();}catch(e){}
  if(!Array.isArray(arr)||!arr.length)break;
  arr.forEach(o=>{ if(o.isVoid||!o.dispatchedDate||(o.invoiceDate&&String(o.invoiceDate).trim()!==''))return; all.push({id:o.id,reference:o.reference||'',customerOrderNo:o.customerOrderNo||'',company:o.company||'',branchId:o.branchId,stage:o.stage||'',dispatchedDate:String(o.dispatchedDate),total:o.total,currency:o.currencyCode||''}); });
  if(arr.length<250)break; page++; await sleep(1100);
}
fs.writeFileSync('temp files/cin7_sweep_from20260815.json', JSON.stringify(all));
const upd=all.filter(o=>!DTC.has(Number(o.branchId))), dtc=all.filter(o=>DTC.has(Number(o.branchId)));
console.log('TOTAL candidates: '+all.length+' ('+totalCalls+' calls) | to UPDATE: '+upd.length+' | DTC (report only): '+dtc.length);
const byBr={}; upd.forEach(o=>byBr[o.branchId]=(byBr[o.branchId]||0)+1);
console.log('UPDATE by branch:', JSON.stringify(byBr));
console.log('dispatch range:', upd.length?(upd.map(o=>o.dispatchedDate.slice(0,10)).sort()[0]+' … '+upd.map(o=>o.dispatchedDate.slice(0,10)).sort().slice(-1)[0]):'—');
console.log('DTC refs (report only):', dtc.map(o=>o.reference).join(', ')||'none');
