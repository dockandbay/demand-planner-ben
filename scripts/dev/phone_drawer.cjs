process.on('unhandledRejection',()=>{}); process.on('uncaughtException',()=>{});
const {JSDOM}=require("/Users/bm/Documents/CLAUDE/horizon-demand-and-supply-planner/node_modules/jsdom"); const fs=require("fs");
const html=fs.readFileSync(process.argv[2],"utf8");
const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,url:"http://localhost:8124/#/demand/plan",
  beforeParse(w){ w.fetch=(u)=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(/\/api\/(me|version)/.test(String(u))?{}:[]),text:()=>Promise.resolve("")}); w.scrollTo=()=>{}; w.matchMedia=(q)=>({matches:/max-width/.test(q),media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}); Object.defineProperty(w,'innerWidth',{value:390}); }});
const win=dom.window;
function label(b){ if(b.classList.contains('hz-grp-lbl')) return '['+b.textContent.trim()+']'; var pre=b.classList.contains('hz-sub2')?'    · ':(b.classList.contains('hz-sub')?'  - ':''); return pre+b.textContent.trim()+(b.classList.contains('active')?' *':''); }
setTimeout(function(){ var d=win.document; var panel=d.querySelector('#dab-navwrap .mob-filt-panel'), btn=d.querySelector('#dab-navwrap .mob-filt-toggle');
  console.log('filters panel open at load:', !!(panel&&panel.classList.contains('open')));
  if(btn&&panel){ btn.click(); console.log('after tap:', panel.classList.contains('open')); btn.click(); console.log('after 2nd tap:', panel.classList.contains('open')); }
  var bg=d.getElementById('hz-burger'); if(!bg){ console.log('no burger'); process.exit(0); }
  bg.click();
  var items=Array.prototype.slice.call(d.querySelectorAll('#hz-drawer .hz-item, #hz-drawer .hz-grp-lbl')); console.log('drawer ('+items.length+' rows):'); items.forEach(function(b){ console.log('  '+label(b)); });
  var tgt=Array.prototype.slice.call(d.querySelectorAll('#hz-drawer .hz-item.hz-sub2')).filter(function(b){ return /^Trends$/.test(b.textContent.trim()); })[0];
  if(!tgt){ console.log('no Trends item'); process.exit(0); }
  tgt.click();
  setTimeout(function(){ var tabs=Array.prototype.slice.call(d.querySelectorAll('.d3nav .d3tab')).filter(function(b){ return b.offsetParent!==null || true; }).map(function(b){ return b.textContent.trim()+(b.classList.contains('active')?'*':''); });
    console.log('after tapping Trends: hash', win.location.hash, '| DEMAND_VIEW', win.DEMAND_VIEW, '| drawer open:', d.getElementById('hz-drawer').classList.contains('open'), '| L3 row:', tabs.join(' | ')); process.exit(0); }, 1500);
}, 7000);
