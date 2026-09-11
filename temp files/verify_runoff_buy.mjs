// Verify: exposing run-off (discontinued) SKUs via available_no_disc adds ZERO buy.
import { JSDOM, VirtualConsole } from 'jsdom';
import http from 'http';
const BASE='http://localhost:8124';
function get(){return new Promise((res,rej)=>{http.get(BASE+'/',r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(d));}).on('error',rej);});}
const html=await get();
const vc=new VirtualConsole();
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
// wait for BP_DATA products
async function waitFor(expr,ms=25000){const t0=Date.now();while(Date.now()-t0<ms){try{if(win.eval(expr))return true;}catch(e){}await new Promise(r=>setTimeout(r,300));}return false;}
if(!await waitFor("typeof BP_DATA!=='undefined'&&BP_DATA.products&&Object.keys(BP_DATA.products).length>50")){console.error('BP_DATA never loaded');process.exit(1);}
// let async boot (loadPreorderKA→buildLiveDemand) settle
await new Promise(r=>setTimeout(r,3000));

const out=win.eval(`(function(){
  try{ if(typeof buildLiveBpOverlay==='function')buildLiveBpOverlay(); }catch(e){return 'ERR overlay '+e.message;}
  try{ if(typeof buildLiveDemand==='function')buildLiveDemand(); }catch(e){return 'ERR demand '+e.message;}
  var gbq=window.BP&&BP.getBuyQtys; if(typeof gbq!=='function')return 'NO BP.getBuyQtys';
  try{ if(window.BP&&BP.BUY_CACHE){for(var k in BP.BUY_CACHE)delete BP.BUY_CACHE[k];} }catch(e){}
  var P=BP_DATA.products;
  var todayISO=new Date().toISOString().slice(0,10);
  var totBuy=0,discBuy=0,totSM=0,discSM=0,discWithBuy=[],discSeen=[];
  for(var sku in P){ var pd=P[sku]; if(!pd||!pd.mkts)continue;
    for(var mkt in pd.mkts){ var md=pd.mkts[mkt]; if(!md)continue;
      var q; try{q=gbq(sku,mkt);}catch(e){q=null;}
      var buy=q?((q.b3||0)+(q.bf||0)):0; totBuy+=buy; totSM++;
      var disc=md.disc||null; if(disc&&String(disc)<todayISO){ discSM++; discBuy+=buy;
        if(discSeen.length<6)discSeen.push(sku+'|'+mkt+' disc='+disc+' buy='+buy+' i3='+(md.i3||0));
        if(buy>0&&discWithBuy.length<15)discWithBuy.push(sku+'|'+mkt+' disc='+disc+' b3='+(q.b3||0)+' bf='+(q.bf||0)+' i3='+(md.i3||0)+' oo='+(md.oo||0));
      }
    }
  }
  // full per-sku×mkt buy map for diffing
  var map={};
  for(var sk in P){ var p=P[sk]; if(!p||!p.mkts)continue; for(var mk in p.mkts){ var mmd=p.mkts[mk]; if(!mmd)continue; var qq; try{qq=gbq(sk,mk);}catch(e){qq=null;} var bb=qq?((qq.b3||0)+(qq.bf||0)):0; if(bb)map[sk+'|'+mk]=Math.round(bb); } }
  return JSON.stringify({totBuy:Math.round(totBuy),discBuy:Math.round(discBuy),totSkuMkt:totSM,discSkuMkt:discSM,discWithBuyCount:discWithBuy.length,map:map});
})()`);
const parsed=JSON.parse(out);
const fs=await import('fs');
const tag=process.env.SNAP_TAG||'snap';
fs.writeFileSync('temp files/buy_'+tag+'.json', JSON.stringify(parsed.map));
console.log(JSON.stringify({tag:tag,totBuy:parsed.totBuy,discBuy:parsed.discBuy,totSkuMkt:parsed.totSkuMkt,discSkuMkt:parsed.discSkuMkt,mapEntries:Object.keys(parsed.map).length}));
process.exit(0);
