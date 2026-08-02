import { JSDOM } from 'jsdom';
const res=await fetch('http://localhost:8124/'); let html=await res.text();
const scripts=[]; html=html.replace(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi,(m,c)=>{scripts.push(c);return '';});
const dom=new JSDOM(html,{url:'http://localhost:8124/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window; w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}}); w.scrollTo=()=>{}; w.fetch=fetch;
if(!w.ResizeObserver)w.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};
for(const c of scripts){ try{ w.eval(c); }catch(e){} }
await new Promise(r=>setTimeout(r,2200));
function E(c){ try{ return String(w.eval(c)); }catch(e){ return 'ERR:'+(e&&e.message||e); } }
E(`['plw:0','fbw:8','fbm:4','fbl:4','txh:20','txl:6','atr:0','qry:'].forEach(function(s){var p=s.split(':');var i=document.createElement('input');i.id=p[0];i.value=p[1]||'';document.body.appendChild(i);});buildLiveDemand();`);
console.log('buy grid:', E(`(function(){ try{ if(!document.querySelector('.wrap')){var w2=document.createElement('div');w2.className='wrap';document.body.appendChild(w2);} if(!document.getElementById('main-hdr')){var t=document.createElement('table');var th=document.createElement('thead');th.id='main-hdr';t.appendChild(th);document.querySelector('.wrap').appendChild(t);} renderBuyView('buy'); var hdr=document.getElementById('main-hdr'); var nTh=hdr.querySelectorAll('th').length; var tb=document.getElementById('tb'); var firstRow=tb&&tb.querySelector('tr.sr'); var nTd=firstRow?firstRow.querySelectorAll('td').length:0; return 'relWindow='+(hdr.innerHTML.indexOf('Release<br>Window')>=0)+' nTh='+nTh+' rowTds='+nTd; }catch(e){ return 'ERR:'+e.message; } })()`));
