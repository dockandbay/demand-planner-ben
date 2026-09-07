process.on('unhandledRejection',()=>{}); process.on('uncaughtException',()=>{});
const {JSDOM}=require("/Users/bm/Documents/CLAUDE/horizon-demand-and-supply-planner/node_modules/jsdom"); const fs=require("fs");
const html=fs.readFileSync(process.argv[2],"utf8");
const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,url:"http://localhost:8124/#/demand/plan",
  beforeParse(w){ w.fetch=(u)=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(/\/api\/(me|version)/.test(String(u))?{}:[]),text:()=>Promise.resolve("")}); w.scrollTo=()=>{}; w.matchMedia=(q)=>({matches:/max-width/.test(q),media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}); Object.defineProperty(w,'innerWidth',{value:390}); Object.defineProperty(w.screen,'width',{value:390}); }});
const win=dom.window;
setTimeout(()=>{ const d=win.document; const nw=d.getElementById('dab-navwrap'); if(!nw){ console.log('no #dab-navwrap'); process.exit(0); }
  console.log('#dab-navwrap children:'); Array.from(nw.children).forEach((k,i)=>{ const txt=(k.textContent||'').replace(/\s+/g,' ').trim().slice(0,90); console.log(' ',i,k.tagName,'#'+(k.id||''),'.'+(k.className||'').toString().slice(0,60),'| pills:',k.querySelectorAll('.pill').length,'inputs:',k.querySelectorAll('input,select').length,'| display:',k.style.display||'-','|',txt); });
  const panel=nw.querySelector('.mob-filt-panel'); console.log('mob-filt-panel present:',!!panel,'open:',panel&&panel.classList.contains('open'),'children:',panel?Array.from(panel.children).map(c=>'#'+(c.id||'')+'.'+(c.className||'').toString().slice(0,30)).join(' , '):'-');
  const l2=d.querySelector('.hz-l2'); console.log('L2 items:',l2?Array.from(l2.querySelectorAll('button,a,.pill,span[data-v]')).map(b=>b.textContent.trim()).filter(Boolean).slice(0,20).join(' | '):'none');
  const d3=d.querySelector('.d3nav'); console.log('D3 items:',d3?Array.from(d3.querySelectorAll('button,a,.pill')).map(b=>b.textContent.trim()).filter(Boolean).slice(0,20).join(' | '):'none');
  const vt=d.getElementById('view-tabs-row'); console.log('view-tabs:',vt?Array.from(vt.querySelectorAll('.view-toggle')).map(b=>b.textContent.trim()+(b.classList.contains('active')?'*':'')).join(' | '):'none');
  process.exit(0); }, 7000);
