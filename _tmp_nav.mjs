import { JSDOM } from 'jsdom';
const res=await fetch('http://localhost:8124/'); let html=await res.text();
const scripts=[]; html=html.replace(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi,(m,c)=>{scripts.push(c);return '';});
const dom=new JSDOM(html,{url:'http://localhost:8124/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window; w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}}); w.scrollTo=()=>{}; w.fetch=fetch;
if(!w.ResizeObserver)w.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};
for(const c of scripts){ try{ w.eval(c); }catch(e){} }
await new Promise(r=>setTimeout(r,2000));
function E(c){ try{ return String(w.eval(c)); }catch(e){ return 'ERR:'+(e&&e.message||e); } }
console.log('top tabs:', E(`Array.from(document.querySelectorAll('.view-toggle')).map(function(b){return b.textContent;}).join(' | ')`));
console.log('render transfer:', E(`(function(){ try{ VIEW_MODE='transfer'; render(); var t=document.getElementById('transfer-wrap'); var nav=document.getElementById('buymove-tabs'); return 'transferWrap='+(t?'yes':'no')+' placeholder='+(t&&t.innerHTML.indexOf('Function to be confirmed')>=0)+' subnav='+(nav?nav.querySelectorAll('button').length:0); }catch(e){ return 'ERR:'+e.message; } })()`));
console.log('subnav labels:', E(`(function(){ var n=document.getElementById('buymove-tabs'); return n?Array.from(n.querySelectorAll('button')).map(function(b){return b.textContent;}).join(','):'none'; })()`));
