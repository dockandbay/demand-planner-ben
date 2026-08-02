import { JSDOM } from 'jsdom';
const res=await fetch('http://localhost:8124/'); let html=await res.text();
const scripts=[]; html=html.replace(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi,(m,c)=>{scripts.push(c);return '';});
const dom=new JSDOM(html,{url:'http://localhost:8124/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window; w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}}); w.scrollTo=()=>{}; w.fetch=fetch;
for(const c of scripts){ try{ w.eval(c); }catch(e){} }
await new Promise(r=>setTimeout(r,2000));
function E(c){ try{ return String(w.eval(c)); }catch(e){ return 'ERR:'+(e&&e.message||e); } }
console.log('buildExecData runs, no NaN:', E(`(function(){ var d=buildExecData(); var bad=false; ['DTC','FBA','B2B'].forEach(function(ch){ Object.keys(d.ch[ch]||{}).forEach(function(m){ var v=d.ch[ch][m]; if(isNaN(v.u)||isNaN(v.r)||isNaN(v.lyU)||isNaN(v.lyR))bad=true; }); }); return 'months='+Object.keys(d.tot).length+' anyNaN='+bad; })()`));
console.log('exec popout renders:', E(`(function(){ openExecSummaryPopout(); var p=document.getElementById('exec-sum-pop'); return p?('len='+p.innerHTML.length+' priorYr='+(p.innerHTML.indexOf('last year')>=0)):'no-pop'; })()`));
