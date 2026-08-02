import { JSDOM } from 'jsdom';
const res=await fetch('http://localhost:8124/'); let html=await res.text();
const scripts=[]; html=html.replace(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi,(m,c)=>{scripts.push(c);return '';});
const dom=new JSDOM(html,{url:'http://localhost:8124/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window; w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}}); w.scrollTo=()=>{}; w.fetch=fetch;
for(const c of scripts){ try{ w.eval(c); }catch(e){} }
await new Promise(r=>setTimeout(r,2200));
function E(c){ try{ return String(w.eval(c)); }catch(e){ return 'ERR:'+(e&&e.stack||e).split('\n').slice(0,2).join(' | '); } }
console.log('buildBody stk2:', E(`(function(){ try{ var f=buildBody(); var cells=f.querySelectorAll('td.stk2'); var out=[]; for(var i=0;i<Math.min(5,cells.length);i++){ out.push(cells[i].textContent.replace(/\\s+/g,' ').trim()); } return 'nCells='+cells.length+' :: '+out.join(' || '); }catch(e){ return 'ERR:'+e.message; } })()`));
