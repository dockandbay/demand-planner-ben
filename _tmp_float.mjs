import { JSDOM } from 'jsdom';
const res=await fetch('http://localhost:8124/'); let html=await res.text();
const scripts=[]; html=html.replace(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi,(m,c)=>{scripts.push(c);return '';});
const dom=new JSDOM(html,{url:'http://localhost:8124/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window; let mob=false; w.matchMedia=()=>({matches:mob,addListener(){},removeListener(){}}); w.scrollTo=()=>{}; w.fetch=fetch;
for(const c of scripts){ try{ w.eval(c); }catch(e){} }
await new Promise(r=>setTimeout(r,1500));
function E(c){ try{ return String(w.eval(c)); }catch(e){ return 'ERR:'+(e&&e.message||e); } }
console.log('desktop:', E(`(function(){ VIEW_MODE='planning'; DEMAND_VIEW='plan'; planRevBtnSync(); var c=document.getElementById('plan-report-float'); return c?('btns='+c.querySelectorAll('button').length+' pos='+c.style.position+' right='+c.style.right):'none'; })()`));
console.log('inline removed:', E(`document.getElementById('plan-report-btns')?'still-there':'gone'`));
mob=true; w.__mob=true;
console.log('mobile hides:', E(`(function(){ window.matchMedia=function(){return{matches:true,addListener(){},removeListener(){}};}; planRevBtnSync(); return document.getElementById('plan-report-float')?'still-there':'removed'; })()`));
