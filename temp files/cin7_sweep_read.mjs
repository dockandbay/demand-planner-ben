import 'dotenv/config'; import fs from 'fs';
const AUTH=process.env.CIN7_AUTH, B='https://api.cin7.com/api/v1/SalesOrders';
const FIELDS='id,reference,customerOrderNo,company,branchId,stage,status,isVoid,dispatchedDate,invoiceDate,total,currencyCode';
const DTC=new Set([5051,27889,27890]);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// month starts Mar-2025 .. Sep-2026 (inclusive), each range [start, nextStart)
const months=[]; let y=2025,m=3; while(y<2026||(y===2026&&m<=9)){ const s=`${y}-${String(m).padStart(2,'0')}`; let ny=y,nm=m+1; if(nm>12){nm=1;ny++;} months.push({label:s,start:`${s}-01T00:00:00Z`,next:`${ny}-${String(nm).padStart(2,'0')}-01T00:00:00Z`}); y=ny;m=nm; }
let all=[], totalCalls=0;
for(const mo of months){
  const where=`DispatchedDate>='${mo.start}' AND DispatchedDate<'${mo.next}' AND InvoiceDate IS NULL`;
  let page=1, got=0;
  while(page<=200){
    const url=B+'?rows=250&page='+page+'&fields='+FIELDS+'&where='+encodeURIComponent(where);
    let r; try{ r=await fetch(url,{headers:{Authorization:AUTH}}); }catch(e){ console.log(mo.label+' fetch err '+e.message); break; }
    totalCalls++;
    if(r.status===429){ console.log('429 — backing off 30s'); await sleep(30000); continue; }
    if(r.status>=400){ console.log(mo.label+' HTTP '+r.status+' '+(await r.text()).slice(0,120)); break; }
    let arr=[]; try{arr=await r.json();}catch(e){}
    if(!Array.isArray(arr)||!arr.length)break;
    arr.forEach(o=>{ if(o.isVoid||!o.dispatchedDate||(o.invoiceDate&&String(o.invoiceDate).trim()!==''))return; all.push({month:mo.label,id:o.id,reference:o.reference||'',customerOrderNo:o.customerOrderNo||'',company:o.company||'',branchId:o.branchId,stage:o.stage||'',dispatchedDate:String(o.dispatchedDate),total:o.total,currency:o.currencyCode||''}); got++; });
    if(arr.length<250)break; page++; await sleep(1100);
  }
  console.log(mo.label+': '+got+' candidates');
  await sleep(1100);
}
fs.writeFileSync('temp files/cin7_sweep_all.json', JSON.stringify(all));
const upd=all.filter(o=>!DTC.has(Number(o.branchId))), dtc=all.filter(o=>DTC.has(Number(o.branchId)));
console.log('\nTOTAL candidates: '+all.length+' ('+totalCalls+' calls) | to UPDATE: '+upd.length+' | DTC (report only): '+dtc.length);
const byBr={}; upd.forEach(o=>byBr[o.branchId]=(byBr[o.branchId]||0)+1);
console.log('UPDATE by branch:', JSON.stringify(byBr));
console.log('DTC refs:', dtc.slice(0,20).map(o=>o.reference).join(', ')+(dtc.length>20?' …':''));
