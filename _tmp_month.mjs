import { JSDOM } from 'jsdom';
const html = await (await fetch('http://localhost:8124/')).text();
const errs=[];
const dom = new JSDOM(html, { runScripts:'dangerously', pretendToBeVisual:true, url:'http://localhost:8124/',
  beforeParse(w){ w.fetch=()=>Promise.resolve({json:()=>Promise.resolve([]),text:()=>Promise.resolve('')}); w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}}); w.scrollTo=()=>{}; w.requestAnimationFrame=(cb)=>setTimeout(cb,0);
    w.addEventListener('error',e=>errs.push('ERR: '+(e.error&&e.error.stack||e.message))); } });
const w=dom.window;
await new Promise(r=>setTimeout(r,1800));
async function test(group){ w.SUMM_METRIC='revtgt'; w.SUMM_TGT_EDIT=true; w.SUMM_GROUP=group;
  var body=w.document.createElement('div'); w.document.body.appendChild(body); errs.length=0;
  try{ w.renderSummaryView(body); await new Promise(r=>setTimeout(r,500));
    // force the draw path used by the fetch-guard: it draws directly since key mismatch triggers fetch(stub→[]) then draw
    console.log(group+': body len', body.innerHTML.length, '| errs', errs.length?('\n'+errs.slice(0,3).join('\n--\n')):' none');
  }catch(e){ console.log(group+' THROW: '+(e&&e.stack||e)); } }
await test('half'); await test('month');
