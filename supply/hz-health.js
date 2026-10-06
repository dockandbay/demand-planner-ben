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
  window.__hzHealth={src:SRC,ep:EP,queue:q,flush:function(){flush(false);}};
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
  var LOADSEL='.count,.mut,.cp-lead,.pv-empty,.ask-empty', pend=null;
  function loading(){ var els=document.querySelectorAll(LOADSEL); for(var i=0;i<els.length;i++){ var t=els[i].textContent; if(t&&t.length<120&&/^\s*Loading/.test(t)&&els[i].offsetParent!==null)return true; } return false; }
  function watch(t0,first){ var id={}; pend=id; var quiet=0, qms=0;   // two quiet ticks in a row = rendered (the app's own hashchange handler may run after ours)
    (function tick(){ if(pend!==id)return; var ms=(first?performance.now():Date.now()-t0);
      if(ms>60000){ pend=null; add('slow_view','View still loading after 60s: '+view(),null,ms,{timeout:true,first:!!first}); return; }
      if(document.readyState!=='loading'&&!loading()){ if(!quiet++)qms=ms; if(quiet>=2){ pend=null; if(qms>SLOW_VIEW_MS)add('slow_view','Slow view load: '+view(),null,qms,{first:!!first}); return; } } else quiet=0;
      setTimeout(tick,300); })(); }
  window.addEventListener('hashchange',function(){ watch(Date.now(),false); });
  watch(0,true);
  setInterval(function(){ flush(false); },10000);
  window.addEventListener('pagehide',function(){ flush(true); });
  document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='hidden')flush(true); });
})();
