import 'dotenv/config';
const sub=(process.env.FULFIL_SANDBOX_SUBDOMAIN||'').trim(), key=(process.env.FULFIL_SANDBOX_API_KEY||'').trim();
const base='https://'+sub+'.fulfil.io/api/v2';
async function f(method,path,body){ const r=await fetch(base+path,{method,headers:{'X-API-KEY':key,'Content-Type':'application/json'},body:body!=null?JSON.stringify(body):undefined}); const t=await r.text(); let j=null; try{j=t?JSON.parse(t):null;}catch(e){} if(!r.ok) throw new Error(method+' '+path+' -> '+r.status+': '+t.slice(0,300)); return j; }
const sr=(model,domain,limit,fields)=>f('PUT','/model/'+model+'/search_read',[domain,0,limit||50,null,fields]);

try {
  // lines for PO156 (id 246) and PO155 (id 245)
  for (const pid of [246,245]) {
    const lines=await sr('purchase.line',[['purchase','=',pid]],50,['id','product','product.code','product.name','description','quantity','unit','unit.symbol','unit_price']);
    console.log('\n=== purchase.line purchase='+pid+' -> '+lines.length+' ===');
    console.log(JSON.stringify(lines,null,1).slice(0,1600));
  }
  // final_destination metafield value for these POs
  const def=await sr('metafield.field',[['code','=','final_destination'],['model_name','=','purchase.purchase']],3,['id','code']);
  console.log('\nmetafield def:', JSON.stringify(def));
  if(def[0]){ for(const pid of [246,245]){ const mv=await sr('metafield.value',[['field','=',def[0].id],['resource','=','purchase.purchase,'+pid]],3,['id','value_char']); console.log('metafield PO id '+pid+':', JSON.stringify(mv)); } }
} catch(e){ console.log('FATAL', e.message); }
