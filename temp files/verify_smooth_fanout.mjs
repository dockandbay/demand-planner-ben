// Verifies Diviyaj's 3 asks by running the ACTUAL v27.323 function bodies (copied verbatim from
// artifact_v16.7.html) against a mocked fetch. Proves: (1) one POST per FY smooth not 12, (2) audit rows
// match old per-month behaviour, (3) a forced failure buffers via _savePausedUntil instead of vanishing.

// ── mocked globals / constants (match the artifact) ──────────────────────────
var SAVE_CHUNK=5000, SAVE_MAX_FAILS=6, SAVE_COOLDOWN_MS=60000, SAVE_BACKOFF=[0,0,0,0,0,0];
var _savePausedUntil=0, _CHG_BUFFER=[], FC_CHANGE_KEYS=new Set();
function st(){}                          // status line — no-op
function _meEmail(){ return 'ben@dockandbay.com'; }

// network mock: count calls + capture bodies; toggle FAIL to force failures
var POSTS=[], FAIL=false;
async function fetch(url,opt){
  POSTS.push({url:url, body:JSON.parse(opt.body)});
  if(FAIL) return { ok:false, status:500, json:async()=>({error:'EMAXCONN: max client connections reached'}) };
  var slice = JSON.parse(opt.body).rows || JSON.parse(opt.body).changes || [];
  return { ok:true, status:200, json:async()=>({ok:true, saved:slice.length}) };
}

// ── ACTUAL v27.323 bodies (verbatim) ────────────────────────────────────────
async function postChangesBatched(url,items,extra,label,payloadKey){
  var _pk=payloadKey||'changes';
  var saved=0, total=items.length, fails=0, tries=0;
  for(var i=0;i<total;){
    var slice=items.slice(i,i+SAVE_CHUNK);
    try{
      var _body={}; _body[_pk]=slice;
      var resp=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign(_body,extra||{}))});
      var data=await resp.json();
      if(!resp.ok||data.error)throw new Error((data&&data.error)||('HTTP '+resp.status));
      saved+=(data.saved!=null?data.saved:slice.length);
      i+=SAVE_CHUNK; fails=0; tries=0;
    }catch(e){
      fails++;
      if(fails>=SAVE_MAX_FAILS){ _savePausedUntil=Date.now()+SAVE_COOLDOWN_MS;
        throw new Error('save paused after '+fails+' consecutive failures: '+((e&&e.message)||e)); }
      var wait=SAVE_BACKOFF[Math.min(tries,SAVE_BACKOFF.length-1)]; tries++;
      await new Promise(function(r){setTimeout(r,wait);});
    }
  }
  return saved;
}
function logChangesBulk(rows){ if(!rows||!rows.length)return;
  rows.forEach(function(r){ FC_CHANGE_KEYS.add((r.level||'sku')+'|'+r.item+'|'+r.country+'|'+r.channel+'|'+r.month); });
  if(typeof _savePausedUntil!=='undefined' && Date.now()<_savePausedUntil){ try{ Array.prototype.push.apply(_CHG_BUFFER,rows); }catch(e){} return; }
  try{
    postChangesBatched('/api/forecast/changes/bulk',rows,{actor:_meEmail()},'Recording changes','rows')
      .catch(function(){ try{ Array.prototype.push.apply(_CHG_BUFFER,rows); }catch(e){} });
  }catch(e){ try{ Array.prototype.push.apply(_CHG_BUFFER,rows); }catch(_e){} } }

// applySmoothAlloc body (verbatim) — with a mock skuOutFC / skuOvSet
var WRITTEN={};                          // captures overrides actually written (the forecast effect)
function skuOutFC(sku,co,ch,m){ return null; }              // no prior value → every cell is a change
function skuOvSet(sku,co,ch,m,nv){ WRITTEN[[sku,co,ch,m].join('|')]=nv; }
function applySmoothAlloc(co,ch,m,vals){
  var _chg=[];
  Object.keys(vals||{}).forEach(function(sku){ var _old=skuOutFC(sku,co,ch,m); var nv=vals[sku]; skuOvSet(sku,co,ch,m,nv);
    if(_old==null||Math.round(_old)!==Math.round(nv)) _chg.push({level:'sku',item:sku,country:co,channel:ch,month:m,action:'smoothed',from:(_old!=null?Math.round(_old):null),to:Math.round(nv)}); });
  return _chg;
}

// ── build a realistic FY-wide preview: 12 months × 8 SKUs ────────────────────
var co='UK', ch='DTC';
var SMOOTH_PREVIEW={pk:'k', fy:2026, months:{}};
var MONTHS=['2026-08','2026-09','2026-10','2026-11','2026-12','2027-01','2027-02','2027-03','2027-04','2027-05','2027-06','2027-07'];
var SKUS=['BAGDRY-XS-BLUSKY','BAGDRY-S-BLUSKY','BAGDRY-M-BLUSKY','BAGDRY-L-BLUSKY','TOWBEA-CORAL','TOWBEA-NAVY','PONCHO-KID','PONCHO-AD'];
MONTHS.forEach(function(m,mi){ var o={}; SKUS.forEach(function(s,si){ o[s]=100+mi*10+si; }); SMOOTH_PREVIEW.months[m]=o; });

