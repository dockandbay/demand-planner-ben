import { JSDOM } from 'jsdom';
const res=await fetch('http://localhost:8124/'); let html=await res.text();
const scripts=[]; html=html.replace(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi,(m,c)=>{scripts.push(c);return '';});
const dom=new JSDOM(html,{url:'http://localhost:8124/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window; w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}}); w.scrollTo=()=>{}; w.fetch=fetch;
for(const c of scripts){ try{ w.eval(c); }catch(e){} }
await new Promise(r=>setTimeout(r,2200));
function E(c){ try{ return w.eval(c); }catch(e){ return 'ERR:'+(e&&e.message||e); } }
E(`['plw:0','fbw:8','fbm:4','fbl:4','txh:20','txl:6','atr:0','qry:'].forEach(function(s){var p=s.split(':');var i=document.createElement('input');i.id=p[0];i.value=p[1]||'';document.body.appendChild(i);});buildLiveDemand();BP.CUR='UK';`);
var d=E(`BP._dbg5('HAIRW-CAB-LTPNK-NB','UK')`);
console.log('disc:', d.disc, 'i3:', d.i3, 'q:', JSON.stringify(d.q));
(d.rows||[]).forEach(function(r){ console.log(r.k, 'disc='+r.disc, 'dtc='+r.dtc, 'b2b='+r.b2b, 'c3='+r.c3, 'bQu='+r.bQu, 'sea='+r.bQuSea, 'air='+r.bQuAir); });
