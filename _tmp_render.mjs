import { JSDOM } from 'jsdom';
const res = await fetch('http://localhost:8124/');
let html = await res.text();
const scripts=[]; html=html.replace(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi,(m,c)=>{scripts.push(c);return '';});
const dom=new JSDOM(html,{url:'http://localhost:8124/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window; w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}}); w.scrollTo=()=>{}; w.fetch=fetch;
if(!w.ResizeObserver)w.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};
for(const code of scripts){ try{ w.eval(code); }catch(e){} }
await new Promise(r=>setTimeout(r,2500));
function E(code){ try{ return w.eval(code); }catch(e){ return 'ERR:'+(e&&e.message||e); } }
// ensure a .wrap host + main-hdr exist for renderBuyView
E(`if(!document.querySelector('.wrap')){var d=document.createElement('div');d.className='wrap';document.body.appendChild(d);} if(!document.getElementById('main-hdr')){var t=document.createElement('table');var th=document.createElement('thead');th.id='main-hdr';t.appendChild(th);document.querySelector('.wrap').appendChild(t);} 'ok'`);
console.log('renderBuyView type:', E(`typeof renderBuyView`));
const r=E(`(function(){ try{ renderBuyView('buy'); }catch(e){ return 'render-err:'+e.message; }
  var q=document.getElementById('qry'); if(q){ q.value='HAIRW-SUE-OCETRES'; } if(window.BP)BP.render();
  var tb=document.getElementById('tb'); if(!tb)return 'no-tb';
  var h=tb.innerHTML;
  var hasChip=h.indexOf('⇄')>=0; var has300=h.indexOf('⇄ 300')>=0 || /⇄\\s*300/.test(h);
  return 'rows='+tb.querySelectorAll('tr.sr').length+' hasChip='+hasChip+' has300='+has300;
})()`);
console.log('RENDER '+r);
