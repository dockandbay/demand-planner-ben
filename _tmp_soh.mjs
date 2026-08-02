import { JSDOM } from 'jsdom';
const res=await fetch('http://localhost:8124/'); let html=await res.text();
const scripts=[]; html=html.replace(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi,(m,c)=>{scripts.push(c);return '';});
const dom=new JSDOM(html,{url:'http://localhost:8124/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window; w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}}); w.scrollTo=()=>{}; w.fetch=fetch;
for(const c of scripts){ try{ w.eval(c); }catch(e){} }
await new Promise(r=>setTimeout(r,2000));
function E(c){ try{ return String(w.eval(c)); }catch(e){ return 'ERR:'+(e&&e.message||e); } }
console.log('skuWh UK DTC/FBA:', E(`skuWh('UK','DTC')+' | '+skuWh('UK','FBA')`));
// pick a real DATA row and dump stockFor
console.log('stockFor sample:', E(`(function(){ var r=(DATA||[]).find(function(x){return x.co==='UK';}); if(!r)return 'no row'; var st=stockFor(r.s,'UK',r.ch); return r.s+'/'+r.ch+' -> oh='+st.oh+' oh3='+st.oh3+' ohF='+st.ohF; })()`));
// dump a few SKUM inv keys to see warehouse naming
console.log('SKUM inv keys sample:', E(`(function(){ var k=Object.keys(SKUM)[0]; var p=SKUM[k]; return k+' inv='+JSON.stringify(p&&p.inv); })()`));
