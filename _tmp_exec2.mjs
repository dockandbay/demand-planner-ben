import { JSDOM } from 'jsdom';
const res=await fetch('http://localhost:8124/'); let html=await res.text();
const scripts=[]; html=html.replace(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi,(m,c)=>{scripts.push(c);return '';});
const dom=new JSDOM(html,{url:'http://localhost:8124/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window; w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}}); w.scrollTo=()=>{}; w.fetch=fetch;
for(const c of scripts){ try{ w.eval(c); }catch(e){} }
await new Promise(r=>setTimeout(r,2000));
function E(c){ try{ return String(w.eval(c)); }catch(e){ return 'ERR:'+(e&&e.message||e); } }
console.log('CUR_MONTH:', E('CUR_MONTH'));
console.log('buildExecData ok:', E(`(function(){ var d=buildExecData(); var nan=false,cm=CUR_MONTH,cmU=0; ['DTC','FBA','B2B'].forEach(function(ch){var v=d.ch[ch][cm]; if(v){cmU+=v.u; if(isNaN(v.u)||isNaN(v.r))nan=true;}}); return 'curMonthUnits='+Math.round(cmU)+' anyNaN='+nan; })()`));
console.log('revMonthly ok:', E(`(function(){ var r=revMonthly('UK','DTC',CUR_FY_START); return 'fc='+Math.round(r.fc)+' curM='+Math.round(r.mon[CUR_MONTH]||0); })()`));
console.log('exec popout:', E(`(function(){ openExecSummaryPopout(); var p=document.getElementById('exec-sum-pop'); return p?('len='+p.innerHTML.length):'no-pop'; })()`));
