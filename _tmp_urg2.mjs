import { JSDOM } from 'jsdom';
const res=await fetch('http://localhost:8124/'); let html=await res.text();
const scripts=[]; html=html.replace(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi,(m,c)=>{scripts.push(c);return '';});
const dom=new JSDOM(html,{url:'http://localhost:8124/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window; w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}}); w.scrollTo=()=>{}; w.fetch=fetch;
for(const c of scripts){ try{ w.eval(c); }catch(e){} }
await new Promise(r=>setTimeout(r,2500));
function E(c){ try{ return w.eval(c); }catch(e){ return 'ERR:'+(e&&e.message||e); } }
E(`['plw:0','fbw:8','fbm:4','fbl:4','txh:20','txl:6','atr:0','qry:'].forEach(function(s){var p=s.split(':');var i=document.createElement('input');i.id=p[0];i.value=p[1]||'';document.body.appendChild(i);});buildLiveDemand();`);
console.log('HAIRW:', JSON.stringify(E(`(function(){BP.CUR='UK';for(var k in BP.BUY_CACHE)delete BP.BUY_CACHE[k];var q=BP.getBuyQtys('HAIRW-SUE-OCETRES','UK');return {b3u:q.b3u,sea:q.b3uSea,air:q.b3uAir};})()`)));
console.log('totals:', JSON.stringify(E(`(function(){var MK=['UK','US','EU','AU','CA'];var t={b3u:0,sea:0,air:0};MK.forEach(function(m){BP.CUR=m;for(var k in BP.BUY_CACHE)delete BP.BUY_CACHE[k];(BP.getFilteredVis()||[]).forEach(function(s){var q=BP.getBuyQtys(s.s,m);t.b3u+=q.b3u||0;t.sea+=q.b3uSea||0;t.air+=q.b3uAir||0;});});return t;})()`)));
