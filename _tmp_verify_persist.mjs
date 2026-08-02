import { JSDOM } from 'jsdom';
const res = await fetch('http://localhost:8124/');
let html = await res.text();
console.log('green style present in HTML:', /id="qry"[\s\S]{0,160}#86efac/.test(html));
const scripts=[]; html=html.replace(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi,(m,c)=>{scripts.push(c);return '';});
const dom=new JSDOM(html,{url:'http://localhost:8124/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;
w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}}); w.scrollTo=()=>{}; w.fetch=fetch;
for(const code of scripts){ try{ w.eval(code); }catch(e){} }
await new Promise(r=>setTimeout(r,1500));
function E(code){ try{ return String(w.eval(code)); }catch(e){ return 'ERR:'+(e&&e.message||e); } }
console.log('BP.restoreFilters:', E('typeof (window.BP&&BP.restoreFilters)'));
// fresh blob -> should restore qry
console.log('fresh restore qry:', E(`(function(){
  var q=document.createElement('input'); q.id='qry'; document.body.appendChild(q);
  localStorage.setItem('hzBuyFilters', JSON.stringify({ti:['A'],st:['ACTIVE'],cs:['Core'],bu:{buy:'URGENT'},qry:'PICNIC-CAB',ts:Date.now()}));
  BP.restoreFilters(); return document.getElementById('qry').value;
})()`));
// stale blob (>1h) -> should be ignored
console.log('stale ignored qry:', E(`(function(){
  document.getElementById('qry').value='';
  localStorage.setItem('hzBuyFilters', JSON.stringify({qry:'SHOULDNOT',ts:Date.now()-3700000}));
  BP.restoreFilters(); return JSON.stringify(document.getElementById('qry').value);
})()`));
