import { JSDOM, VirtualConsole } from 'jsdom';
import http from 'http';
const BASE='http://localhost:8124';
function get(){return new Promise((res,rej)=>{http.get(BASE+'/',r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(d));}).on('error',rej);});}
const html=await get();
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',url:BASE+'/',virtualConsole:new VirtualConsole(),
  beforeParse(win){win.fetch=(u,o)=>new Promise((resolve,reject)=>{let url=String(u);if(!url.startsWith('http'))url=BASE+url;if(url.includes('/api/me'))return resolve({ok:true,status:200,json:()=>Promise.resolve({email:'ben@',live:false,supply_edit:true,demand_edit:true,product_edit:true,is_admin:true}),text:()=>Promise.resolve('{}')});const req=http.request(url,{method:(o&&o.method)||'GET',headers:(o&&o.headers)||{}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>resolve({ok:r.statusCode<400,status:r.statusCode,json:()=>Promise.resolve(JSON.parse(d||'null')),text:()=>Promise.resolve(d)}));});req.on('error',reject);if(o&&o.body)req.write(o.body);req.end();});}});
const win=dom.window;
async function waitFor(expr,ms=25000){const t0=Date.now();while(Date.now()-t0<ms){try{if(win.eval(expr))return true;}catch(e){}await new Promise(r=>setTimeout(r,300));}return false;}
await waitFor("typeof SKUM!=='undefined'&&Object.keys(SKUM).length>50");
await new Promise(r=>setTimeout(r,3000));
console.log(win.eval(`(function(){
  try{buildLiveDemand();}catch(e){}
  var todayISO=new Date().toISOString().slice(0,10);
  // find a discontinued (past) SKU that now has av in UK DTC and has stock — a real run-off candidate
  var cand=null;
  for(var sku in SKUM){ var p=SKUM[sku]; if(!p||!p.disc)continue; var d=p.disc['uk']; if(!(d&&d<todayISO))continue;
    var av=(p.av&&p.av['uk'])||''; if(av.indexOf('d')<0)continue; // available in UK DTC via available_no_disc
    var inv=p.inv||{}; var soh=(inv['uk_3pl']||0)+(inv['uk_fba']||0); if(soh<=0)continue;
    cand={sku:sku,sub:p.s,disc:d,soh:soh}; break;
  }
  if(!cand)return 'no run-off candidate found in UK DTC with stock';
  var s=cand.sub, co='UK', ch='DTC';
  // Active mode: should HIDE the disc sku
  SKU_FILTER.active=true;
  var activeList=filteredSkus(s,co,ch,false);
  var inActive=activeList.indexOf(cand.sku)>=0;
  // All mode: should SHOW it
  SKU_FILTER.active=false;
  var allList=filteredSkus(s,co,ch,false);
  var inAll=allList.indexOf(cand.sku)>=0;
  // all=true (subtotal/smoothing scope): should include it
  var subtotList=filteredSkus(s,co,ch,true);
  var inSubtot=subtotList.indexOf(cand.sku)>=0;
  // run-off forecast populated?
  var fc=0; try{ var pd=BP_DATA.products[cand.sku]; var md=pd&&pd.mkts&&pd.mkts['UK']; if(md&&md.demand&&md.demand.DTC){for(var ym in md.demand.DTC){if(ym>=todayISO.slice(0,7).replace('-','_'))fc+=md.demand.DTC[ym]||0;}} }catch(e){}
  SKU_FILTER.active=true; // restore default
  return JSON.stringify({candidate:cand, hiddenInActive_expect_false:inActive, shownInAll_expect_true:inAll, inSubtotalScope_expect_true:inSubtot, runoffForecastUnits:Math.round(fc)},null,1);
})()`));
process.exit(0);
