import { JSDOM } from 'jsdom';
const res = await fetch('http://localhost:8124/');
let html = await res.text();
const scripts=[]; html=html.replace(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi,(m,c)=>{scripts.push(c);return '';});
const dom=new JSDOM(html,{url:'http://localhost:8124/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;
w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}}); w.scrollTo=()=>{}; w.fetch=fetch;
for(const code of scripts){ try{ w.eval(code); }catch(e){} }
await new Promise(r=>setTimeout(r,2500));
function E(code){ try{ return String(w.eval(code)); }catch(e){ return 'ERR:'+(e&&e.stack||e).split('\n').slice(0,3).join(' | '); } }
// settings inputs the engine reads
E(`['plw:0','fbw:8','fbm:4','fbl:4','txh:20','txl:6','atr:0','qry:'].forEach(function(s){var p=s.split(':');var i=document.createElement('input');i.id=p[0];i.value=p[1]||'';document.body.appendChild(i);});'ok'`);
console.log('sku exists:', E(`typeof PD!=='undefined' ? (PD['HAIRW-CAB-LTBLU-NB']?'yes':'no') : 'PD-not-global'`));
console.log('baseline UK DTC demand (Sep..Feb):', E(`['2026_09','2026_10','2026_11','2026_12','2027_01','2027_02'].map(function(m){return m+'='+(skuOutFC('HAIRW-CAB-LTBLU-NB','UK','DTC',m)||0);}).join(' ')`));
const RUN=`(function(l){ for(var k in BP.BUY_CACHE)delete BP.BUY_CACHE[k]; var q=BP.getBuyQtys('HAIRW-CAB-LTBLU-NB','UK'); return l+' -> orderNow(b3)='+q.b3+'  urgent(b3u)='+q.b3u+'  fba(bf)='+q.bf+'  futN='+q.futN+'  futQty='+q.futQty; })`;
console.log(E(`(function(){ buildLiveDemand(); return ${RUN}('BASELINE'); })()`));
console.log(E(`(function(){ skuOvSet('HAIRW-CAB-LTBLU-NB','UK','DTC','2026_11',10000); buildLiveDemand(); return ${RUN}('SET Nov=10k'); })()`));
console.log(E(`(function(){ skuOvSet('HAIRW-CAB-LTBLU-NB','UK','DTC','2026_12',10000); buildLiveDemand(); return ${RUN}('SET Nov=10k + Dec=10k'); })()`));
