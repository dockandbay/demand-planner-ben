import { JSDOM } from 'jsdom';
const res = await fetch('http://localhost:8124/');
let html = await res.text();
const scripts=[]; html=html.replace(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi,(m,c)=>{scripts.push(c);return '';});
const dom=new JSDOM(html,{url:'http://localhost:8124/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;
w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
w.scrollTo=()=>{}; w.fetch=fetch;
for(const code of scripts){ try{ w.eval(code); }catch(e){} }
await new Promise(r=>setTimeout(r,2500));
function E(code){ try{ return String(w.eval(code)); }catch(e){ return 'ERR:'+(e&&e.stack||e).split('\n').slice(0,3).join(' | '); } }
console.log('setup btns:', E(`(function(){ VIEW_MODE='planning'; DEMAND_VIEW='plan'; if(!document.getElementById('catrow1-wrap')){var d=document.createElement('div');d.id='catrow1-wrap';document.body.appendChild(d);} planRevBtnSync(); var c=document.getElementById('plan-report-btns'); return c?('n='+c.querySelectorAll('button').length+' align='+c.style.marginLeft):'no-container'; })()`));
console.log('exec pop:', E(`(function(){ openExecSummaryPopout(); var p=document.getElementById('exec-sum-pop'); if(!p)return 'no-pop'; var h=p.innerHTML; return 'len='+h.length+' hdr='+(h.indexOf('Executive summary')>=0)+' chan='+(h.indexOf('By channel')>=0)+' fy='+(h.indexOf('FY27')>=0)+' dtc='+(h.indexOf('DTC')>=0); })()`));
console.log('toggle-close:', E(`(function(){ openExecSummaryPopout(); return document.getElementById('exec-sum-pop')?'still-open':'closed-ok'; })()`));
console.log('mobile hides:', E(`(function(){ w0=window.matchMedia; window.matchMedia=function(){return {matches:true,addListener(){},removeListener(){}};}; planRevBtnSync(); var r=document.getElementById('plan-report-btns')?'still-there':'removed'; window.matchMedia=w0; return r; })()`));
