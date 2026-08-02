import { JSDOM } from 'jsdom';
const res=await fetch('http://localhost:8124/'); let html=await res.text();
const scripts=[]; html=html.replace(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi,(m,c)=>{scripts.push(c);return '';});
const dom=new JSDOM(html,{url:'http://localhost:8124/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window; w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}}); w.scrollTo=()=>{}; w.fetch=fetch;
if(!w.ResizeObserver)w.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};
for(const c of scripts){ try{ w.eval(c); }catch(e){} }
await new Promise(r=>setTimeout(r,1800));
function E(c){ try{ return String(w.eval(c)); }catch(e){ return 'ERR:'+(e&&e.message||e); } }
console.log('buttons in country row:', E(`(function(){ VIEW_MODE='planning'; DEMAND_VIEW='plan'; planRevBtnSync(); var c=document.getElementById('plan-report-btns'); var row=document.getElementById('ctabs-row'); return c?('inCtabs='+(c.parentNode===row)+' align='+c.style.marginLeft+' n='+c.querySelectorAll('button').length):'none'; })()`));
console.log('rev drawer opens full:', E(`(function(){ try{ openPlanRevPopout(); var d=document.getElementById('rev-drawer'); return d?('width='+d.style.width+' bodyExists='+!!document.getElementById('rev-drawer-body')):'no-drawer'; }catch(e){return 'ERR:'+e.message;} })()`));
console.log('buymove ver badge:', E(`(function(){ if(!document.getElementById('view-tabs-row')){var v=document.createElement('div');v.id='view-tabs-row';document.body.appendChild(v);} renderBuyMoveTabs(); var bar=document.getElementById('buymove-tabs'); var ver=document.getElementById('ver'); return bar?('verInBar='+(ver&&ver.parentNode===bar)):'no-bar'; })()`));
