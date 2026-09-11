import { JSDOM, VirtualConsole } from 'jsdom';
import http from 'http';
const BASE='http://localhost:8124';
function get(){return new Promise((res,rej)=>{http.get(BASE+'/',r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(d));}).on('error',rej);});}
const html=await get();
const vc=new VirtualConsole();
const errs=[];
vc.on('jsdomError',e=>errs.push('JSDOM_ERR: '+(e.detail?.message||e.message||e)));
vc.on('error',(...a)=>errs.push('ERR: '+a.join(' ')));
const dom=new JSDOM(html,{runScripts:'dangerously',resources:'usable',url:BASE+'/',virtualConsole:vc,
  beforeParse(win){
    win.fetch=(u,o)=>new Promise((resolve,reject)=>{
      let url=String(u); if(!url.startsWith('http'))url=BASE+url;
      if(url.includes('/api/me')){return resolve({ok:true,status:200,json:()=>Promise.resolve({email:'ben@dockandbay.com',live:false,supply_edit:true,demand_edit:true,product_edit:true,is_admin:true}),text:()=>Promise.resolve('{}')});}
      const req=http.request(url,{method:(o&&o.method)||'GET',headers:(o&&o.headers)||{}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>resolve({ok:r.statusCode<400,status:r.statusCode,json:()=>Promise.resolve(JSON.parse(d||'null')),text:()=>Promise.resolve(d)}));});
      req.on('error',reject); if(o&&o.body)req.write(o.body); req.end();
    });
  }});
const win=dom.window;
await new Promise(r=>setTimeout(r,4000));
function probe(expr){ try{return win.eval(expr);}catch(e){return 'THREW:'+e.message;} }
console.log('PD defined?', probe("typeof PD"));
console.log('BP_DATA prod count', probe("typeof BP_DATA!=='undefined'&&BP_DATA.products?Object.keys(BP_DATA.products).length:'na'"));
console.log('SKUM count', probe("typeof SKUM!=='undefined'?Object.keys(SKUM).length:'na'"));
console.log('_SKU_RAW count', probe("typeof _SKU_RAW!=='undefined'?Object.keys(_SKU_RAW.p||{}).length:'na'"));
console.log('augmentSKUM ran?', probe("typeof augmentSKUM"));
console.log('--- captured errors ---');
console.log(errs.slice(0,10).join('\n'));
process.exit(0);
