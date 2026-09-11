import { JSDOM, VirtualConsole } from 'jsdom';
import http from 'http';
const BASE='http://localhost:8124';
function get(){return new Promise((res,rej)=>{http.get(BASE+'/',r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(d));}).on('error',rej);});}
const html=await get();
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',url:BASE+'/',virtualConsole:new VirtualConsole(),
  beforeParse(win){win.fetch=(u,o)=>new Promise((resolve,reject)=>{let url=String(u);if(!url.startsWith('http'))url=BASE+url;if(url.includes('/api/me'))return resolve({ok:true,status:200,json:()=>Promise.resolve({email:'ben@',live:false,supply_edit:true,demand_edit:true,product_edit:true,is_admin:true}),text:()=>Promise.resolve('{}')});const req=http.request(url,{method:(o&&o.method)||'GET',headers:(o&&o.headers)||{}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>resolve({ok:r.statusCode<400,status:r.statusCode,json:()=>Promise.resolve(JSON.parse(d||'null')),text:()=>Promise.resolve(d)}));});req.on('error',reject);if(o&&o.body)req.write(o.body);req.end();});}});
const win=dom.window;
async function waitFor(expr,ms=25000){const t0=Date.now();while(Date.now()-t0<ms){try{if(win.eval(expr))return true;}catch(e){}await new Promise(r=>setTimeout(r,300));}return false;}
await waitFor("typeof BP_DATA!=='undefined'&&BP_DATA.products&&Object.keys(BP_DATA.products).length>50");
await new Promise(r=>setTimeout(r,3000));
console.log(win.eval(`(function(){
  var o={};
  o.FC_OUTPUTS = (typeof FC_OUTPUTS!=='undefined')?('keys='+Object.keys(FC_OUTPUTS||{}).length):'undefined';
  o.FC_CURRENT = (typeof FC_CURRENT!=='undefined')?('keys='+Object.keys(FC_CURRENT||{}).length):'undefined';
  try{ if(typeof buildLiveDemand==='function')buildLiveDemand(); o.builtDemand=true; }catch(e){o.builtDemand='THREW '+e.message;}
  // sample an active SKU
  var s='TOWLB-CAB-LG-TEAL-R'; var pd=BP_DATA.products[s];
  o.sampleSku=s; o.hasPd=!!pd;
  if(pd&&pd.mkts){ var md=pd.mkts['UK']; o.uk_md_keys = md?Object.keys(md):'no UK md';
    o.uk_demand = md&&md.demand?JSON.stringify(md.demand).slice(0,300):'no demand';
    try{o.uk_buy=JSON.stringify(getBuyQtys(s,'UK'));}catch(e){o.uk_buy='THREW '+e.message;}
  }
  // count sku×mkt with any demand
  var withDem=0,P=BP_DATA.products; for(var sk in P){var p=P[sk];if(!p.mkts)continue;for(var m in p.mkts){var d=p.mkts[m];if(d&&d.demand&&d.demand.DTC&&Object.keys(d.demand.DTC).length)withDem++;}}
  o.skuMktWithDemand=withDem;
  return JSON.stringify(o,null,1);
})()`));
process.exit(0);
