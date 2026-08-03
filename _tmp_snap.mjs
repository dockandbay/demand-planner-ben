import { JSDOM } from 'jsdom';
const LABEL=process.argv[2]||'snap';
const res=await fetch('http://localhost:8124/'); let html=await res.text();
const scripts=[]; html=html.replace(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi,(m,c)=>{scripts.push(c);return '';});
const dom=new JSDOM(html,{url:'http://localhost:8124/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window; w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}}); w.scrollTo=()=>{}; w.fetch=fetch;
for(const c of scripts){ try{ w.eval(c); }catch(e){} }
await new Promise(r=>setTimeout(r,2500));
function E(c){ try{ return w.eval(c); }catch(e){ return 'ERR:'+(e&&e.message||e); } }
E(`['plw:0','fbw:8','fbm:4','fbl:4','txh:20','txl:6','atr:0','qry:'].forEach(function(s){var p=s.split(':');var i=document.createElement('input');i.id=p[0];i.value=p[1]||'';document.body.appendChild(i);});buildLiveDemand();`);
const out=E(`(function(){var MKTS=['UK','US','EU','AU','CA'];var tot={b3:0,b3u:0,b3uSea:0,b3uAir:0,bf:0,nB3u:0,nSku:0};
  MKTS.forEach(function(m){BP.CUR=m;for(var k in BP.BUY_CACHE)delete BP.BUY_CACHE[k];var vis=[];try{vis=BP.getFilteredVis()||[]}catch(e){}
    vis.forEach(function(s){try{var q=BP.getBuyQtys(s.s,m);if(!q)return;tot.nSku++;tot.b3+=q.b3||0;tot.b3u+=q.b3u||0;tot.b3uSea+=q.b3uSea||0;tot.b3uAir+=q.b3uAir||0;tot.bf+=q.bf||0;if((q.b3u||0)>0)tot.nB3u++;}catch(e){}})});
  return tot;})()`);
const bag=E(`(function(){BP.CUR='UK';for(var k in BP.BUY_CACHE)delete BP.BUY_CACHE[k];var q=BP.getBuyQtys('BAGTOI-MD-SEASOIR','UK');return q?{b3:q.b3,b3u:q.b3u,b3uSea:q.b3uSea,b3uAir:q.b3uAir,urgTip:q.urgTip}:'no q';})()`);
console.log(LABEL+' TOT '+JSON.stringify(out));
console.log(LABEL+' BAGTOI-UK '+JSON.stringify(bag));
