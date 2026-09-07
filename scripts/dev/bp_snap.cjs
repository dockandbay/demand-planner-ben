process.on('unhandledRejection',()=>{}); process.on('uncaughtException',()=>{});
const {JSDOM}=require("/Users/bm/Documents/CLAUDE/horizon-demand-and-supply-planner/node_modules/jsdom"); const fs=require("fs");
const html=fs.readFileSync(process.argv[2],"utf8"); const out=process.argv[3];
const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,url:"http://localhost:8124/",
  beforeParse(w){ w.fetch=(u)=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(/\/api\/(me|version)/.test(String(u))?{}:[]),text:()=>Promise.resolve("")}); w.scrollTo=()=>{}; w.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}); w.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}}; w.IntersectionObserver=class{observe(){}unobserve(){}disconnect(){}}; w.HTMLElement.prototype.scrollIntoView=()=>{}; }});
const win=dom.window;
function run(js){ const s=win.document.createElement("script"); s.textContent=js; win.document.body.appendChild(s); }
setTimeout(()=>{ run(`try{ buildLiveDemand(); buildLiveBpOverlay(); }catch(e){ window.__err=String(e&&e.message||e); }`);
  run(`(function(){ var o={err:window.__err||null,mkts:{},skus:Object.keys(SKUM).length};
    try{ var mk=['UK','US','EU','AU','CA'];
      mk.forEach(function(m){ var map={},t=0,n=0; BP.BUY_CACHE={}; BP.CUR=m;
        var skus=Object.keys(BP_DATA.products||{}); skus.forEach(function(sku){ var p=BP_DATA.products[sku]; if(!p||!p.mkts||!p.mkts[m])return; try{ var pr=BP.project(p.mkts[m],p,0,m,null,sku); var q=0,qu=0; (pr||[]).forEach(function(x){ q+=(x.bQ||0); qu+=(x.bQu||0); }); if(q||qu){ map[sku]=[q,qu]; t+=q+qu; n++; } }catch(e){} });
        o.mkts[m]={skus:n,units:t,map:map}; });
    }catch(e){ o.bpErr=String(e&&e.message||e); }
    var el=document.createElement('div'); el.id='__snap'; el.textContent=JSON.stringify(o); document.body.appendChild(el); })();`);
  setTimeout(()=>{ const el=win.document.getElementById('__snap'); const txt=el?el.textContent:'{"err":"NO RESULT"}'; fs.writeFileSync(out,txt);
    const o=JSON.parse(txt); console.log('err:',o.err,o.bpErr||'', 'SKUM:',o.skus); Object.keys(o.mkts||{}).forEach(m=>console.log(m,'skus',o.mkts[m].skus,'units',o.mkts[m].units)); process.exit(0); }, 4000); }, 6000);
