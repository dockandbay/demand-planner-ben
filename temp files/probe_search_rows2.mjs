import { JSDOM, VirtualConsole } from 'jsdom';
import http from 'http';
const BASE='http://localhost:8124';
function get(){return new Promise((res,rej)=>{http.get(BASE+'/',r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(d));}).on('error',rej);});}
const html=await get();
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',url:BASE+'/',virtualConsole:new VirtualConsole(),
  beforeParse(win){win.fetch=(u,o)=>new Promise((resolve,reject)=>{let url=String(u);if(!url.startsWith('http'))url=BASE+url;if(url.includes('/api/me'))return resolve({ok:true,status:200,json:()=>Promise.resolve({email:'ben@',is_admin:true,live:false,supply_edit:true,demand_edit:true,product_edit:true}),text:()=>Promise.resolve('{}')});const req=http.request(url,{method:(o&&o.method)||'GET',headers:(o&&o.headers)||{}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>resolve({ok:r.statusCode<400,status:r.statusCode,json:()=>Promise.resolve(JSON.parse(d||'null')),text:()=>Promise.resolve(d)}));});req.on('error',reject);if(o&&o.body)req.write(o.body);req.end();});}});
const win=dom.window;
const t0=Date.now();while(Date.now()-t0<25000){try{if(win.eval("typeof SKUM!=='undefined'&&Object.keys(SKUM).length>50"))break;}catch(e){}await new Promise(r=>setTimeout(r,300));}
await new Promise(r=>setTimeout(r,2500));
console.log(win.eval(`(function(){
  try{buildLiveDemand();}catch(e){}
  PLAN_SKU_QRY=${JSON.stringify(process.env.Q||'TOWLB-CAB-LG')};
  try{renderMain();}catch(e){return 'THREW '+e.message;}
  var tb=document.querySelector('#plan-body')||document.querySelector('tbody')||document.body;
  var rows=tb.querySelectorAll('tr'); var counts={};
  rows.forEach(function(tr){ var cl=(tr.className||'(none)'); counts[cl]=(counts[cl]||0)+1; });
  return JSON.stringify({query:PLAN_SKU_QRY, byClass:counts},null,1);
})()`));
process.exit(0);
