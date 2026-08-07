import { JSDOM } from 'jsdom';
const html = await (await fetch('http://localhost:8124/')).text();
const errs=[];
const dom = new JSDOM(html, { runScripts:'dangerously', pretendToBeVisual:true, url:'http://localhost:8124/',
  beforeParse(w){ w.fetch=()=>Promise.resolve({json:()=>Promise.resolve([]),text:()=>Promise.resolve('')}); w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}}); w.scrollTo=()=>{}; w.requestAnimationFrame=(cb)=>setTimeout(cb,0); w.confirm=()=>true; w.addEventListener('error',e=>errs.push('ERR: '+(e.error&&e.error.stack||e.message))); w.addEventListener('unhandledrejection',e=>errs.push('REJ: '+(e.reason&&e.reason.stack||e.reason))); } });
const w=dom.window; await new Promise(r=>setTimeout(r,1800));
try{ var body=w.document.createElement('div'); w.document.body.appendChild(body); errs.length=0;
  var t0=Date.now(); w.renderTargetRecs(body); await new Promise(r=>setTimeout(r,900));
  console.log('render ms:', Date.now()-t0, '| body len:', body.innerHTML.length, '| has counters:', /trec-fy/.test(body.innerHTML), '| apply1 btns:', (body.innerHTML.match(/trec-apply1/g)||[]).length, '| dismiss btns:', (body.innerHTML.match(/trec-dismiss/g)||[]).length);
}catch(e){ errs.push('THROW: '+(e&&e.stack||e)); }
console.log('--errors--', errs.length?('\n'+errs.slice(0,4).join('\n--\n')):'none');
