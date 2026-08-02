import { JSDOM } from 'jsdom';
const res=await fetch('http://localhost:8124/'); let html=await res.text();
const scripts=[]; html=html.replace(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi,(m,c)=>{scripts.push(c);return '';});
const dom=new JSDOM(html,{url:'http://localhost:8124/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window; w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}}); w.scrollTo=()=>{}; w.fetch=fetch;
if(!w.ResizeObserver)w.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};
for(const c of scripts){ try{ w.eval(c); }catch(e){} }
await new Promise(r=>setTimeout(r,2000));
function E(c){ try{ return String(w.eval(c)); }catch(e){ return 'ERR:'+(e&&e.message||e); } }
console.log('open exec drawer:', E(`(function(){ if(!document.querySelector('.wrap')){var w2=document.createElement('div');w2.className='wrap';document.body.appendChild(w2);} openExecSummaryPopout(); return 'drawer-exists='+!!document.getElementById('exec-drawer'); })()`));
await new Promise(r=>setTimeout(r,300));
console.log('full exec rendered in drawer:', E(`(function(){ var b=document.getElementById('exec-drawer-body'); if(!b)return 'no-body'; var h=b.innerHTML; return 'execWrap='+(b.querySelector('#exec-wrap')?'yes':'no')+' hasFY27='+(h.indexOf('FY27')>=0)+' hasChannel='+(h.indexOf('Channel')>=0)+' len='+h.length; })()`));
console.log('drawer width 50vw:', E(`(function(){ var d=document.getElementById('exec-drawer'); return d?d.style.width:'?'; })()`));
console.log('float buttons top:', E(`(function(){ VIEW_MODE='planning'; DEMAND_VIEW='plan'; planRevBtnSync(); var c=document.getElementById('plan-report-float'); return c?('n='+c.querySelectorAll('button').length+' top='+c.style.top):'none'; })()`));
