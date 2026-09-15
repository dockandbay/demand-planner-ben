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
await new Promise(r=>setTimeout(r,2500));
const q=process.env.Q||'TOWLB-CAB-LG';
console.log(win.eval(`(function(){
  try{buildLiveDemand();}catch(e){}
  PLAN_SKU_QRY=${JSON.stringify(q)};
  try{ if(typeof renderMain==='function')renderMain(); }catch(e){return 'render THREW '+e.message;}
  var tb=document.querySelector('#plan-body')||document.querySelector('tbody')||document.body;
  var rows=tb.querySelectorAll('tr');
  var out={query:PLAN_SKU_QRY, catHdr:0, subHdr:0, skuRows:0, dataRows:0, subtotVisible:0, sample:[]};
  rows.forEach(function(tr){
    var cl=tr.className||'';
    if(/cat-hdr/.test(cl)){ out.catHdr++; if(out.sample.length<12)out.sample.push('CATHDR: '+tr.textContent.trim().slice(0,40)); }
    else if(/sku-row|inline-sku|skurow/.test(cl)){ out.skuRows++; }
    else if(/subtot|sub-tot/.test(cl)){ if(tr.style.display!=='none')out.subtotVisible++; }
    else if(tr.children.length>3){ out.dataRows++; if(out.sample.length<12)out.sample.push('ROW['+cl+']: '+tr.textContent.trim().slice(0,50)); }
  });
  return JSON.stringify(out,null,1);
})()`));
process.exit(0);
