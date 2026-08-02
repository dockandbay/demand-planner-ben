import { JSDOM } from 'jsdom';
const res = await fetch('http://localhost:8124/');
let html = await res.text();
const scripts=[]; html=html.replace(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi,(m,c)=>{scripts.push(c);return '';});
const dom=new JSDOM(html,{url:'http://localhost:8124/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;
w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}}); w.scrollTo=()=>{}; w.fetch=fetch;
for(const code of scripts){ try{ w.eval(code); }catch(e){} }
await new Promise(r=>setTimeout(r,2500));
function E(code){ try{ return String(w.eval(code)); }catch(e){ return 'ERR:'+(e&&e.message||e); } }
E(`['plw:0','fbw:8','fbm:4','fbl:4','txh:20','txl:6','atr:0','qry:'].forEach(function(s){var p=s.split(':');var i=document.createElement('input');i.id=p[0];i.value=p[1]||'';document.body.appendChild(i);});'ok'`);
E(`buildLiveDemand(); BP.CUR='UK';`);
const S='HAIRW-SUE-OCETRES';
console.log('buy-plan figures:', E(`(function(){ for(var k in BP.BUY_CACHE)delete BP.BUY_CACHE[k]; var q=BP.getBuyQtys('${S}','UK'); return 'b3='+q.b3+' b3u='+q.b3u+' bf(BuyFBA)='+q.bf+' tx(transfer-now)='+q.tx; })()`));
