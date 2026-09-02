import { JSDOM, VirtualConsole } from 'jsdom';
import http from 'http'; import fs from 'fs';
const BASE='http://localhost:8124';
function get(){return new Promise((res,rej)=>{http.get(BASE+'/',r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(d));}).on('error',rej);});}
const html=await get();
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',url:BASE+'/',virtualConsole:new VirtualConsole(),
  beforeParse(win){win.fetch=(u,o)=>new Promise((resolve,reject)=>{let url=String(u);if(!url.startsWith('http'))url=BASE+url;if(url.includes('/api/me'))return resolve({ok:true,status:200,json:()=>Promise.resolve({email:'ben@',live:false,supply_edit:true,demand_edit:true,product_edit:true,is_admin:true}),text:()=>Promise.resolve('{}')});const req=http.request(url,{method:(o&&o.method)||'GET',headers:(o&&o.headers)||{}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>resolve({ok:r.statusCode<400,status:r.statusCode,json:()=>Promise.resolve(JSON.parse(d||'null')),text:()=>Promise.resolve(d)}));});req.on('error',reject);if(o&&o.body)req.write(o.body);req.end();});}});
const win=dom.window;
async function waitFor(expr,ms=25000){const t0=Date.now();while(Date.now()-t0<ms){try{if(win.eval(expr))return true;}catch(e){}await new Promise(r=>setTimeout(r,300));}return false;}
await waitFor("typeof BP_DATA!=='undefined'&&BP_DATA.products&&Object.keys(BP_DATA.products).length>50");
await new Promise(r=>setTimeout(r,3000));
const out=win.eval(`(function(){
  try{buildLiveDemand();}catch(e){return 'ERR '+e.message;}
  var P=BP_DATA.products, todayISO=new Date().toISOString().slice(0,10);
  // sum forward demand (months >= current) per subcat|co, split active vs disc
  var perSub={}, totAll=0, totDisc=0, totActive=0;
  for(var sku in P){ var pd=P[sku]; if(!pd||!pd.mkts)continue; var sub=(pd.s||pd.subcat||'?');
    for(var mkt in pd.mkts){ var md=pd.mkts[mkt]; if(!md||!md.demand)continue;
      var disc=md.disc||null, isDisc=disc&&String(disc)<todayISO;
      var s=0; ['DTC','B2B','FBA','TIK'].forEach(function(ch){ var dd=md.demand[ch]; if(dd)for(var ym in dd){ if(ym>=todayISO.slice(0,7).replace('-','_'))s+=dd[ym]||0; } });
      totAll+=s; if(isDisc)totDisc+=s; else totActive+=s;
      var key=sub+'|'+mkt; (perSub[key]||(perSub[key]={a:0,d:0})); if(isDisc)perSub[key].d+=s; else perSub[key].a+=s;
    }
  }
  return JSON.stringify({totAll:Math.round(totAll),totActive:Math.round(totActive),totDisc:Math.round(totDisc),perSub:perSub});
})()`);
const p=JSON.parse(out);
const tag=process.env.SNAP_TAG||'x';
fs.writeFileSync('temp files/dem_'+tag+'.json', JSON.stringify(p.perSub));
console.log(JSON.stringify({tag:tag,totAll:p.totAll,totActive:p.totActive,totDisc:p.totDisc}));
process.exit(0);
