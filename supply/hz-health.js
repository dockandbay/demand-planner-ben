// v28.159 (Ben): browser health capture, ONE shared snippet for the staff shell (inlined into <head> by server.mjs so it sees
// artefact boot errors), the supplier portal (supply/portal.html) and the client portal (supply/client.html), both served as
// /hz-health.js. Captures window errors, unhandled rejections, console.error (calls through to the original) and slow view
// loads (hash change or first load until no "Loading…" panel is visible; > 3s is recorded with the view). Identical messages
// are sent once per page session, at most 20 events a minute, batched every 10s and on pagehide (sendBeacon, falling back to
// fetch keepalive). Endpoint by data-hz-src: staff /api/health/client-events, portal /api/portal/..., client_portal /api/cp/...
// Idempotent: a second copy (e.g. portal-view.js previews inside the staff shell) is a no-op. Never throws into the page.
(function(){
  if(window.__hzHealth)return;
  var sc=document.currentScript, SRC=(sc&&sc.getAttribute('data-hz-src'))||'staff', VER=(sc&&sc.getAttribute('data-hz-ver'))||'';
  var EP=SRC==='portal'?'/api/portal/health/client-events':SRC==='client_portal'?'/api/cp/health/client-events':'/api/health/client-events';
  var _fetch=window.fetch, _cerr=console.error, q=[], seen={}, winT=0, winN=0, SLOW_VIEW_MS=3000;
  // v28.188 (Ben): setEp lets the supplier portal LOGIN page (no session yet) send to the unauthenticated, rate-limited login endpoint.
  window.__hzHealth={src:SRC,ep:EP,queue:q,flush:function(){flush(false);},setEp:function(u){ if(typeof u==='string'&&/^\/api\//.test(u)){ EP=u; window.__hzHealth.ep=u; } }};
  function view(){ var h=String(location.hash||'').split('?')[0].slice(0,200); return SRC==='staff'?(h||'#/'):(String(location.pathname||'/')+h).slice(0,200); }
  function str(a){ try{ if(a instanceof Error)return a.message||String(a); if(a&&typeof a==='object')return JSON.stringify(a).slice(0,300); }catch(e){} return String(a); }
  function add(kind,msg,stack,ms,meta){ try{
    msg=String(msg==null?'':msg).slice(0,500); if(!msg)return;
    var k=kind+'|'+msg+(kind==='slow_view'?'|'+view():''); if(seen[k])return; seen[k]=1;   // dedupe per page session
    var now=Date.now(); if(now-winT>60000){winT=now;winN=0;} if(++winN>20)return;           // cap 20 events / minute
    q.push({kind:kind,message:msg,stack:stack?String(stack).slice(0,2000):null,path:view(),ms:ms==null?null:Math.round(ms),v:VER,meta:meta||null});
    if(q.length>50)q.shift();
  }catch(e){} }
  function flush(beacon){ if(!q.length)return; var body; try{ body=JSON.stringify(q.splice(0,50)); }catch(e){ return; }
    try{ if(navigator.sendBeacon&&navigator.sendBeacon(EP,body))return; }catch(e){}             // string body = text/plain (CORS-safelisted)
    try{ _fetch.call(window,EP,{method:'POST',headers:{'Content-Type':'application/json'},body:body,keepalive:true,credentials:'same-origin'}).catch(function(){}); }catch(e){} }
  window.addEventListener('error',function(e){ try{ if(!e||(!e.error&&!e.message))return; if(e.message==='Script error.'&&!e.error)return;   // opaque cross-origin: nothing useful
    add('client_error',e.message||str(e.error),e.error&&e.error.stack,null,{file:e.filename?String(e.filename).slice(0,200):null,line:e.lineno||null,col:e.colno||null}); }catch(_){} });
  window.addEventListener('unhandledrejection',function(e){ try{ var r=e&&e.reason; add('client_error','Unhandled rejection: '+str(r),r&&r.stack,null,null); }catch(_){} });
  console.error=function(){ try{ var a=[].slice.call(arguments), er=null; a.forEach(function(x){ if(!er&&x instanceof Error)er=x; });
    add('console_error',a.map(str).join(' '),er&&er.stack,null,null); }catch(_){} return _cerr.apply(console,arguments); };
  // slow views: from nav (hash change) or first load until no visible "Loading…" panel remains
  // v28.179 (Ben): + any visible [data-hz-loading] panel (the DEMAND / BUY & MOVE / REPORTS cold-entry panels have no .count text, so
  // slow BUY & MOVE > Actions entries were never seen) and "⏳ Loading…" style text (a leading symbol defeated /^\s*Loading/).
  // v28.188 (Ben): + the Chinese portal text "加载中…" (the portal translates "Loading…" in 中文 mode, so slow views never matched there).
  var LOADSEL='.count,.mut,.cp-lead,.pv-empty,.ask-empty', pend=null, manualAt=0;
  function loading(){ var els=document.querySelectorAll(LOADSEL); for(var i=0;i<els.length;i++){ var t=els[i].textContent; if(t&&t.length<120&&/^[^A-Za-z0-9]{0,4}(Loading|加载中)/.test(t)&&els[i].offsetParent!==null)return true; }
    var pn=document.querySelectorAll('[data-hz-loading]'); for(var j=0;j<pn.length;j++)if(pn[j].offsetParent!==null)return true; return false; }
  function watch(t0,first){ var id={}; pend=id; var quiet=0, qms=0;   // two quiet ticks in a row = rendered (the app's own hashchange handler may run after ours)
    (function tick(){ if(pend!==id)return; var ms=(first?performance.now():Date.now()-t0);
      if(ms>60000){ pend=null; add('slow_view','View still loading after 60s: '+view(),null,ms,{timeout:true,first:!!first}); return; }
      if(document.readyState!=='loading'&&!loading()){ if(!quiet++)qms=ms; if(quiet>=2){ pend=null; if(qms>SLOW_VIEW_MS)add('slow_view','Slow view load: '+view(),null,qms,{first:!!first}); return; } } else quiet=0;
      setTimeout(tick,300); })(); }
  window.addEventListener('hashchange',function(){ if(Date.now()-manualAt<1000)return; watch(Date.now(),false); });   // v28.188: a view that started its own watch (hzHealthWatch) just before changing the hash keeps that start time
  watch(0,true);
  // v28.188 (Ben): hzHealthWatch(): an app that renders a view BEFORE it changes the hash (the supplier portal's tab click renders, then
  // sets #/<section>/<tab>) starts the slow-view timer itself at the click; the hashchange that follows within 1s does not restart it.
  window.hzHealthWatch=function(){ try{ manualAt=Date.now(); watch(manualAt,false); }catch(e){} };
  // v28.163 (Ben): AGGREGATED captures, kept in memory and sent as one row per group every 60s and on pagehide / tab hidden:
  //  long_task  : main-thread tasks >= 1s (PerformanceObserver 'longtask', buffered), per normalised view: count, max, sum; <= 10 a minute.
  //  api_failure: same-origin /api calls seen by THIS browser that failed: network error, timeout, status >= 500, 408 / 429, or
  //               slower than 10s; per method + normalised path + status. Health posts and /hz-health.js are never recorded.
  //  page_view  : visits + active seconds (visible tab only) per normalised view; ids in the hash become :id.
  //  dead_click : v28.179 (Ben) staff nav presses that changed nothing within 1.5 s, per view + nav label (see below).
  // window.fetch is wrapped HERE, i.e. innermost: this script runs first in <head>, so the shell's own wrappers (memo / in-flight
  // sharing, the activity counter and __hzBg, the 403/401 handler) wrap this one and keep working unchanged; init is passed through
  // untouched. Memo hits never reach the network, so they are (correctly) not seen. Cost per fetch: one performance.now() + one then().
  var LT={}, ltT=0, ltN=0, API={}, PV={}, curV=null, curT=0, vis=document.visibilityState!=='hidden', AGG_MS=60000;
  var API_SKIP=/^\/(api\/(health\/|portal\/health\/|cp\/health\/)|hz-health\.js)/;
  function nv(h){ return String(h||'').split('?')[0].split('/').map(function(s){ return /^v\d{1,2}$/.test(s)?s:(s.length>24||/^\d+$/.test(s)||(/\d/.test(s)&&s.length>=5))?':id':s; }).join('/').slice(0,200); }
  function nview(){ return nv(view()); }
  function ltNote(ms,v){ try{ if(!(ms>=1000))return false; var now=Date.now(); if(now-ltT>60000){ltT=now;ltN=0;} if(++ltN>10)return false;
    v=v||nview(); var a=LT[v]||(LT[v]={n:0,max:0,sum:0}); a.n++; a.sum+=ms; if(ms>a.max)a.max=ms; return true; }catch(e){ return false; } }
  try{ if(window.PerformanceObserver&&PerformanceObserver.supportedEntryTypes&&PerformanceObserver.supportedEntryTypes.indexOf('longtask')>=0)
    new PerformanceObserver(function(l){ try{ var es=l.getEntries(); for(var i=0;i<es.length;i++)if(es[i].duration>=1000)ltNote(es[i].duration); }catch(_){} }).observe({type:'longtask',buffered:true}); }catch(e){}
  function apiPath(u){ var s=String(u||''); if(/^https?:/i.test(s)){ if(s.indexOf(location.origin+'/')!==0)return null; s=s.slice(location.origin.length); }
    if(s.indexOf('/api/')!==0||API_SKIP.test(s))return null; return nv(s); }
  // v28.188 (Ben): the supplier portal also records 4xx (session expired 401, "not your shipment" 403, 404, validation 400 / 409):
  // to a supplier these are failures too. The sign-in probe (GET /api/portal/me answering 401 on the login page) is expected, not a failure.
  function PORTAL4xx(m,p,s){ return SRC==='portal'&&!(s===401&&m==='GET'&&p==='/api/portal/me'); }
  function apiNote(m,p,st,ms,err){ var k=m+' '+p+' '+st, a=API[k]; if(!a){ if(Object.keys(API).length>=40)return; a=API[k]={m:m,p:p,s:st,n:0,max:0,err:null}; } a.n++; if(ms>a.max)a.max=ms; if(err)a.err=err; }
  if(typeof _fetch==='function'){ window.fetch=function(input,init){
    var t0=0, u='', m='GET'; try{ t0=performance.now(); u=(typeof input==='string')?input:((input&&input.url)||String(input||'')); m=String((init&&init.method)||(input&&input.method)||'GET').toUpperCase(); }catch(e){}
    var p=_fetch.apply(window,arguments);
    try{ var path=apiPath(u); if(path&&p&&typeof p.then==='function')p.then(function(r){ try{ var ms=performance.now()-t0, s=r.status; if(s>=500||s===408||s===429||ms>10000||(s>=400&&PORTAL4xx(m,path,s)))apiNote(m,path,s,Math.round(ms),(ms>10000&&s<500)?'slow':null); }catch(_){} },
      function(e){ try{ var n=e&&e.name; if(n==='AbortError')return; apiNote(m,path,0,Math.round(performance.now()-t0),n==='TimeoutError'?'timeout':'network'); }catch(_){} }); }catch(e){}
    return p; }; }
  // v28.179 (Ben): dead_click: a press on a NAV item (left rail L1 / L2 / L3, top view toggles, L2 / L3 tab bars) that is not
  // already the active one, after which neither the route nor the active nav item changes and no loading panel appears within
  // 1.5 s. Aggregated per view + label like long_task (count, <= 10 a minute). Clicks on anything else are never looked at.
  var DC={}, dcT=0, dcN=0, dcPend=null, DEAD_MS=1500;
  var NAVSEL='#hz-leftrail .rl1,#hz-leftrail .rl2,#hz-leftrail .rl3,#view-tabs-row .view-toggle,.hz-l2 .dnav,.d3nav .d3tab,#supply-subnav .stab,#rep-subnav .rtab,#act-subnav .rtab,#product-subnav .stab,#client-subnav .stab,#config-subs .rtab,#config-subs-l3 .rtab,#perf-subnav .rtab'
    +',#hz-drawer .hz-nav,#prod-subtabs .rtab,#pcfg-subs-l3 .rtab,#client-l3 .rtab,#tpl-subnav .dnav3'   // v28.184 (Ben): + the phone drawer tree (L1 / L2 / L3) and the L3 bars the drawer mirrors
    +',#pp-secs .pp-sec,#pp-tabs .rtab';   // v28.188 (Ben): + the supplier portal's section menu and tab row (same rules, touch-aware)
  function navLabel(el){ try{ var l=el.querySelector('.lab,.hz-lab'), t=l?l.textContent:Array.prototype.filter.call(el.childNodes,function(n){ return n.nodeType===3; }).map(function(n){ return n.textContent; }).join('');
    return String(t||el.textContent||'').replace(/\s+/g,' ').trim().slice(0,60); }catch(e){ return '?'; } }   // v28.184 (Ben): .hz-lab = drawer row label (without its count badge)
  function navOn(el){ var c=el.classList; return !!(c&&(c.contains('active')||c.contains('on'))); }
  function navSig(){ var s=String(location.hash||''); try{ var els=document.querySelectorAll(NAVSEL); for(var i=0;i<els.length;i++)if(navOn(els[i]))s+='|'+navLabel(els[i]); }catch(e){} return s; }
  function dcNote(label,v){ try{ var now=Date.now(); if(now-dcT>60000){dcT=now;dcN=0;} if(++dcN>10)return false;
    var k=v+'|'+label, a=DC[k]||(DC[k]={n:0,label:label,path:v}); a.n++; return true; }catch(e){ return false; } }
  function dcPress(el){ if(!el||navOn(el))return;
    var o=dcPend, sig=navSig(); if(o&&o.sig===sig&&!loading()&&Date.now()-o.t>=400)dcNote(o.label,o.path);   // clicked again because the previous press did nothing: that one was dead
    var p={label:navLabel(el),path:nview(),sig:sig,t:Date.now()}; dcPend=p;
    (function chk(){ if(dcPend!==p)return;   // a newer nav press supersedes this one
      if(navSig()!==p.sig||loading()){ dcPend=null; return; }
      if(Date.now()-p.t>=DEAD_MS){ dcPend=null; dcNote(p.label,p.path); return; }
      setTimeout(chk,250); })(); }
  // v28.184 (Ben): phones. A tap is taken at touchend (a drag / scroll of the drawer is not a press); the compatibility mousedown the
  // browser fires right after the same tap is then ignored, so one tap never counts twice (which would read as "pressed again: dead").
  var dcTouch=null, dcTouchAt=0;
  if(SRC==='staff'||SRC==='portal'){   // v28.188 (Ben): + the supplier portal
    document.addEventListener('mousedown',function(e){ try{ if(e.button!==0||!e.target||!e.target.closest)return; if(Date.now()-dcTouchAt<1000)return; dcPress(e.target.closest(NAVSEL)); }catch(_){} },true);
    document.addEventListener('touchstart',function(e){ try{ var t=e.touches&&e.touches[0]; dcTouch=(e.touches&&e.touches.length===1&&e.target&&e.target.closest)?{el:e.target.closest(NAVSEL),x:t?t.clientX:0,y:t?t.clientY:0,moved:false}:null; }catch(_){ dcTouch=null; } },{capture:true,passive:true});
    document.addEventListener('touchmove',function(e){ try{ var t=e.touches&&e.touches[0]; if(dcTouch&&t&&(Math.abs(t.clientX-dcTouch.x)>10||Math.abs(t.clientY-dcTouch.y)>10))dcTouch.moved=true; }catch(_){} },{capture:true,passive:true});
    document.addEventListener('touchend',function(){ try{ var d=dcTouch; dcTouch=null; if(!d||d.moved||!d.el)return; dcTouchAt=Date.now(); dcPress(d.el); }catch(_){} },{capture:true,passive:true});
  }
  function pvAccrue(){ var now=Date.now(); if(curV&&vis&&curT){ var a=PV[curV]||(PV[curV]={n:0,s:0}); a.s+=(now-curT)/1000; } curT=now; }
  function pvEnter(){ try{ pvAccrue(); curV=nview(); var a=PV[curV]||(PV[curV]={n:0,s:0}); a.n++; }catch(e){} }
  function aggFlush(){ try{ pvAccrue(); var k, a, rows=[];
    for(k in PV){ a=PV[k]; if(a.n||a.s>=1)rows.push({kind:'page_view',message:'page view',path:k,count:Math.max(1,a.n),v:VER,meta:{visits:a.n,active_s:Math.round(a.s)}}); } PV={};
    for(k in LT){ a=LT[k]; rows.push({kind:'long_task',message:'Main thread blocked >= 1s',path:k,ms:Math.round(a.max),count:a.n,v:VER,meta:{sum_ms:Math.round(a.sum)}}); } LT={};
    for(k in DC){ a=DC[k]; rows.push({kind:'dead_click',message:'Dead click: '+a.label,path:a.path,count:a.n,v:VER,meta:{label:a.label}}); } DC={};   // v28.179
    for(k in API){ a=API[k]; rows.push({kind:'api_failure',message:(a.s?'HTTP '+a.s:a.err)+' '+a.m+' '+a.p+(a.err==='slow'?' (> 10s)':''),path:a.p,method:a.m,status:a.s||null,ms:a.max,count:a.n,v:VER,meta:{err:a.err}}); } API={};
    for(var i=0;i<rows.length&&i<60;i++)q.push(rows[i]); return rows.length; }catch(e){ return 0; } }
  window.addEventListener('hashchange',pvEnter); pvEnter();
  document.addEventListener('visibilitychange',function(){ pvAccrue(); vis=document.visibilityState!=='hidden'; });
  // Hook for the apps (owned transport): hzHealthMetric('sanity', message, meta) or hzHealthMetric('metric', name, meta, path).
  window.hzHealthMetric=function(kind,message,meta,path){ try{
    if(kind==='sanity'){ var sk='sanity|'+message; if(seen[sk])return; seen[sk]=1; q.push({kind:'sanity',message:String(message||'').slice(0,500),path:String(path||'client:'+nview()).slice(0,200),v:VER,meta:meta||null}); }   // once per message per page session
    else if(kind==='metric')q.push({kind:'metric',message:String(message||'metric').slice(0,500),path:String(path||message||'').slice(0,200),count:1,v:VER,meta:meta||null}); }catch(e){} };
  window.__hzHealth._t={ltNote:ltNote,aggFlush:aggFlush,nv:nv,apiPath:apiPath,loading:loading,navSig:navSig,state:function(){ return {LT:LT,API:API,PV:PV,DC:DC}; }};   // unit tests
  setInterval(function(){ flush(false); },10000);
  setInterval(function(){ if(aggFlush())flush(false); },AGG_MS);
  window.addEventListener('pagehide',function(){ aggFlush(); flush(true); });
  document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='hidden'){ aggFlush(); flush(true); } });
})();
