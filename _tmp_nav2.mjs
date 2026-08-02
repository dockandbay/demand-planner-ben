import { JSDOM } from 'jsdom';
const res=await fetch('http://localhost:8124/'); let html=await res.text();
const scripts=[]; html=html.replace(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi,(m,c)=>{scripts.push(c);return '';});
const dom=new JSDOM(html,{url:'http://localhost:8124/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window; w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}}); w.scrollTo=()=>{}; w.fetch=fetch;
for(const c of scripts){ try{ w.eval(c); }catch(e){} }
await new Promise(r=>setTimeout(r,1500));
function E(c){ try{ return String(w.eval(c)); }catch(e){ return 'ERR:'+(e&&e.message||e); } }
console.log('renderTransferView:', E(`(function(){ if(!document.querySelector('.wrap')){var w2=document.createElement('div');w2.className='wrap';document.body.appendChild(w2);} renderTransferView(); var t=document.getElementById('transfer-wrap'); return t?('placeholder='+(t.innerHTML.indexOf('Function to be confirmed')>=0)+' hasTRANSFER='+(t.innerHTML.indexOf('TRANSFER')>=0)):'no-wrap'; })()`));
console.log('renderBuyMoveTabs:', E(`(function(){ if(!document.getElementById('view-tabs-row')){var v=document.createElement('div');v.id='view-tabs-row';document.body.appendChild(v);} renderBuyMoveTabs(); var n=document.getElementById('buymove-tabs'); return n?Array.from(n.querySelectorAll('button')).map(function(b){return b.textContent;}).join(','):'none'; })()`));
