import "dotenv/config";
const T=setTimeout(()=>{console.error("TIMEOUT");process.exit(1)},60000);
const sub=process.env.FULFIL_LIVE_SUBDOMAIN, key=process.env.FULFIL_LIVE_API_KEY;
const base="https://"+sub+".fulfil.io/api/v2";
async function ff(model,domain,fields){ let out=[],off=0; for(;;){ const r=await fetch(base+"/model/"+model+"/search_read",{method:"PUT",headers:{"X-API-KEY":key,"Content-Type":"application/json"},body:JSON.stringify([domain,off,500,null,fields])}); const t=await r.text(); if(!r.ok)throw new Error(model+" "+r.status+" "+t.slice(0,200)); const rows=JSON.parse(t); out=out.concat(rows); if(rows.length<500)break; off+=500;} return out; }
// all live POs + their line counts
const pos=await ff("purchase.purchase",[["reference","!=",null]],["id","reference","state"]);
const ids=pos.map(p=>p.id); const cnt={}; ids.forEach(i=>cnt[i]=0); let codeNull=0, codeSet=0;
for(let i=0;i<ids.length;i+=200){ const b=ids.slice(i,i+200); const lr=await ff("purchase.line",[["purchase","in",b]],["purchase","product.code","quantity"]); lr.forEach(l=>{ cnt[l.purchase]=(cnt[l.purchase]||0)+1; if(l["product.code"])codeSet++; else codeNull++; }); }
const empty=pos.filter(p=>!cnt[p.id]);
console.log("live POs:",pos.length,"| with >=1 line:",pos.filter(p=>cnt[p.id]>0).length,"| EMPTY (0 lines):",empty.length);
console.log("line product.code — set:",codeSet,"null/blank:",codeNull);
console.log("empty PO refs (first 25):", empty.map(p=>p.reference).slice(0,25).join(", "));
// raw dump of one problem PO
const one=pos.find(p=>String(p.reference)==="PO-58UKLX1");
if(one){ const lr=await ff("purchase.line",[["purchase","=",one.id]],["id","product","product.code","quantity","unit_price","description"]); console.log("PO-58UKLX1 id",one.id,"state",one.state,"lines:",lr.length); lr.slice(0,6).forEach(l=>console.log("   ",JSON.stringify({product:l.product,code:l["product.code"],qty:l.quantity,desc:(l.description||"").slice(0,30)}))); }
clearTimeout(T); process.exit(0);