// NEW (v27.323) applySmoothPreview accumulation (verbatim control flow)
function applySmoothPreview(){
  if(!SMOOTH_PREVIEW||!SMOOTH_PREVIEW.months)return;
  var _allChg=[];
  Object.keys(SMOOTH_PREVIEW.months).forEach(function(mo){ _allChg=_allChg.concat(applySmoothAlloc(co,ch,mo,SMOOTH_PREVIEW.months[mo])||[]); });
  try{ logChangesBulk(_allChg); }catch(e){}
}

// OLD (v27.307) behaviour — one un-awaited fetch PER MONTH — for the row-count parity check
function oldPerMonthAudit(){
  var oldRows=[];
  Object.keys(SMOOTH_PREVIEW.months).forEach(function(mo){
    var chg=applySmoothAlloc(co,ch,mo,SMOOTH_PREVIEW.months[mo])||[];   // same alloc
    oldRows=oldRows.concat(chg);                                        // old fired one POST of `chg` per month
  });
  return oldRows;
}

// ── run the checks ───────────────────────────────────────────────────────────
var results=[];
function check(name,pass,detail){ results.push({name,pass,detail}); }

(async ()=>{
  // expected row count the OLD code would have written
  var oldRows=oldPerMonthAudit();          // 12 months × 8 skus = 96
  WRITTEN={};                              // reset written map before the new run

  // TEST 1 + 2 : happy path — one request, correct rows
  POSTS=[]; FAIL=false; _savePausedUntil=0; _CHG_BUFFER=[];
  applySmoothPreview();
  await new Promise(r=>setTimeout(r,20));   // let the un-awaited .then settle

  check('1. FY smooth issues ONE POST (not 12)', POSTS.length===1, POSTS.length+' POST(s)');
  check('1b. that POST targets the bulk audit endpoint', POSTS[0] && POSTS[0].url==='/api/forecast/changes/bulk', POSTS[0] && POSTS[0].url);
  check("1c. payload uses key 'rows' (server reads b.rows, no server change)",
        POSTS[0] && Array.isArray(POSTS[0].body.rows) && POSTS[0].body.changes===undefined,
        POSTS[0] && Object.keys(POSTS[0].body).join(','));
  var sentRows = POSTS[0] ? POSTS[0].body.rows.length : 0;
  check('2. audit rows sent == old per-month total', sentRows===oldRows.length, sentRows+' vs '+oldRows.length);
  // forecast effect parity: every override written matches the old alloc (maths unchanged)
  var writtenCount=Object.keys(WRITTEN).length;
  check('2b. forecast overrides written == 12×8', writtenCount===96, writtenCount+' cells');

  // TEST 3 : forced failure → circuit breaker pauses + rows buffered, NOT vanished
  POSTS=[]; FAIL=true; _savePausedUntil=0; _CHG_BUFFER=[];
  logChangesBulk(oldRows.slice());          // 96 rows, all POSTs fail
  await new Promise(r=>setTimeout(r,50));    // let retries + circuit-breaker run (SAVE_BACKOFF all 0)
  check('3. after forced failure _savePausedUntil is set', _savePausedUntil>Date.now(), 'pausedUntil-now='+(_savePausedUntil-Date.now())+'ms');
  check('3b. failed rows re-buffered (not silently dropped)', _CHG_BUFFER.length===96, _CHG_BUFFER.length+' buffered');
  check('3c. it retried SAVE_MAX_FAILS times then gave up', POSTS.length===SAVE_MAX_FAILS, POSTS.length+' attempts');

  // TEST 3d : while paused, a NEW bulk call buffers immediately (doesn't pile on the pooler)
  POSTS=[]; _CHG_BUFFER=[];                   // _savePausedUntil still in the future from test 3
  logChangesBulk(oldRows.slice(0,10));
  await new Promise(r=>setTimeout(r,10));
  check('3d. while paused, new smooth buffers with ZERO new POSTs', POSTS.length===0 && _CHG_BUFFER.length===10, POSTS.length+' posts / '+_CHG_BUFFER.length+' buffered');

  // report
  console.log('\n  v27.323 smoothing fan-out verification\n  '+'-'.repeat(52));
  var ok=true;
  results.forEach(function(r){ if(!r.pass)ok=false; console.log('  '+(r.pass?'PASS':'FAIL')+'  '+r.name+'   ['+r.detail+']'); });
  console.log('  '+'-'.repeat(52));
  console.log('  '+(ok?'ALL PASS':'*** FAILURES ***')+'\n');
  process.exit(ok?0:1);
})();
