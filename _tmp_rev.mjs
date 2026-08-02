import { JSDOM } from 'jsdom';
const res=await fetch('http://localhost:8124/'); let html=await res.text();
const scripts=[]; html=html.replace(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi,(m,c)=>{scripts.push(c);return '';});
const dom=new JSDOM(html,{url:'http://localhost:8124/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window; w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}}); w.scrollTo=()=>{}; w.fetch=fetch;
for(const c of scripts){ try{ w.eval(c); }catch(e){} }
await new Promise(r=>setTimeout(r,2000));
function E(c){ try{ return String(w.eval(c)); }catch(e){ return 'ERR:'+(e&&e.message||e); } }
// call revMonthly via a wrapper that has access to CUR_FY_START internally
console.log('revMonthly (literal fy 2026):', E(`(function(){ var r=revMonthly('UK','DTC',2026); return 'fc='+Math.round(r.fc)+' ly='+Math.round(r.ly)+' months='+Object.keys(r.mon).length; })()`));
console.log('renderExecView into drawer:', E(`(function(){ var b=document.createElement('div'); b.id='sa-drawer-body'; document.body.appendChild(b); try{ if(!document.querySelector('.wrap')){var w2=document.createElement('div');w2.className='wrap';document.body.appendChild(w2);} renderExecView(); return document.getElementById('exec-wrap')?'exec-wrap rendered':'no wrap'; }catch(e){ return 'ERR:'+e.message; } })()`));
