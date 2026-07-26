// Supplier-portal renderer — the SINGLE source of truth, used by BOTH the live /portal and the admin
// CONFIG ▸ Portal preview (which mounts DBPortalView with an "acting-as" adapter). Originally extracted
// from inject.html's preview; that inline copy has since been removed, so edit THIS file directly.
// DBPortalView.mount(opts): {root, getData, ep, by, sid, supplierName, bc?}. Includes the label/barcode
// PDF subsystem; the live host's default bc renders via the /api/portal asset + label-data endpoints.
(function(){
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
  var shortUser=function(s){return String(s==null?'':s).replace(/@dockandbay\.com\b/gi,'@');};  // ben@dockandbay.com → ben@ (display only)
  var shortNotes=function(arr){ (arr||[]).forEach(function(n){ if(n){ if(n.body)n.body=shortUser(n.body); if(n.author_email)n.author_email=shortUser(n.author_email); } }); return arr; };
  function money(v){return v==null||v===''?'':Number(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});}
  function units(v){return v==null||v===''?'':Number(v).toLocaleString(undefined,{maximumFractionDigits:0});}
  var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function fd(s){ if(!s)return ''; var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(s)); return m?(m[3]+'-'+MON[+m[2]-1]+'-'+m[1].slice(2)):String(s); }
  function dcell(v){return v?esc(fd(v)):'<span class="mut tiny">—</span>';}
  // Dynamic tracking URL for a carrier + code (DHL / FedEx / UPS / SF Express); '' when the carrier has no tracker.
  function carrierTrackUrl(carrier,code){ var c=String(carrier||'').toLowerCase(), r=String(code||'').trim(); if(!r)return ''; var e=encodeURIComponent(r);
    if(/dhl/.test(c)) return 'https://www.dhl.com/en/express/tracking.html?AWB='+e+'&brand=DHL';
    if(/ups/.test(c)) return 'https://www.ups.com/track?loc=en_US&tracknum='+e;
    if(/fedex|fed ?ex/.test(c)) return 'https://www.fedex.com/fedextrack/?trknbr='+e;
    if(/sf ?express|sf-express|shunfeng|顺丰|順豐/.test(c)) return 'https://www.sf-international.com/us/en/dynamic_function/waybill/#search/bill-number/'+e;
    if(/flex/.test(c)){ var n=(r.match(/\d{6,}/)||[])[0]; return n?'https://app.flexport.com/shipments/'+n:''; }
    return ''; }
  function carrierTrackLink(carrier,code){ var u=carrierTrackUrl(carrier,code); return u?'<a href="'+u+'" target="_blank" rel="noopener" style="color:#1d4ed8;text-decoration:underline;font-weight:700" title="track with '+esc(carrier||'carrier')+' ↗">'+esc(code)+' ↗</a>':esc(code); }
  // Direct-to-Client details apply when the PO branch is Direct to Client (incl. B2B JLEW/NEXT) OR a
  // client sales ref is set — otherwise the DtC tab + approval workflow do not show.
  function ppIsDtc(p){ var b=(p&&p.branch||'').toLowerCase();
    return (b.indexOf('direct to client')>=0||b.indexOf('b2b jlew')>=0||b.indexOf('b2b next')>=0) || (p.sales_order_ref||'').trim()!==''; }
  // once a PO is shipping / shipped / delivered / complete, production is done → DTC approval is no longer an action
  function ppShipped(p){ return /ship|deliver|complete/i.test((p&&p.status)||'') || (p&&p.production_status)==='shipped'; }
  function dtcActionDue(p){ return ppIsDtc(p) && !(p&&p.dtc_accepted_at) && !ppShipped(p); }
  // DTC shipment details (carton count / CBM / weight / dims) become a supplier action once production has ended
  // and nothing's been entered yet (migration 127; entered under portal ▸ SHIPMENT).
  function dtcShipDataDue(p){ return ppIsDtc(p) && !!(p&&p.prod_end) && p.prod_end<new Date().toISOString().slice(0,10) && !(p&&p.dtc_entered_at); }
  // Action notifications only apply from production 55 onward — productions 54 and earlier raise nothing.
  function prodActionable(p){ var pn=parseInt(p&&p.prod_no,10); return !(isFinite(pn) && pn<=54); }
  // FOB pickup — mirrors the main app's isFOBdest: no shipment AND (Manufacturing branch OR a destination that
  // isn't one of our import warehouses UK/US/EU/AU/CA). Used to badge FOB POs on the portal grid.
  function ppIsFOB(p){ if(!p)return false; if(p.shipment)return false; if(/manufactur/i.test(p.branch||''))return true; var c=(p.country||'').trim(); if(!c)return false; return !/^(UK|US|EU|AU|CA)/i.test(c); }   // blank destination = not yet set, NOT FOB
  // debounce: coalesce rapid keystrokes into one call after `ms` quiet
  function debounce(fn,ms){ var t; return function(){ var a=arguments, c=this; clearTimeout(t); t=setTimeout(function(){ fn.apply(c,a); }, ms||220); }; }
  // normalise for matching: lowercase + drop spaces and the "└" tree char, so a search matches regardless of them
  function nrm(s){ return String(s==null?'':s).toLowerCase().replace(/[\s└]+/g,''); }
  // effective search query: normalise, then ignore <2 chars and the universal "PO"/"PO-" prefix (matches every PO)
  function effQ(q){ q=nrm(q); if(q.length<2)return ''; if(/^po-?$/.test(q))return ''; return q; }
  var PP_CAP=200;   // cap rendered PO/shipment rows in the portal; "show all" reveals the rest
  var PO_STATUSES=['FUTURE','PRODUCTION','READY TO SHIP','SHIPPING','DELIVERED','COMPLETE'];
  // document types a supplier can attach (Documents section on the INVOICE tab)
  var DOC_TYPES=['Commercial Invoice','Tax Invoice Consolidated','Packing List','CI & PL','Transaction Certificate','Certificate of Origin','Photos','Other'];
  // supplier production status — the supplier maintains this; an exception flags a status that conflicts with the dates
  var PROD_STATUS=[['not_started','Not started'],['in_production','In production'],['ready_to_ship','Ready to ship'],['shipped','Shipped']];
  function prodStatusLabel(v){ var m=PROD_STATUS.filter(function(o){return o[0]===v;}); return m.length?m[0][1]:''; }
  // production-status colour coding: —/not started grey, in production amber, ready to ship blue, shipped green
  var PROD_STATUS_COL={'':['#f1f5f9','#64748b','#e2e8f0'],not_started:['#f1f5f9','#64748b','#e2e8f0'],in_production:['#fef3c7','#92710a','#fcd34d'],ready_to_ship:['#dbeafe','#1d4ed8','#93c5fd'],shipped:['#dcfce7','#15803d','#86efac']};
  function prodStatusStyle(v){ var c=PROD_STATUS_COL[v||'']||PROD_STATUS_COL['']; return 'background:'+c[0]+';color:'+c[1]+';border:1px solid '+c[2]+';font-weight:600'; }
  function paintProdSel(el){ if(!el)return; var c=PROD_STATUS_COL[el.value||'']||PROD_STATUS_COL['']; el.style.background=c[0]; el.style.color=c[1]; el.style.borderColor=c[2]; el.style.fontWeight='600'; }
  function prodStatusSel(po,val){ return '<select class="fci pp-prod" data-po="'+esc(po)+'" style="font-size:11px;text-align:left;width:130px;min-width:0;'+prodStatusStyle(val)+'"><option value=""'+(val?'':' selected')+'>—</option>'
    +PROD_STATUS.map(function(o){return '<option value="'+o[0]+'"'+(o[0]===val?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select>'; }
  function prodStatusException(ps, prodStart, prodEnd){ ps=ps||''; var today=new Date().toISOString().slice(0,10);
    if((ps===''||ps==='not_started') && prodStart && prodStart<today) return 'Past production start ('+fd(prodStart)+') but status is '+(ps?prodStatusLabel(ps):'not set');
    if(ps!=='ready_to_ship' && ps!=='shipped' && prodEnd && prodEnd<today) return 'Past completion date ('+fd(prodEnd)+') but status is '+(ps?prodStatusLabel(ps):'not set');
    return ''; }
  // portal: a production status needs the supplier's attention when it's unset OR it conflicts with the dates
  function prodAttention(ps, prodStart, prodEnd, subsArr){ subsArr=subsArr||[];
    var supEnd=''; subsArr.forEach(function(s){ if(s.kind==='completion_date' && s.status!=='dismissed' && s.value) supEnd=s.value; });   // supplier-submitted completion overrides the calculated prod_end
    var effEnd = supEnd || prodEnd || '';
    var e=prodStatusException(ps, prodStart, effEnd); if(e)return e; if(!ps)return 'Please set your production status'; return ''; }
  // timeline notes shown newest-first (descending by created_at)
  function tlDesc(a){ return (a||[]).slice().sort(function(x,y){ var cx=String(x.created_at||''), cy=String(y.created_at||''); return cx<cy?1:(cx>cy?-1:0); }); }
  // PO status colours — aligned to the production-status progression: planned/future grey → production amber
  // → shipping blue → completed/delivered green
  function statusBg(s){ var u=String(s||'').toUpperCase();
    if(u.indexOf('COMPLETE')>=0||u.indexOf('DELIVER')>=0)return 'bg-green';
    if(u.indexOf('SHIP')>=0)return 'bg-blue';
    if(u.indexOf('PRODUCTION')>=0||u.indexOf('READY')>=0)return 'bg-amber';
    if(u.indexOf('FUTURE')>=0||u.indexOf('PLAN')>=0)return 'bg-neutral';
    return 'bg-neutral'; }
  // ── label/barcode PDF subsystem (extracted from inject.html; assets scoped to /api/portal) ──
  function ean13Pattern(code){ code=String(code||'').replace(/\D/g,''); if(code.length===12)code='0'+code; if(code.length!==13)return null;
    var L={'0':'0001101','1':'0011001','2':'0010011','3':'0111101','4':'0100011','5':'0110001','6':'0101111','7':'0111011','8':'0110111','9':'0001011'};
    var G={'0':'0100111','1':'0110011','2':'0011011','3':'0100001','4':'0011101','5':'0111001','6':'0000101','7':'0010001','8':'0001001','9':'0010111'};
    var R={'0':'1110010','1':'1100110','2':'1101100','3':'1000010','4':'1011100','5':'1001110','6':'1010000','7':'1000100','8':'1001000','9':'1110100'};
    var par={'0':'LLLLLL','1':'LLGLGG','2':'LLGGLG','3':'LLGGGL','4':'LGLLGG','5':'LGGLLG','6':'LGGGLL','7':'LGLGLG','8':'LGLGGL','9':'LGGLGL'};
    var d=code.split(''), p=par[d[0]], bits='101', i;
    for(i=1;i<=6;i++) bits+=(p[i-1]==='L'?L:G)[d[i]];
    bits+='01010';
    for(i=7;i<=12;i++) bits+=R[d[i]];
    return bits+'101'; }
  function lblDims(r){ if(r.uk_carton_l&&r.uk_carton_w&&r.uk_carton_h)return r.uk_carton_l+'×'+r.uk_carton_w+'×'+r.uk_carton_h+' cm'+(r.uk_carton_wt?' · '+r.uk_carton_wt+' kg':''); return ''; }
  function lblRRP(r){ var p=[]; if(r.uk_rt!=null&&r.uk_rt!=='')p.push('£'+money(r.uk_rt)); if(r.us_rt!=null&&r.us_rt!=='')p.push('$'+money(r.us_rt)); if(r.eu_rt!=null&&r.eu_rt!=='')p.push('€'+money(r.eu_rt)); return p.join('   '); }
  function svgText(x,y,s,o){ o=o||{}; return '<text x="'+x+'" y="'+y+'" font-family="'+(o.mono?'monospace':"'Gotham',Arial,Helvetica,sans-serif")+'" font-size="'+(o.size||11)+'"'+(o.bold?' font-weight="700"':'')+' fill="'+(o.fill||'#111')+'"'+(o.anchor?' text-anchor="'+o.anchor+'"':'')+(o.ls?' letter-spacing="'+o.ls+'"':'')+'>'+esc(s)+'</text>'; }
  // @font-face block embedding the Gotham TTFs (data URIs) so the rasterised label/PNG/PDF uses the brand font
  function fontCss(opts){ if(!opts||!opts.fontBook)return ''; function ff(w,u){ return u?"@font-face{font-family:'Gotham';font-style:normal;font-weight:"+w+";src:url("+u+") format('truetype');}":''; }
    return '<defs><style type="text/css">'+ff(400,opts.fontBook)+ff(700,opts.fontBold)+'</style></defs>'; }
  // pre-decode the fonts in the document so they're ready when the SVG image rasterises
  function preloadFonts(opts){ if(!opts.fontBook||!window.FontFace||!document.fonts)return Promise.resolve();
    try{ var a=new window.FontFace('Gotham','url('+opts.fontBook+')',{weight:'400'}), b=new window.FontFace('Gotham','url('+opts.fontBold+')',{weight:'700'});
      document.fonts.add(a); document.fonts.add(b); return Promise.all([a.load(),b.load()]).catch(function(){}); }catch(e){ return Promise.resolve(); } }
  function wrapLines(s,max){ s=String(s||''); var w=s.split(/\s+/),lines=[],cur=''; w.forEach(function(t){ if((cur+' '+t).trim().length>max){ if(cur)lines.push(cur); cur=t; } else cur=(cur+' '+t).trim(); }); if(cur)lines.push(cur); return lines; }
  // friendly size = last " - " segment of the product name (e.g. "Quick Dry Towel - Navy - Extra Large …" → "Extra Large …")
  function lblSizeName(r){ var pn=r.product_name||''; if(pn.indexOf(' - ')>=0){ var p=pn.split(' - '); return p[p.length-1].trim(); } return r.size||''; }
  // size-circle code: the source size_short field verbatim (blank for "One Size"); falls back to a derivation
  // from the size name until size_short is populated from the PIM.
  function lblCircle(r,sizeName){ var ss=(r.size_short||'').trim(); if(ss) return /^one\s*size$/i.test(ss)?'':ss;
    var s=(sizeName||'').toLowerCase(); if(/one\s*size/.test(s))return '';
    if(/extra large|x-?large|\bxl\b/.test(s))return 'XL';
    if(/extra small|x-?small|\bxs\b/.test(s))return 'XS';
    if(/\blarge\b|\bl\b/.test(s))return 'L';
    if(/\bmedium\b|\bm\b/.test(s))return 'M';
    if(/\bsmall\b|\bs\b/.test(s))return 'S';
    return ''; }
  // EAN-13 bars with extended guard bars (start/centre/end run lower, classic look)
  function eanBars(code,x,y,m,nH,gExt){ var bits=ean13Pattern(code); if(!bits)return null; var guard={0:1,2:1,46:1,48:1,92:1,94:1},gH=nH+gExt,out='',i=0;
    while(i<bits.length){ if(bits[i]==='1'){ var run=1; while(bits[i+run]==='1')run++; var hh=(run===1&&guard[i])?gH:nH; out+='<rect x="'+(x+i*m).toFixed(2)+'" y="'+y+'" width="'+(run*m).toFixed(2)+'" height="'+hh+'" fill="#000"/>'; i+=run; } else i++; } return out; }
  // fixed compliance boilerplate on every carton / inner label
  var DB_ADDRESS=['UK: Reg: 09444124 | 90A High St, Berkhamsted HP4 2BL','EU: c/o Global Ecommerce Experts, Rijnlanderweg 766','Unit H, 2132 NM Hoofddorp Netherlands'];
  // carton / inner label (portrait) — matches the BOX_/BOX_INNER_ artwork: logo wordmark, BOX OF n header,
  // swatch + size circle + box SKU + size + batch, GRS logo + material text, barcode, compliance address.
  function buildCartonSVG(kind,r,opts){ var W=600,H=841,cx=W/2,el=[];   // H matches the mould cell aspect (1178:1652)
    var code=kind==='carton'?r.carton_barcode:r.inner_barcode;
    // header: line 1 = "BOX OF n  x" (from the carton/inner name), line 2 = the SKU
    var nm=kind==='carton'?(r.barcode_carton_name||''):(r.barcode_inner_name||'');
    var l1=(nm && nm.indexOf(r.sku)>=0) ? nm.slice(0,nm.indexOf(r.sku)).trim() : (kind==='carton'?('BOX OF '+(r.carton_qty||'?')+'  x'):'INNER  x');
    var boxSku=(kind==='carton'?'BOX-':'INNER-')+r.sku, sizeName=lblSizeName(r), circle=lblCircle(r,sizeName), batch=opts.batch;
    var y=26;
    if(opts.dbUri){ var lw=150, lh=Math.round(lw*916/1488); el.push('<image x="'+(cx-lw/2)+'" y="'+y+'" width="'+lw+'" height="'+lh+'" href="'+opts.dbUri+'" xlink:href="'+opts.dbUri+'"/>'); y+=lh+16; }
    else { el.push(svgText(cx,y+26,'DOCK & BAY',{size:30,bold:true,anchor:'middle',ls:0.5})); y+=48; }
    el.push(svgText(cx,y,l1,{size:21,bold:true,anchor:'middle'})); y+=27;
    el.push(svgText(cx,y,r.sku,{size:21,bold:true,anchor:'middle'})); y+=27;
    y+=20;
    var bY=y, swX=72, swW=92;
    if(opts.swatchUri) el.push('<image x="'+swX+'" y="'+bY+'" width="'+swW+'" height="'+swW+'" preserveAspectRatio="xMidYMid slice" href="'+opts.swatchUri+'" xlink:href="'+opts.swatchUri+'"/>');
    if(circle){ el.push('<circle cx="'+(swX+swW+28)+'" cy="'+(bY+24)+'" r="24" fill="#111"/>'); el.push(svgText(swX+swW+28,bY+31,circle,{size:circle.length>1?17:21,bold:true,fill:'#fff',anchor:'middle'})); }
    var tx=swX+swW+68;
    el.push(svgText(tx,bY+16,boxSku,{size:17,bold:true}));
    el.push(svgText(tx,bY+40,sizeName,{size:15}));
    if(batch) el.push(svgText(tx,bY+66,'BATCH '+batch.batch,{size:15,bold:true}));
    y=bY+swW+34;
    if(opts.grsUri && r.grs_material){ var gw=140,gh=Math.round(gw*185/273); el.push('<image x="'+(cx-gw/2)+'" y="'+y+'" width="'+gw+'" height="'+gh+'" href="'+opts.grsUri+'" xlink:href="'+opts.grsUri+'"/>'); y+=gh+20; }
    if(r.grs_material){ wrapLines(r.grs_material,70).slice(0,4).forEach(function(ln){ el.push(svgText(cx,y,ln,{size:11,fill:'#222',anchor:'middle'})); y+=15; }); }
    y+=18;
    var bits=ean13Pattern(code);
    // barcode anchored near the bottom, just above the address block (not floating mid-label)
    var by=Math.max(y, H-190);
    if(bits){ var m=4.5,bw=95*m,bx=(W-bw)/2,nH=85,gExt=22; el.push(eanBars(code,bx,by,m,nH,gExt)); var dbl=by+nH+30,c=String(code).replace(/\D/g,''); if(c.length===12)c='0'+c;
      el.push(svgText(bx-8,dbl,c[0],{size:30,anchor:'end'}));
      el.push(svgText(bx+24*m,dbl,c.slice(1,7),{size:30,anchor:'middle',ls:2}));
      el.push(svgText(bx+71*m,dbl,c.slice(7,13),{size:30,anchor:'middle',ls:2})); }
    else { el.push(svgText(cx,by+30,'no '+kind+' barcode on file',{size:13,fill:'#b91c1c',anchor:'middle'})); }
    var ay=H-66; DB_ADDRESS.forEach(function(ln){ el.push(svgText(cx,ay,ln,{size:14,anchor:'middle'})); ay+=19; });   // address anchored to the bottom
    return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'">'+fontCss(opts)+'<rect width="'+W+'" height="'+H+'" fill="#fff"/>'+el.join('')+'</svg>'; }
  // crossdock / preorder box label — matches the _CROSS DOCK TEMPLATES artwork, with PO# / sales-order# / client
  // overlaid in the "DELIVER TO:" white space (opts.po / opts.salesOrder / opts.client)
  function buildCrossdockSVG(r,opts){ opts=opts||{}; var W=600,H=841,cx=W/2,el=[];
    var code=r.carton_barcode||r.product_barcode||r.inner_barcode;
    var isPre=/^PREORDER/i.test(r.sku||'');
    var y=24;
    if(!isPre){ el.push('<rect x="'+(cx-110)+'" y="'+y+'" width="220" height="30" fill="none" stroke="#111" stroke-width="2"/>'); el.push(svgText(cx,y+21,'DO NOT UNPACK',{size:16,bold:true,anchor:'middle'})); y+=44; }
    if(opts.dbUri){ var lw=140,lh=Math.round(lw*916/1488); el.push('<image x="'+(cx-lw/2)+'" y="'+y+'" width="'+lw+'" height="'+lh+'" href="'+opts.dbUri+'" xlink:href="'+opts.dbUri+'"/>'); y+=lh+30; }
    else { el.push(svgText(cx,y+26,'DOCK & BAY',{size:28,bold:true,anchor:'middle'})); y+=58; }
    el.push(svgText(cx,y,isPre?'CROSSDOCK ONLY - DO NOT UNPACK -':'CROSS DOCK SHIPMENT',{size:23,bold:true,anchor:'middle'})); y+=34;
    el.push(svgText(cx,y,'SKU: '+(r.sku||''),{size:18,bold:true,anchor:'middle'})); y+=34;
    // DELIVER TO box — larger text + spacing, box floored so it fills the space down to the barcode
    var bx0=40, bx1=W-40, boxTop=y+8, dy=boxTop+42, dt=[];
    dt.push(svgText(bx0+20,dy,'DELIVER TO:',{size:21,bold:true})); dy+=44;
    if(opts.address){ wrapLines(opts.address,24).slice(0,5).forEach(function(ln){ dt.push(svgText(bx0+20,dy,ln,{size:27,bold:true})); dy+=36; }); dy+=16; }
    if(opts.po){ dt.push(svgText(bx0+20,dy,'PO: '+opts.po,{size:21,bold:true})); dy+=34; }
    if(opts.dispatchOrder){ dt.push(svgText(bx0+20,dy,'Dispatch order: '+opts.dispatchOrder,{size:21,bold:true})); dy+=34; }
    if(opts.client){ wrapLines('Client: '+opts.client,30).forEach(function(ln){ dt.push(svgText(bx0+20,dy,ln,{size:21,bold:true})); dy+=34; }); }
    var boxBot=Math.max(dy+30, H-190);   // floor so the framed box fills the white space toward the barcode
    dt.push(svgText(bx0+20,boxBot-24,'Carton ____________ of ____________',{size:17}));   // anchored to the box bottom
    el.push('<rect x="'+bx0+'" y="'+boxTop+'" width="'+(bx1-bx0)+'" height="'+(boxBot-boxTop)+'" rx="8" fill="none" stroke="#111" stroke-width="1.5"/>');
    dt.forEach(function(t){ el.push(t); }); y=boxBot+16;
    var bits=ean13Pattern(code);
    if(bits){ var m=4.5,bw=95*m,bx=(W-bw)/2,nH=80,gExt=22; var by=Math.max(y+10, H-150); el.push(eanBars(code,bx,by,m,nH,gExt)); var dbl=by+nH+28,cc=String(code).replace(/\D/g,''); if(cc.length===12)cc='0'+cc;
      el.push(svgText(bx-8,dbl,cc[0],{size:28,anchor:'end'}));
      el.push(svgText(bx+24*m,dbl,cc.slice(1,7),{size:28,anchor:'middle',ls:2}));
      el.push(svgText(bx+71*m,dbl,cc.slice(7,13),{size:28,anchor:'middle',ls:2})); }
    else { el.push(svgText(cx,H-120,'no barcode on file for '+esc(r.sku||''),{size:13,fill:'#b91c1c',anchor:'middle'})); }
    el.push(svgText(cx,H-30,'Reg: 09444124 | 90A High St, Berkhamsted HP4 2BL, UK',{size:11,anchor:'middle'}));
    return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'">'+fontCss(opts)+'<rect width="'+W+'" height="'+H+'" fill="#fff"/>'+el.join('')+'</svg>'; }
  // SHIPS-WITH master label (carton size 600×841) — field : value rows matching PRODUCTION-MASTER artwork
  function buildShipsWithSVG(d,opts){ opts=opts||{}; var W=600,H=841,el=[]; var lx=46,vx=278;
    el.push('<rect x="22" y="22" width="'+(W-44)+'" height="'+(H-44)+'" fill="none" stroke="#111" stroke-width="1.5"/>');
    var y=80; el.push(svgText(lx,y,'DOCK & BAY',{size:30,bold:true,ls:0.5})); if(opts.air)el.push(svgText(lx+300,y,'AIR FREIGHT',{size:18,bold:true,fill:'#b45309'})); y+=66;
    // AIR FREIGHT label = the SHIPS WITH label WITHOUT the "ships with supplier / ships with PO" section.
    var rows=[['SOURCE SUPPLIER',d.source_supplier],['PRODUCTION REF',d.production_ref]]
      .concat(opts.air?[]:[['SHIPS WITH SUPPLIER',d.ships_with_supplier],['SHIPS WITH PO',d.ships_with_po]])
      .concat([['DESTINATION BRANCH',d.dest_branch],['DESTINATION COUNTRY',d.dest_country],
      ['CLIENT NAME',d.client],['CLIENT SALES ORDER REF',d.sales_order_ref]]);
    var boxTop=null, boxBot=null;
    rows.forEach(function(rw,idx){
      var big=(idx<2);                       // SOURCE SUPPLIER + PRODUCTION REFERENCE → +3pt
      var swRow=!opts.air && (idx===2||idx===3);          // SHIPS WITH SUPPLIER + SHIPS WITH PO → boxed, value not bold
      if(swRow){ if(boxTop===null)boxTop=y-26; boxBot=y+18; }
      el.push(svgText(lx,y,rw[0],{size:big?17:14,fill:'#222'}));
      var val=String(rw[1]==null?'':rw[1]).trim()||'—'; wrapLines(val,22).slice(0,2).forEach(function(ln,li){ el.push(svgText(vx,y+li*19,ln,{size:big?19:16,bold:!swRow})); }); y+=58; });
    if(boxTop!==null) el.unshift('<rect x="34" y="'+boxTop+'" width="'+(W-68)+'" height="'+(boxBot-boxTop)+'" rx="7" fill="none" stroke="#111" stroke-width="1.5"/>');
    y+=28; el.push(svgText(lx,y,'CARTON / PALLET COUNT',{size:13,fill:'#222'})); el.push(svgText(vx,y,'___________ of ___________',{size:14}));
    return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'">'+fontCss(opts)+'<rect width="'+W+'" height="'+H+'" fill="#fff"/>'+el.join('')+'</svg>'; }
  // SHIPS-WITH label → A4 print mould (4-up, carton size), one PDF
  function dlShipsWith(po,btn,base,air){ var orig=btn?btn.textContent:''; if(btn)btn.disabled=true;
    fetch((base||'/api/supply/ships-with/')+encodeURIComponent(po)).then(function(r){return r.json();}).then(function(d){
      if(!d||d.error){ if(btn){btn.textContent=orig;btn.disabled=false;} alert((d&&d.error)||'Could not load ships-with data'); return; }
      Promise.all([fetchImgDataUri('/api/portal/asset/gotham-book'),fetchImgDataUri('/api/portal/asset/gotham-bold')]).then(function(a){
        var opts={fontBook:a[0],fontBold:a[1],air:!!air};
        preloadFonts(opts).then(function(){ rasterizeSVGCanvas(buildShipsWithSVG(d,opts),2.5,function(cv){ if(btn){btn.textContent=orig;btn.disabled=false;} if(!cv){alert('Could not render label');return;}
          cv.toBlob(function(jb){ if(!jb){alert('Could not encode label');return;} jb.arrayBuffer().then(function(ab){ bcDownloadBlob((air?'AIRFREIGHT-':'SHIPSWITH-')+zipSafe(po)+'_A4.pdf', new Blob([pdfA4(new Uint8Array(ab),cv.width,cv.height,MOLD_4)],{type:'application/pdf'})); }); },'image/jpeg',0.92); }); });
      });
    }).catch(function(){ if(btn){btn.textContent=orig;btn.disabled=false;} alert('Could not load ships-with data'); }); }
  // v2 barcode label — product (landscape) matches the OUTPUT artwork; carton/inner go to buildCartonSVG
  function buildLabelSVG(kind,r,opts){ opts=opts||{};
    if(kind==='crossdock') return buildCrossdockSVG(r,opts);
    if(kind!=='product') return buildCartonSVG(kind,r,opts);
    var W=575, code=kind==='product'?r.product_barcode:kind==='carton'?r.carton_barcode:r.inner_barcode;
    var sizeName=lblSizeName(r), circle=lblCircle(r,sizeName), batch=opts.batch, el=[];
    el.push(svgText(40,60,'DOCK & BAY',{size:30,bold:true,ls:0.5}));
    var dy=85; wrapLines(r.barcode_sku_name||'',40).slice(0,2).forEach(function(ln){ el.push(svgText(40,dy,ln.toUpperCase(),{size:13,fill:'#6b6b6b',ls:1.3})); dy+=17; });
    var ty=dy+30;
    el.push(svgText(40,ty,sizeName,{size:18,fill:'#111'}));
    el.push(svgText(40,ty+26,(kind==='carton'?('BOX OF '+(r.carton_qty||'?')+' x '):kind==='inner'?'INNER · ':'')+r.sku,{size:18,bold:true}));
    var afterSku=ty+26;
    if(kind==='product' && opts.rrp){ var rt=(r.uk_rt!=null&&r.uk_rt!=='')?Number(r.uk_rt).toFixed(2):''; if(rt)el.push(svgText(40,afterSku+27,rt,{size:18,bold:true})); }
    // right block: swatch + size circle + batch / date of production
    var swX=440,swY=15,swW=120;
    if(kind==='product' && opts.swatchUri) el.push('<image x="'+swX+'" y="'+swY+'" width="'+swW+'" height="'+swW+'" preserveAspectRatio="xMidYMid slice" href="'+opts.swatchUri+'" xlink:href="'+opts.swatchUri+'"/>');
    if(circle){ el.push('<circle cx="405" cy="50" r="30" fill="#111"/>'); el.push(svgText(405,58,circle,{size:circle.length>1?20:25,bold:true,fill:'#fff',anchor:'middle'})); }
    if(batch){ var by=swY+swW+24; el.push(svgText(swX+swW/2,by,'BATCH '+batch.batch,{size:12,anchor:'middle'})); el.push(svgText(swX+swW/2,by+15,'DATE OF PRODUCTION:',{size:12,bold:true,anchor:'middle'})); el.push(svgText(swX+swW/2,by+30,batch.batch_date?fd(batch.batch_date):'',{size:12,bold:true,anchor:'middle'})); }
    // carton: GRS material text (icon artwork still TODO)
    if(kind==='carton' && r.grs_material){ var gy=afterSku+30; wrapLines(r.grs_material,72).slice(0,4).forEach(function(ln){ el.push(svgText(40,gy,ln,{size:9,fill:'#444'})); gy+=12; }); }
    // barcode
    var m=5,bx=(W-95*m)/2,byc=232,nH=80,gExt=20,H=355;
    var bars=eanBars(code,bx,byc,m,nH,gExt);
    if(bars){ el.push(bars); var dbl=byc+nH+30, c=String(code).replace(/\D/g,''); if(c.length===12)c='0'+c;
      el.push(svgText(bx-8,dbl,c[0],{size:33,anchor:'end'}));
      el.push(svgText(bx+24*m,dbl,c.slice(1,7),{size:33,anchor:'middle',ls:3}));
      el.push(svgText(bx+71*m,dbl,c.slice(7,13),{size:33,anchor:'middle',ls:3}));
      H=dbl+18; }
    else { el.push(svgText(W/2,byc+40,'no '+kind+' barcode on file',{size:13,fill:'#b91c1c',anchor:'middle'})); H=byc+70; }
    H=Math.max(H,377);   // match the mould cell aspect (564:370) so the A4 sheet doesn't stretch the label
    return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'">'+fontCss(opts)+'<rect width="'+W+'" height="'+H+'" fill="#fff"/>'+el.join('')+'</svg>'; }
  // rasterise an SVG string to a PNG blob via canvas (data-URI swatch keeps the canvas un-tainted)
  function rasterizeSVG(svg,scale,cb){ var img=new Image(); var url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
    img.onload=function(){ var w=img.naturalWidth||img.width, h=img.naturalHeight||img.height; var cv=document.createElement('canvas'); cv.width=w*scale; cv.height=h*scale; var ctx=cv.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,cv.width,cv.height); ctx.scale(scale,scale); ctx.drawImage(img,0,0); URL.revokeObjectURL(url); try{ cv.toBlob(function(b){cb(b);},'image/png'); }catch(e){ cb(null); } };
    img.onerror=function(){ URL.revokeObjectURL(url); cb(null); }; img.src=url; }
  function bcDownloadBlob(filename,blob){ var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){URL.revokeObjectURL(a.href);},2000); }
  // fetch a same-origin image URL → data URI (keeps the rasterised canvas un-tainted)
  function fetchImgDataUri(url){ return fetch(url).then(function(resp){ if(!resp.ok)throw 0; return resp.blob(); }).then(function(blob){ return new Promise(function(res){ var fr=new FileReader(); fr.onload=function(){res(fr.result);}; fr.onerror=function(){res('');}; fr.readAsDataURL(blob); }); }).catch(function(){ return ''; }); }
  // gather the data-URI assets a label needs (swatch / GRS logo / D&B logo), then call cb(opts)
  function bcGatherAssets(kind,r,batch,rrp,cb){ var opts={batch:batch,rrp:rrp}, jobs=[];
    if(r.swatch_url) jobs.push(fetchImgDataUri('/api/portal/img?url='+encodeURIComponent(r.swatch_url)).then(function(u){opts.swatchUri=u;}));
    if(kind!=='product'){ jobs.push(fetchImgDataUri('/api/portal/asset/grs').then(function(u){opts.grsUri=u;})); jobs.push(fetchImgDataUri('/api/portal/asset/db').then(function(u){opts.dbUri=u;})); }
    jobs.push(fetchImgDataUri('/api/portal/asset/gotham-book').then(function(u){opts.fontBook=u;}));
    jobs.push(fetchImgDataUri('/api/portal/asset/gotham-bold').then(function(u){opts.fontBold=u;}));
    Promise.all(jobs).then(function(){ preloadFonts(opts).then(function(){ cb(opts); }); }); }
  // warn if no batch is selected (label's BATCH / DATE OF PRODUCTION will be blank) — proceed/cancel
  function confirmNoBatch(batch){ return batch ? true : window.confirm('No BATCH selected — the label’s BATCH and DATE OF PRODUCTION will be blank. Download anyway?'); }
  function bcMakeLabel(kind,r,batch,rrp){ if(!r||!confirmNoBatch(batch))return; bcGatherAssets(kind,r,batch,rrp,function(opts){
    rasterizeSVG(buildLabelSVG(kind,r,opts),2,function(blob){ if(!blob){ alert('Could not render label PNG'); return; } bcDownloadBlob(kindPrefix(kind)+r.sku+'_label.png',blob); }); }); }
  // ---- A4 merge sheet (PDF) — exact cell rects from the PSD molds (px @ 300 DPI, page 2480×3505) ----
  var MOLD_4=[[1256,59,1178,1652],[49,60,1178,1652],[1251,1738,1178,1652],[44,1739,1178,1652]];
  var MOLD_36=[[76,89,564,370],[663,89,564,370],[1253,89,564,370],[1840,89,564,370],[76,461,564,370],[663,461,564,370],[1253,461,564,370],[1840,461,564,370],[76,830,564,370],[663,830,564,370],[1253,830,564,370],[1840,830,564,370],[76,1200,564,370],[663,1200,564,370],[1253,1200,564,370],[1840,1200,564,370],[76,1569,564,370],[663,1569,564,370],[1253,1569,564,370],[1840,1569,564,370],[76,1941,564,370],[663,1941,564,370],[1253,1941,564,370],[1840,1941,564,370],[76,2310,564,370],[663,2310,564,370],[1253,2310,564,370],[1840,2310,564,370],[76,2680,564,370],[663,2680,564,370],[1253,2680,564,370],[1840,2680,564,370],[76,3049,564,370],[663,3049,564,370],[1253,3049,564,370],[1840,3049,564,370]];
  // rasterise an SVG string to a <canvas> (data-URI assets keep it un-tainted)
  function rasterizeSVGCanvas(svg,scale,cb){ var img=new Image(); var url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
    img.onload=function(){ var w=img.naturalWidth||img.width,h=img.naturalHeight||img.height; var cv=document.createElement('canvas'); cv.width=Math.round(w*scale); cv.height=Math.round(h*scale); var ctx=cv.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,cv.width,cv.height); ctx.scale(scale,scale); ctx.drawImage(img,0,0); URL.revokeObjectURL(url); cb(cv); };
    img.onerror=function(){ URL.revokeObjectURL(url); cb(null); }; img.src=url; }
  // hand-built minimal PDF: one A4 page, one JPEG image XObject placed into each mold cell
  function pdfA4(jpeg,imgW,imgH,cells){ var enc=new TextEncoder(), parts=[], off=[], len=0, P=0.24, pageW=2480*P, pageH=3505*P;
    function push(x){ var u=(x instanceof Uint8Array)?x:enc.encode(x); parts.push(u); len+=u.length; }
    function pad(n){ n=String(n); while(n.length<10)n='0'+n; return n; }
    push('%PDF-1.4\n');
    off[1]=len; push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    off[2]=len; push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
    off[3]=len; push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+pageW.toFixed(2)+' '+pageH.toFixed(2)+'] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>\nendobj\n');
    var content=''; cells.forEach(function(c){ var cw=c[2]*P, ch=c[3]*P, s=Math.min(cw/imgW, ch/imgH), dw=imgW*s, dh=imgH*s;   // fit-preserve aspect, centre in cell (no stretch)
      var x=(c[0]*P+(cw-dw)/2).toFixed(2), y=(pageH-c[1]*P-(ch+dh)/2).toFixed(2); content+='q '+dw.toFixed(2)+' 0 0 '+dh.toFixed(2)+' '+x+' '+y+' cm /Im0 Do Q\n'; });
    var cb=enc.encode(content);
    off[4]=len; push('4 0 obj\n<< /Length '+cb.length+' >>\nstream\n'); push(cb); push('\nendstream\nendobj\n');
    off[5]=len; push('5 0 obj\n<< /Type /XObject /Subtype /Image /Width '+imgW+' /Height '+imgH+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.length+' >>\nstream\n'); push(jpeg); push('\nendstream\nendobj\n');
    var xo=len, xref='xref\n0 6\n0000000000 65535 f \n'; for(var i=1;i<=5;i++)xref+=pad(off[i])+' 00000 n \n';
    push(xref); push('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xo+'\n%%EOF');
    var out=new Uint8Array(len),o=0; parts.forEach(function(u){ out.set(u,o); o+=u.length; }); return out; }
  // Single small-label PDF: one page sized to (ptW × ptH) points, the JPEG filling the whole page. Used for the
  // per-sample-version label (a compact label to stick on the physical sample).
  function pdfSingleImg(jpeg,imgW,imgH,ptW,ptH){ var enc=new TextEncoder(),parts=[],off=[],len=0;
    function push(x){ var u=(x instanceof Uint8Array)?x:enc.encode(x); parts.push(u); len+=u.length; }
    function pad(n){ n=String(n); while(n.length<10)n='0'+n; return n; }
    push('%PDF-1.4\n');
    off[1]=len; push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    off[2]=len; push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
    off[3]=len; push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+ptW.toFixed(2)+' '+ptH.toFixed(2)+'] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>\nendobj\n');
    var content='q '+ptW.toFixed(2)+' 0 0 '+ptH.toFixed(2)+' 0 0 cm /Im0 Do Q\n';
    var cb=enc.encode(content);
    off[4]=len; push('4 0 obj\n<< /Length '+cb.length+' >>\nstream\n'); push(cb); push('\nendstream\nendobj\n');
    off[5]=len; push('5 0 obj\n<< /Type /XObject /Subtype /Image /Width '+imgW+' /Height '+imgH+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.length+' >>\nstream\n'); push(jpeg); push('\nendstream\nendobj\n');
    var xo=len,xref='xref\n0 6\n0000000000 65535 f \n'; for(var i=1;i<=5;i++)xref+=pad(off[i])+' 00000 n \n';
    push(xref); push('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xo+'\n%%EOF');
    var out=new Uint8Array(len),o=0; parts.forEach(function(u){ out.set(u,o); o+=u.length; }); return out; }
  // Multi-page A4 PDF: one page per {jpeg,imgW,imgH} entry, same cell layout on each. Lets a batch download as a
  // single consolidated PDF instead of a zip of one-page PDFs.
  function pdfA4Multi(pages,cells){ var enc=new TextEncoder(), parts=[], off=[], len=0, P=0.24, pageW=2480*P, pageH=3505*P;
    function push(x){ var u=(x instanceof Uint8Array)?x:enc.encode(x); parts.push(u); len+=u.length; }
    function pad(n){ n=String(n); while(n.length<10)n='0'+n; return n; }
    var N=pages.length, kids=[]; for(var k=0;k<N;k++)kids.push((3+k*3)+' 0 R');
    push('%PDF-1.4\n');
    off[1]=len; push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    off[2]=len; push('2 0 obj\n<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+N+' >>\nendobj\n');
    for(var pi=0;pi<N;pi++){ var pg=pages[pi], imgW=pg.imgW, imgH=pg.imgH, jpeg=pg.jpeg, pageObj=3+pi*3, contentObj=4+pi*3, imgObj=5+pi*3;
      off[pageObj]=len; push(pageObj+' 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+pageW.toFixed(2)+' '+pageH.toFixed(2)+'] /Resources << /XObject << /Im0 '+imgObj+' 0 R >> >> /Contents '+contentObj+' 0 R >>\nendobj\n');
      var content=''; cells.forEach(function(c){ var cw=c[2]*P, ch=c[3]*P, s=Math.min(cw/imgW, ch/imgH), dw=imgW*s, dh=imgH*s;
        var x=(c[0]*P+(cw-dw)/2).toFixed(2), y=(pageH-c[1]*P-(ch+dh)/2).toFixed(2); content+='q '+dw.toFixed(2)+' 0 0 '+dh.toFixed(2)+' '+x+' '+y+' cm /Im0 Do Q\n'; });
      var cb=enc.encode(content);
      off[contentObj]=len; push(contentObj+' 0 obj\n<< /Length '+cb.length+' >>\nstream\n'); push(cb); push('\nendstream\nendobj\n');
      off[imgObj]=len; push(imgObj+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+imgW+' /Height '+imgH+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.length+' >>\nstream\n'); push(jpeg); push('\nendstream\nendobj\n'); }
    var total=2+N*3, xo=len, xref='xref\n0 '+(total+1)+'\n0000000000 65535 f \n'; for(var i=1;i<=total;i++)xref+=pad(off[i])+' 00000 n \n';
    push(xref); push('trailer\n<< /Size '+(total+1)+' /Root 1 0 R >>\nstartxref\n'+xo+'\n%%EOF');
    var out=new Uint8Array(len),o=0; parts.forEach(function(u){ out.set(u,o); o+=u.length; }); return out; }
  function bcMakeSheet(kind,r,batch,rrp){ if(!r||!confirmNoBatch(batch))return; var cells=kind==='product'?MOLD_36:MOLD_4;
    bcGatherAssets(kind,r,batch,rrp,function(opts){ rasterizeSVGCanvas(buildLabelSVG(kind,r,opts),2.5,function(cv){ if(!cv){ alert('Could not render label'); return; }
      cv.toBlob(function(jb){ if(!jb){ alert('Could not encode label'); return; } jb.arrayBuffer().then(function(ab){
        var pdf=pdfA4(new Uint8Array(ab),cv.width,cv.height,cells); bcDownloadBlob(kindPrefix(kind)+r.sku+'_A4.pdf', new Blob([pdf],{type:'application/pdf'})); }); },'image/jpeg',0.92); }); }); }
  // ---- ZIP (STORE / no compression — CSP-safe, no lib) for the "download all" batch ----
  function crc32(buf){ var t=crc32._t; if(!t){ t=crc32._t=[]; for(var n=0;n<256;n++){ var c=n; for(var k=0;k<8;k++) c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1); t[n]=c>>>0; } }
    var crc=0xFFFFFFFF; for(var i=0;i<buf.length;i++) crc=(crc>>>8)^t[(crc^buf[i])&0xFF]; return (crc^0xFFFFFFFF)>>>0; }
  function zipStore(files){ var enc=new TextEncoder(), parts=[], len=0, central=[];
    function u16(n){ return new Uint8Array([n&255,(n>>8)&255]); } function u32(n){ return new Uint8Array([n&255,(n>>8)&255,(n>>16)&255,(n>>>24)&255]); }
    function push(u){ parts.push(u); len+=u.length; }
    files.forEach(function(f){ var nm=enc.encode(f.name), data=f.data, crc=crc32(data), off=len;
      push(u32(0x04034b50)); push(u16(20)); push(u16(0)); push(u16(0)); push(u16(0)); push(u16(0)); push(u32(crc)); push(u32(data.length)); push(u32(data.length)); push(u16(nm.length)); push(u16(0)); push(nm); push(data);
      central.push({nm:nm,crc:crc,size:data.length,off:off}); });
    var cdStart=len;
    central.forEach(function(c){ push(u32(0x02014b50)); push(u16(20)); push(u16(20)); push(u16(0)); push(u16(0)); push(u16(0)); push(u16(0)); push(u32(c.crc)); push(u32(c.size)); push(u32(c.size)); push(u16(c.nm.length)); push(u16(0)); push(u16(0)); push(u16(0)); push(u16(0)); push(u32(0)); push(u32(c.off)); push(c.nm); });
    var cdSize=len-cdStart;
    push(u32(0x06054b50)); push(u16(0)); push(u16(0)); push(u16(central.length)); push(u16(central.length)); push(u32(cdSize)); push(u32(cdStart)); push(u16(0));
    var out=new Uint8Array(len),o=0; parts.forEach(function(u){ out.set(u,o); o+=u.length; }); return out; }
  function zipSafe(s){ return String(s||'').replace(/[\/\\:*?"<>|]/g,'_').trim()||'_'; }
  // crossdock labels: A4 4-up box label per crossdock SKU, PO# / sales-order# / client overlaid → ZIP of PDFs
  function bcDownloadCrossdock(rows,po,dispatchOrder,client,address,btn,zipname){
    var items=rows.filter(function(r){ return r.carton_barcode||r.product_barcode||r.inner_barcode; });
    if(!items.length){ alert('No crossdock SKUs with a barcode on this PO'); return; }
    var orig=btn?btn.textContent:''; if(btn)btn.disabled=true;
    Promise.all([fetchImgDataUri('/api/portal/asset/gotham-book'),fetchImgDataUri('/api/portal/asset/gotham-bold'),fetchImgDataUri('/api/portal/asset/db')]).then(function(a){
      var base={po:po,dispatchOrder:dispatchOrder,client:client,address:address,fontBook:a[0],fontBold:a[1],dbUri:a[2]};
      preloadFonts(base).then(function(){ var pages=[], i=0;
        function next(){ if(i>=items.length) return finish();
          var r=items[i++]; if(btn)btn.textContent='Rendering '+i+'/'+items.length+'…';
          rasterizeSVGCanvas(buildLabelSVG('crossdock',r,base),2.5,function(cv){ if(!cv)return next();
            cv.toBlob(function(jb){ if(!jb)return next(); jb.arrayBuffer().then(function(ab){ pages.push({jpeg:new Uint8Array(ab),imgW:cv.width,imgH:cv.height}); next(); }); },'image/jpeg',0.92); }); }
        function finish(){ if(btn){btn.textContent=orig;btn.disabled=false;} if(!pages.length){alert('Nothing rendered');return;}
          var name=String(zipname||'crossdock_labels').replace(/\.zip$/i,'')+'.pdf';   // one consolidated PDF (no zip)
          bcDownloadBlob(name,new Blob([pdfA4Multi(pages,MOLD_4)],{type:'application/pdf'})); }
        next();
      });
    }); }
  function rowHasKind(r,k){ return k==='product'?r.product_barcode:k==='carton'?r.carton_barcode:r.inner_barcode; }
  function kindPrefix(kind){ return kind==='carton'?'BOX-':kind==='inner'?'INNER-':kind==='crossdock'?'XDOCK-':'PROD-'; }
  // download A4 print-mould PDFs (one per SKU per kind: product 36-up, carton/inner 4-up) → ZIP. Used by the portal.
  function bcDownloadSheets(rows,kinds,zipname,btn){
    var items=rows.filter(function(r){ return kinds.some(function(k){ return rowHasKind(r,k); }); });
    if(!items.length){ alert('No barcodes here'); return; }
    // batch + production date ride on the rows (server stamps them from ?batch / PO) → print on the label
    var _b=items[0]||{}; var batch=_b.batch?{batch:_b.batch, batch_date:_b.batch_date}:null;
    var orig=btn?btn.textContent:''; if(btn)btn.disabled=true;
    var needCI = kinds.indexOf('carton')>=0 || kinds.indexOf('inner')>=0;
    var jobs=[fetchImgDataUri('/api/portal/asset/gotham-book'),fetchImgDataUri('/api/portal/asset/gotham-bold')];
    if(needCI){ jobs.push(fetchImgDataUri('/api/portal/asset/grs')); jobs.push(fetchImgDataUri('/api/portal/asset/db')); }
    Promise.all(jobs).then(function(a){ var base={fontBook:a[0],fontBold:a[1],batch:batch}; if(needCI){ base.grsUri=a[2]; base.dbUri=a[3]; }
      preloadFonts(base).then(function(){ var files=[], i=0;
        function next(){ if(i>=items.length) return finish();
          var r=items[i++]; if(btn)btn.textContent='Rendering '+i+'/'+items.length+'…';
          var swP=r.swatch_url?fetchImgDataUri('/api/portal/img?url='+encodeURIComponent(r.swatch_url)):Promise.resolve('');
          swP.then(function(sw){ var kp=kinds.filter(function(k){ return rowHasKind(r,k); }), ki=0;
            function nk(){ if(ki>=kp.length) return next(); var kind=kp[ki++]; var opts={}; for(var x in base)opts[x]=base[x]; opts.swatchUri=sw; var cells=kind==='product'?MOLD_36:MOLD_4;
              rasterizeSVGCanvas(buildLabelSVG(kind,r,opts),2.5,function(cv){ if(!cv)return nk(); cv.toBlob(function(jb){ if(!jb)return nk(); jb.arrayBuffer().then(function(ab){ files.push({name:kindPrefix(kind)+zipSafe(r.sku)+'_A4.pdf',data:pdfA4(new Uint8Array(ab),cv.width,cv.height,cells)}); nk(); }); },'image/jpeg',0.92); }); }
            nk(); }); }
        function finish(){ if(btn){btn.textContent=orig;btn.disabled=false;} if(!files.length){alert('Nothing rendered');return;} bcDownloadBlob(zipname,new Blob([zipStore(files)],{type:'application/zip'})); }
        next();
      });
    }); }
  var STYLE=`#supply-root{display:none;font-size:12px;color:#1a1a1a;padding-top:4px;-webkit-text-size-adjust:100%;text-size-adjust:100%}
#supply-root .stab{background:transparent;border:none;padding:6px 13px;font-size:12px;font-weight:500;cursor:pointer;color:#888;border-bottom:2px solid transparent;letter-spacing:.01em;font-family:inherit}
#supply-root .stab:hover{color:#1a1a1a}
#supply-root .stab.active{color:#1a1a1a;border-bottom-color:#1a1a1a;font-weight:600}
#supply-root .ver{margin-left:auto;color:#aaa;font-size:10px}
#supply-root .annot{background:#0f172a;color:#cbd5e1;font-size:11px;border-radius:6px;padding:8px 12px;margin:0 0 10px;line-height:1.5}
#supply-root .annot b{color:#7dd3fc}
#supply-root .bar{display:flex;align-items:center;margin-bottom:8px;flex-wrap:wrap}
#supply-root .bar>*{margin:2px 8px 2px 0;flex:0 0 auto}   /* explicit spacing + no shrink (some webviews drop flex gap → overlap, or shrink items → clip); wrap instead */
#supply-root .bar-grp{display:inline-flex;align-items:center}
#supply-root .bar-grp>*{margin-right:5px}
#supply-root .bar-grp>*:last-child{margin-right:0}
#supply-root .bar-sep{flex:0 0 1px;width:1px;height:16px;background:#c3d4ee;display:inline-block}
#supply-root #bc-settings{display:flow-root}   /* flow-root contains the floated Download-all button so the box still grows */
#supply-root #bc-settings>*{display:inline-block;vertical-align:middle}
#supply-root #bc-dlall-prod,#supply-root #bc-dlall-cart{float:right;margin-left:8px}   /* sit top-right, above the grid's "labels" column */
#supply-root .pill{padding:3px 9px;font-size:10px;cursor:pointer;border:1px solid #d0d0d0;background:#fff;color:#666;border-radius:4px;white-space:nowrap;font-weight:600}
#supply-root .pill:hover{background:#f5f5f5;color:#333}
#supply-root .pill.active{background:#1a1a1a;color:#fff;border-color:#1a1a1a}
#supply-root .pill-lbl{font-size:11px;color:#444;font-weight:600}
#supply-root #rep-subnav,#supply-root #config-subs,#supply-root #prod-subtabs,#supply-root .po-subnav{display:flex;gap:2px;align-items:center;flex-wrap:wrap;background:#f0f6ff;border:1px solid #dbeafe;border-radius:6px;padding:2px 5px;margin:0 0 12px}
#supply-root .ex-badge{display:inline-block;min-width:16px;height:16px;line-height:16px;border-radius:8px;background:#dc2626;color:#fff;font-size:9px;font-weight:700;text-align:center;padding:0 4px;margin-left:4px;vertical-align:1px}
#supply-root .cli-form{max-width:660px;margin-bottom:10px}
#supply-root .cli-row{display:flex;align-items:flex-start;gap:10px;padding:5px 0;border-bottom:1px solid #f1f1f1}
#supply-root .cli-lbl{flex:0 0 170px;font-size:11px;color:#444;font-weight:600;padding-top:4px}
#supply-root .cli-val{flex:1 1 auto;min-width:0}
#supply-root .xd-pick{display:flex;flex-wrap:wrap;align-items:center;gap:3px}
#supply-root .rtab{background:transparent;border:none;padding:6px 14px;font-size:12px;font-weight:500;cursor:pointer;color:#7c93b8;border-bottom:2px solid transparent;letter-spacing:.01em;font-family:inherit}
#supply-root .rtab:hover{color:#2563eb}
#supply-root .rtab.active{color:#2563eb;border-bottom-color:#3b82f6;font-weight:600}
#supply-root #op-status,#supply-root #op-country{display:inline-flex;flex-wrap:wrap;gap:6px;align-items:center}
#supply-root .flt{border:1px solid #d0d0d0;border-radius:4px;padding:4px 9px;font-size:11px;font-family:inherit;width:230px}
#supply-root .save-btn{font-size:11px;padding:4px 12px;cursor:pointer;border:1px solid #ccc;border-radius:4px;background:#fff;font-weight:600;font-family:inherit}
#supply-root .save-btn:hover{background:#f5f5f5}
#supply-root .save-btn.dark{background:#1a1a1a;color:#fff;border-color:#1a1a1a}
#supply-root .tw{overflow:auto;border:1px solid #e0e0e0;border-radius:6px;background:#fff;margin-bottom:10px;max-height:calc(100vh - 210px)}
#supply-root table{border-collapse:collapse;font-size:11px;width:100%}
#supply-root thead th{background:#f3f3f1;padding:5px 8px;font-weight:600;font-size:9.5px;color:#444;border-bottom:1px solid #d5d5d5;text-align:right;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;position:sticky;top:0;z-index:1}
/* small tables inside an expanded PO detail must NOT have sticky headers — otherwise the order-plan "Qty"
   header floats over the sections below (e.g. Additional costs) as the page scrolls */
#supply-root .ppx thead th{position:static!important;top:auto!important;z-index:auto!important}
#supply-root thead th.l{text-align:left}
#supply-root tbody td{padding:4px 8px;text-align:right;border-bottom:1px solid #f1f1f1;font-variant-numeric:tabular-nums;white-space:nowrap}
#supply-root tbody td.l{text-align:left}
#supply-root tbody tr:hover td{background:#fafaf8}
#supply-root tr.exp-row>td{background:#f8fafc;text-align:left;white-space:normal}
#supply-root .tool-badge,#scenario-root .tool-badge{font-size:9px;font-weight:700;padding:1px 6px;border-radius:8px;letter-spacing:.2px;display:inline-block}
#supply-root .chip{display:inline-block;background:#e0f2fe;color:#075985;font-size:11px;padding:2px 6px;border-radius:10px;margin:2px 2px;white-space:nowrap}
#supply-root .chip .xd-rm{border:none;background:none;color:#0369a1;cursor:pointer;font-weight:700;padding:0 0 0 2px;font-size:12px;line-height:1}
#supply-root .bg-amber,#scenario-root .bg-amber{background:#fef3c7;color:#92400e}#supply-root .bg-red,#scenario-root .bg-red{background:#fee2e2;color:#991b1b}#supply-root .bg-neutral,#scenario-root .bg-neutral{background:#f3f4f6;color:#4b5563}
#supply-root .bg-green,#scenario-root .bg-green{background:#dcfce7;color:#166534}#supply-root .bg-blue,#scenario-root .bg-blue{background:#dbeafe;color:#1e40af}#supply-root .bg-purple,#scenario-root .bg-purple{background:#ede9fe;color:#5b21b6}
#supply-root .src{font-size:8.5px;font-weight:700;border-radius:3px;padding:1px 4px;margin-left:4px}
#supply-root .src.fx{background:#dbeafe;color:#1e40af}#supply-root .src.m{background:#ede9fe;color:#5b21b6}
#supply-root .fci{min-width:46px;padding:2px 5px;font-size:11px;text-align:right;border:1px solid #93c5fd;border-radius:3px;background:#eff6ff;color:#1d4ed8;font-family:inherit}
#supply-root .fci:focus{outline:2px solid #93c5fd}
#supply-root .fci.txt{text-align:left;width:120px}#supply-root .fci.dt{text-align:left;width:104px}
#supply-root .fci.saved{border-color:#16a34a!important;background:#f0fdf4!important;color:#166534!important}
#supply-root .fci.err{border-color:#dc2626!important;background:#fef2f2!important;color:#991b1b!important}
#supply-root select.fci{cursor:pointer;font-weight:700;text-align:left}
#supply-root .fci.needdep{background:#fee2e2;border-color:#fca5a5;color:#991b1b}
#supply-root .qtycell{width:54px;text-align:center;font-size:11px;border:1px solid transparent;background:transparent;border-radius:3px;color:#1a1a1a;font-family:inherit;padding:2px 4px}
#supply-root .qtycell:hover,#supply-root .qtycell:focus{border-color:#93c5fd;background:#fff;outline:none}
#supply-root .qtycell.z{color:#cbd5e1}
#supply-root .qtycell.mm{border-color:#dc2626!important;background:#fef2f2!important;color:#991b1b!important;font-weight:700}
#supply-root .qtycell.saved{border-color:#16a34a;background:#f0fdf4}
#supply-root td.pcell{background:#fef3c7}#supply-root td.pcellok{background:#dcfce7}#supply-root td.chgcell{background:#fff7ed}
#supply-root .pbtn{font-size:9px;padding:1px 5px;border:1px solid #16a34a;background:#16a34a;color:#fff;border-radius:3px;cursor:pointer;font-weight:700;margin-left:3px}
#supply-root .pbtn:hover{background:#15803d}
#supply-root .fci.mm{border-color:#dc2626!important;background:#fef2f2!important;color:#991b1b!important;font-weight:700}
#supply-root .opup{font-size:9px;padding:1px 6px;border:1px solid #1d4ed8;background:#eff6ff;color:#1d4ed8;border-radius:4px;cursor:pointer;margin-top:3px;font-weight:700}
#supply-root .opup.has{border-color:#dc2626;background:#fef2f2;color:#991b1b}
#supply-root .po-exp{cursor:pointer;color:#1d4ed8;font-weight:700;text-align:center}
#supply-root .planbtn{background:#1a1a1a;color:#fff;border:none;border-radius:4px;padding:2px 7px;font-size:9px;font-weight:700;letter-spacing:.05em;cursor:pointer;font-family:inherit}
#supply-root .planbtn:hover{background:#3730a3}#supply-root .planbtn.open{background:#3730a3}
#supply-root table.po-tbl{width:max-content;min-width:100%}
#supply-root table.bc-tbl{width:max-content;min-width:100%}   /* size to content (don't let width:100% fatten thin columns like GRS); scrolls if wide */
#supply-root table.pp-tbl thead th{white-space:normal;vertical-align:middle;line-height:1.2}   /* portal grid: wrapping headers, vertically centred (no max-width — it was clipping the date column) */
#supply-root table.pp-tbl{width:max-content;min-width:100%}   /* size to content (overrides table{width:100%}) so cell min-widths hold — the date column stops clipping */
/* portal Product grid: scrolls sideways; the first column (View + swatch + ref/colour) stays sticky on the left */
#supply-root table.ppp-tbl{width:max-content;min-width:100%;border-collapse:separate;border-spacing:0;font-size:12px}
#supply-root table.ppp-tbl th{background:#e9eef5;text-align:left;padding:6px 8px;white-space:nowrap;font-size:10px;text-transform:uppercase;color:#64748b}
#supply-root table.ppp-tbl td{background:#fff;text-align:left;padding:6px 8px;border-bottom:1px solid #f1f1f1;white-space:nowrap}
#supply-root table.ppp-tbl td:nth-child(1),#supply-root table.ppp-tbl th:nth-child(1){position:sticky;left:0;z-index:2;box-shadow:2px 0 4px -2px rgba(15,23,42,.15)}
#supply-root table.ppp-tbl th:nth-child(1){z-index:3}
#supply-root table.po-tbl .fci.dt{width:84px}#supply-root table.po-tbl .fci.txt{width:96px}
#supply-root table.po-tbl thead th:first-child,
#supply-root table.po-tbl tbody tr:not(.exp-row):not(.grp-row) td:first-child{position:sticky;left:0;z-index:2;background:#fff;box-sizing:border-box;width:54px;min-width:54px;max-width:54px}
#supply-root table.po-tbl thead th:nth-child(2),
#supply-root table.po-tbl tbody tr:not(.exp-row):not(.grp-row) td:nth-child(2){position:sticky;left:54px;z-index:2;background:#fff;box-shadow:1px 0 0 #e0e0e0}
#supply-root table.po-tbl td.po-child b{font-weight:600}
#supply-root table.po-tbl td.po-child .ind{color:#9ca3af}
#supply-root table.po-tbl thead th:first-child,#supply-root table.po-tbl thead th:nth-child(2){z-index:3;background:#f3f3f1}
#supply-root .pay-tbl .fci.dt{width:96px}#supply-root .pay-tbl .pctin{width:38px;text-align:right}
#supply-root tr.exp-row .tw>table{width:max-content;min-width:100%}
#supply-root tr.exp-row table td:first-child,#supply-root tr.exp-row table th:first-child{white-space:nowrap;min-width:240px;padding-right:16px}
#supply-root .pay-tbl td:first-child,#supply-root .pay-tbl th:first-child{white-space:nowrap;min-width:330px}
/* Direct to Client details tab — keep it compact and on-screen (override the wide-first-column expand rule) */
#supply-root .dtc-wrap{max-width:640px}
#supply-root .dtc-wrap table{width:100%}
#supply-root .dtc-wrap table td,#supply-root .dtc-wrap table th{white-space:normal!important;min-width:0!important;vertical-align:top}
#supply-root .dtc-wrap table td:first-child,#supply-root .dtc-wrap table th:first-child{white-space:normal!important;min-width:0!important;padding-right:14px}
#supply-root .payin.pdis,#supply-root .payin:disabled{background:#f1f1f1;color:#bbb;cursor:not-allowed;border-color:#eee}
#supply-root .mut{color:#888}#supply-root .tiny{font-size:9.5px}
#supply-root .tl-msg{font-size:13px;color:#1a1a1a;line-height:1.45;white-space:pre-wrap;margin-top:2px}
#supply-root .tip{position:relative}
#supply-root .tip::after{content:attr(data-tip);position:absolute;left:50%;bottom:100%;transform:translateX(-50%);margin-bottom:5px;background:#0f172a;color:#fff;font-size:10px;font-weight:400;padding:4px 7px;border-radius:4px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .08s;transition-delay:0s;z-index:60}
#supply-root .tip:hover::after{opacity:1;transition-delay:120ms}
#supply-root .samp-card{font-size:13px}#supply-root .samp-card .tiny{font-size:12.5px}#supply-root .samp-card .mut.tiny{font-size:12px}#supply-root .samp-card .mut{font-size:inherit}
#supply-root .todo{color:#16a34a;font-weight:700}  /* "to proceed / needs input" prompts — bright green */
#supply-root .lnk-btn{background:none;border:none;color:#1d4ed8;cursor:pointer;font-size:11px;font-family:inherit;text-decoration:underline;padding:0}#supply-root .lnk-btn:hover{color:#dc2626}
#supply-root .ship-pick{background:none;border:none;color:#1d4ed8;cursor:pointer;font:inherit;font-size:11px;padding:0;white-space:nowrap}#supply-root .ship-pick:hover{text-decoration:underline}
#supply-root .ship-open{background:none;border:none;color:#1d4ed8;cursor:pointer;font:inherit;font-size:11px;padding:0;white-space:nowrap;text-decoration:underline;font-weight:600}#supply-root .ship-open:hover{color:#dc2626}
#supply-root .dep-pick{background:none;border:none;color:#1d4ed8;cursor:pointer;font:inherit;font-size:11px;padding:1px 4px;white-space:nowrap;border-radius:3px}#supply-root .dep-pick:hover{text-decoration:underline}
#supply-root .cell-pick{background:none;border:1px solid transparent;color:#1a1a1a;cursor:pointer;font:inherit;font-size:11px;padding:2px 5px;white-space:nowrap;border-radius:4px;text-align:left;max-width:150px;overflow:hidden;text-overflow:ellipsis}#supply-root .cell-pick:hover{border-color:#cbd5e1;background:#f8fafc}
#supply-root .dep-pick.needdep{background:#fee2e2;color:#991b1b;font-weight:600;text-decoration:none}
#supply-root .card{border:1px solid #e0e0e0;border-left:4px solid #ccc;border-radius:6px;padding:8px 12px;margin-bottom:7px}
#supply-root .card.high{border-left-color:#dc2626}#supply-root .card.amber{border-left-color:#f59e0b}#supply-root .card.low{border-left-color:#16a34a}
#supply-root .card .t{font-weight:700}#supply-root .card .d{color:#666;font-size:11px;margin-top:2px}
#supply-root .act-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:8px;align-items:start}#supply-root .act-cards .card{margin-bottom:0}
#supply-root .sect-h{font-weight:700;margin:12px 0 5px;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#555}
#supply-root .count{color:#999;font-size:11px}
#supply-root .swatch{width:24px;height:24px;border-radius:4px;object-fit:cover;border:1px solid #eee;vertical-align:middle}
#supply-root .bc-lbl{font-size:10px;font-weight:700;border:1px solid #93c5fd;background:#eff6ff;color:#1d4ed8;border-radius:3px;cursor:pointer;padding:1px 6px;margin-right:3px;font-family:inherit}
#supply-root .bc-lbl:hover{background:#dbeafe}
#supply-root .bc-mono{font-family:ui-monospace,Menlo,monospace}
#supply-root tr.batchrow td{background:#eef2ff!important;font-weight:600;border-top:1px solid #c7d2fe;text-align:left;white-space:normal}
#supply-root tr.cat-hdr td{background:#e8e8e6;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.03em;color:#333;padding:3px 8px;text-align:left;border-top:2px solid #bbb}
#supply-root .opapprove:hover{color:#15803d}
/* Purchase Orders grid: keep the MANAGE + PO columns anchored while scrolling the wide grid sideways
   (data rows only — the expanded detail row has id="pp-N" and must not be pinned). */
#supply-root table.pp-tbl thead th:first-child,
#supply-root table.pp-tbl tbody tr:not([id]):not(.pp-grp) td:first-child{position:sticky;left:0;z-index:2;background:#fff;width:104px;min-width:104px;max-width:104px;box-sizing:border-box;padding-left:5px;padding-right:5px}
#supply-root .pp-exp .ex-badge{margin-left:3px}   /* snug the counter to the MANAGE text */
#supply-root table.pp-tbl thead th:nth-child(2),
#supply-root table.pp-tbl tbody tr:not([id]) td:nth-child(2){position:sticky;left:104px;z-index:2;background:#fff;box-shadow:1px 0 0 #e0e0e0}
#supply-root table.pp-tbl thead th:first-child,#supply-root table.pp-tbl thead th:nth-child(2){z-index:3;background:#f3f3f1}
/* MANAGE button: compact; and never clip the action-count badge (which is always shown — grey 0 = nothing
   outstanding, red N = N actions needed). */
#supply-root .pp-exp{font-size:9px;padding:2px 2px;line-height:1.1;background:#fff;color:#111827;border:1px solid #111827}
#supply-root .pp-exp:hover{background:#f1f5f9}
#supply-root table.pp-tbl tbody tr:not([id]) td:first-child{overflow:visible}
#supply-root .ex-badge.done{background:#9ca3af}
/* Production sub-heading row spanning the portal PO grid. NOT position:sticky — a sticky <td> drops its
   background in Chrome (border-collapse), which left this banner white; a normal full-width row paints grey. */
#supply-root table.pp-tbl tr.pp-grp td{background:#e5e7eb;color:#374151;font-weight:700;font-size:11px;padding:6px 10px;text-align:left;letter-spacing:.03em;text-transform:uppercase;border-top:2px solid #cbd5e1;border-bottom:1px solid #cbd5e1}
#supply-root table.pp-tbl tr.pp-row.row-open>td{background:#FDFBD4!important}   /* expanded PO row highlight — matches the main supply grid */
/* Mobile: turn the portal sub-menu (tab strip) into a full-width horizontally-scrollable row so all tabs
   stay reachable instead of wrapping/overlapping. */
@media (max-width:640px){
  #supply-root .bar{flex-wrap:wrap}
  #supply-root #pp-tabs{display:flex!important;flex:1 1 100%;width:100%;flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 0 8px;border-bottom:1px solid #e5e7eb}
  #supply-root #pp-tabs::-webkit-scrollbar{height:0}
  #supply-root #pp-tabs .rtab{flex:0 0 auto;padding:9px 13px;font-size:13px;white-space:nowrap;border-bottom-width:3px}
  /* compact MANAGE → "M", but keep the first column wide enough to show the action-count badge */
  #supply-root .pp-exp .mng-txt{display:none}
  #supply-root .pp-exp{padding:4px 6px}
  #supply-root .pp-exp::before{content:"M"}
  #supply-root table.pp-tbl thead th:first-child,
  #supply-root table.pp-tbl tbody tr:not([id]) td:first-child{width:60px;min-width:60px;max-width:60px;overflow:visible}
  #supply-root table.pp-tbl thead th:nth-child(2),
  #supply-root table.pp-tbl tbody tr:not([id]) td:nth-child(2){left:60px;white-space:normal;word-break:break-all;max-width:12ch;min-width:0}
  /* PO-detail sub-menu (TIMELINE / ORDER PLAN / …): the detail renders inside a very wide table cell, so pin
     the strip to the viewport (sticky left:0 + width:100vw) and let it scroll sideways within that, instead of
     spanning the full table width. sticky top:0 keeps it visible while scrolling the panel. */
  #supply-root .po-subnav{position:sticky;left:0;top:0;z-index:5;width:100vw;max-width:100vw;box-sizing:border-box;flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch}
  #supply-root .po-subnav::-webkit-scrollbar{height:0}
  #supply-root .po-subnav .rtab{flex:0 0 auto;white-space:nowrap}
  /* portal PRODUCT detail sub-tabs: fit all four across one screen (no scroll) on mobile */
  #supply-root .pp-prod-nav{overflow-x:visible!important;flex-wrap:nowrap}
  #supply-root .pp-prod-nav .rtab{flex:1 1 0;min-width:0;padding:8px 2px!important;font-size:11px!important;letter-spacing:0;text-align:center}
  #supply-root #pp-prod-detail,#supply-root #pp-prod-detail *{max-width:100%!important;box-sizing:border-box;overflow-wrap:anywhere}
  /* PO-detail PANELS (Timeline / Order Plan / …): bound each panel to the viewport and let its wide content
     scroll sideways WITHIN the panel. The .ppx is JS-pinned to the left of the full-grid-width cell, so without
     this the right of a wide panel is unreachable — grid-scroll just re-pins .ppx back to the left. */
  #supply-root table.pp-tbl .ppx{width:100vw;max-width:100vw;box-sizing:border-box;padding-left:0!important;padding-right:0!important}
  #supply-root .pptab-panel{max-width:100vw;overflow-x:auto;-webkit-overflow-scrolling:touch;box-sizing:border-box}
  /* detail cell flush to the left edge — drop the inherited tbody-td horizontal padding so there's no indent */
  #supply-root table.pp-tbl tr[id^="pp-"]>td{padding-left:0;padding-right:0}
  /* TIMELINE: fit to exactly one screen width — never scroll sideways. Flex items default to min-width:auto and
     refuse to shrink below their content (forcing the panel wide → clipped by overflow:hidden); min-width:0 lets
     them shrink so long note text wraps instead. Inline min-width (e.g. the 78px control column) still wins.
     Order-plan etc. keep overflow-x:auto for their wide tables. */
  #supply-root .pptab-panel[data-pt="timeline"]{overflow-x:hidden}
  /* Fit-to-one-width for EVERY element in the Timeline: cap at the panel width, border-box so padding is internal
     (the yellow "Please confirm" / "Production status" boxes have padding:8px 11px), min-width:0 so flex items
     shrink, and wrap long words. Inline min-width (e.g. the 78px note control column) still wins. */
  #supply-root .pptab-panel[data-pt="timeline"] *{max-width:100%;min-width:0;box-sizing:border-box;overflow-wrap:anywhere}
  /* stop iOS inflating large text; trim oversized headings */
  #supply-root .sect-h{font-size:11px}
  #supply-root .ppx-h{font-size:12px}
  /* smaller grouping-row text on mobile (production groups + shipment date bands) */
  #supply-root table.pp-tbl tr.pp-grp td{font-size:8px!important;padding:3px 7px!important}
  #supply-root .sp-grp{font-size:8px!important;padding:3px 8px!important}
}`;
  function injectStyle(){ var st=document.getElementById('pv-style'); if(!st){ st=document.createElement('style'); st.id='pv-style'; document.head.appendChild(st); } st.textContent=STYLE; }   // always (re)apply the latest CSS — a stale pv-style from an earlier load in the admin SPA must be refreshed

  function mount(opts){
    injectStyle();
    var EP=opts.ep, STATE={supplierName:opts.supplierName||'', sid:opts.sid||null, by:opts.by||'portal'};
    // Anonymise mode (screenshots only): rewrite displayed text — PO supplier code → CM, real supplier name → the
    // demo name. Display only; underlying data / requests are unchanged.
    var PP_ANON = opts.anon || null;
    function anonText(t){ if(!PP_ANON||!t)return t;
      t=t.replace(/(PO-\d+(?:UK|US|EU|AU|CA))([A-Za-z]+)(\d)/g,'$1CM$3');   // PO-55UKLX3 → PO-55UKCM3
      (PP_ANON.realNames||[]).forEach(function(nm){ if(nm&&nm!==PP_ANON.name) t=t.split(nm).join(PP_ANON.name); });
      return t; }
    function anonSweep(){ if(!PP_ANON||!rootEl)return;
      var w=document.createTreeWalker(rootEl,NodeFilter.SHOW_TEXT,null,false), n, ch=[];
      while(n=w.nextNode()){ var v=n.nodeValue; if(!v)continue;
        if(v.indexOf('PO-')<0 && !(PP_ANON.realNames||[]).some(function(nm){return nm&&v.indexOf(nm)>=0;}))continue;
        var nv=anonText(v); if(nv!==v)ch.push([n,nv]); }
      ch.forEach(function(c){ c[0].nodeValue=c[1]; }); }
    var by=STATE.by, sid=STATE.sid;
    var BC=opts.bc||(typeof bcDownloadSheets==='function'?{sheets:bcDownloadSheets,crossdock:bcDownloadCrossdock}:{placeholder:true,note:function(){alert('Labels unavailable.');}});
    var _ppData=null, PORTAL_TAB='pos', PORTAL_PO_ST=null, _ppOpenPO=null;   // _ppOpenPO: a PO to auto-expand after switching to the Purchase Orders tab
    var PORTAL_SP_ESC=false, PORTAL_SP_PO='', PORTAL_SP_ACTIVE=true, PORTAL_SP_SHIPPED=false, PORTAL_SP_FOB=false, PORTAL_SP_CTRY={};   // Shipment Plan filters
    var PORTAL_PROD_BATCH='';   // PRODUCTIONS tab: selected batch id
    var PORTAL_PO_Q='';   // Purchase Orders search (overrides the status pills)
    var PORTAL_PO_PROD='', PORTAL_PO_CTRY='', PORTAL_PO_BR='';   // Purchase Orders dropdown filters (Production / Country / Branch)
    var PORTAL_PO_EXC=false;   // "show all exceptions" pill — POs with ≥1 open action, across all statuses
    // Deep link (?po=PO-…) — e.g. from an escalation email: open that PO on the Purchase Orders tab (its card
    // defaults to the TIMELINE sub-tab). Filter the grid to it so it's rendered even past the row cap.
    try{ var _dpPo=new URLSearchParams(location.search||'').get('po'); if(_dpPo){ PORTAL_TAB='pos'; _ppOpenPO=_dpPo; PORTAL_PO_Q=_dpPo; } }catch(e){}
    var PORTAL_BC_BATCH='';   // Barcodes tab: selected batch id
    var PORTAL_BC_Q='';       // Barcodes tab: per-SKU filter text
    var _bcRowsCache={};      // Barcodes tab: batch → fetched label-data rows (avoid refetch on filter/re-render)
    var _ppShowAllPO=false, _ppShowAllSP=false;   // "show all" toggles for the capped PO / shipment grids
    var PORTAL_SAMP_F='open', PORTAL_SAMP_Q='';   // Samples grid filter + search (default: open)
    var PORTAL_PROD_Q='', PORTAL_PROD_SEASON='', PORTAL_PROD_STATUS='in_development';   // Product grid: search + season + status (default: in development)
    var _invFiles={};     // base64 of the last parsed invoice file, per PO (for the Apply step)
    var rootEl=opts.root; if(!rootEl.closest('#supply-root')){rootEl.id='supply-root';} rootEl.style.display='block';
    if(PP_ANON){ try{ var _anonObs=new MutationObserver(function(){ if(_anonObs._busy)return; _anonObs._busy=1; _anonObs.disconnect(); try{anonSweep();}catch(e){} _anonObs.observe(rootEl,{childList:true,subtree:true}); _anonObs._busy=0; });
      _anonObs.observe(rootEl,{childList:true,subtree:true}); setTimeout(anonSweep,80); }catch(e){} }
    rootEl.innerHTML='<div class="bar" style="align-items:center"><span id="pp-tabs" style="display:none"><span class="rtab active" data-pt="pos">Purchase Orders <span id="pp-pos-badge"></span></span><span class="rtab" data-pt="shipmentplan">Shipment Plan <span id="pp-ship-badge"></span></span><span class="rtab" data-pt="deposits">Deposits</span><span class="rtab" data-pt="payments">Payments</span><span class="rtab" data-pt="productions">Productions</span><span class="rtab" data-pt="samples">Samples <span id="pp-samp-badge"></span></span><span class="rtab" data-pt="product" id="pp-prod-tab" style="display:none">Product <span id="pp-prod-badge"></span></span></span>'
      +'<span id="pp-notif" style="margin-left:auto;display:none;gap:6px;align-items:center;position:relative;white-space:nowrap">'
        +'<button id="pp-unread-btn" class="save-btn light" title="Unread messages from Dock &amp; Bay" style="position:relative">✉ <span id="pp-unread-n">0</span></button>'
        +'<button id="pp-recent-btn" class="save-btn light" title="Recent changes">🕘 Recent</button>'
        +'<div id="pp-unread-drop" style="display:none;position:absolute;right:0;top:100%;margin-top:4px;z-index:120;background:#fff;border:1px solid #cbd5e1;border-radius:8px;box-shadow:0 8px 24px rgba(15,23,42,.18);min-width:280px;max-width:360px;max-height:60vh;overflow:auto;text-align:left"></div>'
        +'<div id="pp-recent-drop" style="display:none;position:absolute;right:0;top:100%;margin-top:4px;z-index:120;background:#fff;border:1px solid #cbd5e1;border-radius:8px;box-shadow:0 8px 24px rgba(15,23,42,.18);min-width:300px;max-width:380px;max-height:60vh;overflow:auto;text-align:left"></div>'
      +'</span></div><div id="pp-banner"></div><div id="pp-body"><div class="count">Loading…</div></div>';
    var tabsEl=document.getElementById('pp-tabs'), body=document.getElementById('pp-body');
    // download a generated invoice as a real file (fetch -> blob) rather than opening a tab — works on the
    // portal host where /api/invoice/* isn't routed (uses the /api/portal/* endpoints via EP).
    function dlInvoice(url, btn){ var t=btn?btn.textContent:'';
      if(btn){ btn.disabled=true; btn.textContent='Preparing…'; }
      fetch(url).then(function(r){ if(!r.ok) return r.text().then(function(tx){ var m; try{m=JSON.parse(tx);}catch(e){} throw new Error((m&&m.error)||('HTTP '+r.status)); });
          var cd=r.headers.get('content-disposition')||''; var fm=/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd); var fn=fm?decodeURIComponent(fm[1]):'invoice.xlsx';
          return r.blob().then(function(b){ var u=URL.createObjectURL(b); var a=document.createElement('a'); a.href=u; a.download=fn; document.body.appendChild(a); a.click(); setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(u); },120); }); })
        .then(function(){ if(btn){ btn.disabled=false; btn.textContent=t; } })
        .catch(function(e){ if(btn){ btn.disabled=false; btn.textContent=t; } alert('Could not generate the invoice: '+(e&&e.message||e)); }); }
    if(!rootEl._invBound){ rootEl._invBound=1; rootEl.addEventListener('click', function(e){
      var fb=e.target.closest('.sp-fob-flag');   // FOB timeline "Flag" — delegated so it survives the note-list re-render
      if(fb){ e.preventDefault(); if(!EP.escalate)return; var msg=fb.dataset.msg||''; if(!msg)return; if(!confirm('Email this note to the supply planner?'))return; fb.disabled=true; fb.textContent='Sending…';
        postJSON(EP.escalate,{kind:'po',ref:fb.dataset.po,message:msg,initiator:'supplier'},function(j){ fb.textContent='✓ Flagged'; if(j&&j.sandbox)alert('Sandbox: no email key configured, nothing sent. On live this routes to the internal recipients in CONFIG ▸ General settings.'); }); return; }
      var b=e.target.closest('.pp-ship-inv,.pp-po-inv'); if(!b)return; e.preventDefault();
      if(b.classList.contains('pp-ship-inv')) dlInvoice((EP.shipmentInvoice||'/api/invoice/shipment/')+encodeURIComponent(b.dataset.ref), b);
      else dlInvoice((EP.poInvoice||'/api/invoice/po/')+encodeURIComponent(b.dataset.po), b); }); }
    function postJSON(ep,b2,cb){ fetch(ep,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b2)})
      .then(function(r){ return r.text().then(function(t){ try{ return t?JSON.parse(t):{}; }catch(_){ return r.ok?{}:{error:'Server error ('+r.status+')'}; } }); })   // tolerate empty / non-JSON (e.g. a 404 HTML page) — don't throw the cryptic Safari parse error
      .then(function(j){ if(j&&j.error){alert(j.error);return;} cb&&cb(j); }).catch(function(e){ alert('Failed: '+(e&&e.message||e)); }); }
    // GET that tolerates empty / non-JSON (404 HTML etc.) — returns [] instead of throwing Safari's "did not match the expected pattern"
    function getJSON(url){ return fetch(url).then(function(r){ return r.text().then(function(t){ try{ return t?JSON.parse(t):[]; }catch(_){ return []; } }); }); }
    // Should the INVOICE action fire for this PO? Rules (Ben): never on FUTURE POs; never once an invoice value is
    // submitted; only when the production END date is in the PAST — preferring the supplier-submitted end date
    // (completion_date submission), else the calculated prod_end; if there's no end date at all, don't show.
    function invoiceDue(p, subsArr){ subsArr=subsArr||[];
      var _pn=parseInt(p.prod_no,10); if(isFinite(_pn) && _pn<57) return false;   // invoices are only required from production 57 onward — 56 and earlier don't need one
      if(/future/i.test(p.status||'')) return false;
      if(subsArr.some(function(s){return s.kind==='invoice_value';})) return false;
      var supEnd=''; subsArr.forEach(function(s){ if(s.kind==='completion_date' && s.status!=='dismissed' && s.value) supEnd=s.value; });   // latest supplier-submitted production end
      var effEnd = supEnd || p.prod_end || '';
      if(!effEnd) return false;   // no production end date (supplier or calculated) → nothing to invoice against yet
      return effEnd < new Date().toISOString().slice(0,10); }
    // Completion date the supplier has provided: latest non-dismissed completion_date submission, else the
    // applied end_production_overide (p.completion_date). Blank = supplier hasn't entered one yet.
    function poCdVal(p, subsArr){ subsArr=subsArr||[]; var v=''; subsArr.forEach(function(s){ if(s.kind==='completion_date'&&s.status!=='dismissed'&&s.value) v=s.value; }); return v||(p&&(p.prod_completion_date||p.completion_date))||''; }
    // "Must enter completion date" exception — a confirmation-required, not-yet-shipped PO with no completion date.
    function poCdMissing(p, subsArr){ return !!(p&&p.require_confirmation) && p.production_status!=='shipped' && !poCdVal(p, subsArr); }
    // ── Minimal XLSX writer (ported from the main app) so PRODUCTIONS can export the same ORDER PLAN .xlsx ──
    function _xlsxEsc(s){ return String(s==null?'':s).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];}); }
    function _xlsxCol(i){ var s=''; i=i+1; while(i){ var r=(i-1)%26; s=String.fromCharCode(65+r)+s; i=((i-r)/26)|0; } return s; }
    function _xlsxCell(ref,v){ var st=null; if(v&&typeof v==='object'&&('v' in v)){ st=v.s; v=v.v; }
      var sa=(st!=null&&st>0)?(' s="'+st+'"'):'';
      if(v===''||v==null){ return sa?('<c r="'+ref+'"'+sa+'/>'):''; }
      if(typeof v==='number'&&isFinite(v)) return '<c r="'+ref+'"'+sa+'><v>'+v+'</v></c>';
      return '<c r="'+ref+'"'+sa+' t="inlineStr"><is><t xml:space="preserve">'+_xlsxEsc(v)+'</t></is></c>'; }
    function _xlsxSheet(grid, freeze, cols){ var rows=grid.map(function(row,ri){ var cells=(row||[]).map(function(v,ci){ return _xlsxCell(_xlsxCol(ci)+(ri+1),v); }).join(''); return cells?'<row r="'+(ri+1)+'">'+cells+'</row>':''; }).join('');
      var views='';
      if(freeze&&(freeze.x||freeze.y)){ var tl=_xlsxCol(freeze.x||0)+((freeze.y||0)+1);
        views='<sheetViews><sheetView workbookViewId="0"><pane'+(freeze.x?' xSplit="'+freeze.x+'"':'')+(freeze.y?' ySplit="'+freeze.y+'"':'')+' topLeftCell="'+tl+'" activePane="bottomRight" state="frozen"/></sheetView></sheetViews>'; }
      var colXml=(cols&&cols.length)?'<cols>'+cols.map(function(c){return '<col min="'+c.min+'" max="'+c.max+'" width="'+c.width+'" customWidth="1"/>';}).join('')+'</cols>':'';
      return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+views+colXml+'<sheetData>'+rows+'</sheetData></worksheet>'; }
    function _crc32(buf){ var t=_crc32._t; if(!t){ t=_crc32._t=[]; for(var n=0;n<256;n++){ var c=n; for(var k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1); t[n]=c>>>0; } } var crc=0xFFFFFFFF; for(var i=0;i<buf.length;i++)crc=(crc>>>8)^t[(crc^buf[i])&0xFF]; return (crc^0xFFFFFFFF)>>>0; }
    function _zipStore(files){ var enc=new TextEncoder(), parts=[], len=0, central=[];
      function u16(n){return new Uint8Array([n&255,(n>>8)&255]);} function u32(n){return new Uint8Array([n&255,(n>>8)&255,(n>>16)&255,(n>>>24)&255]);}
      function push(u){parts.push(u); len+=u.length;}
      files.forEach(function(f){ var nm=enc.encode(f.name), data=f.data, crc=_crc32(data), off=len;
        push(u32(0x04034b50)); push(u16(20)); push(u16(0)); push(u16(0)); push(u16(0)); push(u16(0)); push(u32(crc)); push(u32(data.length)); push(u32(data.length)); push(u16(nm.length)); push(u16(0)); push(nm); push(data);
        central.push({nm:nm,crc:crc,len:data.length,off:off}); });
      var cstart=len;
      central.forEach(function(c){ push(u32(0x02014b50)); push(u16(20)); push(u16(20)); push(u16(0)); push(u16(0)); push(u16(0)); push(u16(0)); push(u32(c.crc)); push(u32(c.len)); push(u32(c.len)); push(u16(c.nm.length)); push(u16(0)); push(u16(0)); push(u16(0)); push(u16(0)); push(u32(0)); push(u32(c.off)); push(c.nm); });
      var csize=len-cstart;
      push(u32(0x06054b50)); push(u16(0)); push(u16(0)); push(u16(central.length)); push(u16(central.length)); push(u32(csize)); push(u32(cstart)); push(u16(0));
      var out=new Uint8Array(len), p=0; parts.forEach(function(u){ out.set(u,p); p+=u.length; }); return out; }
    function buildXlsx(sheetName, grid, freeze, cols){ var enc=new TextEncoder();
      var STYLES='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        +'<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
        +'<fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
        +'<fill><patternFill patternType="solid"><fgColor rgb="FFFA5053"/></patternFill></fill>'
        +'<fill><patternFill patternType="solid"><fgColor rgb="FF8FD9FB"/></patternFill></fill>'
        +'<fill><patternFill patternType="solid"><fgColor rgb="FFADEBB3"/></patternFill></fill>'
        +'<fill><patternFill patternType="solid"><fgColor rgb="FFDAB1DA"/></patternFill></fill></fills>'
        +'<borders count="1"><border/></borders>'
        +'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
        +'<cellXfs count="8"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
        +'<xf numFmtId="0" fontId="0" fillId="2" borderId="0" xfId="0" applyFill="1" applyAlignment="1"><alignment horizontal="center"/></xf>'
        +'<xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1" applyAlignment="1"><alignment horizontal="center"/></xf>'
        +'<xf numFmtId="0" fontId="0" fillId="4" borderId="0" xfId="0" applyFill="1" applyAlignment="1"><alignment horizontal="center"/></xf>'
        +'<xf numFmtId="0" fontId="0" fillId="5" borderId="0" xfId="0" applyFill="1" applyAlignment="1"><alignment horizontal="center"/></xf>'
        +'<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
        +'<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf>'
        +'<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center"/></xf></cellXfs></styleSheet>';
      var files=[
        {name:'[Content_Types].xml', str:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'},
        {name:'_rels/.rels', str:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
        {name:'xl/workbook.xml', str:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="'+_xlsxEsc(sheetName)+'" sheetId="1" r:id="rId1"/></sheets></workbook>'},
        {name:'xl/_rels/workbook.xml.rels', str:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'},
        {name:'xl/styles.xml', str:STYLES},
        {name:'xl/worksheets/sheet1.xml', str:_xlsxSheet(grid, freeze, cols)}
      ];
      return _zipStore(files.map(function(f){ return {name:f.name, data:enc.encode(f.str)}; })); }
    function ppCard(l,v){ return '<div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px 14px;min-width:120px"><div class="tiny mut">'+l+'</div><div style="font-weight:700;font-size:16px">'+v+'</div></div>'; }
    // portal payment cell: only show a payment once it's been MADE (a paid date exists), with that date
    function ppPay(amt,dt){ return dt ? '$'+units(amt||0)+'<br><span class="mut tiny">'+esc(fd(dt))+'</span>' : '<span class="mut">—</span>'; }
    // Pin an expanded PO's detail panel (its sub-tabs + content) to the left while the wide portal grid scrolls
    // sideways — same JS-translate approach as the main PURCHASE ORDERS grid (CSS sticky can't: the detail cell
    // spans the full table width, so it has no containing-block slack). transform is compositor-only + rAF-coalesced.
    function portalGridTw(){ var tbl=document.querySelector('#supply-root table.pp-tbl'); return tbl&&tbl.closest('.tw'); }
    function applyPortalPin(){ var tw=portalGridTw(); if(!tw)return; var x=tw.scrollLeft;
      document.querySelectorAll('#supply-root table.pp-tbl .ppx').forEach(function(el){ el.style.transform=x?('translateX('+x+'px)'):''; }); }
    function bindPortalScrollPin(){ var tw=portalGridTw(); if(!tw||tw._pin)return; tw._pin=1; var raf=0;
      tw.addEventListener('scroll',function(){ if(!raf)raf=requestAnimationFrame(function(){ raf=0; applyPortalPin(); }); },{passive:true}); }
    function subFmt(s){ if(s.kind==='tracking'){ try{var o=JSON.parse(s.value);return 'tracking '+(o.tracking||'')+(o.carrier?' / '+o.carrier:'');}catch(e){return 'tracking';} }
      if(s.kind==='completion_date')return 'completion '+s.value; if(s.kind==='invoice_value')return 'invoice $'+s.value; return s.kind+' '+(s.value||''); }
    function ppExpand(p, lines, notes, subs, i, costs, supSkus, xd, add){ var po=esc(p.po); costs=costs||{}; supSkus=supSkus||[]; xd=xd||{}; add=add||[];
      var pend=subs.filter(function(s){return s.status==='pending';}), appl=subs.filter(function(s){return s.status==='applied';});
      var has=function(kind){ return subs.some(function(s){return s.kind===kind;}); };
      // ---- ORDER PLAN: amend qty, submit cost, add SKUs (from this supplier's SKU list) + line totals ----
      var lineSkus={}; lines.forEach(function(l){lineSkus[l.sku]=1;});
      var totQ=0, totP=0;
      function planRow(sku,orderQty,est,c,added){
        var act=(c&&c.actual_cost!=null&&c.actual_cost!=='')?Number(c.actual_cost):null;
        var aq=(c&&c.amended_qty!=null&&c.amended_qty!=='')?Number(c.amended_qty):null;
        var qn=(aq!=null?aq:(Number(orderQty)||0)), price=(act!=null?act:(est!=null?est:0)), lt=qn*price; totQ+=qn; totP+=lt;
        var qVal=(aq!=null?aq:(orderQty!=null?orderQty:''));
        return '<tr><td class="l" style="white-space:nowrap;min-width:30ch">'+esc(sku)+(added?' <span class="tool-badge bg-blue" style="font-size:8px">added</span>':'')+'</td>'
          +'<td style="text-align:right"><input class="fci pp-qty" data-po="'+po+'" data-sku="'+esc(sku)+'" value="'+esc(qVal)+'" style="width:62px;text-align:right" inputmode="numeric"></td>'
          +'<td style="text-align:right">'+(est!=null?'$'+money(est):'<span class="mut">—</span>')+'</td>'
          +'<td style="text-align:right"><input class="fci pp-cost" data-po="'+po+'" data-sku="'+esc(sku)+'" data-est="'+(est!=null?est:0)+'" value="'+(act!=null?esc(act):'')+'" placeholder="'+(est!=null?money(est):'0.00')+'" style="width:80px;text-align:right" inputmode="decimal"></td>'
          +'<td style="text-align:right" class="pp-lt" data-sku="'+esc(sku)+'">$'+money(lt)+'</td>'
          +'<td class="l">'+(added?'<button class="lnk-btn pp-rm" data-po="'+po+'" data-sku="'+esc(sku)+'" title="remove this added SKU" style="color:#b91c1c">✕</button>':'')+'</td></tr>';
      }
      var rws=lines.map(function(l){ return planRow(l.sku, l.qty, (l.cost_price!=null&&l.cost_price!=='')?Number(l.cost_price):((l.sku_cost!=null&&l.sku_cost!=='')?Number(l.sku_cost):null), costs[l.sku], false); }).join('');
      Object.keys(costs).forEach(function(sku){ var c=costs[sku]; if(c&&c.is_added&&!lineSkus[sku]) rws+=planRow(sku, null, null, c, true); });
      if(!rws) rws='<tr><td colspan="6" class="mut">no lines</td></tr>';
      var dlId='ppsku-'+i;
      var addOpts=supSkus.filter(function(s){ return !lineSkus[s.sku] && !(costs[s.sku]&&costs[s.sku].is_added); }).map(function(s){ return '<option value="'+esc(s.sku)+'">'+esc(s.product_name||'')+'</option>'; }).join('');
      // upload a commercial invoice / packing (.xlsx) to auto-fill qty + price overrides from the file
      var invUpload='<div style="margin:0 0 10px;padding:8px 11px;border:1px solid #cdd9ea;border-radius:7px;background:#f8fafc">'
        +'<div class="ppx-h" style="font-weight:600;font-size:12px;margin-bottom:4px">📄 Upload invoice / packing list (Excel) to auto-fill qty &amp; price</div>'
        +'<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><input type="file" class="pp-inv-parse-file" data-po="'+po+'" accept=".xlsx" style="font-size:11px;max-width:280px"><button class="save-btn pp-inv-parse-go" data-po="'+po+'">Parse file</button></div>'
        +'<div class="pp-inv-parse-out" data-po="'+po+'" style="margin-top:6px"></div>'
        +'<div class="tiny mut" style="margin-top:3px">Reads the SKU / Q’TY (PCS) / Unit Price columns and proposes qty + price overrides. You review, then apply — it then goes to Dock &amp; Bay to approve.</div></div>';
      // "What changed since you approved" — compare the current SKUs/qtys against the snapshot taken when the
      // supplier last confirmed this order (_ppData.approvedByPo[po]). Only shown once they've approved before
      // (so a first-time order isn't flagged) and something has since changed.
      var _appr=(_ppData.approvedByPo&&_ppData.approvedByPo[po])||null;
      var _chgs=[]; if(_appr){ var _cur={}; lines.forEach(function(l){ _cur[l.sku]=Number(l.qty)||0; });
        Object.keys(_appr).forEach(function(sku){ var old=Number(_appr[sku])||0, nw=(_cur[sku]!=null?_cur[sku]:0); if(nw!==old)_chgs.push({sku:sku,old:old,nw:nw,kind:(nw===0?'removed':(nw>old?'up':'down'))}); });
        lines.forEach(function(l){ var nw=Number(l.qty)||0; if(nw>0 && !(l.sku in _appr))_chgs.push({sku:l.sku,old:0,nw:nw,kind:'new'}); }); }
      var chgHtml=_chgs.length ? '<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;padding:8px 11px;margin:0 0 8px;max-width:540px">'
        +'<div style="font-weight:700;font-size:12px;margin-bottom:4px">⚠ Changes since you approved — please review &amp; re-confirm</div>'
        +'<div style="overflow-x:auto"><table style="font-size:11px;border-collapse:collapse;width:auto"><thead><tr><th class="l" style="padding:2px 12px 3px 0;min-width:30ch;white-space:nowrap">SKU</th><th style="text-align:right;padding:2px 12px 3px">Was</th><th style="text-align:right;padding:2px 12px 3px">Now</th><th class="l" style="padding:2px 0 3px">Change</th></tr></thead><tbody>'
        +_chgs.map(function(c){ var d=c.nw-c.old; return '<tr><td class="l" style="padding:1px 12px 1px 0;min-width:30ch;white-space:nowrap">'+esc(c.sku)+'</td><td style="text-align:right;padding:1px 12px">'+(c.kind==='new'?'<span class="mut">—</span>':c.old)+'</td><td style="text-align:right;padding:1px 12px">'+c.nw+'</td><td class="l" style="font-weight:600;color:'+(c.kind==='removed'?'#b91c1c':d>0?'#166534':'#b45309')+'">'+(c.kind==='new'?'added':c.kind==='removed'?'removed':(d>0?'+':'')+d)+'</td></tr>'; }).join('')
        +'</tbody></table></div></div>' : '';
      var skus=chgHtml+invUpload
        +'<div style="margin:3px 0 4px"><button class="lnk-btn pp-op-csv" data-po="'+po+'" style="font-size:11px">⤓ Download to CSV</button></div>'
        +'<div style="overflow-x:auto;-webkit-overflow-scrolling:touch"><table style="font-size:11px;margin:3px 0 6px;width:auto"><thead><tr><th class="l" style="white-space:nowrap;min-width:30ch">SKU</th><th style="text-align:right">Qty</th><th style="text-align:right">Est. cost</th><th style="text-align:right">Your cost</th><th style="text-align:right">Line total</th><th></th></tr></thead><tbody>'
        +rws
        +'<tr style="font-weight:700;border-top:2px solid #999"><td class="l">TOTAL</td><td style="text-align:right" class="pp-totq">'+units(totQ)+'</td><td></td><td style="text-align:right">FINAL</td><td style="text-align:right" class="pp-totp">$'+money(totP)+'</td><td></td></tr>'
        +'</tbody></table></div>'
        +'<div style="margin:6px 0"><button class="save-btn pp-op-addline" data-po="'+po+'">+ Add new line</button></div>'
        +'<div class="pp-op-picker" data-po="'+po+'" style="display:none"></div>'
        +'<div class="tiny mut" style="margin:2px 0 6px">Amend the quantity or enter your cost per line in the table above, or use <b>+ Add new line</b> to add SKUs you supply (enter the cost in the table after).</div>';
      // ---- Additional costs (freight, tooling, surcharges…) → sum into the total invoice cost ----
      var addTot=0; var acRows=add.map(function(a){ var q=Number(a.qty)||0, pr=Number(a.price)||0, lt=q*pr; addTot+=lt;
        return '<tr><td class="l"><input class="fci pp-ac-desc" data-id="'+a.id+'" data-po="'+po+'" value="'+esc(a.description||'')+'" placeholder="description" style="width:190px"></td>'
          +'<td style="text-align:right"><input class="fci pp-ac-qty" data-id="'+a.id+'" value="'+(a.qty!=null?esc(a.qty):'')+'" style="width:56px;text-align:right" inputmode="numeric"></td>'
          +'<td style="text-align:right"><input class="fci pp-ac-price" data-id="'+a.id+'" value="'+(a.price!=null?esc(a.price):'')+'" style="width:74px;text-align:right" inputmode="decimal"></td>'
          +'<td style="text-align:right">$'+money(lt)+'</td>'
          +'<td class="l"><button class="lnk-btn pp-ac-rm" data-id="'+a.id+'" title="remove" style="color:#b91c1c">✕</button></td></tr>'; }).join('');
      var invTot=totP+addTot;
      skus+='<div class="sect-h" style="margin-top:12px">Additional costs <span class="mut tiny">(freight, tooling, surcharges… — added to the invoice)</span></div>'
        +'<table style="font-size:11px;border-collapse:collapse;text-align:left;table-layout:fixed;width:540px;max-width:100%"><colgroup><col style="width:200px"><col style="width:72px"><col style="width:90px"><col style="width:88px"><col style="width:70px"></colgroup><thead><tr><th class="l">Description</th><th class="l">Qty</th><th class="l">Price</th><th class="l">Total</th><th></th></tr></thead><tbody>'
        +acRows
        +'<tr><td class="l"><input class="fci pp-ac-ndesc" data-po="'+po+'" placeholder="+ add a cost…" style="width:190px"></td><td style="text-align:right"><input class="fci pp-ac-nqty" data-po="'+po+'" placeholder="qty" style="width:56px;text-align:right" inputmode="numeric"></td><td style="text-align:right"><input class="fci pp-ac-nprice" data-po="'+po+'" placeholder="price" style="width:74px;text-align:right" inputmode="decimal"></td><td></td><td class="l"><button class="save-btn pp-ac-add" data-po="'+po+'">Add</button></td></tr>'
        +(add.length?'<tr style="font-weight:700;border-top:1px solid #ccc"><td class="l">Additional total</td><td></td><td></td><td style="text-align:right">$'+money(addTot)+'</td><td></td></tr>':'')
        +'</tbody></table>'
        +'<div style="margin:12px 0 4px;padding:10px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;font-weight:800;font-size:18px">Total invoice amount: <span class="pp-inv-tot" data-add="'+addTot+'">$'+money(invTot)+'</span> <span class="mut" style="font-weight:400;font-size:12px">(line items $'+money(totP)+' + additional $'+money(addTot)+')</span></div>';
      // ---- crossdock SKUs → shipped-qty entry lives in the SHIPMENT tab (becomes an open action once shipping) ----
      var cdSkus=(p.crossdock_skus||'').split(',').map(function(s){return s.trim();}).filter(Boolean);
      var today=new Date().toISOString().slice(0,10);
      var xdReq = cdSkus.length>0 && (/shipping/i.test(p.status||'') || (p.prod_end && p.prod_end<today));
      var xdMissing = cdSkus.filter(function(s){ var q=xd[s]; return q==null||q===''; }).length;
      var xdAction = (xdReq && xdMissing>0) ? 1 : 0;
      // ---- PO confirmation banner — supplier reviews SKUs / quantities (ORDER PLAN) + dates and formally confirms.
      //      Only shown when the PO's production requires confirmation (set per-production in CONFIG ▸ Productions).
      //      Lives at the top of the TIMELINE tab; an unconfirmed order is then an open action item. ----
      var needConfirm=!!p.require_confirmation;
      var confirmed=!!p.supplier_confirmed;
      var confirmBar=needConfirm?('<div style="margin:0 0 10px;padding:8px 11px;border-radius:6px;font-size:12px;box-sizing:border-box;'+(confirmed?'background:#dcfce7;border:1px solid #86efac':'background:#fef3c7;border:1px solid #fcd34d')+'">'
        +(confirmed
          ? '<div style="margin-bottom:8px">✓ <b>Order confirmed</b> on '+esc(p.supplier_confirmed)+(p.supplier_confirmed_by?' · '+esc(p.supplier_confirmed_by):'')+'</div><button class="save-btn light pp-confirm" data-po="'+po+'" data-v="0">Withdraw confirmation</button>'
          : '<div style="margin-bottom:8px">⏳ <b>'+(_chgs.length?'A change has been made. Please re-confirm this order.':'Please confirm this order.')+'</b> Review the SKUs &amp; quantities (ORDER PLAN tab) and the dates, amend anything that\'s wrong, then confirm.</div><button class="save-btn pp-confirm" data-po="'+po+'" data-v="1" style="background:#16a34a;color:#fff;border-color:#16a34a">✓ Confirm order</button>')
        +'</div>'):'';
      // The same confirm / re-confirm prompt + button also sits at the top of the ORDER PLAN tab (Ben). Yellow
      // prompt only — once confirmed it disappears from BOTH tabs (the card re-renders on confirm). Withdraw
      // stays on the TIMELINE banner only.
      var confirmOP=(needConfirm && !confirmed)?('<div style="margin:0 0 10px;padding:8px 11px;border-radius:6px;font-size:12px;box-sizing:border-box;background:#fef3c7;border:1px solid #fcd34d">'
        +'<div style="margin-bottom:8px">⏳ <b>'+(_chgs.length?'A change has been made. Please re-confirm this order.':'Please confirm this order.')+'</b> Review the SKUs &amp; quantities and the dates below, amend anything that\'s wrong, then confirm.</div>'
        +'<button class="save-btn pp-confirm" data-po="'+po+'" data-v="1" style="background:#16a34a;color:#fff;border-color:#16a34a">✓ Confirm order</button></div>'):'';
      skus=confirmOP+'<div class="sect-h" style="font-size:14px;margin:0 0 8px">Step 1 — Confirm order plan <span class="mut tiny" style="font-weight:400">(SKU · qty · your cost)</span></div>'+skus;
      // ---- TIMELINE: production status + status + notes (Dock & Bay notes show as 'new' until you mark them read) ----
      var unreadInt=notes.filter(function(n){return n.author_kind==='internal'&&!n.read;}).length;
      var prodExc=needConfirm?prodAttention(p.production_status, p.prod_start, p.prod_end, subs):'';
      var cdVal=poCdVal(p, subs), cdMiss=poCdMissing(p, subs);
      var prodBlock='<div style="margin-bottom:10px;padding:8px 11px;border-radius:6px;font-size:12px;box-sizing:border-box;'+((prodExc||cdMiss)?'background:#fef3c7;border:1px solid #fcd34d':'background:#f1f5f9;border:1px solid #e5e7eb')+'">'
        +'<b>Production status</b> &nbsp; '+prodStatusSel(p.po, p.production_status||'')
        +'<div style="margin-top:8px"><b>Completion date</b> &nbsp; <input type="date" class="pp-cd-grid" data-po="'+esc(p.po)+'" value="'+esc(cdVal)+'" title="your production completion date — submitted for Dock &amp; Bay approval; kept in sync with the purchase order grid" style="width:150px;cursor:pointer;text-align:left;font:inherit;font-size:12px;padding:4px 6px;border:1px solid '+(cdMiss?'#dc2626':'#93c5fd')+';border-radius:4px;background:'+(cdMiss?'#fef2f2':'#eff6ff')+';color:#1d4ed8">'
        +(cdMiss?' <span style="background:#dc2626;color:#fff;border-radius:4px;font-size:10px;font-weight:700;padding:2px 7px">⚠ Must enter completion date</span>':'')+'</div>'
        +(prodExc?'<div class="tiny" style="color:#b45309;margin-top:4px">⚠ '+esc(prodExc)+'</div>':'')+'</div>';
      // escalate is only offered on the supplier's OWN latest message (it emails Dock & Bay) — never on a D&B note
      var _supNotes=(notes||[]).filter(function(n){return n.author_kind!=='internal';});
      var _recentSupNoteId=_supNotes.length?_supNotes.slice().sort(function(a,b){return String(b.created_at||'').localeCompare(String(a.created_at||''));})[0].id:null;
      var timeline=confirmBar+prodBlock
        +(pend.length?'<div class="tiny" style="color:#92400e;margin-bottom:3px">⏳ Submitted, awaiting approval: '+pend.map(function(s){return esc(subFmt(s));}).join(' · ')+'</div>':'')
        +(appl.length?'<div class="tiny" style="color:#166534;margin-bottom:6px">✓ Applied: '+appl.map(function(s){return esc(subFmt(s))+(s.attachment_id?' <a href="/api/portal/attachment/'+s.attachment_id+'" target="_blank">doc</a>':'');}).join(' · ')+'</div>':'')
        +(notes.length?tlDesc(notes).map(function(n){ var internal=(n.author_kind==='internal');
          var ctrl = internal
            ? (n.read?'<button class="pp-note-read" data-id="'+n.id+'" data-read="1" style="font-size:10px;color:#64748b;cursor:pointer;text-decoration:underline;white-space:nowrap;background:none;border:none;padding:0">mark unread</button>':'<button class="save-btn light pp-note-read" data-id="'+n.id+'" data-read="0">Mark read</button>')
            : ((EP.escalate&&n.id===_recentSupNoteId)?'<button class="save-btn light tip pp-esc-note" data-po="'+po+'" data-msg="'+esc(n.body)+'" data-tip="email this note to the supply planner" style="color:#b91c1c;border-color:#fca5a5;white-space:nowrap">⚑ Flag</button>':'');
          return '<div style="font-size:11px;margin:3px 0;max-width:640px;padding:5px 8px;background:'+(internal?(n.read?'#eef2ff':'#fff7ed'):'#f1f5f9')+';border:1px solid '+(internal&&!n.read?'#fdba74':'#e5e7eb')+';border-radius:5px;display:flex;gap:10px;align-items:flex-start">'
            +(ctrl?'<div style="flex:0 0 auto;display:flex;flex-direction:column;gap:3px;align-items:flex-start;min-width:78px">'+ctrl+'</div>':'')
            +'<div style="flex:1"><span class="mut tiny">'+esc(n.created_at)+' · '+(internal?'Dock &amp; Bay':'You')+'</span>'+(internal&&!n.read?' <span class="ex-badge">new</span>':'')+'<br>'+esc(n.body)+'</div>'
            +'</div>'; }).join(''):'<div class="mut tiny">No notes yet.</div>')
        +'<div style="margin-top:6px;display:flex;gap:5px"><textarea class="pp-note-body fci" data-po="'+po+'" rows="1" placeholder="Reply to Dock &amp; Bay…" style="flex:1;min-height:26px;max-width:420px;text-align:left"></textarea><button class="save-btn pp-note-post" data-po="'+po+'">Post</button></div>';
      // ---- INVOICE (the submitted value persists here with its approval status) ----
      var invSubsAll=subs.filter(function(s){return s.kind==='invoice_value';}); var invSub=invSubsAll.length?invSubsAll[invSubsAll.length-1]:null;
      var invStatus=invSub?(invSub.status==='applied'?'<span class="tool-badge bg-green">approved</span>':invSub.status==='dismissed'?'<span class="tool-badge bg-neutral">rejected — please resubmit</span>':'<span class="tool-badge bg-amber">awaiting Dock &amp; Bay approval</span>'):'';
      // STEP 2 — confirm the invoice amount (defaults to the calculated Step-1 total) → submit for D&B approval + tax invoice
      var invDefault=(invSub&&invSub.status!=='dismissed'&&invSub.value!=null&&invSub.value!=='')?esc(invSub.value):(Number(invTot)||0).toFixed(2);
      // red warning if the submitted invoice amount differs from the Step-1 calculated total (update the order plan)
      var _invCalc=(Number(invTot)||0).toFixed(2);   // Step-1 calculated total; the amount is compared LIVE against this
      var _invNow=(Number(String(invDefault).replace(/,/g,''))||0);
      var invMismatch=(Math.abs(_invNow-(Number(invTot)||0))>0.01);   // current field value ≠ calculated
      var invStep2='<div class="sect-h" style="font-size:14px;margin:18px 0 8px;padding-top:12px;border-top:2px solid #e5e7eb">Step 2 — Confirm invoice amount</div>'
        +'<div class="pp-inv-warn" data-po="'+po+'" data-calc="'+_invCalc+'" style="'+(invMismatch?'':'display:none;')+'margin:0 0 10px;padding:8px 11px;border-radius:6px;font-size:12px;background:#fef2f2;border:1px solid #fca5a5;color:#991b1b"><b>⚠ Invoice amount doesn\'t match the order plan.</b> Your invoice amount differs from the calculated total <b>$'+money(invTot)+'</b>. Please update the order plan in Step 1 above (SKUs / quantities / costs) so they match.</div>'
        +(invoiceDue(p,subs)?'<div style="margin:0 0 12px;padding:8px 11px;border-radius:6px;font-size:12px;background:#fef3c7;border:1px solid #fcd34d">⏳ <b>Please submit your invoice.</b> This order\'s production is complete, so Dock &amp; Bay need your commercial invoice to proceed with payment.</div>':'')
        +'<div style="display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end">'
        +'<label class="tiny">Invoice amount (USD) <span class="mut">— defaults to the calculated total above</span><br><input class="fci pp-inv" data-po="'+po+'" data-calc="'+_invCalc+'" placeholder="0.00" value="'+invDefault+'" style="width:150px;font-size:15px;font-weight:700"></label>'
        +'<label class="tiny">Invoice doc <span class="mut">(optional)</span><br><input type="file" class="pp-inv-file" data-po="'+po+'" style="font-size:11px;width:200px"></label>'
        +'<button class="save-btn pp-inv-go" data-po="'+po+'" style="background:#16a34a;color:#fff;border-color:#15803d;font-weight:700">SUBMIT TO DOCK &amp; BAY FOR APPROVAL</button></div>'
        +(invSub?'<div class="tiny" style="margin-top:8px;padding:6px 9px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:6px">Submitted: <b>$'+esc(invSub.value)+'</b> · '+esc(invSub.submitted_at||'')+' · '+invStatus+(invSub.attachment_id?' · <a href="/api/portal/attachment/'+invSub.attachment_id+'" target="_blank">doc</a>':'')+'</div>':'')
        +'<div style="margin-top:12px"><button class="save-btn pp-po-inv" data-po="'+esc(po)+'" style="background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;font-weight:600">⤓ DOWNLOAD GENERATED TAX INVOICE FOR THIS PO</button></div>';
      // DOCUMENTS — moved to the PAYMENTS & DOCUMENTS tab
      var pdocs=(_ppData&&_ppData.docsByPo&&_ppData.docsByPo[po])||[];
      var attBase=(EP.attachmentBase||'/api/portal/attachment/');
      // Approval workflow: a supplier submits a document for Dock & Bay approval; the status + D&B's decision
      // (with notes) show here and on the timeline. Rejected docs can be revised & re-submitted.
      function docStatusCell(d){ var s=d.approval_status||'draft';
        if(s==='submitted') return '<span class="tool-badge bg-amber">⏳ Awaiting Dock &amp; Bay approval</span>';
        if(s==='approved') return '<span class="tool-badge bg-green">✓ Approved</span>'+(d.reviewed_at?' <span class="mut tiny">'+esc(d.reviewed_at)+'</span>':'');
        if(s==='rejected') return '<span class="tool-badge" style="background:#fee2e2;color:#b91c1c">✗ Rejected</span>'+(d.review_notes?' <span class="mut tiny">'+esc(d.review_notes)+'</span>':'');
        return '<span class="mut tiny">Draft</span>'; }
      function docActionCell(d){ var s=d.approval_status||'draft', canSubmit=(s==='draft'||s==='rejected')&&EP.docSubmit;
        return (canSubmit?'<button class="save-btn pp-doc-submit" data-id="'+d.id+'" data-po="'+po+'" title="send this document to Dock &amp; Bay for approval">'+(s==='rejected'?'Re-submit':'Submit for approval')+'</button> ':'')
          +'<button class="lnk-btn pp-doc-rm" data-id="'+d.id+'" data-po="'+po+'" style="color:#b91c1c">remove</button>'; }
      var docRows=pdocs.length?pdocs.map(function(d){ return '<tr><td class="l">'+esc(d.category||'Other')+'</td><td class="l"><a href="'+attBase+d.id+'" target="_blank" rel="noopener">'+esc(d.filename||'file')+'</a></td><td class="l mut tiny">'+esc(d.uploaded_at||'')+'</td><td class="l">'+docStatusCell(d)+'</td><td class="l">'+docActionCell(d)+'</td></tr>'; }).join('')
        :'<tr><td colspan="5" class="mut tiny">No documents uploaded yet.</td></tr>';
      var docsBlock='<div class="sect-h" style="margin-top:16px">Documents <span class="mut tiny">— attach your commercial invoice, packing list, certificates, photos… then submit for Dock &amp; Bay approval</span></div>'
        +'<div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin-bottom:6px">'
        +'<label class="tiny">Type<br><select class="fci pp-doc-type" data-po="'+po+'" style="text-align:left;min-width:160px">'+DOC_TYPES.map(function(t){return '<option>'+esc(t)+'</option>';}).join('')+'</select></label>'
        +'<label class="tiny">File<br><input type="file" class="pp-doc-file" data-po="'+po+'" style="font-size:11px;width:210px"></label>'
        +'<button class="save-btn pp-doc-go" data-po="'+po+'">Upload document</button></div>'
        +'<table style="font-size:11px;width:auto"><thead><tr><th class="l">Type</th><th class="l">File</th><th class="l">Uploaded</th><th class="l">Approval</th><th></th></tr></thead><tbody>'+docRows+'</tbody></table>'
        +(/coghlans/i.test(p.branch||'')?'<div style="margin-top:8px"><button class="save-btn" onclick="window.open(\'/api/portal/asn-labels/\'+encodeURIComponent(\''+po+'\'))" title="download your A4 ASN pallet labels — one page per pallet">⤓ ASN Pallet Labels</button> <span class="mut tiny">one A4 page per pallet</span></div>':'');
      var orderInvoice=skus+invStep2;   // merged ORDER PLAN & INVOICE tab (Step 1 order plan + Step 2 invoice)
      // ---- SHIPMENT: flexport details, else submit tracking/carrier + completion ----
      var shipLabelBtn=(p.ship_other_supplier?'<div style="margin:6px 0"><button class="save-btn pp-shiplabel" data-po="'+po+'" title="this shipment consolidates under another supplier’s master — download the SHIPS WITH labels for your cartons">⤓ Shipment Labels</button> <span class="mut tiny">consolidated under another supplier — label your cartons</span></div>':'');
      // carrier + tracking live on the SHIPMENT (same carrier list as the planner). If this PO isn't on a
      // shipment yet, submitting creates a master shipment for it and assigns this PO.
      var hasShip=!!p.shipment;
      var CARS_PP=['DHL','Fedex','SF Express','Local Delivery','Other'];
      var carVal=p.ship_carrier||(p.flexport_reference?'Flexport':'');
      var trkVal=p.ship_carrier_ref||p.flexport_reference||'';
      var carOpts='<option value="">—</option>'+((carVal&&CARS_PP.indexOf(carVal)<0)?'<option selected>'+esc(carVal)+'</option>':'')
        +CARS_PP.map(function(o){return '<option'+(o===carVal?' selected':'')+'>'+o+'</option>';}).join('');
      var shipHead=hasShip
        ? '<div style="font-size:12px;margin-bottom:8px"><b>Shipment '+esc(p.shipment)+'</b>'
            +(p.ships_with_supplier?' &nbsp;·&nbsp; ships with supplier: <b>'+esc(p.ships_with_supplier)+'</b>':'')
            +'<br>Ship date: '+(p.ship?esc(fd(p.ship)):'<span class="mut">—</span>')+' · Est. completion: '+(p.prod_end?esc(fd(p.prod_end)):'<span class="mut">—</span>')
            +' &nbsp; <button class="lnk-btn pp-go-shipplan" data-ref="'+esc(p.shipment)+'" style="color:#1d4ed8;text-decoration:underline;cursor:pointer;background:none;border:none;padding:0;font:inherit">View in Shipment Plan →</button></div>'
        : '<div style="font-size:13px;color:#334155;margin-bottom:8px">No shipment assigned yet — enter the carrier &amp; tracking below and we’ll create the shipment for this PO.</div>';
      if(p.branch_delivery_notes) shipHead += '<div style="margin:0 0 10px;padding:8px 11px;border-radius:6px;font-size:12px;background:#eff6ff;border:1px solid #bfdbfe;white-space:pre-wrap"><b>Delivery notes</b><br>'+esc(p.branch_delivery_notes)+'</div>';   // branch delivery notes (from the PO's branch)
      var flexRef=p.flexport_reference||p.flex_id||((carVal==='Flexport')?trkVal:'');
      var shipment=hasShip
        // shipment already linked → carrier / tracking / Flexport ref are READ-ONLY (managed on the shipment centrally)
        ? shipHead
          +'<table style="font-size:12px;border-collapse:collapse;text-align:left"><tbody>'
          +'<tr><td class="mut" style="padding:2px 14px 2px 0;text-align:left">Carrier</td><td style="text-align:left">'+(carVal?'<b>'+esc(carVal)+'</b>':'<span class="mut">—</span>')+'</td></tr>'
          +'<tr><td class="mut" style="padding:2px 14px 2px 0;text-align:left">Tracking ref</td><td style="text-align:left">'+(trkVal?'<b>'+esc(trkVal)+'</b>':'<span class="mut">—</span>')+'</td></tr>'
          +'<tr><td class="mut" style="padding:2px 14px 2px 0;text-align:left">Flexport ref</td><td style="text-align:left">'+(flexRef?'<b>'+esc(flexRef)+'</b>':'<span class="mut">—</span>')+'</td></tr>'
          +'</tbody></table>'
          +'<div class="tiny mut" style="margin-top:5px">Carrier &amp; tracking are managed on the shipment — to change them, contact Dock &amp; Bay.</div>'
          +'<div class="sect-h" style="margin-top:14px">Freight charge</div>'
          +'<div class="tiny mut" style="margin-bottom:6px">Add a freight cost for this shipment. Dock &amp; Bay reviews it; once accepted it becomes a payment to you.</div>'
          +'<div class="pp-fchg-list" data-ref="'+esc(p.shipment)+'" style="margin-bottom:6px"><span class="mut tiny">…</span></div>'
          +'<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end">'
          +'<label class="tiny">Freight (&pound;/$)<br><input class="fci pp-fcost" data-ref="'+esc(p.shipment)+'" placeholder="0.00" style="width:110px;text-align:left" inputmode="decimal"></label>'
          +'<label class="tiny">Note (optional)<br><input class="fci pp-fnote" data-ref="'+esc(p.shipment)+'" placeholder="e.g. extra container" style="width:200px;text-align:left"></label>'
          +'<button class="save-btn pp-fchg-go" data-ref="'+esc(p.shipment)+'">Add freight charge</button></div>'
        // no shipment yet → NOT an action. Only if the supplier ticks "shipped with own carrier" do we reveal
        // the carrier/tracking/charge inputs (submitting then creates the shipment for this PO).
        : shipHead
          +'<label style="display:block;font-size:12px;margin-bottom:6px;cursor:pointer"><input type="checkbox" class="pp-ownship" data-po="'+po+'" style="vertical-align:middle;margin-right:6px">Supplier shipped this with own carrier account (ie. DHL / Fedex)</label>'
          +'<div class="pp-ownship-box" data-po="'+po+'" style="display:none">'
          +'<div style="display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end">'
          +'<label class="tiny">Carrier<br><select class="fci pp-car" data-po="'+po+'" style="min-width:120px;text-align:left">'+carOpts+'</select></label>'
          +'<label class="tiny">Tracking ref<br><input class="fci pp-trk" data-po="'+po+'" value="'+esc(trkVal)+'" placeholder="e.g. MAEU… / Flexport ID" style="width:170px;text-align:left"></label>'
          +'<label class="tiny">Freight charge (optional, &pound;/$)<br><input class="fci pp-fcost-new" data-po="'+po+'" placeholder="0.00" style="width:140px;text-align:left" inputmode="decimal"></label>'
          +'<button class="save-btn pp-trk-go" data-po="'+po+'">Create shipment &amp; save</button></div>'
          +'<div class="tiny mut" style="margin-top:4px">Submitting creates the shipment for this PO, saves the carrier &amp; tracking, and logs any freight charge for Dock &amp; Bay to review.</div>'
          +'</div>';
      shipment = shipLabelBtn + shipment;
      // Direct-to-Client shipment details (carton count / CBM / gross weight / dimensions). Supplier-entered;
      // saving posts a PO timeline note (→ D&B ✉ bell). Overdue badge once production has ended with data missing.
      if(ppIsDtc(p)){ var _dtcToday=new Date().toISOString().slice(0,10), _dtcOverdue=(p.prod_end&&p.prod_end<_dtcToday&&!p.dtc_entered_at);
        shipment += '<div class="sect-h" style="margin-top:16px">Shipment details'+(_dtcOverdue?' <span class="ex-badge" title="production has ended — please enter your shipment details">!</span>':'')+'</div>'
          +'<div class="tiny'+(_dtcOverdue?'':' mut')+'" style="margin-bottom:6px'+(_dtcOverdue?';color:#92400e':'')+'">'+(_dtcOverdue?'⚠ Production has ended — please enter the shipment details for this direct-to-client order.':'Enter the carton count, cargo volume, gross weight and dimensions for this direct-to-client shipment.')+'</div>'
          +'<div style="display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end">'
          +'<label class="tiny">Carton count<br><input class="fci pp-dtc" data-po="'+po+'" data-f="cartons" value="'+esc(p.dtc_cartons!=null?p.dtc_cartons:'')+'" inputmode="numeric" style="width:100px;text-align:left"></label>'
          +'<label class="tiny">Cargo volume (CBM)<br><input class="fci pp-dtc" data-po="'+po+'" data-f="cbm" value="'+esc(p.dtc_cbm!=null?p.dtc_cbm:'')+'" inputmode="decimal" style="width:120px;text-align:left"></label>'
          +'<label class="tiny">Gross weight (kg)<br><input class="fci pp-dtc" data-po="'+po+'" data-f="gross_weight_kg" value="'+esc(p.dtc_weight!=null?p.dtc_weight:'')+'" inputmode="decimal" style="width:120px;text-align:left"></label>'
          +'<label class="tiny">Total shipment dimensions<br><input class="fci pp-dtc" data-po="'+po+'" data-f="dimensions" value="'+esc(p.dtc_dimensions||'')+'" placeholder="e.g. 120x100x80cm total" style="width:230px;text-align:left"></label>'
          +'<button class="save-btn pp-dtc-go" data-po="'+po+'">Save shipment details</button></div>'
          +(p.dtc_entered_at?'<div class="tiny mut" style="margin-top:4px">Last updated '+esc(p.dtc_entered_at)+'</div>':''); }
      if(cdSkus.length){ var xrows=cdSkus.map(function(s){ var q=xd[s];
          return '<tr><td class="l">'+esc(s)+'</td><td style="text-align:right"><input class="fci pp-xqty" data-po="'+po+'" data-sku="'+esc(s)+'" value="'+(q!=null&&q!==''?esc(q):'')+'" placeholder="qty shipped" style="width:96px;text-align:right" inputmode="numeric"></td></tr>'; }).join('');
        shipment += '<div class="sect-h" style="margin-top:14px">Crossdock SKUs on this shipment'+(xdAction?' <span class="ex-badge" title="enter the quantity shipped for each crossdock SKU">'+xdMissing+'</span>':'')+'</div>'
          +(xdReq?'<div class="tiny" style="color:#92400e;margin-bottom:4px">⚠ This order is shipping — enter the quantity shipped for each crossdock SKU.</div>':'<div class="tiny mut" style="margin-bottom:4px">Enter the quantity shipped for each crossdock SKU (required once the order is shipping).</div>')
          +'<table style="font-size:11px;width:auto"><thead><tr><th class="l">Crossdock SKU</th><th style="text-align:right">Qty shipped</th></tr></thead><tbody>'+xrows+'</tbody></table>'
          +'<div class="tiny mut" style="margin-top:3px">Download the crossdock box labels from the grid (⤓ Crossdock).</div>'; }
      // ---- BARCODES & LABELS tab: PO + production barcodes (always); Ship-To pallet labels (only when this PO
      //      ships under another supplier's PO); Direct-to-Client / FBA attachments (only when there are any) ----
      var clientDocs=p.client_docs||[];
      function blRow(lbl,val){ return '<div style="display:flex;gap:14px;align-items:baseline;padding:7px 0;border-bottom:1px solid #f1f1f1"><div style="flex:0 0 220px;color:#555">'+lbl+'</div><div>'+val+'</div></div>'; }
      var barcodesLabels='<div class="sect-h">Barcodes &amp; Labels</div><div style="max-width:640px;font-size:12px">'
        +blRow('Barcodes for this PO','<button class="save-btn pp-dl-po" data-po="'+po+'">⤓ Download barcodes for PO</button>')
        +(p.prod_no?blRow('Barcodes for production '+esc(p.prod_no),'<button class="save-btn pp-dl-prod" data-prod="'+esc(p.prod_no)+'">⤓ Download barcodes for '+esc(p.prod_no)+'</button>'):'')
        +(p.shipment&&!p.ship_other_supplier&&p.po!==p.ships_with_master_po?blRow('Shipment labels','<button class="save-btn pp-shiplabel" data-po="'+po+'">⤓ Download shipment labels</button> <span class="mut tiny">SHIPS WITH master label for shipment '+esc(p.shipment)+'</span>'):'')   /* riders only — the shipment master never gets a SHIPS WITH label */
        +(p.ship_other_supplier?blRow('Ship To pallet labels','<button class="save-btn pp-shiplabel" data-po="'+po+'">⤓ Download Ship To Pallet Labels</button> <span class="mut tiny">this PO ships under another supplier’s PO</span>'):'')
        +((p.shipment&&p.po===p.ships_with_master_po&&/air/i.test(p.ship_mode||''))?blRow('Air freight labels','<button class="save-btn pp-airlabel" data-po="'+po+'">⤓ Download air freight labels</button> <span class="mut tiny">master of air shipment '+esc(p.shipment)+'</span>'):'')   /* master of an AIR shipment — ships-with label without the ships-with section */
        +(cdSkus.length?blRow('Crossdock box labels','<button class="save-btn pp-dl-cd" data-skus="'+esc(cdSkus.join(','))+'" data-po="'+po+'" data-do="'+esc(p.dispatch_order_ref||'')+'" data-client="'+esc(p.client||'')+'" data-address="'+esc(p.final_delivery_address||'')+'">⤓ Download crossdock labels</button> <span class="mut tiny">PO / dispatch order / client / delivery address overlaid</span>'):'')
        +(/coghlans/i.test(p.branch||'')?blRow('ASN pallet labels','<button class="save-btn" onclick="window.open(\'/api/portal/asn-labels/\'+encodeURIComponent(\''+po+'\'))">⤓ ASN Pallet Labels</button> <span class="mut tiny">one A4 page per pallet</span>'):'')
        +(clientDocs.length?blRow('Direct to Client / FBA attachments',clientDocs.map(function(x){return '<a href="/api/portal/attachment/'+x.id+'" target="_blank" rel="noopener">'+esc(x.filename||'file')+'</a>';}).join(' &nbsp;·&nbsp; ')):'')
        +'</div>';
      // ---- Direct to Client details (read-only packing & labelling) + approve workflow ----
      var packBools=[['Polybags',p.pack_polybags,p.pack_polybags_notes,'pack_polybags','pack_polybags_notes'],['Dock & Bay Product barcodes',p.pack_dnb_barcodes,p.pack_dnb_barcodes_notes,'pack_dnb_barcodes','pack_dnb_barcodes_notes'],['RFID Product Barcodes',p.pack_rfid_barcodes,p.pack_rfid_barcodes_notes,'pack_rfid_barcodes','pack_rfid_barcodes_notes'],['Dock & Bay Carton labels',p.pack_dnb_carton,p.pack_dnb_carton_notes,'pack_dnb_carton','pack_dnb_carton_notes'],['Client Specific Carton Labels',p.pack_client_carton,p.pack_client_carton_notes,'pack_client_carton','pack_client_carton_notes']];
      var dtcApplies=ppIsDtc(p);   // only Direct-to-Client POs with a client sales ref get the tab + approval
      var dtcAccepted=!!p.dtc_accepted_at;
      // What changed since the supplier last approved these DtC details — diff current vs the approval snapshot
      // (server captures dtc_approved_snapshot on approve; kept when D&B edits, which resets dtc_accepted_at).
      var dtcSnap=p.dtc_approved_snapshot||null; if(typeof dtcSnap==='string'){ try{dtcSnap=JSON.parse(dtcSnap);}catch(e){dtcSnap=null;} }
      function dtcChg(k){ if(!dtcSnap||!(k in dtcSnap))return false; var a=dtcSnap[k], b=p[k];
        if(k.indexOf('pack_')===0 && k.slice(-6)!=='_notes') return (!!a)!==(!!b);   // packing boolean flag
        return String(a==null?'':a).trim()!==String(b==null?'':b).trim(); }
      var dtcChangedKeys=dtcSnap?Object.keys(dtcSnap).filter(dtcChg):[];
      var dtcHasChange=!dtcAccepted && !!dtcSnap && dtcChangedKeys.length>0;   // previously approved, now differs → re-approve
      var _dtcChgTag=' <span style="background:#f59e0b;color:#fff;border-radius:8px;font-size:9px;font-weight:700;padding:1px 6px;vertical-align:1px">changed</span>';
      var dtcReqRow=function(lbl,yes,notes,changed){ return '<tr'+(changed?' style="background:#fef9c3"':'')+'><td class="mut" style="padding:3px 14px 3px 0;text-align:left;white-space:nowrap">'+esc(lbl)+(changed?_dtcChgTag:'')+'</td><td style="text-align:left;padding:3px 14px 3px 0">'+(yes?'<span style="color:#166534;font-weight:700">Yes</span>':'<span class="mut">No</span>')+'</td><td style="text-align:left;padding:3px 0">'+(notes?esc(notes):'<span class="mut">—</span>')+'</td></tr>'; };
      var dtcNoteRow=function(lbl,notes,changed){ return '<tr'+(changed?' style="background:#fef9c3"':'')+'><td class="mut" style="padding:3px 14px 3px 0;text-align:left;white-space:nowrap">'+esc(lbl)+(changed?_dtcChgTag:'')+'</td><td colspan="2" style="text-align:left;padding:3px 0">'+(notes?esc(notes):'<span class="mut">—</span>')+'</td></tr>'; };
      var dtcInfoRow=function(lbl,val,pre,changed){ return '<tr'+(changed?' style="background:#fef9c3"':'')+'><td class="mut" style="padding:3px 16px 3px 0;text-align:left;white-space:nowrap;vertical-align:top">'+esc(lbl)+(changed?_dtcChgTag:'')+'</td><td style="text-align:left;padding:3px 0'+(pre?';white-space:pre-wrap':'')+'">'+(val?'<b>'+esc(val)+'</b>':'<span class="mut">—</span>')+'</td></tr>'; };
      var dtcInfo='<table style="font-size:12px;border-collapse:collapse;text-align:left;margin-bottom:12px"><tbody>'
        +dtcInfoRow('Direct to Client Name',p.client,false,dtcChg('client'))
        +dtcInfoRow('Direct to Client sales ref',p.sales_order_ref,false,dtcChg('sales_order_ref'))
        +dtcInfoRow('Direct to Client PO number',p.client_po_ref,false,dtcChg('client_po_ref'))
        +dtcInfoRow('Direct to Client notes',p.client_requirements,true,dtcChg('client_requirements'))
        +((p.forwarder_name||p.forwarder_email||p.forwarder_phone)
            ? dtcInfoRow('Forwarder name',p.forwarder_name)
              +dtcInfoRow('Forwarder email',p.forwarder_email)
              +dtcInfoRow('Forwarder phone',p.forwarder_phone)
            : '')
        +'</tbody></table>';
      // approve bar — same format as the Confirm-order banner (green button, yellow box), at the TOP of the tab
      var dtcApproveBar='<div style="margin:0 0 12px;padding:8px 11px;border-radius:6px;font-size:12px;'+(dtcAccepted?'background:#dcfce7;border:1px solid #86efac':'background:#fef3c7;border:1px solid #fcd34d')+'">'
        +(dtcAccepted
           ? '✓ <b>Direct to Client details approved</b>'+(p.dtc_accepted_at?' on '+esc(p.dtc_accepted_at):'')+(p.dtc_accepted_by?' · '+esc(p.dtc_accepted_by):'')
           : (dtcHasChange?'<b>A change has been made.</b> ':'')+'⏳ <b>Please approve these Direct to Client details.</b> Review the packing &amp; labelling below'+(dtcHasChange?' (changes highlighted)':'')+', then approve. &nbsp; <button class="save-btn pp-dtc-accept" data-po="'+po+'" data-v="1" style="background:#16a34a;color:#fff;border-color:#16a34a">✓ Approve Direct to Client details</button>')
        +'</div>';
      var dtcPackTbl='<div style="font-size:12px;margin-bottom:8px">Packing &amp; labelling requirements set by Dock &amp; Bay:</div>'
          +'<table style="font-size:12px;border-collapse:collapse;text-align:left"><thead><tr><th class="l" style="padding:2px 14px 2px 0">Requirement</th><th class="l" style="padding:2px 14px 2px 0">Required</th><th class="l">Notes</th></tr></thead><tbody>'
          +packBools.map(function(x){return dtcReqRow(x[0],x[1],x[2], dtcChg(x[3])||dtcChg(x[4]));}).join('')
          +dtcNoteRow('Pallet Packing requirements',p.pack_pallet_notes, dtcChg('pack_pallet_notes'))
          +dtcNoteRow('Other Packing & Labelling requirements',p.pack_other_notes, dtcChg('pack_other_notes'))
          +'</tbody></table>';
      var dtc='<div class="dtc-wrap">'+dtcApproveBar+'<div class="sect-h" style="margin:0 0 8px">Direct to Client details</div>'+dtcInfo
        +'<div class="sect-h" style="margin:6px 0 8px">Packing &amp; Labelling</div>'+dtcPackTbl+'</div>';
      // ---- PAYMENTS tab: invoice value + due date, the deposit/completion/balance milestones, and a paid/due summary
      var _pm=function(v){ return (v==null||v==='')?'<span class="mut">—</span>':'$'+units(v); };
      var _pd=function(v){ return v?esc(fd(v)):'<span class="mut">—</span>'; };
      var startAmt=(p.start_assigned!=null?p.start_assigned:p.start_dep), compAmt=(p.completion_assigned!=null?p.completion_assigned:p.completion), balAmt=p.balance_1_amount;
      var paidTot=(p.start_date?Number(startAmt)||0:0)+(p.completion_date?Number(compAmt)||0:0)+(p.balance_1_date?Number(balAmt)||0:0);
      // Amount due = order value − amounts actually PAID (paidTot counts only milestones with a recorded paid date),
      // so paid + due = the full order value. A scheduled-but-unpaid deposit/completion is still owed — the old
      // balance_owing netted those off even when unpaid, understating what the supplier is still due.
      var dueTot=(p.value_used!=null?Number(p.value_used)-paidTot:null);
      var _prow=function(lbl,amt,dt,ref){ return '<tr><td class="l" style="padding:4px 16px 4px 0;white-space:nowrap">'+lbl+'</td><td class="l" style="padding:4px 16px 4px 0"><b>'+_pm(amt)+'</b></td><td class="l" style="padding:4px 16px 4px 0">'+_pd(dt)+'</td><td class="l" style="padding:4px 0">'+(ref?esc(ref):'<span class="mut">—</span>')+'</td></tr>'; };
      var payments='<div class="sect-h">Payments</div>'
        +'<table style="font-size:12px;border-collapse:collapse;text-align:left;table-layout:fixed;width:600px;max-width:100%">'
          +'<colgroup><col style="width:190px"><col style="width:120px"><col style="width:130px"><col style="width:160px"></colgroup>'
          +'<thead><tr>'
          +'<th class="l" style="padding:3px 10px 3px 0">Milestone</th><th class="l" style="padding:3px 10px 3px 0">Amount</th><th class="l" style="padding:3px 10px 3px 0">Date</th><th class="l">Deposit reference</th></tr></thead><tbody>'
        +_prow('Total invoice value', p.supplier_invoice_total, p.balance_due, '')
        // only show a deposit/balance milestone once it's a CONFIRMED payment (a paid date is set) — the
        // calculated-but-undated amounts are projections, not payments to show the supplier
        +(p.start_date?_prow('Starting deposit', startAmt, p.start_date, p.deposit_ref):'')
        +(p.completion_date?_prow('Completion deposit', compAmt, p.completion_date, ''):'')
        +(p.balance_1_date?_prow('Balance payment', balAmt, p.balance_1_date, ''):'')
        +((!p.start_date&&!p.completion_date&&!p.balance_1_date)?'<tr><td class="l mut" colspan="4" style="padding:4px 0">No payments recorded yet.</td></tr>':'')
        +'</tbody></table>'
        +'<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">'+ppCard('Amount paid','$'+units(paidTot))+ppCard('Amount due',dueTot!=null?'$'+units(dueTot):'—')+'</div>'
        +'<div class="tiny mut" style="margin-top:6px">Total invoice value shows its payment due date. Amounts/dates are the deposit &amp; balance milestones from your PO.</div>'
        +docsBlock;   // Documents moved here (PAYMENTS & DOCUMENTS)
      // ---- tabs + action badges ----
      var tabs=[['timeline','TIMELINE',timeline,unreadInt+((needConfirm&&!confirmed)?1:0)+(prodExc?1:0)+(cdMiss?1:0)],['orderplan','ORDER PLAN &amp; INVOICE',orderInvoice, (_chgs.length?1:0)+(invoiceDue(p,subs)?1:0)],
        ['payments','PAYMENTS &amp; DOCUMENTS',payments,0],
        ['shipment','SHIPMENT',shipment, xdAction],   // "no shipment assigned yet" is a passive state, not an action — only a real outstanding crossdock qty entry counts
        ['barcodes','BARCODES & LABELS',barcodesLabels,0]];
      if(dtcApplies) tabs.push(['dtc','DIRECT TO CLIENT DETAILS', dtc, (dtcAccepted||ppShipped(p))?0:1]);
      function badge(n){ return n>0?' <span class="ex-badge">'+n+'</span>':''; }
      var bar='<div class="po-subnav">'+tabs.map(function(t,ti){return '<button class="rtab pptab'+(ti===0?' active':'')+'" data-pt="'+t[0]+'">'+t[1]+badge(t[3])+'</button>';}).join('')+'</div>';
      var panels=tabs.map(function(t,ti){return '<div class="pptab-panel" data-pt="'+t[0]+'"'+(ti===0?'':' style="display:none"')+'>'+t[2]+'</div>';}).join('');
      return '<div class="ppx" style="padding:4px 2px;max-width:none;text-align:left">'+bar+panels+'</div>'; }
    // Shared per-PO open-action count (row badge + top PO badge + "show all exceptions" filter all use this).
    // Productions 54 and earlier raise nothing. Mirrors the SHIPMENTS-tab rules (no "no shipment yet" term).
    function poActionCount(p){ if(!prodActionable(p))return 0; var po=p.po, D=_ppData||{};
      var sb=(D.subsByPo&&D.subsByPo[po])||[], nts=(D.notesByPo&&D.notesByPo[po])||[];
      var unreadInt=nts.filter(function(n){return n.author_kind==='internal'&&!n.read;}).length;
      var today=new Date().toISOString().slice(0,10);
      var cdS=(p.crossdock_skus||'').split(',').map(function(s){return s.trim();}).filter(Boolean), xdm=(D.xdByPo&&D.xdByPo[po])||{};
      var xdReq=cdS.length>0&&(/shipping/i.test(p.status||'')||(p.prod_end&&p.prod_end<today)), xdMiss=cdS.filter(function(s){var q=xdm[s];return q==null||q==='';}).length;
      var prodExc=p.require_confirmation?prodAttention(p.production_status, p.prod_start, p.prod_end, sb):'';
      return (invoiceDue(p,sb)?1:0)+unreadInt+((xdReq&&xdMiss>0)?1:0)+((p.require_confirmation&&!p.supplier_confirmed)?1:0)+(prodExc?1:0)+(dtcActionDue(p)?1:0)+(poCdMissing(p,sb)?1:0); }
    function ppPOs(pos, data){ var lb=data.lb||{}, notesByPo=data.notesByPo||{}, subsByPo=data.subsByPo||{}, costsByPo=data.costsByPo||{}, supSkus=data.supSkus||[], xdByPo=data.xdByPo||{}, addByPo=data.addByPo||{};
      if(!pos.length)return '<div class="count">No purchase orders for this supplier.</div>';
      var today=new Date().toISOString().slice(0,10);
      return '<div class="tw"><table class="pp-tbl"><thead><tr><th class="l"></th><th class="l">PO</th><th class="l" style="width:38px;min-width:38px" title="Production number">P#</th><th class="l">Status</th><th class="l" title="Ship to country">CTRY</th><th class="l">Ship to branch</th><th class="l">Direct</th><th class="l">Production status</th><th class="l">Start</th><th class="l">Est. completion</th><th class="l">Completion date</th><th class="l">Ship</th><th class="l">Flexport</th><th class="l">Ships With</th><th style="text-align:right">Start deposit</th><th style="text-align:right">Completion</th><th style="text-align:right">Balance</th><th style="text-align:right">Amount due</th><th class="l">Due</th><th class="l">Deposit ref</th></tr></thead><tbody>'
        +pos.slice().sort(function(a,b){ var pa=((a.prod_no==null?'':String(a.prod_no)).trim())||'~~~', pb=((b.prod_no==null?'':String(b.prod_no)).trim())||'~~~'; return pa<pb?-1:pa>pb?1:(String(a.po||'')<String(b.po||'')?-1:1); }).map(function(p,i,arr){
          // group the grid by production number — emit a sub-heading row at the first PO of each prod_no group
          function _pk(x){ return (x.prod_no==null?'':String(x.prod_no)).trim(); }
          var _gk=_pk(p), _gkey=_gk||'none', _gcnt=arr.filter(function(x){return _pk(x)===_gk;}).length;
          var _grpHdr=(i===0||_pk(arr[i-1])!==_gk)
            ? '<tr class="pp-grp" data-grp="'+esc(_gkey)+'"><td colspan="20" style="cursor:pointer;user-select:none" title="click to expand / collapse this production"><span class="pp-grp-car">▾</span> '+(_gk?('P# '+esc(_gk)):'No production number')+' — '+_gcnt+" PO"+(_gcnt>1?"'s":"")+'</td></tr>'
            : '';
          // lazy: the heavy expanded card (all sub-tabs) is built on first expand, not upfront (see .pp-exp handler)
          var det='<tr id="pp-'+i+'" data-po="'+esc(p.po)+'" data-grp="'+esc(_gkey)+'" style="display:none"><td colspan="20"><div class="count">Loading…</div></td></tr>';   // single flush cell (no leading empty td) so the detail panel isn't indented by the MANAGE column
          var sb=subsByPo[p.po]||[]; var nts=notesByPo[p.po]||[]; var unreadInt=nts.filter(function(n){return n.author_kind==='internal'&&!n.read;}).length;
          var cdS=(p.crossdock_skus||'').split(',').map(function(s){return s.trim();}).filter(Boolean), xdm=xdByPo[p.po]||{};
          var xdReq=cdS.length>0&&(/shipping/i.test(p.status||'')||(p.prod_end&&p.prod_end<today)), xdMiss=cdS.filter(function(s){var q=xdm[s];return q==null||q==='';}).length;
          var prodExc=p.require_confirmation?prodAttention(p.production_status, p.prod_start, p.prod_end, sb):'';
          var act=poActionCount(p);   // shared count (excludes productions ≤54; no "no shipment yet" term)
          var cdVal=poCdVal(p, sb);
          var cdGrid=(p.crossdock_skus||'').split(',').map(function(s){return s.trim();}).filter(Boolean);
          // Amount due (outstanding) = order value − amounts actually PAID (milestone with a recorded paid date),
          // so paid + due = the full order value. A scheduled-but-unpaid deposit/completion stays owed (mirrors the
          // Payments-tab summary; the old balance_owing netted them off even when unpaid).
          var _gSa=(p.start_assigned!=null?p.start_assigned:p.start_dep), _gCa=(p.completion_assigned!=null?p.completion_assigned:p.completion);
          var _gPaid=(p.start_date?Number(_gSa)||0:0)+(p.completion_date?Number(_gCa)||0:0)+(p.balance_1_date?Number(p.balance_1_amount)||0:0);
          var _gDue=(p.value_used!=null?Number(p.value_used)-_gPaid:null);
          return _grpHdr+'<tr class="pp-row" data-grp="'+esc(_gkey)+'"><td class="l"><button class="save-btn pp-exp" data-i="'+i+'" data-po="'+esc(p.po)+'"><span class="mng-txt">MANAGE</span>'+(act>0?' <span class="ex-badge" title="'+act+' action'+(act>1?'s':'')+' needed">'+act+'</span>':'')+'</button></td>'
            +'<td class="l"><b>'+esc(p.po)+'</b></td>'
            +'<td class="l" style="width:38px;min-width:38px;white-space:nowrap">'+(p.prod_no?esc(p.prod_no):'<span class="mut">—</span>')+'</td>'
            +'<td class="l"><span class="tool-badge '+statusBg(p.status)+'">'+esc(p.status||'')+'</span>'+(ppIsFOB(p)?' <span style="background:#ede9fe;color:#6d28d9;border-radius:10px;font-size:9px;font-weight:700;padding:1px 6px;white-space:nowrap" title="FOB — collected at your factory, no import shipment">📦 FOB</span>':'')+'</td>'
            +'<td class="l">'+(p.country?esc(p.country):'<span class="mut">—</span>')+'</td>'
            +'<td class="l">'+(p.branch?esc(p.branch):'<span class="mut">—</span>')+'</td>'
            +'<td class="l" style="font-size:10px;line-height:1.05;max-width:130px;white-space:normal">'+(p.client?esc(p.client):'<span class="mut">—</span>')+'<br>'+(p.sales_order_ref?'<span class="mut">'+esc(p.sales_order_ref)+'</span>':'<span class="mut">—</span>')+'</td>'
            +'<td class="l" style="min-width:150px">'+prodStatusSel(p.po, p.production_status||'')+(prodExc?'<div class="tiny" style="color:#b91c1c;font-weight:600;margin-top:2px" title="'+esc(prodExc)+'">⚠ check status</div>':'')+'</td>'
            +'<td class="l">'+dcell(p.prod_start)+'</td><td class="l">'+dcell(p.prod_end)+'</td>'
            +'<td class="l" style="min-width:140px"><input type="date" class="pp-cd-grid" data-po="'+esc(p.po)+'" value="'+esc(cdVal)+'" title="click to pick your completion date — it saves automatically" style="width:128px;cursor:pointer;text-align:left;font:inherit;font-size:12px;padding:4px 6px;border:1px solid #93c5fd;border-radius:4px;background:#eff6ff;color:#1d4ed8;box-sizing:content-box"></td>'
            +'<td class="l">'+dcell(p.ship)+'</td>'
            +'<td class="l">'+((p.flexport_reference||p.flex_id)?esc(p.flexport_reference||p.flex_id):'<span class="mut">—</span>')+'</td>'
            +'<td class="l">'+(p.ships_with?esc(p.ships_with)+(p.ships_with_supplier?' <span class="mut">('+esc(p.ships_with_supplier)+')</span>':''):'<span class="mut">—</span>')+'</td>'
            +'<td style="text-align:right">'+ppPay(p.start_assigned!=null?p.start_assigned:p.start_dep, p.start_date)+'</td>'
            +'<td style="text-align:right">'+ppPay(p.completion_assigned!=null?p.completion_assigned:p.completion, p.completion_date)+'</td>'
            +'<td style="text-align:right">'+ppPay(p.balance_1_amount, p.balance_1_date)+'</td>'
            +'<td style="text-align:right">'+(_gDue!=null?'$'+units(_gDue):'<span class="mut">—</span>')+'</td>'
            +'<td class="l">'+dcell(p.balance_due)+'</td><td class="l">'+(p.deposit_ref?esc(p.deposit_ref):'<span class="mut">—</span>')+'</td></tr>'+det; }).join('')
        +'</tbody></table></div>'; }
    function ppDeposits(deps){ var paid=0,used=0,rem=0,seenRef={}; deps.forEach(function(d,di){ if(!d.is_deposit)return; paid+=Number(d.amount)||0; var k=d.reference||('__'+di); if(seenRef[k])return; seenRef[k]=1; used+=Number(d.deposit_used)||0; rem+=Number(d.deposit_remaining)||0; });
      var cards='<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">'+ppCard('Total deposits','$'+money(paid))+ppCard('Drawn down','$'+money(used))+ppCard('Remaining','$'+money(rem))+'</div>';
      var rows=deps.filter(function(d){return d.is_deposit;}).map(function(d){
        return '<tr><td class="l">'+esc(d.reference||'—')+'</td><td style="text-align:right">$'+money(d.amount)+'</td><td class="l">'+(d.date_paid?esc(fd(d.date_paid)):'<span class="mut">unpaid</span>')+'</td><td style="text-align:right">$'+money(d.deposit_used||0)+'</td><td style="text-align:right">$'+money(d.deposit_remaining||0)+'</td></tr>'; }).join('');
      return cards+'<div class="tw" style="max-width:720px"><table style="width:auto;min-width:0"><thead><tr><th class="l">Deposit reference</th><th style="text-align:right">Amount</th><th class="l">Paid</th><th style="text-align:right">Drawn down</th><th style="text-align:right">Remaining</th></tr></thead><tbody>'+(rows||'<tr><td colspan="5" class="l mut">No deposits for this supplier.</td></tr>')+'</tbody></table></div>'; }
    // Master PAYMENTS tab: payments MADE to this supplier (the ledger), grouped by payment run and expandable to
    // the per-line breakdown (PO reference, type, amount, deposit ref).
    function ppPayments(rows){ rows=rows||[];
      if(!rows.length)return '<div class="count">No payments recorded against your account yet.</div>';
      function poRef(r){ return r.reference||r.po_completion||r.po_balance_1||r.po_balance_2||r.po_balance_3||''; }
      var groups={}, order=[]; rows.forEach(function(r){ var k=r.payment_run_ref||r.payment_date||'—'; if(!groups[k]){groups[k]=[];order.push(k);} groups[k].push(r); });
      var total=rows.reduce(function(a,r){return a+(Number(r.amount)||0);},0);
      var head='<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">'+ppCard('Total paid','$'+money(total))+ppCard('Payments',String(rows.length))+'</div>';
      var cards=order.map(function(k){ var items=groups[k]; var gtot=items.reduce(function(a,r){return a+(Number(r.amount)||0);},0); var dt=items[0].payment_date;
        var body=items.map(function(r){ return '<tr><td class="l">'+esc(poRef(r)||'—')+'</td><td class="l">'+(r.type?esc(r.type):'<span class="mut">—</span>')+'</td><td style="text-align:right">$'+money(r.amount||0)+'</td><td class="l">'+(r.deposit_ref?esc(r.deposit_ref):'<span class="mut">—</span>')+'</td></tr>'; }).join('');
        return '<div class="sp-card" style="border:1px solid #e0e0e0;border-radius:8px;margin-bottom:8px;background:#fff">'
          +'<div class="pay-head" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:9px 12px;cursor:pointer">'
            +'<span class="pay-toggle" style="font-size:12px;color:#475569">▸</span>'
            +'<div style="font-weight:700">'+esc(dt?fd(dt):k)+'</div>'
            +'<span class="mut tiny">'+items.length+' payment'+(items.length>1?'s':'')+'</span>'
            +'<div style="margin-left:auto;font-weight:700">$'+money(gtot)+'</div></div>'
          +'<div class="pay-body" style="display:none;padding:0 12px 12px"><table style="font-size:12px;border-collapse:collapse;text-align:left;width:100%;max-width:720px;table-layout:fixed">'
            +'<colgroup><col style="width:42%"><col style="width:20%"><col style="width:20%"><col style="width:18%"></colgroup>'
            +'<thead><tr><th class="l">PO reference</th><th class="l">Type</th><th style="text-align:right">Amount</th><th class="l">Deposit ref</th></tr></thead><tbody>'+body+'</tbody></table></div></div>'; }).join('');
      return '<div style="max-width:560px">'+head+cards+'</div>'; }   // cap the tab to ~half width so it doesn't span full screen
    // ── PRODUCTIONS tab: pick a batch → order-plan pivot (SKUs × POs × qty) for that batch, + XLSX download ──
    function prodBatchesList(){ var s={}; (_ppData.pos||[]).forEach(function(p){ var b=(p.batch_id==null?'':String(p.batch_id)).trim(); if(b)s[b]=1; }); return Object.keys(s).sort().reverse(); }
    function prodBatchPOs(){ return (_ppData.pos||[]).filter(function(p){ return ((p.batch_id==null?'':String(p.batch_id)).trim())===PORTAL_PROD_BATCH; }); }
    function prodPivotData(bp){ var qmap={},skuSet={},skus=[]; bp.forEach(function(p){ (_ppData.lb[p.po]||[]).forEach(function(l){ var k=l.sku+'|'+p.po; qmap[k]=(qmap[k]||0)+(Number(l.qty)||0); if(!skuSet[l.sku]){skuSet[l.sku]=1;skus.push(l.sku);} }); }); skus.sort();
      var poList=bp.map(function(p){return p.po;}).sort().reverse(); var attr={}; (_ppData.supSkus||[]).forEach(function(s){ attr[s.sku]=s; }); return {qmap:qmap,skus:skus,poList:poList,attr:attr}; }
    function ppProductions(){
      var batches=prodBatchesList();
      var sel='<div class="bar" style="gap:8px;align-items:center;flex-wrap:wrap"><span class="pill-lbl" style="width:auto">Batch</span>'
        +'<select class="fci pv-prod-batch" style="width:auto;min-width:0;max-width:150px;text-align:left"><option value="">— choose —</option>'
        +batches.map(function(b){return '<option value="'+esc(b)+'"'+(PORTAL_PROD_BATCH===b?' selected':'')+'>'+esc(b)+'</option>';}).join('')+'</select>'
        +(PORTAL_PROD_BATCH?'<span style="display:inline-flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="save-btn pv-prod-dl">⤓ Download order plan (XLSX)</button>'
          +'<span style="position:relative;display:inline-block"><button class="save-btn pv-bc-dl">⤓ Download barcodes ▾</button>'
          +'<span class="pv-bc-menu" style="display:none;position:absolute;right:0;top:100%;z-index:50;background:#fff;border:1px solid #cbd5e1;border-radius:8px;box-shadow:0 8px 24px rgba(15,23,42,.18);min-width:190px;text-align:left">'
          +[['product','Product barcodes'],['carton','Carton barcodes'],['inner','Inner barcodes']].map(function(o,i){return '<div class="pv-bc-opt" data-k="'+o[0]+'" style="padding:9px 13px;cursor:pointer;font-size:12px'+(i?';border-top:1px solid #f1f1f1':'')+'">'+o[1]+'</div>';}).join('')
          +'</span></span></span>':'')+'</div>';
      if(!batches.length) return sel+'<div class="count">No batches on your purchase orders yet.</div>';
      if(!PORTAL_PROD_BATCH) return sel+'<div class="count">Choose a batch to see its order plan.</div>';
      var bp=prodBatchPOs(); if(!bp.length) return sel+'<div class="count">No purchase orders in that batch.</div>';
      var d=prodPivotData(bp);
      if(!d.skus.length) return sel+'<div class="count">No SKUs ordered in that batch.</div>';
      var th='<th class="l" style="position:sticky;left:0;background:#f3f3f1;z-index:3;min-width:190px">SKU</th><th class="l">EAN</th><th class="l">Size</th>'+d.poList.map(function(po){return '<th style="text-align:right;min-width:70px">'+esc(po)+'</th>';}).join('');
      var body=d.skus.map(function(sku){ var a=d.attr[sku]||{};
        return '<tr><td class="l" style="position:sticky;left:0;background:#fff;z-index:1;font-weight:600;white-space:nowrap;min-width:190px">'+esc(sku)+'</td><td class="l" style="white-space:nowrap"><span class="mut">'+esc(a.ean||'')+'</span></td><td class="l" style="white-space:nowrap"><span class="mut">'+esc(a.size_long||'')+'</span></td>'
          +d.poList.map(function(po){ var q=d.qmap[sku+'|'+po]; return '<td style="text-align:right">'+(q?units(q):'<span class="mut">—</span>')+'</td>'; }).join('')+'</tr>'; }).join('');
      return sel+'<div class="mut tiny" style="margin:2px 0 8px">'+bp.length+' PO'+(bp.length>1?'s':'')+' · '+d.skus.length+' SKU'+(d.skus.length>1?'s':'')+' in batch '+esc(PORTAL_PROD_BATCH)+'</div>'
        +'<div class="tw" style="max-height:calc(100vh - 220px)"><table class="pp-tbl"><thead><tr>'+th+'</tr></thead><tbody>'+body+'</tbody></table></div>'; }
    function prodBatchBarcodeDl(kind,btn){ if(!PORTAL_PROD_BATCH)return; if(BC.placeholder){BC.note();return;} var orig=btn.textContent; btn.disabled=true; btn.textContent='Preparing…';
      fetch(EP.labelData+'?batch='+encodeURIComponent(PORTAL_PROD_BATCH)+'&supplier='+encodeURIComponent(STATE.supplierName)).then(function(r){return r.json();}).then(function(rows){ btn.disabled=false; btn.textContent=orig;
        if(rows&&rows.error){alert(rows.error);return;} if(!rows||!rows.length){alert('No '+kind+' barcodes found for batch '+PORTAL_PROD_BATCH);return;}
        BC.sheets(rows,[kind],'batch_'+PORTAL_PROD_BATCH+'_'+kind+'_barcodes.zip',btn); }).catch(function(){alert('Could not load barcodes');btn.disabled=false;btn.textContent=orig;}); }
    function downloadProductionPlan(){
      var bp=prodBatchPOs(); if(!bp.length){ alert('No POs in that batch.'); return; }
      var d=prodPivotData(bp), poList=d.poList; if(!d.skus.length){ alert('No SKUs ordered in that batch.'); return; }
      var pmeta={}; bp.forEach(function(p){ pmeta[p.po]={co:p.country||'',branch:p.branch||'',sw:(p.ships_with?p.ships_with+(p.ships_with_supplier?' — '+p.ships_with_supplier:''):''),pe:p.prod_end||'',client:p.client||'',so:p.sales_order_ref||''}; });
      var CO_STYLE={UK:1,US:2,AU:3,EU:4};
      var LEFT=7, pad=function(v){ var a=new Array(LEFT-1); for(var i=0;i<a.length;i++)a[i]=''; return [v].concat(a); };
      var boldL=function(arr){ return arr.map(function(v){ return {v:(v&&typeof v==='object'&&'v' in v)?v.v:v, s:5}; }); };
      var ctr=function(v){ return {v:v==null?'':v, s:6}; };
      var metaRow=function(lbl,fn){ return pad(lbl).concat(poList.map(function(po){ return ctr(fn(po)); })); };
      var grid=[];
      grid.push(pad('Country').concat(poList.map(function(po){ var co=pmeta[po].co||''; return {v:co, s:(CO_STYLE[String(co).toUpperCase()]||6)}; })));
      grid.push(boldL(pad('PO')).concat(poList.map(function(po){ return {v:po, s:7}; })));
      grid.push(metaRow('Branch', function(po){return pmeta[po].branch;}));
      grid.push(metaRow('Ships with', function(po){return pmeta[po].sw;}));
      grid.push(metaRow('Production end', function(po){return pmeta[po].pe;}));
      grid.push(metaRow('Client (DTC)', function(po){return pmeta[po].client;}));
      grid.push(metaRow('DTC sales order ref', function(po){return pmeta[po].so;}));
      grid.push(boldL(['SKU','EAN','Carton qty','Release window','Product title','Size','Colour']).concat(poList.map(function(){return {v:'QTY', s:7};})));
      d.skus.forEach(function(sku){ var a=d.attr[sku]||{};
        grid.push([sku, a.ean||'', a.carton_qty||'', a.release_window||'', a.product_name||'', a.size_long||'', a.colour||'']
          .concat(poList.map(function(po){ var q=d.qmap[sku+'|'+po]; return ctr(q?q:''); }))); });
      var colDefs=[30,15,10,18,34,26,18].map(function(w,i){ return {min:i+1,max:i+1,width:w}; }); colDefs.push({min:8, max:7+poList.length, width:12.6});
      var bytes=buildXlsx('Order Plan', grid, {x:1,y:8}, colDefs);   // freeze col A + rows 1-8 (7 meta rows + SKU header)
      var blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      var url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download='OrderPlan_'+String(PORTAL_PROD_BATCH).replace(/[^A-Za-z0-9_-]/g,'_')+'_'+new Date().toISOString().slice(0,10)+'.xlsx'; document.body.appendChild(a); a.click();
      setTimeout(function(){URL.revokeObjectURL(url);a.remove();},150); }
          // FOB card timeline = notes on the PO itself (FOB has no shipment). Reuses the PO-notes store.
          function fobTLHtml(po){ var nts=(_ppData.notesByPo&&_ppData.notesByPo[po])||[];
            var sup=nts.filter(function(n){return n.author_kind==='supplier';}); var recent=sup.length?sup.slice().sort(function(a,b){return String(b.created_at||'').localeCompare(String(a.created_at||''));})[0]:null;
            return nts.length?nts.map(function(n){ var flag=(EP.escalate&&recent&&n===recent)?' <button class="save-btn light tip sp-fob-flag" data-po="'+esc(po)+'" data-msg="'+esc(n.body)+'" data-tip="email this note to the supply planner" style="color:#b91c1c;border-color:#fca5a5;white-space:nowrap;font-size:10px;padding:0 5px">⚑ Flag</button>':'';
              return '<div style="margin:6px 0"><span class="mut" style="font-size:10px">'+esc(n.created_at)+' · '+(n.author_kind==='supplier'?'You':'Dock &amp; Bay')+'</span> '+flag+'<div class="tl-msg">'+esc(n.body)+'</div></div>'; }).join(''):'<div class="mut tiny">No timeline entries yet.</div>'; }
          function ppShipmentPlan(rows){ rows=rows||[];
            if(!rows.length)return '<div class="count">No shipments for your orders yet.</div>';
            // a prominent "label / big value" cell for the dates & Flexport strip
            function spCell(lbl,val,strong){ return '<div style="min-width:96px"><div class="mut" style="font-size:10px;text-transform:uppercase;letter-spacing:.04em">'+lbl+'</div><div style="font-weight:700;font-size:15px;margin-top:1px">'+(val?val:'<span class="mut" style="font-weight:400">—</span>')+'</div></div>'; }
            // Direct-to-Client details + label downloads for a PO on this card (client name / requirements /
            // delivery address, Ships-With shipment labels, crossdock labels if the PO has crossdock SKUs).
            var posByPo={}; (_ppData.pos||[]).forEach(function(p){ posByPo[p.po]=p; });
            // a PO reference that links back to the Purchase Orders tab with that PO opened
            function poLink(po){ return '<button class="lnk-btn pp-go-po" data-po="'+esc(po)+'" title="open '+esc(po)+' in Purchase Orders" style="color:#1d4ed8;text-decoration:underline;cursor:pointer;background:none;border:none;padding:0;font:inherit">'+esc(po)+'</button>'; }
            // per-shipment action counter shown BEFORE the PO number in the card header
            function spBadge(s){ var n=shipActCount(s); return n?'<span class="sp-shipbadge" data-ref="'+esc(s.shipment_ref||'')+'" title="needs your attention">'+ppBadgeHtml(n)+'</span> ':''; }
            function dtcBlock(po){ var p=posByPo[po]; if(!p||!ppIsDtc(p))return '';
              var cd=(p.crossdock_skus||'').split(',').map(function(x){return x.trim();}).filter(Boolean);
              return '<div style="margin-top:8px;padding:9px 12px;background:#ecfeff;border:1px solid #a5f3fc;border-radius:7px">'
                +'<div style="font-weight:700;font-size:12px;color:#0e7490;margin-bottom:4px">📍 Direct to Client — '+esc(po)+'</div>'
                +'<div style="font-size:12px;line-height:1.55">'
                  +'<div><b>Client:</b> '+(p.client?esc(p.client):'<span class="mut">—</span>')+(p.sales_order_ref?' <span class="mut">('+esc(p.sales_order_ref)+')</span>':'')+'</div>'
                  +'<div><b>Delivery address:</b> '+(p.final_delivery_address?esc(p.final_delivery_address):'<span class="mut">—</span>')+'</div>'
                  +'<div><b>Client requirements:</b> '+(p.client_requirements?esc(p.client_requirements):'<span class="mut">none</span>')+'</div>'
                +'</div>'
                +'<div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap">'
                  +'<button class="save-btn sp-shiplabel" data-po="'+esc(po)+'" title="download the Ships With shipment labels for this PO">⤓ Shipment labels</button>'
                  +(cd.length?'<button class="save-btn sp-cd" data-po="'+esc(po)+'" data-skus="'+esc(cd.join(','))+'" data-do="'+esc(p.dispatch_order_ref||'')+'" data-client="'+esc(p.client||'')+'" data-address="'+esc(p.final_delivery_address||'')+'" title="crossdock box labels (PO / dispatch order / client / delivery address overlaid)">⤓ Crossdock labels</button>':'')
                +'</div></div>'; }
            // group the cards by production-end date: DUE NOW (<1wk) / DUE SOON (1–3wk) / UPCOMING (3–6wk) / 6+wk / no date
            var _tdy=new Date(); _tdy.setHours(0,0,0,0);
            function _bucketOf(s){ var pe=s.prod_end; if(!pe)return 4; var d=new Date(pe+'T00:00:00'); if(isNaN(d.getTime()))return 4; var days=Math.round((d-_tdy)/86400000); if(days<7)return 0; if(days<21)return 1; if(days<42)return 2; return 3; }
            var _BKT=[{t:'DUE NOW',d:'Production End Date &lt; 1 week',bg:'#fee2e2',bd:'#fca5a5',c:'#991b1b'},{t:'DUE SOON',d:'Production End Date 1–3 weeks',bg:'#ffedd5',bd:'#fdba74',c:'#9a3412'},{t:'UPCOMING',d:'Production End Date 3–6 weeks',bg:'#fef9c3',bd:'#facc15',c:'#854d0e'},{t:'',d:'Production End Date 6+ weeks',bg:'#e5e7eb',bd:'#cbd5e1',c:'#374151'},{t:'',d:'No production end date yet',bg:'#e5e7eb',bd:'#cbd5e1',c:'#374151'}];
            function cardHtml(s){
              var members=s.members.length?'<table style="font-size:11px;width:auto;margin-top:4px"><thead><tr><th class="l">PO</th><th class="l">Supplier</th><th>Est. pallets</th><th class="l">Client</th></tr></thead><tbody>'
                +s.members.map(function(m){return '<tr><td class="l">'+poLink(m.po)+(m.is_master?' <span class="tool-badge bg-green" style="font-size:9px">★ master</span>':'')+'</td><td class="l">'+esc(m.supplier||'')+'</td><td style="text-align:right">'+esc(m.pallets)+'</td><td class="l">'+(m.client?esc(m.client):'<span class="mut">—</span>')+'</td></tr>';}).join('')
                +'<tr style="font-weight:700;border-top:1px solid #ccc"><td class="l">Total</td><td></td><td style="text-align:right">'+esc(s.total_pallets)+'</td><td></td></tr></tbody></table>':'<span class="mut tiny">no POs on this shipment</span>';
              // FOB orders — no shipment to us (collected at factory / delivered to a forwarder). Editable:
              // production end date (submitted for D&B approval, like elsewhere) + a timeline of PO notes.
              if(s.is_fob){
                var po=s.master_po;
                var subs=(_ppData.subsByPo&&_ppData.subsByPo[po])||[];
                var cdq=subs.filter(function(x){return x.kind==='completion_date';}), cd=cdq.length?cdq[cdq.length-1]:null;
                var cdStatus=cd?(cd.status==='applied'?'<span class="tool-badge bg-green">approved</span>':cd.status==='dismissed'?'<span class="tool-badge bg-neutral">rejected — please resubmit</span>':'<span class="tool-badge bg-amber">awaiting Dock &amp; Bay approval</span>'):'';
                var cdVal=(cd&&cd.status!=='dismissed')?cd.value:'';
                var fobStrip='<div style="display:flex;flex-wrap:wrap;gap:18px;margin-top:8px;padding:9px 12px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:7px">'
                  +spCell('Type','FOB — collection')
                  +spCell('Status', esc(s.status||''))
                  +spCell('Current prod. end', s.prod_end?esc(fd(s.prod_end)):'')
                  +(s.master_client?spCell('Client', esc(s.master_client)):'')
                  +(s.master_deadline?spCell('Client deadline', esc(fd(s.master_deadline))):'')
                  +'</div>';
                var prodEndEdit='<div style="margin-top:10px;display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap">'
                  +'<label class="tiny">Ship Date <span class="mut">(submit for Dock &amp; Bay approval)</span><br>'
                  +'<input type="date" class="sp-fob-cd" data-po="'+esc(po)+'" value="'+esc(cdVal)+'" title="pick your production end date — submitted for Dock &amp; Bay to approve" style="width:150px;text-align:left;font:inherit;font-size:12px;padding:4px 6px;border:1px solid #93c5fd;border-radius:4px;background:#eff6ff;color:#1d4ed8"></label>'
                  +(cdStatus?'<div class="tiny">'+cdStatus+(cd&&cd.status==='pending'?' — '+esc(fd(cd.value)):'')+'</div>':'')+'</div>';
                var timeline='<div style="margin-top:10px;border-top:1px solid #f1f1f1;padding-top:8px">'
                  +(EP.escalate?'<div style="margin-bottom:8px"><button class="save-btn sp-esc-fob" data-po="'+esc(po)+'" style="color:#b91c1c;border-color:#fca5a5;font-weight:600" title="escalate this shipment to Dock &amp; Bay by email">⚑ Escalate shipment</button></div>':'')
                  +'<div style="font-weight:600;font-size:12px;margin-bottom:4px">Timeline <span class="mut tiny">(notes on this purchase order)</span></div>'
                  +'<div class="sp-fob-tl" data-po="'+esc(po)+'">'+fobTLHtml(po)+'</div>'
                  +'<div style="display:flex;gap:6px;align-items:flex-start;margin-top:6px"><textarea class="fci sp-fob-note-body" data-po="'+esc(po)+'" rows="2" placeholder="Add a note to the timeline… (multiple lines OK)" style="flex:1;max-width:560px;min-height:44px;text-align:left;resize:vertical;line-height:1.4"></textarea><button class="save-btn sp-fob-note-post" data-po="'+esc(po)+'">Post</button></div></div>';
                return '<div class="sp-card" style="border:1px solid #ddd6fe;border-radius:8px;margin-bottom:10px;background:#fff">'
                  +'<div class="sp-head" style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:10px 12px;cursor:pointer">'
                  +'<span class="sp-toggle" style="font-size:12px;color:#6d28d9">▸</span>'
                  +spBadge(s)+'<div style="font-weight:700;font-size:15px">'+esc(po)+'</div>'
                  +'<span style="background:#ede9fe;color:#6d28d9;border-radius:10px;font-size:10px;font-weight:700;padding:2px 8px">📦 FOB — no shipment</span>'
                  +'<span class="mut tiny">'+esc(s.status||'')+(s.prod_end?' · prod end '+esc(fd(s.prod_end)):'')+'</span>'
                  +'</div>'
                  +'<div class="sp-body" style="display:none;padding:0 12px 12px">'+fobStrip+'<div style="margin-top:8px">'+members+'</div>'+dtcBlock(po)+prodEndEdit+timeline
                  +'<div class="mut tiny" style="margin-top:6px">No shipment to Dock &amp; Bay — collected at your factory or delivered to a nominated forwarder.</div></div></div>';
              }
              // prominent shipment dates + Flexport details
              var flex=s.flex_id?('<a href="https://app.flexport.com/shipments/'+((String(s.carrier_ref||s.flex_id).match(/\d+/)||[''])[0])+'" target="_blank" rel="noopener" style="color:#1d4ed8;text-decoration:underline">'+esc(s.flex_id)+' ↗</a>'):'';
              var datesStrip='<div style="display:flex;flex-wrap:wrap;gap:18px;margin-top:8px;padding:9px 12px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:7px">'
                +spCell('Mode / Carrier', esc((s.mode||'—')+(s.carrier?' · '+s.carrier:'')))
                +spCell('Tracking', s.carrier_ref?esc(s.carrier_ref):'')
                +spCell('Flexport', flex)
                +spCell('Departure', s.departure?(esc(fd(s.departure))+(s.departure_est?' <span class="mut" style="font-size:9px;font-weight:400">est</span>':'')):'')
                +spCell('Landing', s.landing?(esc(fd(s.landing))+(s.landing_est?' <span class="mut" style="font-size:9px;font-weight:400">est</span>':'')):'')
                +spCell('Arrival', s.arrival?(esc(fd(s.arrival))+(s.arrival_est?' <span class="mut" style="font-size:9px;font-weight:400">est</span>':'')):'')
                +(s.master_client?spCell('Client', esc(s.master_client)):'')
                +(s.master_deadline?spCell('Client deadline', esc(fd(s.master_deadline))):'')
                +'</div>';
              // supplier-editable panel — carrier / tracking / ship date / status (writes straight to the shipment)
              var _u=String(s.status||'').toLowerCase(), stNorm=(_u==='active'?'Shipping':(_u==='complete'||_u==='completed')?'Completed':(s.status||'Planned'));
              var STO=['Planned','Shipping'];   // supplier-settable stages only; 'Completed' stays Dock & Bay-controlled
              function eLbl(t){ return '<div class="mut" style="font-size:10px;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px">'+t+'</div>'; }
              var rf=esc(s.shipment_ref);
              var editPanel='<div style="margin-top:10px;padding:10px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:7px">'
                +'<div style="font-weight:700;font-size:12px;color:#166534;margin-bottom:8px">📝 Update this shipment</div>'
                +'<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end">'
                  +'<div>'+eLbl('Carrier')+'<input class="fci txt sp-e-carrier" data-ref="'+rf+'" value="'+esc(s.carrier||'')+'" placeholder="carrier…" style="width:140px;text-align:left"></div>'
                  +'<div>'+eLbl('Tracking code')+'<input class="fci txt sp-e-trk" data-ref="'+rf+'" value="'+esc(s.carrier_ref||'')+'" placeholder="tracking…" style="width:170px;text-align:left"></div>'
                  +'<div>'+eLbl('Ship date')+'<input type="date" class="fci sp-e-date" data-ref="'+rf+'" value="'+esc(s.departure_est?'':(s.departure||''))+'"'+(s.departure_est?' title="estimated '+esc(s.departure)+' — enter the actual ship date"':'')+' style="width:150px;text-align:left"></div>'
                  +'<div>'+eLbl('Status')+(stNorm==='Completed'
                    ? '<div style="font-weight:700;color:#1d4ed8;font-size:13px;padding:4px 0">Completed</div><div class="tiny mut">set by Dock &amp; Bay</div>'
                    : '<select class="fci sp-e-status" data-ref="'+rf+'" style="width:130px;font-weight:600;'+(stNorm==='Shipping'?'background:#dcfce7;color:#15803d;border:1px solid #86efac':'background:#ffedd5;color:#9a3412;border:1px solid #fdba74')+'">'+STO.map(function(o){return '<option'+(o===stNorm?' selected':'')+'>'+o+'</option>';}).join('')+'</select>')+'</div>'
                  +'<button class="save-btn sp-ship-save" data-ref="'+rf+'" style="background:#16a34a;color:#fff;border-color:#15803d">Save</button>'
                +'</div></div>';
              var chgPanel='<div style="margin-top:10px;padding:10px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:7px">'
                +'<div style="font-weight:700;font-size:12px;color:#92400e;margin-bottom:6px">💰 Freight charges</div>'
                +'<div class="sp-chg-list" data-ref="'+rf+'"><span class="mut tiny">Loading…</span></div>'
                +'<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;margin-top:8px">'
                  +'<div>'+eLbl('Freight cost')+'<input class="fci sp-chg-cost" data-ref="'+rf+'" placeholder="0.00" style="width:100px;text-align:right"></div>'
                  +'<div>'+eLbl('Description')+'<input class="fci txt sp-chg-desc" data-ref="'+rf+'" placeholder="e.g. fuel surcharge" style="width:220px;text-align:left"></div>'
                  +'<button class="save-btn sp-chg-go" data-ref="'+rf+'">Add charge</button>'
                +'</div><div class="tiny mut" style="margin-top:4px">Charges go to Dock &amp; Bay to review.</div></div>';
              return '<div class="sp-card" style="border:1px solid '+(s.escalated?'#fca5a5':'#e0e0e0')+';border-radius:8px;margin-bottom:10px;background:'+(s.escalated?'#fef2f2':'#fff')+'">'
                +'<div class="sp-head" style="display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:10px 12px;cursor:pointer">'
                +'<span class="sp-toggle" style="font-size:12px;color:#475569">▸</span>'
                +spBadge(s)+'<div style="font-weight:700;font-size:15px">'+esc(s.master_po)+'</div>'
                +(/^fob$/i.test(s.mode||'')?'<span style="background:#ede9fe;color:#6d28d9;border-radius:10px;font-size:10px;font-weight:700;padding:2px 8px">📦 FOB</span>':'')
                +'<span class="mut tiny">'+esc((s.mode||'—')+(s.carrier?' · '+s.carrier:''))+(s.departure?' · dep '+esc(fd(s.departure)):'')+(s.arrival?' · arr '+esc(fd(s.arrival)):'')+'</span>'
                +(s.escalated?'<span class="tool-badge bg-red" style="margin-left:auto">⚑ ESCALATED</span>':'')
                +'</div>'
                +'<div class="sp-body" style="display:none;padding:0 12px 12px">'+editPanel+datesStrip+'<div style="margin-top:8px">'+members+'</div>'
                +(s.members||[]).map(function(m){return dtcBlock(m.po);}).join('')
                +chgPanel
                +'<div style="margin-top:10px"><div class="mut tiny" style="margin-bottom:3px">Download a consolidated shipment tax invoice</div><button class="save-btn pp-ship-inv" data-ref="'+esc(s.shipment_ref)+'" style="background:#dbeafe;color:#1e40af;border:1px solid #93c5fd" title="download the consolidated Tax Invoice + Packing List for this shipment">📄 Tax Invoice</button></div>'
                +'<div class="sp-timeline" data-ref="'+esc(s.shipment_ref)+'" style="margin-top:8px;border-top:1px solid #f1f1f1;padding-top:6px"></div></div></div>'; }
            var _sorted=rows.slice().map(function(s){return {s:s,b:_bucketOf(s)};}).sort(function(a,b){ if(a.b!==b.b)return a.b-b.b; var pa=a.s.prod_end||'~', pb=b.s.prod_end||'~'; return pa<pb?-1:pa>pb?1:0; });
            var _out='', _cur=-1;
            _sorted.forEach(function(o){ if(o.b!==_cur){ _cur=o.b; var g=_BKT[o.b]; _out+='<div class="sp-grp" style="margin:14px 0 8px;padding:7px 12px;background:'+g.bg+';border:1px solid '+g.bd+';border-radius:6px;font-weight:700;font-size:12px;color:'+g.c+'">'+(g.t?g.t+'. ':'')+g.d+'</div>'; } _out+=cardHtml(o.s); });
            return _out; }
          function ppShipTimeline(ref){ var box=rootEl.querySelector('.sp-timeline[data-ref="'+(window.CSS&&CSS.escape?CSS.escape(ref):ref)+'"]'); if(!box)return;
            fetch(EP.shipmentNotesBase+encodeURIComponent(ref)).then(function(r){return r.json();}).then(function(notes){ shortNotes(notes);
              var _supN=(notes||[]).filter(function(n){return n.author_kind==='supplier';});   // escalate only on the supplier's OWN latest note
              var recentSupId=_supN.length?_supN.slice().sort(function(a,b){return String(b.created_at||'').localeCompare(String(a.created_at||''));})[0].id:null;
              box.innerHTML=(EP.escalate?'<div style="margin-bottom:10px"><button class="save-btn sp-esc-ship" data-ref="'+esc(ref)+'" style="color:#b91c1c;border-color:#fca5a5;font-weight:600" title="escalate this shipment to Dock &amp; Bay by email">⚑ Escalate shipment</button></div>':'')
                +'<div style="font-weight:600;font-size:12px;margin-bottom:4px">Add timeline note</div>'
                +'<div style="display:flex;gap:6px;align-items:flex-start;margin-bottom:10px"><textarea class="fci sp-note-in" rows="3" placeholder="Add a note to the timeline… (multiple lines OK)" style="flex:1;max-width:560px;min-height:58px;text-align:left;resize:vertical;line-height:1.4"></textarea><button class="save-btn sp-note-post" style="flex:0 0 auto">Post</button></div>'
                +'<div class="tiny" style="font-weight:600;margin-bottom:3px">Timeline</div>'
                +((notes&&notes.length)?tlDesc(notes).map(function(n){ var flag=(EP.escalate&&n.id===recentSupId)?'<button class="save-btn light tip sp-flag-note" data-ref="'+esc(ref)+'" data-msg="'+esc(n.body)+'" data-tip="email this note to the supply planner" style="flex:0 0 auto;color:#b91c1c;border-color:#fca5a5;white-space:nowrap">⚑ Flag</button>':'';
                  return '<div style="margin:6px 0;max-width:640px;display:flex;gap:8px;align-items:flex-start">'+(flag?'<div style="flex:0 0 auto;min-width:60px">'+flag+'</div>':'')+'<div style="flex:1"><span class="mut" style="font-size:10px">'+esc(n.created_at)+' · '+(n.author_kind==='supplier'?'You':'Dock &amp; Bay')+'</span><div class="tl-msg">'+esc(n.body)+'</div></div></div>';}).join(''):'<div class="mut tiny">No timeline entries yet.</div>');
              var _se=box.querySelector('.sp-esc-ship'); if(_se)_se.onclick=function(){ if(!confirm('Escalate this shipment to Dock & Bay by email?'))return;
                _se.disabled=true; _se.textContent='Sending…';
                postJSON(EP.escalate,{kind:'shipment',ref:ref,message:'Escalation requested for shipment '+ref,initiator:'supplier',set_escalated:true,post_note:true},function(j){ _se.textContent='✓ Escalated';
                  var ent=(_ppData.shipmentPlan||[]).filter(function(x){return x.shipment_ref===ref;})[0]; if(ent)ent.escalated=true; setShipBadge&&setShipBadge();   // reflect the new escalated status (filterable)
                  ppShipTimeline(ref);   // re-render so the "<user> escalated this shipment" note appears on the timeline
                  if(j&&j.sandbox)alert('Sandbox: no email key configured, nothing sent. On live this routes to the internal recipients in CONFIG ▸ General settings.'); }); };
              var _fn=box.querySelector('.sp-flag-note'); if(_fn)_fn.onclick=function(){ var msg=_fn.dataset.msg||''; if(!msg)return; if(!confirm('Email this note to the supply planner?'))return; _fn.disabled=true; _fn.textContent='Sending…';
                postJSON(EP.escalate,{kind:'shipment',ref:_fn.dataset.ref,message:msg,initiator:'supplier'},function(j){ _fn.textContent='✓ Flagged'; if(j&&j.sandbox)alert('Sandbox: no email key configured, nothing sent. On live this routes to the internal recipients in CONFIG ▸ General settings.'); }); };
              // opening the timeline marks Dock&Bay notes read → clears this shipment's notification
              var ent=(_ppData.shipmentPlan||[]).filter(function(x){return x.shipment_ref===ref;})[0];
              if(EP.shipmentNotesRead&&ent&&(ent.unread_dnb||0)>0){ postJSON(EP.shipmentNotesRead,{shipment_ref:ref},function(){ ent.unread_dnb=0; setShipBadge(); var bd=rootEl.querySelector('.sp-shipbadge[data-ref="'+(window.CSS&&CSS.escape?CSS.escape(ref):ref)+'"]'); if(bd)bd.innerHTML=''; }); }
              box.querySelector('.sp-note-post').onclick=function(){ var inp=box.querySelector('.sp-note-in'); var v=(inp.value||'').trim(); if(!v)return;
                postJSON(EP.shipmentNote,{shipment_ref:ref,author_kind:'supplier',author_email:STATE.by,body:v},function(){ ppShipTimeline(ref); }); }; }).catch(function(){}); }
          function sampChip(st){ var m={'PLANNED':['#dbeafe','#1d4ed8'],'SHIPPED':['#dcfce7','#166534'],'CANCELLED':['#f1f5f9','#94a3b8'],'Awaiting supplier':['#fef3c7','#92710a'],'Change requested':['#fee2e2','#b91c1c'],'In production':['#dbeafe','#1d4ed8'],'Charge to review':['#fee2e2','#b91c1c'],'Shipped':['#dcfce7','#166534'],'Complete':['#e2e8f0','#475569'],'Cancelled':['#f1f5f9','#94a3b8']}; var c=m[st]||['#e2e8f0','#475569']; return '<span style="background:'+c[0]+';color:'+c[1]+';border-radius:4px;font-size:10px;font-weight:700;padding:1px 6px">'+esc(st||'')+'</span>'; }
          function chgChip(st){ var m={pending:['#fef3c7','#92710a'],accepted:['#dcfce7','#166534'],rejected:['#f1f5f9','#94a3b8']}; var c=m[st]||['#e2e8f0','#475569']; return '<span style="background:'+c[0]+';color:'+c[1]+';border-radius:4px;font-size:10px;padding:1px 6px">'+esc(st)+'</span>'; }
          // freight charges on a PO's shipment (lazy-loaded into .pp-fchg-list when a PO row is expanded)
          function loadFreightCharges(container){ if(!container||!container.querySelectorAll)return;
            Array.prototype.forEach.call(container.querySelectorAll('.pp-fchg-list'),function(el){ var ref=el.dataset.ref; if(!ref)return;
              fetch(EP.shipmentChargesBase+encodeURIComponent(ref)).then(function(r){return r.json();}).then(function(cs){
                if(!Array.isArray(cs)||!cs.length){ el.innerHTML='<span class="mut tiny">No freight charges yet.</span>'; return; }
                el.innerHTML=cs.map(function(c){ var t=(Number(c.freight_cost)||0)+(Number(c.product_cost)||0); return '<div class="tiny" style="margin:2px 0">'+chgChip(c.status)+' &nbsp;'+money(t)+(c.description?' · '+esc(c.description):'')+'</div>'; }).join('');
              }).catch(function(){ el.innerHTML='<span class="mut tiny">—</span>'; }); }); }
          function ppSampleCard(s){
            function lbl(t){ return '<div style="font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#94a3b8;font-weight:700;margin-bottom:3px">'+t+'</div>'; }
            // "changes since you approved" — diff current lines vs the approved snapshot (only meaningful when a re-confirm is needed)
            var _appr=s.approved_lines||{}, _cur=s.cur_lines||{}, _sampChg={}, _sampChgList=[];
            if(s.change_requested && _appr && Object.keys(_appr).length){
              Object.keys(_appr).forEach(function(sk){ var o=Number(_appr[sk])||0, n=(_cur[sk]!=null?Number(_cur[sk]):0); if(n!==o){ _sampChg[sk]=1; _sampChgList.push({sku:sk,old:o,nw:n,kind:(n===0?'removed':(n>o?'up':'down'))}); } });
              Object.keys(_cur).forEach(function(sk){ if(!(sk in _appr) && (Number(_cur[sk])||0)>0){ _sampChg[sk]=1; _sampChgList.push({sku:sk,old:0,nw:Number(_cur[sk])||0,kind:'new'}); } });
            }
            var skuList=(s.lines||[]).map(function(l){var ch=_sampChg[l.sku]; return '<div class="samp-lrow" style="display:flex;gap:6px;align-items:center;padding:1px 0;text-align:left'+(ch?';background:#fef9c3;border-radius:4px':'')+'"><input class="fci samp-lqty" data-sku="'+esc(l.sku)+'" value="'+(l.qty==null?'':l.qty)+'" style="width:50px;text-align:left" inputmode="numeric" title="qty"><span style="flex:1;min-width:0">'+esc(l.sku)+(ch?' <span style="background:#f59e0b;color:#fff;border-radius:8px;font-size:9px;font-weight:700;padding:1px 5px">changed</span>':'')+'</span><a class="samp-lrm" data-sku="'+esc(l.sku)+'" title="remove" style="color:#dc2626;cursor:pointer">✕</a></div>';}).join('')||'<div class="mut tiny">no SKUs</div>';
            var devList=(s.dev_samples||[]).map(function(d){return '<div style="display:flex;gap:6px;align-items:center;padding:1px 0;text-align:left"><input class="fci samp-dqty" data-id="'+d.id+'" value="'+(d.qty==null?'':d.qty)+'" style="width:50px;text-align:left" inputmode="numeric" title="qty"><b style="font-family:ui-monospace,Menlo,monospace;font-size:11px">'+esc(d.ref)+'</b>'+(d.colour_name?'<span class="mut tiny" style="flex:1;min-width:0">'+esc(d.colour_name)+'</span>':'<span style="flex:1"></span>')+'<a class="samp-drm" data-id="'+d.id+'" title="remove" style="color:#dc2626;cursor:pointer">✕</a></div>';}).join('')||'<div class="mut tiny">none</div>';
            var addr=[s.address_line1,s.address_line2,[s.city,s.region,s.postcode].filter(Boolean).join(' '),s.country].filter(Boolean);
            var charges=(s.charges||[]).map(function(c){ var t=(Number(c.freight_cost)||0)+(Number(c.product_cost)||0); return '<div class="tiny" style="margin:2px 0">'+chgChip(c.status)+' &nbsp;freight '+money(c.freight_cost)+' + product '+money(c.product_cost)+' = <b>'+money(t)+'</b>'+(c.description?' · '+esc(c.description):'')+'</div>'; }).join('')||'<div class="mut tiny">none yet</div>';
            return '<div class="samp-card" data-id="'+s.id+'" data-ref="'+esc(s.ref)+'" style="border:1px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:12px;background:#fff;text-align:left">'
              +'<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px"><b style="font-size:15px">'+esc(s.ref)+'</b>'+sampChip(s.status_calc)+' <span class="mut tiny">Dock &amp; Bay status</span>'
                +'<span class="mut tiny">Completion required: <b>'+(s.completion_required?fd(s.completion_required):'—')+'</b></span></div>'
              +(sampNeedsAccept(s)?('<div style="margin:0 0 12px;padding:9px 12px;border-radius:8px;font-size:12px;background:#fef3c7;border:1px solid #fcd34d">'
                +'<div style="margin-bottom:8px">⏳ <b>'+(s.change_requested?'A change has been made. Please re-confirm this sample request.':'Please confirm this sample request.')+'</b> Review the SKUs &amp; quantities'+(_sampChgList.length?' (changes highlighted below)':'')+', then confirm.</div>'
                +(_sampChgList.length?'<div style="overflow-x:auto;margin-bottom:8px"><table style="font-size:11px;border-collapse:collapse"><thead><tr><th class="l" style="padding:2px 12px 3px 0;min-width:24ch">SKU</th><th style="text-align:right;padding:2px 12px 3px">Was</th><th style="text-align:right;padding:2px 12px 3px">Now</th><th class="l">Change</th></tr></thead><tbody>'+_sampChgList.map(function(c){var d=c.nw-c.old;return '<tr><td class="l" style="padding:1px 12px 1px 0">'+esc(c.sku)+'</td><td style="text-align:right;padding:1px 12px">'+(c.kind==='new'?'—':c.old)+'</td><td style="text-align:right;padding:1px 12px">'+c.nw+'</td><td class="l" style="font-weight:600;color:'+(c.kind==='removed'?'#b91c1c':d>0?'#166534':'#b45309')+'">'+(c.kind==='new'?'added':c.kind==='removed'?'removed':(d>0?'+':'')+d)+'</td></tr>';}).join('')+'</tbody></table></div>':'')
                +'<button class="save-btn samp-accept" style="background:#16a34a;color:#fff;border-color:#15803d">✓ Confirm sample request</button></div>')
                :(s.accepted?'<div style="margin:0 0 10px;font-size:12px;color:#166534">✓ Sample request confirmed</div>':''))
              +'<div style="display:flex;gap:32px;flex-wrap:wrap">'
                +'<div style="min-width:190px">'+lbl('Ship to')+'<div class="tiny" style="line-height:1.65"><b>'+esc(s.recipient_company||'—')+'</b>'+(s.recipient_name?'<br>'+esc(s.recipient_name):'')+(addr.length?'<br>'+addr.map(esc).join('<br>'):'')+(s.phone?'<br>☏ '+esc(s.phone):'')+'</div></div>'
                +'<div style="min-width:220px">'+lbl('Contents')
                  +'<div class="tiny" style="line-height:1.7"><div style="font-weight:600;color:#64748b;margin-bottom:2px">Bulk SKUs</div>'+skuList
                  +'<div style="font-weight:600;color:#64748b;margin:6px 0 2px">Product development</div>'+devList
                  +'<button class="save-btn samp-add-contents" style="margin-top:7px;font-size:11px;background:#2563eb;color:#fff;border-color:#1d4ed8">＋ Add contents</button></div>'
                  +'<div class="samp-picker" style="margin-top:7px"></div></div>'
                +'<div style="min-width:190px">'+lbl('Purpose')+'<div class="tiny" style="margin-bottom:10px">'+esc((s.purpose||[]).join(', ')||'—')+'</div>'+lbl('Notes')+'<div class="tiny" style="white-space:pre-wrap;background:#f8fafc;border:1px solid #eef2f7;border-radius:6px;padding:7px 9px;min-width:170px;max-width:300px">'+(s.notes?esc(s.notes):'<span class="mut">—</span>')+'</div></div>'
              +'</div>'
              +'<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end;margin-top:12px;border-top:1px solid #f1f5f9;padding-top:10px">'
                +'<div>'+lbl('Your production status')+'<select class="fci samp-prod" data-id="'+s.id+'" style="width:150px;font-size:12px'+((sampStMissing(s)||sampDateConflict(s))?';border:1px solid #dc2626;background:#fef2f2':'')+'"><option value="">—</option>'+PROD_STATUS.map(function(o){return '<option value="'+o[0]+'"'+(o[0]===(s.production_status||'')?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select>'+(sampStMissing(s)?'<div style="margin-top:3px"><span style="background:#dc2626;color:#fff;border-radius:4px;font-size:10px;font-weight:700;padding:2px 6px">⚠ Must set status</span></div>':'')+'</div>'
                +'<div>'+lbl('Expected completion')+'<input type="date" class="fci samp-exp" value="'+esc(s.supplier_expected||'')+'" style="width:150px'+((sampCdMissing(s)||sampDateConflict(s))?';border:1px solid #dc2626;background:#fef2f2':'')+'">'+(sampCdMissing(s)?'<div style="margin-top:3px"><span style="background:#dc2626;color:#fff;border-radius:4px;font-size:10px;font-weight:700;padding:2px 6px">⚠ Must enter completion date</span></div>':'')+'</div>'
                +(sampDateConflict(s)?'<div style="flex-basis:100%"><span style="background:#dc2626;color:#fff;border-radius:4px;font-size:10px;font-weight:700;padding:2px 7px">⚠ Expected completion date has passed but status is still "In production" — please update</span></div>':'')
                +'<div>'+lbl('Tracking code')+'<input class="fci txt samp-trk" value="'+esc(s.tracking_code||'')+'" style="width:170px" placeholder="tracking…">'+(carrierTrackUrl(s.carrier,s.tracking_code)?'<div class="tiny" style="margin-top:3px">'+carrierTrackLink(s.carrier,s.tracking_code)+'</div>':'')+'</div>'
                +'<div>'+lbl('Carrier')+(function(){var CARR=['DHL','FedEx','UPS','Flexport','SF Express','Other'],cur=s.carrier||'';return '<select class="fci samp-car" style="width:130px"><option value="">—</option>'+CARR.map(function(o){return '<option'+(o===cur?' selected':'')+'>'+o+'</option>';}).join('')+((cur&&CARR.indexOf(cur)<0)?'<option selected>'+esc(cur)+'</option>':'')+'</select>';})()+'</div>'
                +'<button class="save-btn samp-save">Save</button></div>'
              +'<div style="margin-top:12px;border-top:1px solid #f1f5f9;padding-top:10px">'+lbl('Charges')+charges
                +'<div style="display:flex;gap:8px;align-items:flex-end;margin-top:6px;flex-wrap:wrap"><div><div class="mut tiny">Freight</div><input class="fci samp-cf" style="width:80px" placeholder="0.00"></div><div><div class="mut tiny">Product</div><input class="fci samp-cp" style="width:80px" placeholder="0.00"></div><div><div class="mut tiny">Note</div><input class="fci txt samp-cd" style="width:180px" placeholder="optional"></div><button class="save-btn samp-charge">Create charge</button></div></div>'
              +'<div style="margin-top:12px;border-top:1px solid #f1f5f9;padding-top:10px;text-align:left">'+lbl('Attachments')
                +'<div style="font-size:12px;margin-bottom:4px;text-align:left">'+((s.attachments||[]).map(function(a){return '<span style="display:inline-block;margin:0 12px 4px 0"><a href="'+EP.attachmentBase+a.id+'" target="_blank" rel="noopener">'+esc(a.filename||'file')+'</a> <a class="ps-att-rm" data-aid="'+a.id+'" title="remove" style="color:#dc2626;cursor:pointer">×</a></span>';}).join('')||'<span class="mut">none</span>')+'</div>'
                +'<div style="text-align:left"><input type="file" class="ps-att-file" style="font-size:11px"> <button class="save-btn ps-att-up">Upload attachment</button></div></div>'
              +'<div style="margin-top:12px;border-top:1px solid #f1f5f9;padding-top:10px">'+lbl('Timeline')
                +'<div style="display:flex;gap:6px;align-items:flex-start;margin:4px 0 6px"><textarea class="fci samp-note-in" rows="2" placeholder="Add a note…" style="flex:1;max-width:480px;text-align:left"></textarea><button class="save-btn samp-note-post">Post</button></div>'
                +'<div class="samp-tl" data-id="'+s.id+'"></div></div>'
              +'</div>'; }
          function sampNeedsAccept(s){ return (!s.accepted||s.change_requested)&&s.status!=='cancelled'&&s.status!=='complete'; }
          function sampInFilt(s,f){ if(f==='all')return true; if(f==='closed')return !s.is_open; return s.is_open; }
          function sampActive(s){ var u=String(s.status_calc||s.status||'').toUpperCase(); return u!=='CANCELLED' && u!=='SHIPPED'; }
          function sampCdMissing(s){ return sampActive(s) && !s.supplier_expected; }   // must enter expected completion date
          function sampStMissing(s){ return sampActive(s) && !s.production_status; }     // must set their production status
          // logic conflict: the expected completion date has passed but the supplier still says "In production".
          function sampDateConflict(s){ return sampActive(s) && !!s.supplier_expected && s.supplier_expected<new Date().toISOString().slice(0,10) && s.production_status==='in_production'; }
          // supplier actions on a sample: unread D&B message, missing expected date / production status, or a
          // past-expected-date-while-in-production conflict. (Accept step removed.)
          function sampActions(s){ return ((s.unread_dnb)||0)+(sampCdMissing(s)?1:0)+(sampStMissing(s)?1:0)+(sampDateConflict(s)?1:0); }
          function setSampBadge(){ var n=((_ppData&&_ppData.samples)||[]).reduce(function(a,s){return a+sampActions(s);},0);   // supplier actions: needs-(re)accept + unread D&B notes
            var sbg=document.getElementById('pp-samp-badge'); if(sbg)sbg.innerHTML=n?'<span style="background:#dc2626;color:#fff;border-radius:8px;font-size:9px;font-weight:700;padding:0 5px">'+n+'</span>':''; }
          function sampRowBadgeHtml(s){ var n=sampActions(s); var act=n?'<span style="background:#dc2626;color:#fff;border-radius:8px;font-size:9px;font-weight:700;padding:0 5px;margin-left:4px" title="needs your attention">'+n+'</span>':''; var nu=s.unread_dnb?'<span style="background:#f59e0b;color:#fff;border-radius:8px;font-size:9px;font-weight:700;padding:0 5px;margin-left:3px" title="new note from Dock &amp; Bay">'+s.unread_dnb+'</span>':''; return act+nu; }
          function sampById(id){ return ((_ppData&&_ppData.samples)||[]).filter(function(x){return String(x.id)===String(id);})[0]; }
          // Silent in-place refresh of one sample card + its row/top badges (no full reload / no screen refresh).
          function refreshSampleCard(id){ var s=sampById(id); if(!s)return;
            var det=body.querySelector('.ps-det[data-id="'+id+'"]');
            if(det && det.innerHTML.trim()){ var trk=det.querySelector('.samp-trk'), car=det.querySelector('.samp-car');
              if(trk)s.tracking_code=trk.value; if(car)s.carrier=car.value;   // keep any unsaved sibling edits visible
              det.innerHTML=ppSampleCard(s); wireSampleCard(det, id); }
            var rb=body.querySelector('.ps-rowbadge[data-id="'+id+'"]'); if(rb)rb.innerHTML=sampRowBadgeHtml(s);
            setSampBadge(); }
          function ppBadgeHtml(n){ return n?'<span style="background:#dc2626;color:#fff;border-radius:8px;font-size:9px;font-weight:700;padding:0 5px">'+n+'</span>':''; }
          // Purchase Orders top-menu badge = open supplier ACTIONS across all POs. Deliberately EXCLUDES the
          // per-PO "no shipment yet" term (a passive state, not an action — it would show ~1 per in-production PO).
          function setPosBadge(){
            var n=((_ppData&&_ppData.pos)||[]).reduce(function(a,p){ return a+poActionCount(p); },0);   // shared count (excludes productions ≤54)
            var b=document.getElementById('pp-pos-badge'); if(b)b.innerHTML=ppBadgeHtml(n); }
          // Shipment action count = FOB production-end pending (not submitted / rejected) + unread Dock&Bay notes.
          function shipActCount(s){ if(!s)return 0;
            if(s.is_fob){ var subs=(_ppData.subsByPo&&_ppData.subsByPo[s.master_po])||[];
              var cdq=subs.filter(function(x){return x.kind==='completion_date';}); var cd=cdq.length?cdq[cdq.length-1]:null;
              var pend=(!cd||cd.status==='dismissed')?1:0;
              var nts=(_ppData.notesByPo&&_ppData.notesByPo[s.master_po])||[];
              return pend+nts.filter(function(n){return n.author_kind==='internal'&&!n.read;}).length; }
            return Number(s.unread_dnb)||0; }
          function setShipBadge(){ var n=((_ppData&&_ppData.shipmentPlan)||[]).reduce(function(a,s){return a+shipActCount(s);},0);
            var b=document.getElementById('pp-ship-badge'); if(b)b.innerHTML=ppBadgeHtml(n); }
          function ppSampleRow(s,i){
            var units=(s.lines||[]).reduce(function(a,l){return a+(Number(l.qty)||0);},0), nsku=(s.lines||[]).length;
            return '<tr><td class="l"><button class="planbtn ps-manage" data-id="'+s.id+'" data-i="'+i+'">PLAN</button><span class="ps-rowbadge" data-id="'+s.id+'">'+sampRowBadgeHtml(s)+'</span></td>'
              +'<td class="l"><b>'+esc(s.ref)+'</b></td>'
              +'<td class="l">'+sampChip(s.status_calc)+'</td>'
              +'<td class="l">'+esc(s.recipient_company||'')+(s.recipient_name?' <span class="mut tiny">'+esc(s.recipient_name)+'</span>':'')+'</td>'
              +'<td class="l">'+(s.completion_required?fd(s.completion_required):'<span class="mut">—</span>')+'</td>'
              +'<td class="l"><b>'+units+'</b> <span class="mut tiny">· '+nsku+' SKU'+(nsku===1?'':'s')+'</span></td>'
              +'<td class="l">'+(s.tracking_code?carrierTrackLink(s.carrier,s.tracking_code):'<span class="mut">—</span>')+'</td></tr>'
              +'<tr class="ps-exp" id="ps-exp-'+i+'" style="display:none"><td colspan="7"><div class="ps-det" data-id="'+s.id+'"></div></td></tr>'; }
          function ppSamples(samples){
            var F=[['open','Open'],['closed','Closed'],['all','All']];
            var q=(PORTAL_SAMP_Q||'').toLowerCase();
            var rows=samples.filter(function(s){ if(!sampInFilt(s,PORTAL_SAMP_F))return false; if(q){ var hay=((s.ref||'')+' '+(s.recipient_company||'')+' '+(s.recipient_name||'')+' '+(s.lines||[]).map(function(l){return l.sku;}).join(' ')).toLowerCase(); if(hay.indexOf(q)<0)return false; } return true; });
            var bar='<div class="bar" style="margin-bottom:8px;flex-wrap:wrap;gap:6px;align-items:center">'
              +F.map(function(f){return '<span class="rtab ps-filt'+(PORTAL_SAMP_F===f[0]?' active':'')+'" data-f="'+f[0]+'" style="cursor:pointer">'+f[1]+' ('+samples.filter(function(s){return sampInFilt(s,f[0]);}).length+')</span>';}).join('')
              +'<input class="fci txt ps-q" placeholder="search ref / recipient / SKU…" value="'+esc(PORTAL_SAMP_Q||'')+'" style="width:220px">'
              +'<button class="save-btn" id="samp-new-btn" style="margin-left:auto;background:#16a34a;color:#fff;border-color:#15803d">+ New Sample Shipment</button></div>';
            var tbl=samples.length?(rows.length?'<div class="tw"><table style="width:max-content;min-width:100%"><thead><tr><th class="l"></th><th class="l">Ref</th><th class="l">Status</th><th class="l">Recipient</th><th class="l">Requested completion</th><th class="l">Units</th><th class="l">Tracking</th></tr></thead><tbody>'+rows.map(ppSampleRow).join('')+'</tbody></table></div>':'<div class="count">No samples match this filter.</div>'):'<div class="count">No sample requests yet.</div>';
            return bar+'<div id="samp-newform"></div>'+tbl; }
          function wireSampleCard(scope,id){
            // Contents (bulk SKUs + product-development samples) — replace-all writes, then a light contents-only
            // refresh (no full bootstrap reload) so the card updates silently.
            function loadContents(cb){ getJSON(EP.sampleContentsBase+id+'/contents').then(function(c){ var s=sampById(id); if(s&&c&&!c.error){ s.lines=c.lines||[]; s.dev_samples=c.dev_samples||[]; } refreshSampleCard(id); cb&&cb(); }); }
            function saveLines(lines,cb){ postJSON(EP.sampleContentsBase+id+'/lines',{lines:lines},function(j){ if(j&&j.error){alert(j.error);return;} loadContents(cb); }); }
            function saveDev(devs,cb){ postJSON(EP.sampleContentsBase+id+'/dev-samples',{dev_samples:devs},function(j){ if(j&&j.error){alert(j.error);return;} loadContents(cb); }); }
            scope.querySelectorAll('.samp-lqty').forEach(function(inp){ inp.onchange=function(){ var s=sampById(id); var lines=(s.lines||[]).map(function(l){return {sku:l.sku,qty:l.sku===inp.dataset.sku?(Number(inp.value)||1):l.qty};}); saveLines(lines); }; });
            scope.querySelectorAll('.samp-lrm').forEach(function(a){ a.onclick=function(){ var s=sampById(id); var lines=(s.lines||[]).filter(function(l){return l.sku!==a.dataset.sku;}).map(function(l){return {sku:l.sku,qty:l.qty};}); saveLines(lines); }; });
            scope.querySelectorAll('.samp-dqty').forEach(function(inp){ inp.onchange=function(){ var s=sampById(id); var devs=(s.dev_samples||[]).map(function(d){return {id:d.id,qty:String(d.id)===inp.dataset.id?(Number(inp.value)||1):d.qty};}); saveDev(devs); }; });
            scope.querySelectorAll('.samp-drm').forEach(function(a){ a.onclick=function(){ var s=sampById(id); var devs=(s.dev_samples||[]).filter(function(d){return String(d.id)!==String(a.dataset.id);}).map(function(d){return {id:d.id,qty:d.qty};}); saveDev(devs); }; });
            var addc=scope.querySelector('.samp-add-contents'); if(addc)addc.onclick=function(){ var pk=scope.querySelector('.samp-picker'); if(!pk)return;
              if(pk.style.display==='none'||!pk.innerHTML){ pk.style.display=''; var s=sampById(id);
                sampContentsPicker(pk, s, function(devs, skus){ var s2=sampById(id);
                  var newDevs=(s2.dev_samples||[]).map(function(d){return {id:d.id,qty:d.qty};}).concat(devs);
                  var newLines=(s2.lines||[]).map(function(l){return {sku:l.sku,qty:l.qty};}).concat(skus);
                  function afterDev(){ if(!skus.length){ loadContents(); return; } saveLines(newLines); }
                  if(devs.length){ postJSON(EP.sampleContentsBase+id+'/dev-samples',{dev_samples:newDevs},function(j){ if(j&&j.error){alert(j.error);return;} afterDev(); }); } else afterDev(); });
              } else { pk.style.display='none'; pk.innerHTML=''; } };
            var ac=scope.querySelector('.samp-accept'); if(ac)ac.onclick=function(){ ac.disabled=true; postJSON(EP.sampleAccept,{id:id},function(j){ if(j&&j.error){alert(j.error);ac.disabled=false;return;} var s=sampById(id); if(s){ s.accepted=true; s.change_requested=false; if(!s.tracking_code && s.status_calc!=='Shipped' && s.status_calc!=='Charge to review') s.status_calc='In production'; } refreshSampleCard(id); }); };
            var save=scope.querySelector('.samp-save'); if(save)save.onclick=function(){ var ps=scope.querySelector('.samp-prod'),ex=scope.querySelector('.samp-exp'),tk=scope.querySelector('.samp-trk'),cr=scope.querySelector('.samp-car');
              var ev=(ex&&ex.value)||null,pv=(ps&&ps.value)||null,tv=(tk&&tk.value)||null,cv=(cr&&cr.value)||null;
              postJSON(EP.sampleUpdate,{id:id,supplier_expected_completion:ev,tracking_code:tv,carrier:cv,production_status:pv},function(){ var s=sampById(id); if(s){s.supplier_expected=ev||'';s.production_status=pv||'';s.tracking_code=tv||'';s.carrier=cv||'';} refreshSampleCard(id); }); };
            // completion date + status auto-save silently on change (no reload / no screen refresh)
            var sexp=scope.querySelector('.samp-exp'); if(sexp)sexp.onchange=function(){ var v=sexp.value||null; postJSON(EP.sampleUpdate,{id:id,supplier_expected_completion:v},function(){ var s=sampById(id); if(s)s.supplier_expected=v||''; refreshSampleCard(id); }); };
            var sprod=scope.querySelector('.samp-prod'); if(sprod)sprod.onchange=function(){ var v=sprod.value||null; postJSON(EP.sampleUpdate,{id:id,production_status:v},function(){ var s=sampById(id); if(s)s.production_status=v||''; refreshSampleCard(id); }); };
            var ch=scope.querySelector('.samp-charge'); if(ch)ch.onclick=function(){ var f=scope.querySelector('.samp-cf').value,p=scope.querySelector('.samp-cp').value,d=scope.querySelector('.samp-cd').value; if(!f&&!p){alert('Enter a freight and/or product cost.');return;} ch.disabled=true; postJSON(EP.sampleCharge,{id:id,freight_cost:Number(f)||0,product_cost:Number(p)||0,description:d||null},function(){ reload(); }); };
            var np=scope.querySelector('.samp-note-post'); if(np)np.onclick=function(){ var inp=scope.querySelector('.samp-note-in'); var v=(inp.value||'').trim(); if(!v)return; postJSON(EP.sampleNote,{id:id,body:v,author_kind:EP.sampleNoteAuthorKind,author_email:EP.sampleNoteAuthorEmail},function(){ inp.value=''; ppSampleTimeline(id); }); };
            var af=scope.querySelector('.ps-att-file'), au=scope.querySelector('.ps-att-up');
            if(au)au.onclick=function(){ var f=af&&af.files&&af.files[0]; if(!f){alert('Choose a file to upload.');return;} au.disabled=true; var rd=new FileReader(); rd.onload=function(){ postJSON(EP.sampleAttachment,{id:id,filename:f.name,mime:f.type||'application/octet-stream',data_base64:String(rd.result)},function(){ reload(); }); }; rd.readAsDataURL(f); };
            scope.querySelectorAll('.ps-att-rm').forEach(function(b){ b.onclick=function(){ if(!confirm('Remove this attachment?'))return; postJSON(EP.sampleAttachmentRemove,{att_id:b.dataset.aid},function(){ reload(); }); }; });
            ppSampleTimeline(id); }
          function ppSampleTimeline(id){ var box=body.querySelector('.samp-tl[data-id="'+id+'"]'); if(!box)return;
            var _s=(_ppData.samples||[]).filter(function(x){return String(x.id)===String(id);})[0], sref=_s?_s.ref:'';
            fetch(EP.sampleNotesBase+id).then(function(r){return r.json();}).then(function(notes){ shortNotes(notes);
              var _supN=(notes||[]).filter(function(n){return n.author_kind==='supplier';});   // escalate only on the supplier's OWN latest note
              var recentSupId=_supN.length?_supN.slice().sort(function(a,b){return String(b.created_at||'').localeCompare(String(a.created_at||''));})[0].id:null;
              box.innerHTML=(notes&&notes.length)?tlDesc(notes).map(function(n){ var onBehalf=(n.author_kind==='supplier'&&n.author_email==='D&B'); var dnb=(n.author_kind!=='supplier'), nu=dnb&&!n.read;
                var who=onBehalf?('D&amp;B as '+esc(STATE.supplierName||'supplier')):(dnb?'Dock &amp; Bay':'You');
                var ctrl = nu ? '<button class="save-btn light ps-note-read" data-id="'+n.id+'" style="flex:0 0 auto">Mark read</button>'
                              : ((EP.escalate&&sref&&!dnb&&n.id===recentSupId)?'<button class="save-btn light tip samp-esc-note" data-ref="'+esc(sref)+'" data-msg="'+esc(n.body)+'" data-tip="email this note to the supply planner" style="flex:0 0 auto;color:#b91c1c;border-color:#fca5a5;white-space:nowrap">⚑ Flag</button>':'');
                return '<div style="font-size:13px;line-height:1.5;text-align:left;margin:4px 0;max-width:640px;display:flex;gap:10px;align-items:flex-start'+(nu?';background:#fff7ed;border:1px solid #fdba74;border-radius:6px;padding:6px 9px':'')+'">'+(ctrl?'<div style="flex:0 0 auto;min-width:74px">'+ctrl+'</div>':'')+'<div style="flex:1"><span class="mut" style="font-size:11px">'+esc(n.created_at)+' · '+who+'</span>'+(nu?' <span style="background:#dc2626;color:#fff;border-radius:8px;font-size:9px;font-weight:700;padding:0 5px">new</span>':'')+'<br>'+esc(n.body)+'</div></div>'; }).join(''):'<div class="mut" style="font-size:12px">No timeline entries yet.</div>';
              box.querySelectorAll('.ps-note-read').forEach(function(b){ b.onclick=function(){ postJSON(EP.sampleNoteReadBase+b.dataset.id,{read:true},function(){ var s=(_ppData.samples||[]).filter(function(x){return String(x.id)===String(id);})[0]; if(s&&s.unread_dnb>0)s.unread_dnb--; setSampBadge(); ppSampleTimeline(id); }); }; });
              var _se=box.querySelector('.samp-esc-note'); if(_se)_se.onclick=function(){ var msg=_se.dataset.msg||''; if(!msg)return; if(!confirm('Email this note to the supply planner?'))return; _se.disabled=true; _se.textContent='Sending…';
                postJSON(EP.escalate,{kind:'sample',ref:_se.dataset.ref,message:msg,initiator:'supplier'},function(j){ _se.textContent='✓ Flagged'; if(j&&j.sandbox)alert('Sandbox: no email key configured, nothing sent. On live this routes to the internal recipients in CONFIG ▸ General settings.'); }); };
            }).catch(function(){}); }
          function ppSampleNewForm(){ var box=document.getElementById('samp-newform'); if(box.dataset.open==='1'){box.dataset.open='';box.innerHTML='';return;} box.dataset.open='1';
            var purp=['sales','product','photography','marketing','operations'].map(function(p){return '<label style="margin-right:10px;font-size:11px"><input type="checkbox" class="snf-purpose" value="'+p+'"> '+p+'</label>';}).join('');
            var col={lines:[], dev_samples:[]};   // contents collected before the shipment exists
            box.innerHTML='<div style="border:1px solid #cbd5e1;border-radius:10px;padding:12px;margin-bottom:12px;background:#f8fafc"><div class="tiny" style="font-weight:700;margin-bottom:6px">New sample shipment</div>'
              +'<div style="display:flex;gap:8px;flex-wrap:wrap"><input class="fci txt snf-recipient_company" placeholder="Recipient company" style="width:200px"><input class="fci txt snf-first_name" placeholder="First name" style="width:120px"><input class="fci txt snf-last_name" placeholder="Last name" style="width:120px"><input class="fci txt snf-phone" placeholder="Phone" style="width:140px"></div>'
              +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px"><input class="fci txt snf-address_line1" placeholder="Address line 1" style="width:260px"><input class="fci txt snf-address_line2" placeholder="Line 2" style="width:160px"><input class="fci txt snf-city" placeholder="City" style="width:120px"><input class="fci txt snf-region" placeholder="Region" style="width:100px"><input class="fci txt snf-postcode" placeholder="Postcode" style="width:100px"><input class="fci txt snf-country" placeholder="Country" style="width:80px"></div>'
              +'<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin-top:6px">'
                +'<label style="font-size:11px">Status<br><select class="fci snf-status" style="width:150px;text-align:left">'+PROD_STATUS.map(function(o){return '<option value="'+o[0]+'"'+(o[0]==='not_started'?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select></label>'
                +'<label style="font-size:11px">Expected completion<br><input type="date" class="fci snf-expected" style="width:150px;text-align:left"></label>'
                +'<label style="font-size:11px">Completion required<br><input type="date" class="fci snf-completion" style="width:150px;text-align:left"></label></div>'
              +'<div style="margin-top:6px">'+purp+'</div>'
              +'<div style="margin-top:6px"><textarea class="fci snf-notes" rows="2" placeholder="Notes" style="width:320px;text-align:left"></textarea></div>'
              +'<div style="margin-top:8px;font-weight:700;font-size:12px;color:#64748b">Contents</div><div class="snf-contents" style="margin:3px 0"></div>'
              +'<button class="save-btn snf-addc" style="font-size:11px;background:#2563eb;color:#fff;border-color:#1d4ed8">＋ Add contents</button><div class="snf-picker" style="margin-top:7px"></div>'
              +'<div style="margin-top:10px"><button class="save-btn snf-save" style="background:#16a34a;color:#fff;border-color:#15803d">Create</button> <button class="save-btn snf-cancel">Cancel</button> <span class="snf-msg mut tiny"></span></div></div>';
            function drawContents(){ var el=box.querySelector('.snf-contents');
              var sk=col.lines.map(function(l,ix){return '<div style="display:flex;gap:6px;align-items:center;font-size:12px;padding:1px 0"><b>'+units(l.qty)+'</b> × '+esc(l.sku)+'<a class="snf-rmk" data-i="'+ix+'" style="color:#dc2626;cursor:pointer;margin-left:6px">✕</a></div>';}).join('');
              var dv=col.dev_samples.map(function(d,ix){return '<div style="display:flex;gap:6px;align-items:center;font-size:12px;padding:1px 0"><b>'+units(d.qty)+'</b> × <b style="font-family:ui-monospace,Menlo,monospace">'+esc(d.ref||('#'+d.id))+'</b>'+(d.colour_name?' <span class="mut tiny">'+esc(d.colour_name)+'</span>':'')+'<a class="snf-rmd" data-i="'+ix+'" style="color:#dc2626;cursor:pointer;margin-left:6px">✕</a></div>';}).join('');
              el.innerHTML=(sk||dv)?(sk+dv):'<span class="mut tiny">none yet — use ＋ Add contents</span>';
              el.querySelectorAll('.snf-rmk').forEach(function(a){ a.onclick=function(){ col.lines.splice(+a.dataset.i,1); drawContents(); }; });
              el.querySelectorAll('.snf-rmd').forEach(function(a){ a.onclick=function(){ col.dev_samples.splice(+a.dataset.i,1); drawContents(); }; }); }
            drawContents();
            box.querySelector('.snf-addc').onclick=function(){ var pk=box.querySelector('.snf-picker'); if(pk.style.display==='none'||!pk.innerHTML){ pk.style.display='';
              sampContentsPicker(pk, col, function(devs, skus){ devs.forEach(function(d){ if(!col.dev_samples.some(function(x){return String(x.id)===String(d.id);}))col.dev_samples.push(d); });
                skus.forEach(function(s){ if(!col.lines.some(function(x){return x.sku===s.sku;}))col.lines.push(s); }); drawContents(); }); } else { pk.style.display='none'; pk.innerHTML=''; } };
            box.querySelector('.snf-cancel').onclick=function(){box.dataset.open='';box.innerHTML='';};
            box.querySelector('.snf-save').onclick=function(){ var btn=this, msg=box.querySelector('.snf-msg'); function V(k){var f=box.querySelector('.snf-'+k);return f?f.value.trim():'';}
              var purpose=Array.prototype.map.call(box.querySelectorAll('.snf-purpose:checked'),function(x){return x.value;});
              btn.disabled=true; msg.textContent='Creating…';
              postJSON(EP.sampleCreate,{supplier_name:STATE.supplierName||null,recipient_company:V('recipient_company')||null,first_name:V('first_name')||null,last_name:V('last_name')||null,phone:V('phone')||null,address_line1:V('address_line1')||null,address_line2:V('address_line2')||null,city:V('city')||null,region:V('region')||null,postcode:V('postcode')||null,country:V('country')||null,completion_date_required:V('completion')||null,supplier_expected_completion:V('expected')||null,production_status:V('status')||'not_started',purpose:purpose,notes:V('notes')||null,lines:col.lines,dev_samples:col.dev_samples},function(j){ if(j&&j.error){msg.style.color='#dc2626';msg.textContent=j.error;btn.disabled=false;return;} reload(); }); }; }
          function wireSamples(){
            var nb=document.getElementById('samp-new-btn'); if(nb)nb.onclick=ppSampleNewForm;
            body.querySelectorAll('.ps-filt').forEach(function(p){ p.onclick=function(){ PORTAL_SAMP_F=p.dataset.f; renderPP(); }; });
            var q=body.querySelector('.ps-q'); if(q)q.oninput=debounce(function(){ PORTAL_SAMP_Q=q.value; var foc=document.activeElement===q; renderPP(); if(foc){ var n=body.querySelector('.ps-q'); if(n){ n.focus(); n.setSelectionRange(n.value.length,n.value.length); } } },300);
            body.querySelectorAll('.ps-manage').forEach(function(b){ b.onclick=function(){ var i=b.dataset.i, ex=document.getElementById('ps-exp-'+i), open=ex.style.display!=='none';
              ex.style.display=open?'none':''; b.classList.toggle('open',!open);
              if(!open && !ex.dataset.loaded){ ex.dataset.loaded='1'; var det=ex.querySelector('.ps-det'); var s=(_ppData.samples||[]).filter(function(x){return String(x.id)===String(b.dataset.id);})[0]; if(s){ det.innerHTML=ppSampleCard(s); wireSampleCard(det, s.id); } } }; }); }
          function prodStatusLabel(s){ return {in_development:'In development',approved:'Approved',dropped:'Dropped'}[s]||s; }
          function ppProducts(items){ items=items||[];
            if(!items.length) return '<div class="count" style="padding:16px 2px;text-align:left">No product development items assigned to you yet.</div>';
            var seasons=[]; items.forEach(function(p){ if(p.season&&seasons.indexOf(p.season)<0)seasons.push(p.season); }); seasons.sort();
            var STAT=[['','All'],['in_development','In development'],['approved','Approved'],['dropped','Dropped']];
            return '<div style="font-size:13px;color:#334155;margin-bottom:8px;text-align:left">Product development items Dock &amp; Bay is working on with you — open one to view its details, samples and timeline.</div>'
              +'<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px;text-align:left">'
              +'<span style="display:flex;align-items:center;gap:5px"><span style="color:#64748b;font-size:11px">Season</span><select class="fci pp-prod-season" style="text-align:left"><option value="">All</option>'+seasons.map(function(s){return '<option value="'+esc(s)+'"'+(s===PORTAL_PROD_SEASON?' selected':'')+'>'+esc(s)+'</option>';}).join('')+'</select></span>'
              +'<span style="display:flex;align-items:center;gap:5px"><span style="color:#64748b;font-size:11px">Status</span><select class="fci pp-prod-status" style="text-align:left">'+STAT.map(function(o){return '<option value="'+o[0]+'"'+(o[0]===PORTAL_PROD_STATUS?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select></span>'
              +'<input class="fci txt pp-prod-q" placeholder="search ref / colour / category / supplier…" value="'+esc(PORTAL_PROD_Q||'')+'" style="width:260px;text-align:left">'
              +'<span class="pp-prod-count" style="color:#94a3b8;font-size:11px"></span></div>'
              +'<div id="pp-prod-grid"></div>'; }
          function drawProdGrid(){ var host=document.getElementById('pp-prod-grid'); if(!host)return;
            var items=(_ppData&&_ppData.products)||[]; var q=(PORTAL_PROD_Q||'').toLowerCase();
            var f=items.filter(function(p){ if(PORTAL_PROD_SEASON&&p.season!==PORTAL_PROD_SEASON)return false; if(PORTAL_PROD_STATUS&&p.status!==PORTAL_PROD_STATUS)return false;
              if(q){ var hay=((p.ref||'')+' '+(p.colour_name||'')+' '+(p.category||'')+' '+(p.supplier||'')).toLowerCase(); if(hay.indexOf(q)<0)return false; } return true; });
            var cnt=document.querySelector('.pp-prod-count'); if(cnt)cnt.textContent=f.length+' of '+items.length;
            if(!f.length){ host.innerHTML='<div class="count" style="padding:14px 2px;text-align:left">No items match these filters.</div>'; return; }
            host.innerHTML='<div class="tw"><table class="ppp-tbl"><thead><tr>'+['Product','Category','Season','Sizes','Status'].map(function(h){return '<th>'+h+'</th>';}).join('')+'</tr></thead><tbody>'
              +f.map(function(p,i){ var badge=p.unread_dnb?' <span style="background:#f59e0b;color:#fff;border-radius:8px;font-size:9px;font-weight:700;padding:0 5px">'+p.unread_dnb+'</span>':'';
                var sw=p.has_swatch?'<img src="'+(EP.productSwatchBase||'/api/product/swatch/')+encodeURIComponent(p.ref)+'?t='+encodeURIComponent(p.updated_at||'')+'" style="width:34px;height:34px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;flex:0 0 auto">':'<span style="width:34px;height:34px;border-radius:6px;border:1px dashed #cbd5e1;flex:0 0 auto"></span>';
                return '<tr><td><div style="display:flex;align-items:center;gap:8px">'+sw
                    +'<button class="planbtn pp-prod-open" data-ref="'+esc(p.ref)+'" data-i="'+i+'" style="flex:0 0 auto">PLAN</button>'
                    +'<div style="min-width:0"><b style="font-family:ui-monospace,Menlo,monospace">'+esc(p.ref)+'</b>'+badge+(p.colour_name?'<div style="font-size:10px;color:#94a3b8">'+esc(p.colour_name)+'</div>':'')+'</div></div></td>'
                  +'<td>'+esc(p.category||'')+'</td><td>'+esc(p.season||'')+'</td><td>'+p.sizes+'</td><td>'+esc(prodStatusLabel(p.status))+'</td></tr>'; }).join('')
              +'</tbody></table></div>'
              +'<div id="pp-prod-detail" style="display:none;margin-top:12px;text-align:left;max-width:100%;box-sizing:border-box"></div>';   // detail renders OUTSIDE the scrollable table → fits the phone width
            host.querySelectorAll('.pp-prod-open').forEach(function(b){ b.onclick=function(){ var ref=b.dataset.ref, det=document.getElementById('pp-prod-detail');
              if(det.dataset.ref===ref && det.style.display!=='none'){ det.style.display='none'; det.dataset.ref=''; return; }
              det.dataset.ref=ref; det.style.display=''; ppProdDetail(det, ref); if(det.scrollIntoView)det.scrollIntoView({block:'nearest'}); }; }); }
          function wireProducts(){ var body=document.getElementById('pp-body');
            var ss=body.querySelector('.pp-prod-season'); if(ss)ss.onchange=function(){ PORTAL_PROD_SEASON=ss.value; drawProdGrid(); };
            var st=body.querySelector('.pp-prod-status'); if(st)st.onchange=function(){ PORTAL_PROD_STATUS=st.value; drawProdGrid(); };
            var q=body.querySelector('.pp-prod-q'); if(q)q.oninput=function(){ PORTAL_PROD_Q=q.value; drawProdGrid(); };
            drawProdGrid(); }
          function ppProdDetail(box, ref){ var _it=((_ppData&&_ppData.products)||[]).filter(function(x){return x.ref===ref;})[0]||{}; var _un=Number(_it.unread_dnb)||0;
            var tabs=[['master','Master data'],['samples','Sample'],['documents','Documents'],['timeline','Timeline'+(_un?' <span class="ex-badge">'+_un+'</span>':'')]];
            box.innerHTML='<div class="po-subnav pp-prod-nav">'+tabs.map(function(t,ti){return '<button class="rtab pd2-tab'+(ti===0?' active':'')+'" data-t="'+t[0]+'">'+t[1]+'</button>';}).join('')+'</div><div class="pd2-body"></div>';
            var bd=box.querySelector('.pd2-body');
            function sel(t){ box.querySelectorAll('.pd2-tab').forEach(function(b){ b.classList.toggle('active',b.dataset.t===t); });
              if(t==='timeline')ppProdTimeline(bd,ref); else if(t==='documents')ppProdDocs(bd,ref); else if(t==='master')ppProdMaster(bd,ref); else ppProdSamples(bd,ref); }
            box.querySelectorAll('.pd2-tab').forEach(function(b){ b.onclick=function(){ sel(b.dataset.t); }; }); sel('master'); }
          function ppProdMaster(box, ref){ box.innerHTML='<div class="count" style="text-align:left">Loading…</div>';
            fetch('/api/product/item/'+encodeURIComponent(ref)).then(function(r){return r.json();}).then(function(d){ if(!d||!d.item){ box.innerHTML='<div class="mut" style="text-align:left">Not found.</div>'; return; } var it=d.item;
              function row(l,v){ return '<div style="display:flex;gap:10px;padding:5px 0;border-bottom:1px solid #f4f4f5;text-align:left"><div style="flex:0 0 130px;color:#64748b">'+l+'</div><div style="flex:1;min-width:0">'+v+'</div></div>'; }
              function pFiles(files){ return (files||[]).map(function(f){ var url=(EP.attachImgBase||'/api/supply/portal-attachment/')+f.id, vt=(f.version!=null?'v'+f.version+' ':'');
                return /^image\//i.test(String(f.mime||''))?'<img class="pp-dimimg" data-src="'+url+'" src="'+url+'" style="width:24px;height:24px;object-fit:cover;border-radius:4px;border:1px solid #e5e7eb;margin:1px;cursor:zoom-in;vertical-align:middle" title="'+esc(vt+(f.filename||''))+'">':'<a href="'+url+'" target="_blank" rel="noopener" style="font-size:10px;color:#1d4ed8;margin:0 3px" title="'+esc(f.filename||'')+'">📄'+esc(vt)+'</a>'; }).join(''); }
              function pDimLine(label, sd){ if(!sd.required)return '<div style="color:#94a3b8;font-size:11px;padding:1px 0">'+label+': <span class="mut">not required</span></div>';
                var appr=sd.approval_status||'pending', col=appr==='approved'?'#16a34a':appr==='rejected'?'#dc2626':'#b45309';
                return '<div style="font-size:11px;padding:1px 0">'+label+(sd.description?' <span class="mut">('+esc(sd.description)+')</span>':'')+': <b style="color:'+col+'">'+esc(appr)+'</b> '+pFiles(sd.files)+'</div>'; }
              var sizes=(d.sizes||[]).map(function(s){ function sd(dm){ return ((s.dimensions||[]).filter(function(x){return x.dimension===dm;})[0])||{}; } var pk=sd('packaging'), ok=s.approval_status==='approved';
                return '<div style="border:1px solid #eef2f7;border-radius:7px;padding:7px 10px;margin-bottom:6px">'
                  +'<div><b>'+esc(s.size_label)+'</b> · <span style="color:'+(ok?'#16a34a':s.approval_status==='rejected'?'#dc2626':'#94a3b8')+'">'+esc(s.approval_status)+'</span>'+(s.mapped_sku?' · <b style="font-family:ui-monospace,Menlo,monospace" title="planner SKU">'+esc(s.mapped_sku)+'</b>':'')+'</div>'
                  +pDimLine('Product', sd('product'))
                  +pDimLine('Packaging'+(pk.packaging_type?' ('+esc(pk.packaging_type)+')':''), pk)
                  +pDimLine('Labels/wraps', sd('labels'))
                  +pDimLine('Polybags', sd('polybag'))
                  +pDimLine('Other components', sd('other'))
                  +'</div>'; }).join('')||'<span class="mut">no sizes</span>';
              var sw=it.has_swatch?'<img src="'+(EP.productSwatchBase||'/api/product/swatch/')+encodeURIComponent(ref)+'?t='+encodeURIComponent(it.updated_at||'')+'" style="width:84px;height:84px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb">':'';
              box.innerHTML='<div style="max-width:600px;text-align:left">'+(sw?'<div style="margin-bottom:8px">'+sw+'</div>':'')
                +row('Reference','<b style="font-family:ui-monospace,Menlo,monospace">'+esc(it.ref)+'</b>')+row('Season',esc(it.season||'—'))+row('Category',esc(it.category||'—'))+row('Supplier',esc(it.supplier||'—'))+row('Colour way',esc(it.colour_name||'—'))+row('Status',esc(prodStatusLabel(it.status)))+row('Description','<span style="white-space:pre-wrap">'+esc(it.description||'—')+'</span>')+row('Size variants',sizes)+'</div>';
              box.querySelectorAll('.pp-dimimg').forEach(function(im){ im.onclick=function(){ ppImgZoom(im.dataset.src); }; });
            }).catch(function(e){ box.innerHTML='<div style="color:#dc2626;text-align:left">Failed: '+esc(e&&e.message||e)+'</div>'; }); }
          // Click-to-view image modal (portal). Images pop up; click anywhere to close.
          function ppImgZoom(src){ if(!src)return; var ov=document.createElement('div'); ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:200060;display:flex;align-items:center;justify-content:center;padding:20px;cursor:zoom-out';
            ov.innerHTML='<img src="'+src+'" style="max-width:92vw;max-height:92vh;border-radius:10px;box-shadow:0 12px 46px rgba(0,0,0,.55)">'; ov.onclick=function(){ ov.remove(); }; document.body.appendChild(ov); }
          function isImgMime(m){ return /^image\//i.test(String(m||'')); }
          // One document/photo row: image → thumbnail (click to enlarge) + download; other → download link.
          function docRow(x){ var att=(EP.attachImgBase||'/api/supply/portal-attachment/')+x.id, dl='/api/product/doc/'+x.id, kb=Math.max(1,Math.round((x.byte_size||0)/1024));
            if(isImgMime(x.mime)) return '<div style="display:flex;align-items:center;gap:9px;padding:6px 0;border-bottom:1px solid #f4f4f5"><img class="pp-doc-img" data-src="'+att+'" src="'+att+'" style="width:46px;height:46px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;cursor:zoom-in" title="click to enlarge"><div style="min-width:0"><a href="'+dl+'" style="color:#1d4ed8;text-decoration:underline;word-break:break-word">'+esc(x.filename)+'</a><div class="mut tiny">'+kb+' KB · '+esc(x.uploaded_at||'')+'</div></div></div>';
            return '<div style="padding:6px 0;border-bottom:1px solid #f4f4f5"><a href="'+dl+'" style="color:#1d4ed8;text-decoration:underline;word-break:break-word">'+esc(x.filename)+'</a> <span class="mut tiny">'+kb+' KB · '+esc(x.uploaded_at||'')+'</span></div>'; }
          function ppProdDocs(box, ref){ box.innerHTML='<div class="count" style="text-align:left">Loading…</div>';
            fetch((EP.productItemBase||'/api/product/item/')+encodeURIComponent(ref)).then(function(r){return r.json();}).then(function(d){ var docs=(d&&d.docs)||[];
              var dnb=docs.filter(function(x){return (x.uploader_kind||'internal')!=='supplier';}), sup=docs.filter(function(x){return x.uploader_kind==='supplier';});
              function sect(title,list,empty){ return '<div style="font-weight:700;font-size:12px;margin:0 0 4px;color:#334155">'+title+'</div>'+(list.length?list.map(docRow).join(''):'<div class="mut tiny" style="padding:4px 0">'+empty+'</div>'); }
              box.innerHTML='<div style="max-width:620px;text-align:left">'
                +sect('Uploaded by Dock &amp; Bay',dnb,'None yet.')
                +'<div style="height:14px"></div>'
                +sect('Uploaded by you',sup,'None yet.')
                +'<div style="margin-top:14px;padding-top:10px;border-top:1px dashed #cbd5e1"><label style="font-size:12px;font-weight:600">Upload a document or photo <input type="file" class="pp-doc-file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv" multiple style="font-size:12px;display:block;margin-top:5px"></label><span class="pp-doc-msg" style="font-size:12px;margin-left:2px"></span></div>'
                +'</div>';
              box.querySelectorAll('.pp-doc-img').forEach(function(im){ im.onclick=function(){ ppImgZoom(im.dataset.src); }; });
              var fi=box.querySelector('.pp-doc-file'), msg=box.querySelector('.pp-doc-msg'); if(fi)fi.onchange=function(){ var files=fi.files; if(!files.length)return; msg.style.color='#64748b'; msg.textContent='Uploading…'; var i=0;
                (function up(){ if(i>=files.length){ ppProdDocs(box,ref); return; } var f=files[i++]; if(f.size>10*1024*1024){ up(); return; } var rd=new FileReader(); rd.onload=function(){ postJSON(EP.productDoc,{ref:ref,filename:f.name,mime:f.type||'application/octet-stream',data_base64:String(rd.result)},function(j){ if(j&&j.error){msg.style.color='#dc2626';msg.textContent=j.error;return;} up(); }); }; rd.readAsDataURL(f); })(); };
            }).catch(function(e){ box.innerHTML='<div style="color:#dc2626;text-align:left">Failed: '+esc(e&&e.message||e)+'</div>'; }); }
          // Compact single-label PDF for one sample version: ref (incl _vN), colourway, supplier, date.
          function dlSampleLabel(opts){ try{ opts=opts||{}; var ref=String(opts.ref||''), S=2, W=500, H=320;
            var c=document.createElement('canvas'); c.width=W*S; c.height=H*S; var x=c.getContext('2d'); x.scale(S,S);
            x.fillStyle='#fff'; x.fillRect(0,0,W,H); x.strokeStyle='#0f172a'; x.lineWidth=3; x.strokeRect(10,10,W-20,H-20);
            x.textAlign='left'; x.fillStyle='#0f172a';
            x.font='700 22px system-ui,Arial'; x.fillText('SAMPLE',28,50);
            x.font='700 28px ui-monospace,Menlo,monospace'; x.fillText(ref,28,92);
            x.font='400 17px system-ui,Arial'; var y=134;
            function line(l,v){ if(v==null||v==='')return; x.fillStyle='#64748b'; x.fillText(l,28,y); x.fillStyle='#0f172a'; x.fillText(String(v),160,y); y+=30; }
            line('Colourway',opts.colour); line('Supplier',opts.supplier); line('Date',opts.date);
            x.fillStyle='#94a3b8'; x.font='400 13px system-ui,Arial'; x.fillText('Dock & Bay — product sample',28,H-22);
            c.toBlob(function(b){ if(!b){alert('Could not create label');return;} b.arrayBuffer().then(function(ab){
              var ptW=283, ptH=ptW*(H/W);   // ~100mm wide small label, aspect-preserved (~64mm tall)
              var pdf=pdfSingleImg(new Uint8Array(ab), c.width, c.height, ptW, ptH);
              bcDownloadBlob('sample_'+ref.replace(/[^A-Za-z0-9_-]/g,'_')+'.pdf', new Blob([pdf],{type:'application/pdf'})); }); },'image/jpeg',0.92);
          }catch(e){ alert('Could not create label'); } }
          function ppProdSamples(box, ref){ box.innerHTML='<div class="count" style="text-align:left">Loading…</div>';
            var _it=((_ppData&&_ppData.products)||[]).filter(function(x){return x.ref===ref;})[0]||{};   // colour/supplier for the sample label
            getJSON(EP.productSamplesBase+encodeURIComponent(ref)).then(function(list){ list=Array.isArray(list)?list:[];
              var today=new Date().toISOString().slice(0,10);
              var nextV=list.reduce(function(m,s){return Math.max(m,s.version||0);},0)+1, nextRef=ref+'_v'+nextV;   // shown read-only on the add form
              var rows=list.slice().reverse().map(function(s){ var ph=(s.photos||[]).map(function(p){ var url=(EP.attachImgBase||'/api/supply/portal-attachment/')+p.id;
                  return isImgMime(p.mime)
                    ? '<img class="pp-samp-img" data-src="'+url+'" src="'+url+'" style="width:52px;height:52px;object-fit:cover;border-radius:5px;border:1px solid #e5e7eb;margin:2px;cursor:zoom-in" title="click to enlarge">'
                    : '<a href="'+url+'" target="_blank" rel="noopener" style="display:inline-block;margin:2px;padding:4px 8px;border:1px solid #e5e7eb;border-radius:5px;font-size:11px;color:#1d4ed8;text-decoration:underline">'+esc(p.filename||'file')+'</a>'; }).join('');
                return '<div style="border:1px solid #eef2f7;border-radius:8px;padding:9px 11px;margin-bottom:8px;text-align:left"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><b style="font-family:ui-monospace,Menlo,monospace">'+esc(s.ref)+'</b><span class="mut tiny">'+esc(s.sample_date||'')+'</span>'
                  +'<span style="font-size:10px">'+(s.colour_verified?'<span style="color:#16a34a">✓ colour</span>':'<span class="mut">colour?</span>')+' &nbsp; '+(s.quality_verified?'<span style="color:#16a34a">✓ quality</span>':'<span class="mut">quality?</span>')+'</span>'
                  +'<button class="save-btn pp-samp-label" data-ref="'+esc(s.ref)+'" data-date="'+esc(s.sample_date||'')+'" style="margin-left:auto">⤓ Download label</button></div>'
                  +(s.description?'<div style="margin:4px 0;white-space:pre-wrap">'+esc(s.description)+'</div>':'')
                  +(ph?'<div style="margin-top:4px">'+ph+'</div>':'')
                  +'<div style="margin-top:6px"><label style="font-size:11px;color:#64748b">📎 Upload photo / document <input type="file" class="pp-samp-file" data-id="'+s.id+'" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv" multiple style="font-size:11px;display:inline-block;margin-left:4px"></label> <span class="pp-samp-msg" data-id="'+s.id+'" style="font-size:11px"></span></div>'
                  +((s.shipments||[]).length?'<div style="margin-top:7px;display:flex;flex-direction:column;gap:5px">'+(s.shipments||[]).map(function(sh){return '<div style="padding:6px 9px;background:#f0f6ff;border:1px solid #dbeafe;border-radius:6px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">📦 <b>'+esc(sh.ref)+'</b>'+(sh.carrier?'<span class="mut tiny">'+esc(sh.carrier)+'</span>':'')+(sh.tracking?'<span style="font-size:12px">'+carrierTrackLink(sh.carrier,sh.tracking)+'</span>':'')+'</div>';}).join('')+'<div class="mut tiny">add this sample to a shipment in the <b>Samples</b> tab</div></div>':'')
                  +'</div>'; }).join('')||'<div class="mut" style="padding:4px 0;text-align:left">No sample versions yet.</div>';
              box.innerHTML='<div style="text-align:left"><div style="font-weight:700;font-size:13px;margin-bottom:6px">Sample versions</div>'+rows
                +'<div style="margin-top:8px"><button class="save-btn pp-add-sample" style="background:#16a34a;color:#fff;border-color:#15803d">+ Add sample</button></div>'
                +'<div class="pp-sample-form" style="display:none;border:1px dashed #cbd5e1;border-radius:8px;padding:11px 13px;margin-top:10px;background:#f8fafc">'
                +'<div style="font-weight:700;font-size:12px;margin-bottom:8px">Add a new sample version</div>'
                +'<div style="margin-bottom:8px"><label style="font-size:12px">Reference <input class="fci" value="'+esc(nextRef)+'" readonly style="width:220px;text-align:left;background:#eef2f7;margin-left:4px" title="auto-generated"></label></div>'
                +'<div style="margin-bottom:7px"><label style="font-size:12px">Sample date <input type="date" class="fci ps2-date" value="'+today+'" style="width:150px;text-align:left;margin-left:4px"></label></div>'
                +'<label style="display:block;font-size:12px;margin-bottom:5px;cursor:pointer"><input type="checkbox" class="ps2-col" style="vertical-align:middle;margin-right:6px">I verify that I have colour checked every colour to match Pantone in design</label>'
                +'<label style="display:block;font-size:12px;margin-bottom:7px;cursor:pointer"><input type="checkbox" class="ps2-qual" style="vertical-align:middle;margin-right:6px">I verify I have quality checked sample matches design and quality standards</label>'
                +'<div><label style="font-size:12px;display:block;margin-bottom:2px">Description and notes</label><textarea class="fci ps2-desc" rows="2" placeholder="description and notes…" style="width:320px;max-width:100%;text-align:left;box-sizing:border-box"></textarea></div>'
                +'<div style="margin-top:7px"><label style="font-size:12px">Photos <input type="file" class="ps2-photos" accept="image/*" multiple style="font-size:12px"></label></div>'
                +'<div style="margin-top:9px"><button class="save-btn ps2-save" data-ref="'+esc(ref)+'">Submit sample version</button> <span class="ps2-msg" style="font-size:12px;margin-left:6px"></span></div></div></div>';
              box.querySelectorAll('.pp-samp-label').forEach(function(lb){ lb.onclick=function(){ dlSampleLabel({ref:lb.dataset.ref, date:lb.dataset.date, colour:_it.colour_name||'', supplier:_it.supplier||STATE.supplierName||''}); }; });
              box.querySelectorAll('.pp-samp-img').forEach(function(im){ im.onclick=function(){ ppImgZoom(im.dataset.src); }; });
              box.querySelectorAll('.pp-samp-file').forEach(function(fi){ fi.onchange=function(){ var id=fi.dataset.id, files=fi.files; if(!files.length)return; var msg=box.querySelector('.pp-samp-msg[data-id="'+id+'"]'); if(msg){msg.style.color='#64748b';msg.textContent='Uploading…';} var i=0;
                (function up(){ if(i>=files.length){ ppProdSamples(box,ref); return; } var f=files[i++]; if(f.size>10*1024*1024){ up(); return; } var rd=new FileReader(); rd.onload=function(){ postJSON(EP.productSamplePhoto,{sample_id:id,filename:f.name,mime:f.type||'application/octet-stream',data_base64:String(rd.result)},function(j){ if(j&&j.error){ if(msg){msg.style.color='#dc2626';msg.textContent=j.error;} return; } up(); }); }; rd.readAsDataURL(f); })(); }; });
              var _addb=box.querySelector('.pp-add-sample'), _form=box.querySelector('.pp-sample-form'); if(_addb)_addb.onclick=function(){ _form.style.display=(_form.style.display!=='none')?'none':''; };   // no auto-focus on the date input (it auto-opens the mobile picker); date defaults to today, opens on tap
              var sv=box.querySelector('.ps2-save'); sv.onclick=function(){ var msg=box.querySelector('.ps2-msg');
                var col=box.querySelector('.ps2-col').checked, qual=box.querySelector('.ps2-qual').checked;
                if(!col||!qual){ msg.style.color='#dc2626'; msg.textContent='Please tick both verification boxes.'; return; }
                sv.disabled=true; msg.style.color='#64748b'; msg.textContent='Submitting…';
                postJSON(EP.productSample,{item_ref:ref,sample_date:box.querySelector('.ps2-date').value,colour_verified:true,quality_verified:true,description:box.querySelector('.ps2-desc').value},function(j){ if(j&&j.error){msg.style.color='#dc2626';msg.textContent=j.error;sv.disabled=false;return;}
                  var files=box.querySelector('.ps2-photos').files, i=0;
                  (function up(){ if(i>=files.length){ ppProdSamples(box,ref); return; } var f=files[i++]; if(f.size>10*1024*1024){ up(); return; } var rd=new FileReader(); rd.onload=function(){ postJSON(EP.productSamplePhoto,{sample_id:j.id,filename:f.name,mime:f.type||'image/jpeg',data_base64:String(rd.result)},function(){ up(); }); }; rd.readAsDataURL(f); })(); }); };
            }).catch(function(e){ box.innerHTML='<div style="color:#dc2626;text-align:left">Failed: '+esc(e&&e.message||e)+'</div>'; }); }
          // ── SAMPLE SHIPMENT CONTENTS picker — add product-development samples and/or bulk SKUs ──
          // Renders a rich multi-select (dev samples + SKUs, both with a qty). Calls onAdd(devs, skus) with the
          // NEW selections — devs=[{id,qty}], skus=[{sku,qty}] (qty defaults to 1). The caller persists/merges.
          // `have` = {dev_samples:[], lines:[]} already on the shipment (excluded from the lists).
          function sampContentsPicker(host, have, onAdd){ host.innerHTML='<div class="mut tiny">Loading…</div>';
            var supQ=STATE.supplierName?'&supplier='+encodeURIComponent(STATE.supplierName):'';
            var haveDev={}; ((have&&have.dev_samples)||[]).forEach(function(d){ haveDev[String(d.id)]=1; });
            var haveSku={}; ((have&&have.lines)||[]).forEach(function(l){ haveSku[l.sku]=1; });
            var qcell='style="width:52px;text-align:left" inputmode="numeric" placeholder="qty"';
            getJSON(EP.productOpenSamples+(supQ?'?'+supQ.slice(1):'')).then(function(samples){ samples=(Array.isArray(samples)?samples:[]).filter(function(s){return !haveDev[String(s.id)];});
              host.innerHTML='<div style="border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px;background:#f8fafc;text-align:left">'
                +'<div style="font-weight:700;font-size:12px;margin-bottom:6px">Add contents</div>'
                +'<div style="font-size:11px;color:#64748b;margin-bottom:3px">Product development samples <span class="mut">(products still in development)</span></div>'
                +'<input class="fci ssh-pk-sq" placeholder="filter samples…" style="width:100%;text-align:left;margin-bottom:5px">'
                +'<div class="ssh-pk-slist" style="max-height:150px;overflow:auto;border:1px solid #eef2f7;border-radius:6px;padding:4px 6px;background:#fff">'
                +(samples.length?samples.map(function(s){return '<div class="ssh-pk-srow" data-hay="'+esc(((s.ref||'')+' '+(s.colour_name||'')).toLowerCase())+'" style="display:flex;gap:7px;align-items:center;padding:3px 2px;font-size:12px"><input type="checkbox" class="ssh-pk-scb" value="'+s.id+'" data-ref="'+esc(s.ref)+'" data-colour="'+esc(s.colour_name||'')+'"><b style="font-family:ui-monospace,Menlo,monospace">'+esc(s.ref)+'</b>'+(s.colour_name?'<span class="mut tiny" style="flex:1;min-width:0">'+esc(s.colour_name)+'</span>':'<span style="flex:1"></span>')+'<input class="fci ssh-pk-sqty" data-id="'+s.id+'" '+qcell+'></div>';}).join(''):'<div class="mut tiny" style="padding:4px">no open product samples to add</div>')
                +'</div>'
                +'<div style="font-size:11px;color:#64748b;margin:9px 0 3px">Bulk SKUs <span class="mut">(your products)</span></div>'
                +'<input class="fci ssh-pk-kq" placeholder="search SKU / product / colour / season (e.g. SS27)…" style="width:100%;text-align:left;margin-bottom:5px">'
                +'<div class="ssh-pk-klist" style="max-height:170px;overflow:auto;border:1px solid #eef2f7;border-radius:6px;padding:4px 6px;background:#fff"><div class="mut tiny" style="padding:4px">type to search your SKUs…</div></div>'
                +'<div style="display:flex;gap:6px;align-items:center;margin-top:5px"><input class="fci ssh-pk-free" placeholder="…or type any SKU code" style="flex:1;text-align:left"><input class="fci ssh-pk-freeqty" '+qcell+'></div>'
                +'<div style="margin-top:10px;display:flex;gap:8px;align-items:center"><button class="save-btn ssh-pk-add" style="background:#16a34a;color:#fff;border-color:#15803d">Add selected</button><button class="save-btn ssh-pk-cancel light">Cancel</button><span class="ssh-pk-msg mut tiny"></span></div></div>';
              var sq=host.querySelector('.ssh-pk-sq'); if(sq)sq.oninput=function(){ var q=this.value.toLowerCase(); host.querySelectorAll('.ssh-pk-srow').forEach(function(r){ r.style.display=(!q||r.dataset.hay.indexOf(q)>=0)?'':'none'; }); };
              var kq=host.querySelector('.ssh-pk-kq'), klist=host.querySelector('.ssh-pk-klist'), kt=null;
              function loadSkus(q){ klist.innerHTML='<div class="mut tiny" style="padding:4px">searching…</div>';
                getJSON(EP.productSkus+"?q="+encodeURIComponent(q||"")+supQ).then(function(rows){ rows=(Array.isArray(rows)?rows:[]).filter(function(k){return !haveSku[k.sku];});
                  klist.innerHTML=rows.length?rows.map(function(k){return '<div class="ssh-pk-krow" style="display:flex;gap:7px;align-items:center;padding:3px 2px;font-size:12px"><input type="checkbox" class="ssh-pk-kcb" value="'+esc(k.sku)+'" data-desc="'+esc(k.description||'')+'"><b style="font-family:ui-monospace,Menlo,monospace">'+esc(k.sku)+'</b><span class="mut tiny" style="flex:1;min-width:0">'+esc(k.description||'')+(k.release_window?' · '+esc(k.release_window):'')+'</span><input class="fci ssh-pk-kqty" data-sku="'+esc(k.sku)+'" '+qcell+'></div>';}).join(''):'<div class="mut tiny" style="padding:4px">no matches — use the free-text box below</div>'; }); }
              if(kq)kq.oninput=function(){ var v=this.value; if(kt)clearTimeout(kt); kt=setTimeout(function(){ loadSkus(v); },250); };
              host.querySelector('.ssh-pk-cancel').onclick=function(){ host.style.display='none'; host.innerHTML=''; };
              host.querySelector('.ssh-pk-add').onclick=function(){ var msg=host.querySelector('.ssh-pk-msg');
                function esq(v){ return window.CSS&&CSS.escape?CSS.escape(v):v; }
                var devs=Array.prototype.map.call(host.querySelectorAll('.ssh-pk-scb:checked'),function(c){ var qi=host.querySelector('.ssh-pk-sqty[data-id="'+esq(c.value)+'"]'); return {id:c.value,qty:(qi&&Number(qi.value))||1,ref:c.dataset.ref,colour_name:c.dataset.colour}; });
                var skus=Array.prototype.map.call(host.querySelectorAll('.ssh-pk-kcb:checked'),function(c){ var qi=host.querySelector('.ssh-pk-kqty[data-sku="'+esq(c.value)+'"]'); return {sku:c.value,qty:(qi&&Number(qi.value))||1,description:c.dataset.desc}; });
                var ft=host.querySelector('.ssh-pk-free'), ftq=host.querySelector('.ssh-pk-freeqty');   // free-text SKU (not in the list)
                if(ft&&ft.value.trim()) skus.push({sku:ft.value.trim(),qty:(ftq&&Number(ftq.value))||1,description:''});
                if(!devs.length&&!skus.length){ msg.style.color='#dc2626'; msg.textContent='Select or type at least one item.'; return; }
                host.style.display='none'; host.innerHTML=''; onAdd&&onAdd(devs, skus); };
            }).catch(function(e){ host.innerHTML='<div style="color:#dc2626">Failed: '+esc(e&&e.message||e)+'</div>'; }); }
          function ppProdTimeline(box, ref){ box.innerHTML='<div class="count" style="text-align:left">Loading…</div>';
            fetch(EP.productNotesBase+encodeURIComponent(ref)).then(function(r){return r.json();}).then(function(notes){ shortNotes(notes); notes=Array.isArray(notes)?notes:[];
              var unread=notes.filter(function(n){return n.author_kind==='internal'&&!n.read;}).length;
              var list=(notes.length?tlDesc(notes).map(function(n){ var sup=(n.author_kind!=='internal'); var isNew=(!sup&&!n.read);
                return '<div style="padding:7px 0;border-bottom:1px solid #f1f1f1;text-align:left'+(isNew?';background:#fffbeb':'')+'"><div class="mut tiny">'+esc(n.created_at||'')+' · '+(sup?'you':'Dock &amp; Bay')+(isNew?' <span class="ex-badge">NEW</span>':(!sup?' <span style="color:#94a3b8">· read</span>':''))+'</div><div style="white-space:pre-wrap">'+esc(n.body||'')+'</div></div>'; }).join(''):'<div class="mut" style="padding:6px 0;text-align:left">No messages yet.</div>');
              box.innerHTML='<div style="max-width:640px;text-align:left"><div style="font-weight:700;font-size:13px;margin-bottom:8px">Messages'+(unread?' <span class="ex-badge" title="unread messages from Dock &amp; Bay">'+unread+' unread</span>':' <span class="mut tiny">(all read)</span>')+'</div>'
                +'<div style="display:flex;gap:6px;align-items:flex-start;margin-bottom:10px"><textarea class="fci pp-prod-note" rows="2" placeholder="Add a comment…" style="flex:1;text-align:left"></textarea><button class="save-btn pp-prod-post" data-ref="'+esc(ref)+'">Post</button></div><div>'+list+'</div></div>';
              var it=((_ppData&&_ppData.products)||[]).filter(function(x){return x.ref===ref;})[0];
              if(unread>0){ postJSON(EP.productNotesRead,{ref:ref},function(){ if(it)it.unread_dnb=0; setProdBadge();
                var tb=box.parentNode&&box.parentNode.querySelector('.pd2-tab[data-t="timeline"] .ex-badge'); if(tb&&tb.parentNode)tb.parentNode.removeChild(tb); }); }
              var pb=box.querySelector('.pp-prod-post'); if(pb)pb.onclick=function(){ var v=box.querySelector('.pp-prod-note').value.trim(); if(!v)return; postJSON(EP.productNote,{ref:ref,body:v},function(j){ if(j&&j.error){alert(j.error);return;} ppProdTimeline(box,ref); }); };
            }).catch(function(e){ box.innerHTML='<div style="color:#dc2626;text-align:left">Failed: '+esc(e&&e.message||e)+'</div>'; }); }
          function setProdBadge(){ var t=document.getElementById('pp-prod-tab'); if(t)t.style.display=_ppData&&_ppData.productEnabled?'':'none';
            var n=((_ppData&&_ppData.products)||[]).reduce(function(a,p){return a+(Number(p.unread_dnb)||0);},0);
            var bg=document.getElementById('pp-prod-badge'); if(bg)bg.innerHTML=n?'<span style="background:#dc2626;color:#fff;border-radius:8px;font-size:9px;font-weight:700;padding:0 5px">'+n+'</span>':''; }
          // ---- top-right: unread D&B messages + recent changes -----------------------------------------
          function closeNotif(){ var a=document.getElementById('pp-unread-drop'),b=document.getElementById('pp-recent-drop'); if(a)a.style.display='none'; if(b)b.style.display='none'; }
          function computeUnread(){ var items=[];
            var nb=(_ppData&&_ppData.notesByPo)||{};
            // Only count POs the supplier can actually see. notesByPo is scoped by supplier and includes notes on
            // FUTURE POs, but FUTURE POs are hidden from the portal (and excluded by the unread-messages list) — so a
            // note on one would make the badge say "1" while the Inbox shows "No unread messages". Match the list.
            var poSet={}; ((_ppData&&_ppData.pos)||[]).forEach(function(p){ if(p&&p.po)poSet[p.po]=1; });
            Object.keys(nb).forEach(function(po){ if(!poSet[po])return; var n=(nb[po]||[]).filter(function(x){return x.author_kind==='internal' && !x.read;}).length; if(n>0)items.push({kind:'po',ref:po,n:n,label:'Purchase order '+po}); });
            ((_ppData&&_ppData.shipmentPlan)||[]).forEach(function(s){ if(s.unread_dnb>0)items.push({kind:'shipment',ref:s.shipment_ref,n:s.unread_dnb,label:'Shipment '+(s.shipment_ref||'')}); });
            ((_ppData&&_ppData.samples)||[]).forEach(function(s){ if(s.unread_dnb>0)items.push({kind:'sample',ref:s.ref,n:s.unread_dnb,label:'Sample '+(s.ref||'')}); });
            ((_ppData&&_ppData.products)||[]).forEach(function(pr){ if(pr.unread_dnb>0)items.push({kind:'product',ref:pr.ref,n:pr.unread_dnb,label:'Product '+(pr.ref||'')}); });
            return items; }
          function notifGo(kind,ref){ closeNotif();
            if(kind==='po'){ PORTAL_TAB='pos'; _ppOpenPO=ref; PORTAL_PO_Q=ref; }
            else if(kind==='shipment'){ PORTAL_TAB='shipmentplan'; PORTAL_SP_PO=ref; }
            else if(kind==='sample'){ PORTAL_TAB='samples'; }
            else if(kind==='product'){ PORTAL_TAB='product'; }
            else if(kind==='payments'){ PORTAL_TAB='payments'; }
            renderPP(); }
          function loadRecent(d){ if(!EP.recentActivity){ d.innerHTML='<div style="padding:10px 12px;color:#888;font-size:12px">Not available in preview.</div>'; return; }
            d.innerHTML='<div style="padding:8px 12px;font-weight:700;border-bottom:1px solid #eef2f7;font-size:12px">Recent changes</div><div style="padding:10px 12px;color:#888;font-size:12px">Loading…</div>';
            fetch(EP.recentActivity).then(function(r){return r.json();}).then(function(rows){
              if(!Array.isArray(rows)||!rows.length){ d.innerHTML='<div style="padding:8px 12px;font-weight:700;border-bottom:1px solid #eef2f7;font-size:12px">Recent changes</div><div style="padding:10px 12px;color:#888;font-size:12px">Nothing recent.</div>'; return; }
              var ICO={po_created:'🆕',po_confirmed:'✅',shipment_created:'🚢',payment:'💰',sample_created:'🧪'};
              d.innerHTML='<div style="padding:8px 12px;font-weight:700;border-bottom:1px solid #eef2f7;font-size:12px">Recent changes</div>'
                +rows.map(function(r){ var kind=(r.typ==='payment')?'payments':(r.typ==='sample_created')?'sample':(r.typ==='shipment_created')?'shipment':'po';
                  return '<div class="pp-recent-row" data-kind="'+kind+'" data-ref="'+esc(r.ref||'')+'" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid #f5f5f5;font-size:12px"><div>'+(ICO[r.typ]||'•')+' '+esc(r.label)+'</div><div style="color:#94a3b8;font-size:10px;margin-top:1px">'+esc(r.at||'')+'</div></div>'; }).join('');
              d.querySelectorAll('.pp-recent-row').forEach(function(row){ row.onclick=function(e){ e.stopPropagation(); notifGo(row.dataset.kind, row.dataset.ref); }; });
            }).catch(function(){ d.innerHTML='<div style="padding:10px 12px;color:#dc2626;font-size:12px">Could not load recent changes.</div>'; }); }
          // Inbox drawer: fetch the actual UNREAD Dock & Bay messages (body, sender, date/time, clickable ref +
          // Mark as read). fmtDT: 'YYYY-MM-DD HH:MI' → 'dd-mmm-yy HH:MM'. shortAuthor: ben@dockandbay.com → ben@.
          function fmtDT(at){ if(!at)return ''; var t=String(at).slice(11,16); return fd(at)+(t?(' '+t):''); }
          function shortAuthor(e){ e=String(e||'').trim(); return e?e.replace(/@dockandbay\.com\b/i,'@'):'Dock & Bay'; }
          var UNREAD_LBL={po:'Purchase order',shipment:'Shipment',sample:'Sample',product:'Product'};
          function unreadMarkRead(type,ref,noteId,cb){ var url,body;
            if(type==='po'){ url=EP.noteReadBase&&(EP.noteReadBase+encodeURIComponent(noteId)); body={read:true}; }
            else if(type==='sample'){ url=EP.sampleNoteReadBase&&(EP.sampleNoteReadBase+encodeURIComponent(noteId)); body={read:true}; }
            else if(type==='shipment'){ url=EP.shipmentNotesRead; body={shipment_ref:ref}; }
            else if(type==='product'){ url=EP.productNotesRead; body={ref:ref}; }
            if(!url){ if(cb)cb(); return; }
            postJSON(url,body,function(){ var D=_ppData||{};   // keep the ✉ badge honest without a full bootstrap refetch
              if(type==='po'){ ((D.notesByPo||{})[ref]||[]).forEach(function(x){ if(String(x.id)===String(noteId))x.read=true; }); }
              else if(type==='shipment'){ (D.shipmentPlan||[]).forEach(function(s){ if(s.shipment_ref===ref)s.unread_dnb=0; }); }
              else if(type==='sample'){ (D.samples||[]).forEach(function(s){ if(s.ref===ref)s.unread_dnb=Math.max(0,(Number(s.unread_dnb)||0)-1); }); }
              else if(type==='product'){ (D.products||[]).forEach(function(p){ if(p.ref===ref)p.unread_dnb=0; }); }
              try{ setSampBadge();setPosBadge();setShipBadge();setProdBadge(); }catch(e){}
              if(cb)cb(); }); }
          function loadUnread(d){ if(!d)return;
            var hdr='<div style="padding:8px 12px;font-weight:700;border-bottom:1px solid #eef2f7;font-size:12px">Unread messages from Dock &amp; Bay</div>';
            if(!EP.unreadMessages){ d.innerHTML=hdr+'<div style="padding:10px 12px;color:#888;font-size:12px">Not available in preview.</div>'; return; }
            d.innerHTML=hdr+'<div style="padding:10px 12px;color:#888;font-size:12px">Loading…</div>';
            fetch(EP.unreadMessages).then(function(r){return r.json();}).then(function(rows){
              if(!Array.isArray(rows)||!rows.length){ d.innerHTML=hdr+'<div style="padding:10px 12px;color:#888;font-size:12px">No unread messages.</div>'; return; }
              d.innerHTML=hdr+rows.map(function(m){ var body=String(m.body||''); if(body.length>240)body=body.slice(0,240)+'…';
                return '<div style="padding:8px 12px;border-bottom:1px solid #f5f5f5;font-size:12px">'
                  +'<div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline">'
                    +'<a class="pp-un-go" data-kind="'+esc(m.type)+'" data-ref="'+esc(m.ref||'')+'" style="color:#2563eb;text-decoration:underline;cursor:pointer;font-weight:600">'+esc((UNREAD_LBL[m.type]||'')+' '+(m.ref||''))+'</a>'
                    +'<span style="color:#94a3b8;font-size:10px;white-space:nowrap">'+esc(fmtDT(m.at))+'</span></div>'
                  +'<div style="color:#475569;font-size:10px;margin:1px 0 2px">from '+esc(shortAuthor(m.author))+'</div>'
                  +'<div style="color:#1f2937;white-space:pre-wrap;word-break:break-word">'+esc(body)+'</div>'
                  +'<div style="margin-top:4px"><button class="pp-un-read save-btn light" data-type="'+esc(m.type)+'" data-ref="'+esc(m.ref||'')+'" data-id="'+esc(String(m.note_id))+'" style="font-size:10px">Mark as read</button></div>'
                  +'</div>'; }).join('');
              d.querySelectorAll('.pp-un-go').forEach(function(a){ a.onclick=function(e){ e.stopPropagation(); notifGo(a.dataset.kind, a.dataset.ref); }; });
              d.querySelectorAll('.pp-un-read').forEach(function(bn){ bn.onclick=function(e){ e.stopPropagation(); bn.disabled=true; bn.textContent='…';
                unreadMarkRead(bn.dataset.type, bn.dataset.ref, bn.dataset.id, function(){ renderPortalNotif(); loadUnread(d); }); }; });
            }).catch(function(){ d.innerHTML=hdr+'<div style="padding:10px 12px;color:#dc2626;font-size:12px">Could not load messages.</div>'; }); }
          function renderPortalNotif(){ var wrap=document.getElementById('pp-notif'); if(!wrap)return; wrap.style.display='inline-flex';
            var items=computeUnread(), total=items.reduce(function(t,x){return t+x.n;},0);
            var nEl=document.getElementById('pp-unread-n'); if(nEl)nEl.textContent=total;
            var ub=document.getElementById('pp-unread-btn'); if(ub){ ub.style.background=total>0?'#fef2f2':''; ub.style.borderColor=total>0?'#fca5a5':''; ub.style.color=total>0?'#b91c1c':''; }
            var ud=document.getElementById('pp-unread-drop');
            if(ud && ud.style.display!=='none') loadUnread(ud);   // an already-open Inbox stays fresh; otherwise it loads on open
            if(!wrap._wired){ wrap._wired=1;
              document.getElementById('pp-unread-btn').onclick=function(e){ e.stopPropagation(); var d=document.getElementById('pp-unread-drop'), r=document.getElementById('pp-recent-drop'); if(r)r.style.display='none'; if(d.style.display!=='none'){ d.style.display='none'; return; } d.style.display='block'; loadUnread(d); };
              document.getElementById('pp-recent-btn').onclick=function(e){ e.stopPropagation(); var d=document.getElementById('pp-recent-drop'), u=document.getElementById('pp-unread-drop'); if(u)u.style.display='none'; if(d.style.display!=='none'){ d.style.display='none'; return; } d.style.display='block'; loadRecent(d); };
              document.getElementById('pp-unread-drop').onclick=function(e){ e.stopPropagation(); };
              document.getElementById('pp-recent-drop').onclick=function(e){ e.stopPropagation(); };
              document.addEventListener('click', closeNotif); } }
          function renderPP(){ if(!_ppData)return; var body=document.getElementById('pp-body');
            tabsEl.querySelectorAll('.rtab').forEach(function(t){t.classList.toggle('active',t.dataset.pt===PORTAL_TAB);});
            setSampBadge(); setPosBadge(); setShipBadge(); setProdBadge(); try{ renderPortalNotif(); }catch(e){}
            if(PORTAL_TAB==='product'){ body.innerHTML=ppProducts(_ppData.products||[]); wireProducts(); return; }
            if(PORTAL_TAB==='samples'){ body.innerHTML=ppSamples(_ppData.samples||[]); wireSamples(); return; }
            if(PORTAL_TAB==='shipmentplan'){
              var today=new Date().toISOString().slice(0,10);
              var allSp=_ppData.shipmentPlan||[];
              // a shipment has "shipped" once it has a departure date that has passed
              function spShipped(s){ return (String(s.status||'').toLowerCase()==='shipping') || !!(s.departure && !s.departure_est && s.departure<=today); }
              var poq=effQ(PORTAL_SP_PO);
              var _ctrySel=Object.keys(PORTAL_SP_CTRY).filter(function(k){return PORTAL_SP_CTRY[k];});
              var _allCtrys=(function(){ var s={}; allSp.forEach(function(x){ var c=(x.country||'').toUpperCase(); if(c)s[c]=1; }); return Object.keys(s).sort(); })();
              var shownSp=allSp.filter(function(s){
                // a PO/shipment search OVERRIDES the filter pills — find it whatever its status / escalation
                if(poq) return nrm(s.master_po).indexOf(poq)>=0 || nrm(s.shipment_ref).indexOf(poq)>=0 || (s.members||[]).some(function(m){return nrm(m.po).indexOf(poq)>=0;});
                if(PORTAL_SP_FOB && !s.is_fob)return false;
                if(_ctrySel.length && _ctrySel.indexOf((s.country||'').toUpperCase())<0)return false;
                if(PORTAL_SP_ESC && !s.escalated)return false;
                var shipped=spShipped(s); if(shipped?!PORTAL_SP_SHIPPED:!PORTAL_SP_ACTIVE)return false;
                return true; });
              var spCapped=(!_ppShowAllSP && shownSp.length>PP_CAP), spRender=spCapped?shownSp.slice(0,PP_CAP):shownSp;
              var fbar='<div class="bar" style="gap:8px;flex-wrap:wrap;align-items:center">'
                +'<input class="fci sp-po-q" placeholder="search PO…" value="'+esc(PORTAL_SP_PO)+'" style="width:150px;text-align:left">'
                +'<span class="pill'+(PORTAL_SP_ACTIVE?' active':'')+'" data-spf="active">Still to ship</span>'
                +'<span class="pill'+(PORTAL_SP_SHIPPED?' active':'')+'" data-spf="shipped">Shipped</span>'
                +'<span class="pill'+(PORTAL_SP_ESC?' active':'')+'" data-spf="esc" style="'+(PORTAL_SP_ESC?'background:#dc2626;color:#fff;border-color:#dc2626':'color:#dc2626')+'">⚑ Escalated only</span>'
                +'<span class="pill'+(PORTAL_SP_FOB?' active':'')+'" data-spf="fob">📦 FOB</span>'
                +(_allCtrys.length?'<span class="mut tiny" style="margin-left:6px">Destination</span>'+_allCtrys.map(function(c){return '<span class="pill'+(PORTAL_SP_CTRY[c]?' active':'')+'" data-spctry="'+esc(c)+'">'+esc(c)+'</span>';}).join(''):'')
                +'<span class="mut tiny" style="margin-left:auto">'+(spCapped?spRender.length+' of ':'')+shownSp.length+' of '+allSp.length+' shipments &amp; FOB collections</span></div>';
              body.innerHTML=fbar+ppShipmentPlan(spRender)
                +(spCapped?'<div style="margin:8px 0;text-align:center"><button class="save-btn sp-showall">Show all '+shownSp.length+' &darr;</button></div>':'');
              var spsa=body.querySelector('.sp-showall'); if(spsa)spsa.onclick=function(){ _ppShowAllSP=true; renderPP(); };
              // collapse each Shipment Plan card behind its header — click the header (not the buttons/fields) to expand
              body.querySelectorAll('.sp-card .sp-head').forEach(function(h){ h.onclick=function(e){ if(e.target.closest('button,input,textarea,select,a'))return;
                var card=h.closest('.sp-card'), bd=card&&card.querySelector('.sp-body'), tg=h.querySelector('.sp-toggle'); if(!bd)return;
                var open=bd.style.display!=='none'; bd.style.display=open?'none':''; if(tg)tg.textContent=open?'▸':'▾'; }; });
              body.querySelectorAll('.pp-esc').forEach(function(b){ b.onclick=function(){ var on=b.dataset.on!=='1'; postJSON(EP.shipmentEscalate+encodeURIComponent(b.dataset.ref)+'/escalate',{escalated:on},function(){ reload(); }); }; });
              body.querySelectorAll('.pill[data-spf]').forEach(function(p){ p.onclick=function(){ var f=p.dataset.spf;
                if(f==='active')PORTAL_SP_ACTIVE=!PORTAL_SP_ACTIVE; else if(f==='shipped')PORTAL_SP_SHIPPED=!PORTAL_SP_SHIPPED; else if(f==='esc')PORTAL_SP_ESC=!PORTAL_SP_ESC; else if(f==='fob')PORTAL_SP_FOB=!PORTAL_SP_FOB; _ppShowAllSP=false; renderPP(); }; });
              body.querySelectorAll('.pill[data-spctry]').forEach(function(p){ p.onclick=function(){ var c=p.dataset.spctry; PORTAL_SP_CTRY[c]=!PORTAL_SP_CTRY[c]; _ppShowAllSP=false; renderPP(); }; });
              body.querySelectorAll('.pp-go-po').forEach(function(b){ b.onclick=function(e){ e.stopPropagation(); PORTAL_TAB='pos'; PORTAL_PO_Q=b.dataset.po; _ppOpenPO=b.dataset.po; renderPP(); }; });
              var sq=body.querySelector('.sp-po-q'); if(sq)sq.oninput=debounce(function(){ PORTAL_SP_PO=sq.value; _ppShowAllSP=false; var f=document.activeElement===sq; renderPP(); if(f){ var n=body.querySelector('.sp-po-q'); if(n){ n.focus(); n.setSelectionRange(n.value.length,n.value.length); } } },350);
              // FOB cards: production end date → submit for D&B approval (completion_date, applies to end_production_overide)
              var _sid=(_ppData&&_ppData.sid)||sid||null;
              body.querySelectorAll('.sp-fob-cd').forEach(function(inp){ var t;
                inp.onclick=function(){ try{ if(inp.showPicker)inp.showPicker(); }catch(e){} };
                inp.onchange=function(){ var v=inp.value; if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return; clearTimeout(t); inp.style.borderColor='#f59e0b';
                  t=setTimeout(function(){ postJSON(EP.submit,{po:inp.dataset.po,supplier_id:_sid,submitted_by:by,completion_date:v},function(){ inp.style.borderColor='#16a34a';
                    (_ppData.subsByPo=_ppData.subsByPo||{}); (_ppData.subsByPo[inp.dataset.po]=_ppData.subsByPo[inp.dataset.po]||[]).push({kind:'completion_date',value:v,status:'pending'}); }); },800); }; });
              // FOB cards: escalate the ORDER (no shipment record) to Dock & Bay by email
              body.querySelectorAll('.sp-esc-fob').forEach(function(btn){ btn.onclick=function(){ if(!confirm('Escalate this shipment to Dock & Bay by email?'))return; var po=btn.dataset.po;
                var msg='Escalation requested for '+po;
                btn.disabled=true; btn.textContent='Sending…';
                postJSON(EP.escalate,{kind:'po',ref:po,message:msg,initiator:'supplier',post_note:true},function(j){ btn.textContent='✓ Escalated';
                  var noteBody=(by||'The supplier')+' escalated this shipment';   // mirror the note the server posted so the timeline shows it
                  (_ppData.notesByPo=_ppData.notesByPo||{}); (_ppData.notesByPo[po]=_ppData.notesByPo[po]||[]).push({po:po,author_kind:'supplier',body:noteBody,created_at:new Date().toISOString().slice(0,16).replace('T',' ')});
                  var box=body.querySelector('.sp-fob-tl[data-po="'+(window.CSS&&CSS.escape?CSS.escape(po):po)+'"]'); if(box)box.innerHTML=fobTLHtml(po);
                  if(j&&j.sandbox)alert('Sandbox: no email key configured, nothing sent. On live this routes to the internal recipients in CONFIG ▸ General settings.'); }); }; });
              // FOB cards: timeline note → PO note (author supplier)
              body.querySelectorAll('.sp-fob-note-post').forEach(function(btn){ btn.onclick=function(){ var po=btn.dataset.po, ta=body.querySelector('.sp-fob-note-body[data-po="'+(window.CSS&&CSS.escape?CSS.escape(po):po)+'"]'); var v=ta?(ta.value||'').trim():''; if(!v)return; btn.disabled=true;
                postJSON(EP.note,{po:po,supplier_id:_sid,body:v,author_kind:'supplier',author_email:by},function(){ btn.disabled=false;
                  (_ppData.notesByPo=_ppData.notesByPo||{}); (_ppData.notesByPo[po]=_ppData.notesByPo[po]||[]).push({po:po,author_kind:'supplier',body:v,created_at:new Date().toISOString().slice(0,16).replace('T',' ')});
                  if(ta)ta.value=''; var box=body.querySelector('.sp-fob-tl[data-po="'+(window.CSS&&CSS.escape?CSS.escape(po):po)+'"]'); if(box)box.innerHTML=fobTLHtml(po); }); }; });
              // Real shipments: supplier edits carrier / tracking / ship date / status → direct write to the shipment
              var _rfEsc=function(r){ return window.CSS&&CSS.escape?CSS.escape(r):r; };
              var chgRow=function(c){ var t=(Number(c.freight_cost)||0)+(Number(c.product_cost)||0); return '<div class="tiny" style="margin:2px 0">'+chgChip(c.status)+' &nbsp;'+money(t)+(c.description?' · '+esc(c.description):'')+'</div>'; };
              function loadShipCharges(el){ if(!el||el.dataset.loaded)return; el.dataset.loaded='1'; var ref=el.dataset.ref;
                fetch(EP.shipmentChargesBase+encodeURIComponent(ref)).then(function(r){return r.json();}).then(function(cs){
                  el.innerHTML=(Array.isArray(cs)&&cs.length)?cs.map(chgRow).join(''):'<span class="mut tiny">No charges yet.</span>'; }).catch(function(){ el.innerHTML='<span class="mut tiny">—</span>'; }); }
              // recolor the status dropdown live — orange = Planned, green = Shipping
              body.querySelectorAll('.sp-e-status').forEach(function(sel){ sel.onchange=function(){ var sh=sel.value==='Shipping';
                sel.style.background=sh?'#dcfce7':'#ffedd5'; sel.style.color=sh?'#15803d':'#9a3412'; sel.style.borderColor=sh?'#86efac':'#fdba74'; }; });
              body.querySelectorAll('.sp-ship-save').forEach(function(btn){ btn.onclick=function(){ var ref=btn.dataset.ref;
                var g=function(cls){ var el=body.querySelector('.'+cls+'[data-ref="'+_rfEsc(ref)+'"]'); return el?el.value:''; };
                var stEl=body.querySelector('.sp-e-status[data-ref="'+_rfEsc(ref)+'"]');   // absent when D&B has marked it Completed
                var payload={ carrier:g('sp-e-carrier'), carrier_ref:g('sp-e-trk'), departure_date:g('sp-e-date') };
                if(stEl)payload.status=stEl.value;
                btn.disabled=true; var ot=btn.textContent; btn.textContent='Saving…';
                postJSON(EP.shipmentUpdate+encodeURIComponent(ref),payload,function(j){ btn.disabled=false;
                  if(j&&j.error){ btn.textContent=ot; alert('Failed: '+j.error); return; }
                  btn.textContent='✓ Saved'; setTimeout(function(){ btn.textContent=ot; },1500);
                  var ent=(_ppData.shipmentPlan||[]).filter(function(x){return x.shipment_ref===ref;})[0];
                  if(ent){ ent.carrier=payload.carrier; ent.carrier_ref=payload.carrier_ref; ent.departure=payload.departure_date; if(stEl)ent.status=payload.status; }
                  if(j&&j.date_note&&typeof ppShipTimeline==='function')ppShipTimeline(ref);   // show the "set ship date" note
                  // Shipping advances the POs on board (status + production_status 'shipped' + completion date).
                  // Refresh _ppData SILENTLY (no Loading… flash / no view reset) so the PO tab reflects it next view.
                  if(stEl&&stEl.value==='Shipping'){ opts.getData().then(function(d){ if(d){ if(d.notesByPo)Object.keys(d.notesByPo).forEach(function(k){ shortNotes(d.notesByPo[k]); }); _ppData=d; } }).catch(function(){}); }
                }); }; });
              body.querySelectorAll('.sp-chg-go').forEach(function(btn){ btn.onclick=function(){ var ref=btn.dataset.ref;
                var cEl=body.querySelector('.sp-chg-cost[data-ref="'+_rfEsc(ref)+'"]'), dEl=body.querySelector('.sp-chg-desc[data-ref="'+_rfEsc(ref)+'"]');
                var fc=Number(cEl&&cEl.value)||0; if(fc<=0){ alert('Enter a freight cost greater than 0.'); return; }
                btn.disabled=true; postJSON(EP.shipmentCharge,{shipment_ref:ref,freight_cost:fc,description:(dEl&&dEl.value)||null},function(j){ btn.disabled=false;
                  if(j&&j.error){ alert('Failed: '+j.error); return; }
                  if(cEl)cEl.value=''; if(dEl)dEl.value='';
                  var list=body.querySelector('.sp-chg-list[data-ref="'+_rfEsc(ref)+'"]'); if(list){ list.dataset.loaded=''; loadShipCharges(list); } }); }; });
              // lazy-load a card's freight charges the first time it is expanded
              body.querySelectorAll('.sp-card .sp-head').forEach(function(h){ var prev=h.onclick; h.addEventListener('click',function(e){ if(e.target.closest('button,input,textarea,select,a'))return;
                var card=h.closest('.sp-card'), bd=card&&card.querySelector('.sp-body'); if(bd&&bd.style.display!=='none'){ var el=card.querySelector('.sp-chg-list'); if(el)loadShipCharges(el); } }); });
              // Direct-to-Client label downloads on shipment-plan cards (Ships-With shipment labels + crossdock)
              body.querySelectorAll('.sp-shiplabel').forEach(function(btn){ btn.onclick=function(){ dlShipsWith(btn.dataset.po, btn, EP.shipsWith); }; });
              body.querySelectorAll('.sp-cd').forEach(function(btn){ btn.onclick=function(){ if(BC.placeholder){BC.note();return;} btn.disabled=true;
                fetch(EP.labelData+'?skus='+encodeURIComponent(btn.dataset.skus)).then(function(r){return r.json();}).then(function(rows){ btn.disabled=false; if(!rows||!rows.length||rows.error){alert('No crossdock barcodes found');return;}
                  BC.crossdock(rows,btn.dataset.po,btn.dataset.do,btn.dataset.client,btn.dataset.address,btn,btn.dataset.po+'_crossdock_labels.zip'); }).catch(function(){alert('Could not load crossdock labels');btn.disabled=false;}); }; });
              spRender.forEach(function(s){ if(!s.is_fob) ppShipTimeline(s.shipment_ref); }); return; }
            if(PORTAL_TAB==='deposits'){ body.innerHTML=ppDeposits(_ppData.sdep); return; }
            if(PORTAL_TAB==='payments'){ body.innerHTML=ppPayments(_ppData.payments||[]);
              body.querySelectorAll('.pay-head').forEach(function(h){ h.onclick=function(){ var c=h.closest('.sp-card'), bd=c&&c.querySelector('.pay-body'), tg=h.querySelector('.pay-toggle'); if(!bd)return; var open=bd.style.display!=='none'; bd.style.display=open?'none':''; if(tg)tg.textContent=open?'▸':'▾'; }; });
              return; }
            if(PORTAL_TAB==='productions'){ body.innerHTML=ppProductions();
              var pb=body.querySelector('.pv-prod-batch'); if(pb)pb.onchange=function(){ PORTAL_PROD_BATCH=this.value; renderPP(); };
              var pdl=body.querySelector('.pv-prod-dl'); if(pdl)pdl.onclick=function(){ downloadProductionPlan(); };
              var bcBtn=body.querySelector('.pv-bc-dl'), bcMenu=body.querySelector('.pv-bc-menu');
              if(bcBtn&&bcMenu){ bcBtn.onclick=function(e){ e.stopPropagation(); bcMenu.style.display=(bcMenu.style.display==='none'?'':'none'); };
                document.addEventListener('click',function(){ if(bcMenu)bcMenu.style.display='none'; });
                bcMenu.querySelectorAll('.pv-bc-opt').forEach(function(o){ o.onclick=function(e){ e.stopPropagation(); bcMenu.style.display='none'; prodBatchBarcodeDl(o.dataset.k, bcBtn); }; }); }
              return; }
            if(PORTAL_TAB==='barcodes'){
              // batches on this supplier's POs (distinct batch_id, sorted)
              var bseen={}, batches=[]; _ppData.pos.forEach(function(p){ var b=(p.batch_id==null?'':String(p.batch_id)).trim(); if(b&&!bseen[b]){bseen[b]=1;batches.push(b);} });
              batches.sort();
              if(PORTAL_BC_BATCH && batches.indexOf(PORTAL_BC_BATCH)<0)PORTAL_BC_BATCH='';   // batch no longer present
              var picked=!!PORTAL_BC_BATCH, dis=picked?'':' disabled';
              var note='<div style="margin:0 0 12px;padding:9px 12px;border-radius:6px;font-size:12px;background:#fef3c7;border:1px solid #fcd34d">'
                +'⚠ <b>If a product is missing from a batch, amend the relevant purchase orders&rsquo; &ldquo;Order Plan&rdquo;.</b> Once approved, the product barcode can be downloaded in this batch.</div>';
              var picker='<div class="bar" style="gap:8px;flex-wrap:wrap;align-items:center">'
                +'<span class="pill-lbl">Batch</span>'
                +'<select class="fci pp-bc-batch" style="width:auto;min-width:150px;max-width:240px;text-align:left"><option value="">Select a batch…</option>'
                +batches.map(function(b){return '<option'+(b===PORTAL_BC_BATCH?' selected':'')+'>'+esc(b)+'</option>';}).join('')+'</select>'
                +'<button class="save-btn pp-bc-dl-prod"'+dis+'>⤓ Download product barcodes</button>'
                +'<button class="save-btn pp-bc-dl-carton"'+dis+'>⤓ Download carton barcodes</button>'
                +'<button class="save-btn pp-bc-dl-inner"'+dis+'>⤓ Download inner barcodes</button></div>';
              var help = batches.length ? (picked
                  ? '<div class="count" style="margin:2px 0 8px">Barcodes cover every product on your order-plan lines for POs in batch <b>'+esc(PORTAL_BC_BATCH)+'</b>.</div>'
                  : '<div class="count" style="margin:2px 0 8px">Select a batch to enable the downloads.</div>')
                : '<div class="count" style="margin:2px 0 8px">No batches are assigned to your purchase orders yet.</div>';
              // when a batch is picked: a filter box + a per-SKU list (picture · SKU · barcode numbers · per-SKU download)
              var listBlock = picked
                ? '<div class="bar" style="gap:8px;margin:10px 0 4px;align-items:center"><span class="pill-lbl">Filter</span>'
                  +'<input class="fci pp-bc-q" placeholder="search SKU / name…" value="'+esc(PORTAL_BC_Q)+'" style="width:240px;text-align:left"></div>'
                  +'<div id="pp-bc-list"><div class="count">Loading…</div></div>'
                : '';
              body.innerHTML=note+picker+help+listBlock;
              var bsel=body.querySelector('.pp-bc-batch'); if(bsel)bsel.onchange=function(){ PORTAL_BC_BATCH=this.value; PORTAL_BC_Q=''; renderPP(); };
              function bcBatchDl(kind,btn){ if(!PORTAL_BC_BATCH)return; if(BC.placeholder){BC.note();return;} btn.disabled=true;
                fetch(EP.labelData+'?batch='+encodeURIComponent(PORTAL_BC_BATCH)+'&supplier='+encodeURIComponent(STATE.supplierName)).then(function(r){return r.json();}).then(function(rows){ btn.disabled=false;
                  if(rows&&rows.error){alert(rows.error);return;} if(!rows||!rows.length){alert('No '+kind+' barcodes found for batch '+PORTAL_BC_BATCH);return;}
                  BC.sheets(rows,[kind],'batch_'+PORTAL_BC_BATCH+'_'+kind+'_barcodes.zip',btn); }).catch(function(){alert('Could not load barcodes');btn.disabled=false;}); }
              var bp=body.querySelector('.pp-bc-dl-prod'); if(bp)bp.onclick=function(){ bcBatchDl('product',bp); };
              var bc=body.querySelector('.pp-bc-dl-carton'); if(bc)bc.onclick=function(){ bcBatchDl('carton',bc); };
              var bi=body.querySelector('.pp-bc-dl-inner'); if(bi)bi.onclick=function(){ bcBatchDl('inner',bi); };
              if(picked){
                var _bkey='__'+PORTAL_BC_BATCH;
                function renderBcList(rows){ var listEl=body.querySelector('#pp-bc-list'); if(!listEl)return;
                  if(!rows.length){ listEl.innerHTML='<div class="count">No barcodes found for this batch.</div>'; return; }
                  var q=(PORTAL_BC_Q||'').trim().toLowerCase();
                  var f=q?rows.filter(function(r){ return (String(r.sku||'')+' '+String(r.barcode_sku_name||r.product_name||'')).toLowerCase().indexOf(q)>=0; }):rows;
                  var bySku={}; rows.forEach(function(r){ bySku[r.sku]=r; }); listEl._bySku=bySku;
                  if(!f.length){ listEl.innerHTML='<div class="count">No SKUs match &ldquo;'+esc(PORTAL_BC_Q)+'&rdquo;.</div>'; return; }
                  var mono='font-family:ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap';
                  listEl.innerHTML='<div class="count" style="margin:0 0 4px">'+f.length+' of '+rows.length+' SKUs</div>'
                    +'<div class="tw"><table style="font-size:11px;width:auto"><thead><tr><th class="l"></th><th class="l">SKU</th><th class="l">Product barcode</th><th class="l">Carton barcode</th><th class="l">Inner barcode</th><th class="l">Download</th></tr></thead><tbody>'
                    +f.map(function(r){ return '<tr><td class="l">'+(r.swatch_url?'<img src="'+esc(r.swatch_url)+'" loading="lazy" style="width:36px;height:36px;object-fit:cover;border-radius:4px;vertical-align:middle">':'')+'</td>'
                      +'<td class="l" style="white-space:nowrap"><b>'+esc(r.sku||'')+'</b>'+((r.barcode_sku_name||r.product_name)?'<div class="mut tiny" style="white-space:normal;max-width:220px">'+esc(r.barcode_sku_name||r.product_name)+'</div>':'')+'</td>'
                      +'<td class="l" style="'+mono+'">'+(r.product_barcode?esc(r.product_barcode):'<span class="mut">—</span>')+'</td>'
                      +'<td class="l" style="'+mono+'">'+(r.carton_barcode?esc(r.carton_barcode):'<span class="mut">—</span>')+'</td>'
                      +'<td class="l" style="'+mono+'">'+(r.inner_barcode?esc(r.inner_barcode):'<span class="mut">—</span>')+'</td>'
                      +'<td class="l" style="white-space:nowrap">'
                        +(r.product_barcode?'<button class="save-btn light pp-bc-one" data-sku="'+esc(r.sku)+'" data-kind="product">⤓ Product</button> ':'')
                        +(r.carton_barcode?'<button class="save-btn light pp-bc-one" data-sku="'+esc(r.sku)+'" data-kind="carton">⤓ Carton</button> ':'')
                        +(r.inner_barcode?'<button class="save-btn light pp-bc-one" data-sku="'+esc(r.sku)+'" data-kind="inner">⤓ Inner</button>':'')
                      +'</td></tr>'; }).join('')
                    +'</tbody></table></div>';
                  listEl.querySelectorAll('.pp-bc-one').forEach(function(btn){ btn.onclick=function(){ if(BC.placeholder){BC.note();return;} var r=listEl._bySku[btn.dataset.sku]; if(!r)return; var kind=btn.dataset.kind; BC.sheets([r],[kind], r.sku+'_'+kind+'_barcode.zip', btn); }; });
                }
                if(_bcRowsCache[_bkey]) renderBcList(_bcRowsCache[_bkey]);
                else fetch(EP.labelData+'?batch='+encodeURIComponent(PORTAL_BC_BATCH)+'&supplier='+encodeURIComponent(STATE.supplierName)).then(function(r){return r.json();}).then(function(rows){
                  if(rows&&rows.error){ var le=body.querySelector('#pp-bc-list'); if(le)le.innerHTML='<div class="count">'+esc(rows.error)+'</div>'; return; }
                  _bcRowsCache[_bkey]=rows||[]; renderBcList(_bcRowsCache[_bkey]); }).catch(function(){ var le=body.querySelector('#pp-bc-list'); if(le)le.innerHTML='<div class="count">Could not load barcodes.</div>'; });
                var qi=body.querySelector('.pp-bc-q'); if(qi)qi.oninput=function(){ PORTAL_BC_Q=this.value; if(_bcRowsCache[_bkey]) renderBcList(_bcRowsCache[_bkey]); };
              }
              return; }
            // POs tab — status pill filters; default to PRODUCTION + SHIPPING
            var seen={}, present=[]; _ppData.pos.forEach(function(p){ var s=(p.status||'').toUpperCase(); if(s==='FUTURE')return; if(s&&!seen[s]){seen[s]=1;present.push(s);} });   // FUTURE POs are hidden from the portal (no pill, not listed)
            var ordered=PO_STATUSES.filter(function(s){return seen[s];}).concat(present.filter(function(s){return PO_STATUSES.indexOf(s)<0;}));
            if(PORTAL_PO_ST===null)PORTAL_PO_ST={};
            ordered.forEach(function(s){ if(PORTAL_PO_ST[s]===undefined)PORTAL_PO_ST[s]=(s==='PRODUCTION'||s==='SHIPPING'); });
            var pq=effQ(PORTAL_PO_Q);
            // distinct dropdown values across this supplier's POs (blank-safe, sorted)
            function _distinct(key){ var s={}; _ppData.pos.forEach(function(p){ var v=(p[key]==null?'':String(p[key])).trim(); if(v)s[v]=1; }); return Object.keys(s).sort(); }
            var _prods=_distinct('prod_no'), _ctrys=_distinct('country'), _brs=_distinct('branch');
            function _fSel(cls,cur,label,opts){ return opts.length?('<select class="fci '+cls+'" style="width:auto;max-width:150px;text-align:left"><option value="">'+label+'</option>'+opts.map(function(o){return '<option'+(o===cur?' selected':'')+'>'+esc(o)+'</option>';}).join('')+'</select>'):''; }
            var pillBar='<div class="bar" style="gap:5px;flex-wrap:wrap;align-items:center">'
              +'<input class="fci pp-po-q" placeholder="search PO / client…" value="'+esc(PORTAL_PO_Q)+'" style="width:170px;text-align:left">'
              +_fSel('pp-po-prod',PORTAL_PO_PROD,'All productions',_prods)
              +_fSel('pp-po-ctry',PORTAL_PO_CTRY,'All countries',_ctrys)
              +_fSel('pp-po-br',PORTAL_PO_BR,'All branches',_brs)
              +'<span class="pill'+(PORTAL_PO_EXC?' active':'')+'" data-poexc="1" style="'+(PORTAL_PO_EXC?'background:#dc2626;color:#fff;border-color:#dc2626':'color:#dc2626')+'" title="show every PO with an open action, across all statuses">⚠ Show all exceptions</span>'
              +(ordered.length?ordered.map(function(s){var dim=(pq||PORTAL_PO_EXC);return '<span class="pill'+(PORTAL_PO_ST[s]?' active':'')+(dim?' ':'')+'" data-st="'+esc(s)+'"'+(dim?' style="opacity:.4"':'')+'>'+esc(s)+'</span>';}).join(''):'<span class="mut tiny">no orders</span>')
              +(PORTAL_PO_EXC?'<span class="mut tiny">showing exceptions — all statuses</span>':'')+'</div>';
            // a PO/client search OVERRIDES the status pills; the dropdown filters (production / country / branch) always AND on top
            var shown=_ppData.pos.filter(function(p){
              if(/future/i.test(p.status||'')) return false;   // never show FUTURE POs in the portal
              if(PORTAL_PO_PROD && (p.prod_no==null?'':String(p.prod_no).trim())!==PORTAL_PO_PROD) return false;
              if(PORTAL_PO_CTRY && (p.country||'').trim()!==PORTAL_PO_CTRY) return false;
              if(PORTAL_PO_BR && (p.branch||'').trim()!==PORTAL_PO_BR) return false;
              if(pq) return nrm(p.po).indexOf(pq)>=0 || nrm(p.client).indexOf(pq)>=0 || nrm(p.shipment).indexOf(pq)>=0 || nrm(p.prod_no).indexOf(pq)>=0;
              if(PORTAL_PO_EXC) return poActionCount(p)>0;   // exceptions filter overrides the status pills (all statuses)
              return PORTAL_PO_ST[(p.status||'').toUpperCase()]; });
            var poCapped=(!_ppShowAllPO && shown.length>PP_CAP), poRender=poCapped?shown.slice(0,PP_CAP):shown;
            body.innerHTML=pillBar+ppPOs(poRender,_ppData)
              +(poCapped?'<div style="margin:8px 0;text-align:center"><button class="save-btn pp-showall">Show all '+shown.length+' &darr;</button></div>':'');
            bindPortalScrollPin();   // pin expanded PO detail(s) to the left while the grid scrolls sideways
            var ppsa=body.querySelector('.pp-showall'); if(ppsa)ppsa.onclick=function(){ _ppShowAllPO=true; renderPP(); };
            body.querySelectorAll('.pill[data-st]').forEach(function(p){ p.onclick=function(){ var s=p.dataset.st; PORTAL_PO_ST[s]=!PORTAL_PO_ST[s]; _ppShowAllPO=false; renderPP(); }; });
            var _exc=body.querySelector('.pill[data-poexc]'); if(_exc)_exc.onclick=function(){ PORTAL_PO_EXC=!PORTAL_PO_EXC; _ppShowAllPO=false; renderPP(); };
            var _pr=body.querySelector('.pp-po-prod'); if(_pr)_pr.onchange=function(){ PORTAL_PO_PROD=this.value; _ppShowAllPO=false; renderPP(); };
            var _ct=body.querySelector('.pp-po-ctry'); if(_ct)_ct.onchange=function(){ PORTAL_PO_CTRY=this.value; _ppShowAllPO=false; renderPP(); };
            var _br=body.querySelector('.pp-po-br'); if(_br)_br.onchange=function(){ PORTAL_PO_BR=this.value; _ppShowAllPO=false; renderPP(); };
            var pqi=body.querySelector('.pp-po-q'); if(pqi)pqi.oninput=debounce(function(){ PORTAL_PO_Q=pqi.value; _ppShowAllPO=false; var foc=document.activeElement===pqi; renderPP(); if(foc){ var n=body.querySelector('.pp-po-q'); if(n){ n.focus(); n.setSelectionRange(n.value.length,n.value.length); } } },350);
            if(_ppOpenPO){ var _ob=body.querySelector('.pp-exp[data-po="'+((window.CSS&&CSS.escape)?CSS.escape(_ppOpenPO):_ppOpenPO)+'"]'); _ppOpenPO=null; if(_ob)setTimeout(function(){_ob.click();},0); }   // came from a Shipment Plan PO link → auto-open it
            body.querySelectorAll('.pp-exp').forEach(function(btn){ btn.onclick=function(){ var i=btn.dataset.i, ex=document.getElementById('pp-'+i); if(!ex)return;
              if(!ex.dataset.built){ ex.dataset.built='1'; var po=ex.dataset.po, p=_ppData.pos.filter(function(x){return x.po===po;})[0], cell=ex.children[0];
                if(p&&cell){ cell.innerHTML=ppExpand(p,_ppData.lb[po]||[],_ppData.notesByPo[po]||[],_ppData.subsByPo[po]||[],i,_ppData.costsByPo[po]||{},_ppData.supSkus||[],_ppData.xdByPo[po]||{},_ppData.addByPo[po]||[]); wireDetail(cell); } }
              ex.style.display=(ex.style.display!=='none')?'none':''; var _poOpen=ex.style.display!=='none'; var _poRow=btn.closest('.pp-row'); if(_poRow)_poRow.classList.toggle('row-open',_poOpen);   // highlight the open PO row (light yellow, like the main supply grid)
              if(_poOpen&&!ex.dataset.fcLoaded){ ex.dataset.fcLoaded='1'; loadFreightCharges(ex); }
              applyPortalPin(); }; });   // align the just-opened detail to the current horizontal scroll
            // production grouping rows expand / collapse their POs (default expanded) — collapse hides the group's
            // PO rows + any open detail cards; expand shows the PO rows again (detail cards stay closed)
            body.querySelectorAll('tr.pp-grp').forEach(function(row){ row.onclick=function(){
              var gk=row.dataset.grp, car=row.querySelector('.pp-grp-car'), collapsed=row.dataset.collapsed==='1';
              var sel='[data-grp="'+((window.CSS&&CSS.escape)?CSS.escape(gk):gk)+'"]';
              body.querySelectorAll(sel).forEach(function(r){ if(r===row)return;
                if(collapsed){ if(r.classList.contains('pp-row')) r.style.display=''; }   // expand: PO rows only
                else { r.style.display='none'; } });                                      // collapse: PO + detail rows
              row.dataset.collapsed=collapsed?'0':'1'; if(car)car.textContent=collapsed?'▾':'▸';
              applyPortalPin(); }; });
            // re-render ONE PO's expanded detail in place (no full reload, so MANAGE + the open tab stay put)
            function rerenderRow(row,po,keepPt){ if(!row)return; var p=_ppData.pos.filter(function(x){return x.po===po;})[0]; if(!p)return;
              var i=row.id.replace('pp-',''), cell=row.children[0]; if(!cell)return;
              var cur=cell.querySelector('.pptab.active'); var want=keepPt||(cur&&cur.dataset.pt)||'orderplan';   // keep the tab the user was on
              cell.innerHTML=ppExpand(p,_ppData.lb[po]||[],_ppData.notesByPo[po]||[],_ppData.subsByPo[po]||[],i,_ppData.costsByPo[po]||{},_ppData.supSkus||[],_ppData.xdByPo[po]||{},_ppData.addByPo[po]||[]);
              wireDetail(cell); var t=cell.querySelector('.pptab[data-pt="'+want+'"]'); if(t)t.onclick(); }
            // recompute a PO's MANAGE action-badge count from current _ppData (mirrors the inline calc in ppPOs)
            function poActCount(p){ if(!p)return 0; var po=p.po, today=new Date().toISOString().slice(0,10);
              var sb=_ppData.subsByPo[po]||[], nts=_ppData.notesByPo[po]||[];
              var unreadInt=nts.filter(function(n){return n.author_kind==='internal'&&!n.read;}).length;
              var cdS=(p.crossdock_skus||'').split(',').map(function(s){return s.trim();}).filter(Boolean), xdm=_ppData.xdByPo[po]||{};
              var xdReq=cdS.length>0&&(/shipping/i.test(p.status||'')||(p.prod_end&&p.prod_end<today)), xdMiss=cdS.filter(function(s){var q=xdm[s];return q==null||q==='';}).length;
              var prodExc=p.require_confirmation?prodAttention(p.production_status, p.prod_start, p.prod_end, sb):'';
              var dtcPend=dtcActionDue(p);
              return (invoiceDue(p,sb)?1:0)+((p.shipment||p.flexport_reference||sb.some(function(s){return s.kind==='tracking';}))?0:1)+unreadInt+((xdReq&&xdMiss>0)?1:0)+((p.require_confirmation&&!p.supplier_confirmed)?1:0)+(prodExc?1:0)+(dtcPend?1:0)+(poCdMissing(p,sb)?1:0)+(dtcShipDataDue(p)?1:0); }
            // in-place row refresh after a write: re-render the open expanded cell + sync the MANAGE badge (no full reload)
            function refreshRow(row,po){ if(!row)return; var i=row.id.replace('pp-',''); rerenderRow(row,po);
              var p=_ppData.pos.filter(function(x){return x.po===po;})[0]; var mb=document.querySelector('#supply-root .pp-exp[data-i="'+i+'"]')||document.querySelector('.pp-exp[data-i="'+i+'"]'); if(!mb||!p)return;
              var n=poActCount(p), b=mb.querySelector('.ex-badge');
              if(n>0){ if(b){b.textContent=n;} else { mb.insertAdjacentHTML('beforeend',' <span class="ex-badge" title="'+n+' action'+(n>1?'s':'')+' needed">'+n+'</span>'); } } else if(b){ b.remove(); } }
            // update just the MANAGE action-badge for one PO (by data-po) — no row rebuild
            function setManageBadge(po){ var p=_ppData.pos.filter(function(x){return x.po===po;})[0]; var mb=body.querySelector('.pp-exp[data-po="'+CSS.escape(po)+'"]'); if(!mb||!p)return;
              var n=poActCount(p), b=mb.querySelector('.ex-badge');
              if(n>0){ if(b){b.textContent=n;} else { mb.insertAdjacentHTML('beforeend',' <span class="ex-badge" title="'+n+' action'+(n>1?'s':'')+' needed">'+n+'</span>'); } } else if(b){ b.remove(); } }
            // production status changed (from the grid row OR the Timeline tab) → update _ppData, sync BOTH
            // selects + the badge in place, and refresh the open card so its ⚠ indicator reflects. No reload.
            function applyProdStatus(po,val){ var p=_ppData.pos.filter(function(x){return x.po===po;})[0]; if(p)p.production_status=val;
              body.querySelectorAll('.pp-prod[data-po="'+CSS.escape(po)+'"]').forEach(function(s){ s.value=val; s.disabled=false; paintProdSel(s); });
              setManageBadge(po);
              var ex=body.querySelector('tr[id^="pp-"][data-po="'+CSS.escape(po)+'"]');
              if(ex && ex.dataset.built && ex.style.display!=='none') rerenderRow(ex,po); }
            wireDetail(body);
            // detail-level handlers, bound within a scope (whole body on render, or one cell after a targeted re-render)
            function wireDetail(scope){
              var sid=_ppData.sid, by='preview (acting as '+STATE.supplierName+')';
              var pick=function(cls,po){ return scope.querySelector('.'+cls+'[data-po="'+CSS.escape(po)+'"]'); };
              // portal PO sub-tabs (TIMELINE / ORDER PLAN / INVOICE / SHIPMENT)
              scope.querySelectorAll('.pptab').forEach(function(t){ t.onclick=function(){ var box=t.closest('.ppx'); if(!box)return; var pt=t.dataset.pt;
                box.querySelectorAll('.pptab').forEach(function(x){x.classList.toggle('active',x===t);});
                box.querySelectorAll('.pptab-panel').forEach(function(pl){pl.style.display=(pl.dataset.pt===pt)?'':'none';}); }; });
              function ppDl(url,zipname,btn){ if(BC.placeholder){BC.note();return;} btn.disabled=true; fetch(url).then(function(r){return r.json();}).then(function(rows){ btn.disabled=false; if(rows&&rows.error){alert(rows.error);return;} if(!rows||!rows.length){alert('No barcodes found for this');return;} BC.sheets(rows,['product','carton'],zipname,btn); }).catch(function(){alert('Could not load barcodes');btn.disabled=false;}); }
scope.querySelectorAll('.pp-dl-po').forEach(function(btn){ btn.onclick=function(){ ppDl(EP.labelData+'?po='+encodeURIComponent(btn.dataset.po), btn.dataset.po+'_barcodes.zip', btn); }; });
scope.querySelectorAll('.pp-dl-prod').forEach(function(btn){ btn.onclick=function(){ ppDl(EP.labelData+'?prod='+encodeURIComponent(btn.dataset.prod)+'&supplier='+encodeURIComponent(STATE.supplierName), btn.dataset.prod+'_barcodes.zip', btn); }; });
scope.querySelectorAll('.pp-dl-cd').forEach(function(btn){ btn.onclick=function(){ if(BC.placeholder){BC.note();return;} btn.disabled=true; fetch(EP.labelData+'?skus='+encodeURIComponent(btn.dataset.skus)).then(function(r){return r.json();}).then(function(rows){ btn.disabled=false; if(!rows||!rows.length||rows.error){alert('No crossdock barcodes found');return;} BC.crossdock(rows,btn.dataset.po,btn.dataset.do,btn.dataset.client,btn.dataset.address,btn,btn.dataset.po+'_crossdock_labels.zip'); }).catch(function(){alert('Could not load crossdock labels');btn.disabled=false;}); }; });
              scope.querySelectorAll('.pp-shiplabel').forEach(function(btn){ btn.onclick=function(){ dlShipsWith(btn.dataset.po, btn, EP.shipsWith); }; });   // SHIPS WITH shipment label (per-PO, barcodes & labels tab)
              scope.querySelectorAll('.pp-airlabel').forEach(function(btn){ btn.onclick=function(){ dlShipsWith(btn.dataset.po, btn, EP.shipsWith, true); }; });   // AIR FREIGHT label (master of an air shipment)
              // PO confirmation: supplier confirms (or withdraws) acceptance of the order's SKUs / qty / dates
              scope.querySelectorAll('.pp-confirm').forEach(function(btn){ btn.onclick=function(){ var v=btn.dataset.v==='1';
                if(v && !confirm('Confirm this order? You’re accepting the SKUs, quantities and dates as shown.'))return;
                if(!v && !confirm('Withdraw your confirmation of this order?'))return;
                var po=btn.dataset.po, row=btn.closest('tr[id^="pp-"]'); btn.disabled=true; postJSON(EP.submit,{po:po,supplier_id:sid,submitted_by:by,po_confirmed:v},function(){ var p=_ppData.pos.filter(function(x){return x.po===po;})[0]; if(p){ p.supplier_confirmed=v?(by||'confirmed'):null; p.supplier_confirmed_by=v?by:null; }
                  // on confirm, re-snapshot approved lines locally (server does the same) so "changes since you approved" + the ORDER PLAN (1) badge clear immediately on both tabs
                  if(v){ var snap={}; (_ppData.lb[po]||[]).forEach(function(l){ snap[l.sku]=Number(l.qty)||0; }); _ppData.approvedByPo=_ppData.approvedByPo||{}; _ppData.approvedByPo[po]=snap; }
                  refreshRow(row,po); }); }; });
              // post a note → refresh just this PO's timeline in place (re-fetch the supplier's notes, stay on TIMELINE)
              scope.querySelectorAll('.pp-note-post').forEach(function(btn){ btn.onclick=function(){ var ta=pick('pp-note-body',btn.dataset.po); var v=(ta.value||'').trim(); if(!v)return; var po=btn.dataset.po, row=btn.closest('tr[id^="pp-"]'); btn.disabled=true;
                postJSON(EP.note,{po:po,supplier_id:sid,body:v,author_kind:'supplier',author_email:by},function(){
                  fetch(EP.notesBase+sid).then(function(r){return r.json();}).then(function(notes){ shortNotes(notes); var byPo={}; (notes||[]).forEach(function(n){ (byPo[n.po]=byPo[n.po]||[]).push(n); }); _ppData.notesByPo=byPo; rerenderRow(row,po,'timeline'); })
                    .catch(function(){ rerenderRow(row,po,'timeline'); }); }); }; });
              function adjBadge(el,delta){ if(!el)return; var b=el.querySelector('.ex-badge'); var cur=b?(parseInt(b.textContent,10)||0):0; var nv=Math.max(0,cur+delta);
                if(nv<=0){ if(b)b.remove(); } else if(b){ b.textContent=nv; } else { el.insertAdjacentHTML('beforeend',' <span class="ex-badge">'+nv+'</span>'); } }
              scope.querySelectorAll('.pp-note-read').forEach(function(btn){ btn.onclick=function(){ var read=btn.dataset.read!=='1';
                postJSON(EP.noteReadBase+btn.dataset.id,{read:read},function(){
                  btn.dataset.read=read?'1':'0'; btn.textContent=read?'mark unread':'Mark read';
                  if(read){ btn.className='pp-note-read'; btn.setAttribute('style','font-size:10px;color:#64748b;cursor:pointer;text-decoration:underline;white-space:nowrap;background:none;border:none;padding:0'); }   // read → small text button
                  else { btn.className='save-btn light pp-note-read'; btn.removeAttribute('style'); }   // unread → Mark read button
                  var wrap=btn.parentNode; wrap.style.background=read?'#eef2ff':'#fff7ed'; wrap.style.borderColor=read?'#e5e7eb':'#fdba74';
                  var info=wrap.firstChild, nb=info&&info.querySelector('.ex-badge');
                  if(read){ if(nb)nb.remove(); } else if(!nb){ var sp=info.querySelector('.mut'); if(sp)sp.insertAdjacentHTML('afterend',' <span class="ex-badge">new</span>'); }
                  var ppx=btn.closest('.ppx'), delta=read?-1:1;
                  adjBadge(ppx&&ppx.querySelector('.pptab[data-pt="timeline"]'), delta);
                  var detRow=btn.closest('tr'), m=detRow&&detRow.id&&detRow.id.match(/^pp-(\d+)$/);
                  if(m)adjBadge(body.querySelector('.pp-exp[data-i="'+m[1]+'"]'), delta);
                }); }; });
              scope.querySelectorAll('.pp-esc-note').forEach(function(btn){ btn.onclick=function(){ var msg=btn.dataset.msg||''; if(!msg)return;
                if(!confirm('Email this note to the supply planner?'))return; btn.disabled=true; var t=btn.textContent; btn.textContent='Sending…';
                postJSON(EP.escalate,{kind:'po',ref:btn.dataset.po,message:msg,initiator:'supplier'},function(j){ btn.textContent='✓ Flagged';
                  if(j&&j.sandbox)alert('Sandbox: no email key configured, so nothing was sent. On live this routes to the internal recipients set in CONFIG ▸ General settings.'); }); }; });
              scope.querySelectorAll('.pp-cd-grid').forEach(function(inp){ var t;
                inp.onclick=function(){ try{ if(inp.showPicker)inp.showPicker(); }catch(e){} };
                inp.onchange=function(){ var v=inp.value; if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return;
                  clearTimeout(t); inp.style.borderColor='#f59e0b'; var po=inp.dataset.po;
                  t=setTimeout(function(){ postJSON(EP.submit,{po:po,supplier_id:sid,submitted_by:by,completion_date:v},function(){
                    // reflect locally so the grid row, TIMELINE field, badges & 'must enter' all update without a reload
                    // (and survive a production-status change, which re-renders the detail from _ppData)
                    (_ppData.subsByPo=_ppData.subsByPo||{}); var arr=(_ppData.subsByPo[po]=_ppData.subsByPo[po]||[]);
                    arr.forEach(function(s){ if(s.kind==='completion_date'&&s.status==='pending')s.status='superseded'; });
                    arr.push({kind:'completion_date',value:v,status:'pending',submitted_at:new Date().toISOString().slice(0,10)});
                    var pe=(window.CSS&&CSS.escape)?CSS.escape(po):po;
                    rootEl.querySelectorAll('.pp-cd-grid[data-po="'+pe+'"]').forEach(function(o){ o.value=v; o.style.borderColor='#16a34a'; o.style.background='#eff6ff'; });
                    var ex=body.querySelector('tr[id^="pp-"][data-po="'+pe+'"]'); if(ex && ex.dataset.built && ex.style.display!=='none') rerenderRow(ex,po);
                    setManageBadge(po); setPosBadge(); setShipBadge();
                  }); },900); }; });
              // order-plan amended qty + cost prices: live-recompute line + grand totals, save on change (no reload)
              scope.querySelectorAll('.pp-cost,.pp-qty').forEach(function(inp){
                function recalc(box){ if(!box)return; var tot=0,tq=0;
                  box.querySelectorAll('.pp-qty').forEach(function(qel){ var sku=qel.dataset.sku; var cel=box.querySelector('.pp-cost[data-sku="'+CSS.escape(sku)+'"]');
                    var est=cel?(Number(cel.dataset.est)||0):0, q=Number(qel.value)||0, v=(cel&&cel.value.trim()!=='')?(Number(cel.value)||0):est, lt=q*v; tq+=q; tot+=lt;
                    var cell=box.querySelector('.pp-lt[data-sku="'+CSS.escape(sku)+'"]'); if(cell)cell.textContent='$'+money(lt); });
                  var tp=box.querySelector('.pp-totp'); if(tp)tp.textContent='$'+money(tot); var tqc=box.querySelector('.pp-totq'); if(tqc)tqc.textContent=units(tq);
                  var it=box.querySelector('.pp-inv-tot'); if(it){ var addT=Number(it.dataset.add)||0; it.textContent='$'+money(tot+addT); } }
                function saveLine(box,po,sku){ var qel=box.querySelector('.pp-qty[data-sku="'+CSS.escape(sku)+'"]'); var cel=box.querySelector('.pp-cost[data-sku="'+CSS.escape(sku)+'"]');
                  postJSON(EP.lineCost,{po:po,sku:sku,amended_qty:(qel&&qel.value.trim())||null,actual_cost:(cel&&cel.value.trim())||null,submitted_by:by},function(){   }); }
                inp.oninput=function(){ recalc(inp.closest('.ppx')); };
                inp.onchange=function(){ var box=inp.closest('.ppx'); recalc(box); saveLine(box,inp.dataset.po,inp.dataset.sku); }; });
              // add-SKU search: a filterable dropdown of the supplier's SKUs not already on the order (standard picker UX)
              // "+ Add new line" → multi-select SKU picker (search + checkboxes + qty, "+ Add selected") — same UX as adding a sample
              scope.querySelectorAll('.pp-op-addline').forEach(function(btn){ btn.onclick=function(){ var po=btn.dataset.po;
                var esq=function(v){ return (window.CSS&&CSS.escape)?CSS.escape(v):v; };
                var host=btn.closest('.ppx').querySelector('.pp-op-picker[data-po="'+esq(po)+'"]'); if(!host)return;
                if(host.style.display!=='none'){ host.style.display='none'; host.innerHTML=''; return; }
                host.style.display='';
                function cands(){ var on={}; (_ppData.lb[po]||[]).forEach(function(l){on[l.sku]=1;}); var cb=_ppData.costsByPo[po]||{}; Object.keys(cb).forEach(function(s){ if(cb[s]&&cb[s].is_added)on[s]=1; }); return (_ppData.supSkus||[]).filter(function(s){return !on[s.sku];}); }
                function draw(q){ q=(q||'').trim().toLowerCase(); var list=cands().filter(function(s){return !q||((s.sku+' '+(s.product_name||'')).toLowerCase().indexOf(q)>=0);});
                  host.querySelector('.pp-pk-list').innerHTML=list.length?list.slice(0,200).map(function(s){return '<div style="display:flex;gap:7px;align-items:center;padding:3px 6px;border-bottom:1px solid #f1f5f9;font-size:12px"><input type="checkbox" class="pp-pk-cb" value="'+esc(s.sku)+'"><b style="font-family:ui-monospace,Menlo,monospace">'+esc(s.sku)+'</b><span class="mut tiny" style="flex:1;min-width:0">'+esc(s.product_name||'')+'</span><input class="fci pp-pk-qty" data-sku="'+esc(s.sku)+'" placeholder="qty" style="width:52px;text-align:left" inputmode="numeric"></div>';}).join(''):'<div class="mut tiny" style="padding:6px">no matching SKU</div>'; }
                host.innerHTML='<div style="border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px;background:#f8fafc;text-align:left;max-width:560px">'
                  +'<input class="fci pp-pk-q" placeholder="search a SKU you supply…" style="width:100%;text-align:left;margin-bottom:5px" autocomplete="off">'
                  +'<div class="pp-pk-list" style="max-height:230px;overflow:auto;border:1px solid #eef2f7;border-radius:6px;background:#fff"></div>'
                  +'<div style="margin-top:8px;display:flex;gap:8px;align-items:center"><button class="save-btn pp-pk-add" style="background:#16a34a;color:#fff;border-color:#15803d">+ Add selected</button><button class="save-btn light pp-pk-cancel">Cancel</button><span class="pp-pk-msg mut tiny"></span></div>'
                  +'<div class="tiny mut" style="margin-top:4px">Tick SKUs, set qty, then Add selected. Enter your cost per line in the table above.</div></div>';
                draw(''); var qi=host.querySelector('.pp-pk-q'); qi.oninput=function(){ draw(this.value); }; qi.focus();
                host.querySelector('.pp-pk-cancel').onclick=function(){ host.style.display='none'; host.innerHTML=''; };
                host.querySelector('.pp-pk-add').onclick=function(){ var ab=this, msg=host.querySelector('.pp-pk-msg');
                  var picks=Array.prototype.map.call(host.querySelectorAll('.pp-pk-cb:checked'),function(c){ var qel=host.querySelector('.pp-pk-qty[data-sku="'+esq(c.value)+'"]'); return {sku:c.value, qty:(qel&&Number(qel.value))||1}; });
                  if(!picks.length){ msg.textContent='Tick at least one SKU.'; return; }
                  ab.disabled=true; msg.textContent='Adding '+picks.length+'…'; var row=btn.closest('tr[id^="pp-"]'); var done=0;
                  picks.forEach(function(pk){ postJSON(EP.lineCost,{po:po,sku:pk.sku,amended_qty:String(pk.qty),actual_cost:null,is_added:true,submitted_by:by},function(){
                    (_ppData.costsByPo[po]=_ppData.costsByPo[po]||{})[pk.sku]={actual_cost:null,amended_qty:String(pk.qty),is_added:true};
                    if(++done===picks.length){ rerenderRow(row,po,'orderplan'); } }); }); }; }; });
              // ORDER PLAN → download all SKUs/quantities (and costs) for this PO as a CSV
              scope.querySelectorAll('.pp-op-csv').forEach(function(btn){ btn.onclick=function(){ var po=btn.dataset.po;
                var lines=_ppData.lb[po]||[], costs=_ppData.costsByPo[po]||{}, lineSkus={};
                function csvCell(v){ v=String(v==null?'':v); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }
                var out=['SKU,Qty,Est cost,Your cost,Line total'];
                function pushRow(sku,orderQty,est){ var c=costs[sku]||{};
                  var aq=(c.amended_qty!=null&&c.amended_qty!=='')?Number(c.amended_qty):null;
                  var act=(c.actual_cost!=null&&c.actual_cost!=='')?Number(c.actual_cost):null;
                  var qn=(aq!=null?aq:(Number(orderQty)||0)), price=(act!=null?act:(est!=null?est:0));
                  out.push([csvCell(sku),qn,est!=null?est:'',act!=null?act:'',(qn*price)].join(',')); }
                lines.forEach(function(l){ lineSkus[l.sku]=1; pushRow(l.sku, l.qty, (l.cost_price!=null&&l.cost_price!=='')?Number(l.cost_price):((l.sku_cost!=null&&l.sku_cost!=='')?Number(l.sku_cost):null)); });
                Object.keys(costs).forEach(function(sku){ var c=costs[sku]; if(c&&c.is_added&&!lineSkus[sku]) pushRow(sku, null, null); });
                var blob=new Blob([out.join('\n')],{type:'text/csv'}), url=URL.createObjectURL(blob);
                var a=document.createElement('a'); a.href=url; a.download=po+'-order-plan.csv'; document.body.appendChild(a); a.click();
                setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); },100); }; });
              // parse an uploaded invoice / packing .xlsx → preview proposed qty + price overrides; then Apply
              scope.querySelectorAll('.pp-inv-parse-go').forEach(function(btn){ btn.onclick=function(){ var po=btn.dataset.po;
                var fin=pick('pp-inv-parse-file',po), f=fin&&fin.files&&fin.files[0], out=pick('pp-inv-parse-out',po), row=btn.closest('tr[id^="pp-"]');
                if(!f){ out.innerHTML='<span class="mut tiny">Choose an Excel (.xlsx) file first.</span>'; return; }
                btn.disabled=true; out.innerHTML='<span class="mut tiny">Parsing…</span>';
                var rd=new FileReader(); rd.onload=function(){ var b64=rd.result;
                  postJSON(EP.parseInvoice,{po:po,data_base64:b64},function(j){ btn.disabled=false;
                    if(!j||j.error||j.ok===false){ out.innerHTML='<span style="color:#b91c1c;font-size:11px">'+esc((j&&j.error)||'Could not parse the file.')+'</span>'; return; }
                    _invFiles[po]=b64; var t=j.totals, diff=j.lines.filter(function(l){return l.status!=='match';});
                    var rows=diff.map(function(l){ return '<tr><td class="l">'+esc(l.sku)+'</td><td class="l">'+(l.status==='new'?'<span class="tool-badge bg-amber" style="font-size:9px">NEW</span>':'<span class="mut tiny">changed</span>')+'</td>'
                      +'<td style="text-align:right">'+(l.cur_qty==null?'—':units(l.cur_qty))+' → <b>'+units(l.inv_qty)+'</b></td>'
                      +'<td style="text-align:right">'+(l.cur_cost==null?'—':'$'+money(l.cur_cost))+' → <b>'+(l.inv_price==null?'—':'$'+money(l.inv_price))+'</b></td></tr>'; }).join('');
                    out.innerHTML='<div class="tiny" style="margin-bottom:4px">'+(j.po_detected?'<b>'+esc(j.po_detected)+'</b> · ':'')+t.count+' lines · $'+money(t.value)+' — <b>'+t.changed+'</b> changed, <b>'+t.neu+'</b> new, '+(t.matched-t.changed)+' already match.</div>'
                      +(diff.length?'<div class="tw" style="max-height:240px;overflow:auto"><table style="font-size:11px;width:auto"><thead><tr><th class="l">SKU</th><th class="l"></th><th style="text-align:right">Qty</th><th style="text-align:right">Price</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
                        +'<button class="save-btn pp-inv-apply" data-po="'+esc(po)+'" style="margin-top:6px">Apply '+(t.changed+t.neu)+' change(s) to my order plan</button>'
                        :'<span class="mut tiny">Everything matches your order plan — nothing to change.</span>');
                    var ab=out.querySelector('.pp-inv-apply'); if(ab)ab.onclick=function(){ ab.disabled=true; ab.textContent='Applying…';
                      postJSON(EP.invoiceApply,{po:po,data_base64:_invFiles[po],submitted_by:by},function(r){
                        if(!r||r.error){ alert('Apply failed: '+((r&&r.error)||'')); ab.disabled=false; ab.textContent='Apply'; return; }
                        diff.forEach(function(l){ (_ppData.costsByPo[po]=_ppData.costsByPo[po]||{})[l.sku]={amended_qty:l.inv_qty,actual_cost:l.inv_price,is_added:(l.status==='new')}; });
                        alert('Applied to your order plan: '+r.applied+' line(s)'+(r.added?' ('+r.added+' new)':'')+'. Review the qty & cost below, then confirm the order — Dock & Bay will approve the change.');
                        rerenderRow(row,po,'orderplan'); }); }; }); };
                rd.readAsDataURL(f); }; });
              scope.querySelectorAll('.pp-rm').forEach(function(b){ b.onclick=function(){ if(!confirm('Remove '+b.dataset.sku+' from this order?'))return; var po=b.dataset.po, sku=b.dataset.sku, row=b.closest('tr[id^="pp-"]');
                postJSON(EP.lineRemove,{po:po,sku:sku},function(){  if(_ppData.costsByPo[po])delete _ppData.costsByPo[po][sku]; rerenderRow(row,po); }); }; });
              // crossdock shipped quantity per SKU → save + re-render (updates the open-action badge), no full reload
              scope.querySelectorAll('.pp-xqty').forEach(function(inp){ inp.onchange=function(){ var po=inp.dataset.po, sku=inp.dataset.sku, v=inp.value.trim(), row=inp.closest('tr[id^="pp-"]');
                postJSON(EP.crossdockQty,{po:po,sku:sku,qty:v===''?null:v,submitted_by:by},function(){
                  
                  (_ppData.xdByPo[po]=_ppData.xdByPo[po]||{})[sku]=(v===''?null:Number(v)); rerenderRow(row,po,'shipment'); }); }; });
              // additional cost lines — edit (by id) / add / remove → save + re-render the ORDER PLAN tab in place
              scope.querySelectorAll('.pp-ac-desc,.pp-ac-qty,.pp-ac-price').forEach(function(inp){ inp.onchange=function(){ var box=inp.closest('.ppx'), id=inp.dataset.id, row=inp.closest('tr[id^="pp-"]');
                var po=(box.querySelector('.pp-ac-add')||{}).dataset.po;
                var desc=(box.querySelector('.pp-ac-desc[data-id="'+id+'"]')||{}).value||'', q=(box.querySelector('.pp-ac-qty[data-id="'+id+'"]')||{}).value||'', pr=(box.querySelector('.pp-ac-price[data-id="'+id+'"]')||{}).value||'';
                postJSON(EP.addlCost,{id:id,description:desc,qty:q,price:pr,submitted_by:by},function(){ 
                  var r=(_ppData.addByPo[po]||[]).filter(function(x){return String(x.id)===String(id);})[0]; if(r){r.description=desc;r.qty=q===''?null:Number(q);r.price=pr===''?null:Number(pr);} rerenderRow(row,po,'orderplan'); }); }; });
              scope.querySelectorAll('.pp-ac-add').forEach(function(btn){ btn.onclick=function(){ var box=btn.closest('.ppx'), po=btn.dataset.po, row=btn.closest('tr[id^="pp-"]');
                var desc=(box.querySelector('.pp-ac-ndesc')||{}).value||'', q=(box.querySelector('.pp-ac-nqty')||{}).value||'', pr=(box.querySelector('.pp-ac-nprice')||{}).value||'';
                if(!desc.trim()&&!q&&!pr){ alert('Enter a description, quantity or price for the additional cost.'); return; } btn.disabled=true;
                postJSON(EP.addlCost,{po:po,description:desc,qty:q,price:pr,submitted_by:by},function(j){ 
                  (_ppData.addByPo[po]=_ppData.addByPo[po]||[]).push({id:j.id,description:desc,qty:q===''?null:Number(q),price:pr===''?null:Number(pr)}); rerenderRow(row,po,'orderplan'); }); }; });
              scope.querySelectorAll('.pp-ac-rm').forEach(function(b){ b.onclick=function(){ var box=b.closest('.ppx'), po=(box.querySelector('.pp-ac-add')||{}).dataset.po, row=b.closest('tr[id^="pp-"]'), id=b.dataset.id;
                postJSON(EP.addlCostRemove,{id:id},function(){  if(_ppData.addByPo[po])_ppData.addByPo[po]=_ppData.addByPo[po].filter(function(x){return String(x.id)!==String(id);}); rerenderRow(row,po,'orderplan'); }); }; });
              // supplier production status dropdown (grid AND timeline share class .pp-prod) → save + sync BOTH
              // selects + badge in place (no reload, no full-cell flash from the grid)
              scope.querySelectorAll('.pp-prod').forEach(function(sel){ paintProdSel(sel); sel.onchange=function(){ var po=sel.dataset.po, val=sel.value; paintProdSel(sel); sel.disabled=true;
                postJSON(EP.submit,{po:po,supplier_id:sid,submitted_by:by,production_status:val},function(){ applyProdStatus(po,val);
                  // a master PO marked 'shipped' advances its shipment to Shipping server-side → refresh _ppData silently
                  if(val==='shipped'){ opts.getData().then(function(d){ if(d){ if(d.notesByPo)Object.keys(d.notesByPo).forEach(function(k){ shortNotes(d.notesByPo[k]); }); _ppData=d; } }).catch(function(){}); }
                }); }; });
              scope.querySelectorAll('.pp-ownship').forEach(function(cb){ cb.onchange=function(){ var bx=scope.querySelector('.pp-ownship-box[data-po="'+cb.dataset.po+'"]'); if(bx)bx.style.display=cb.checked?'':'none'; }; });
              scope.querySelectorAll('.pp-trk-go').forEach(function(btn){ btn.onclick=function(){ var po=btn.dataset.po; var t=pick('pp-trk',po).value, cc=pick('pp-car',po).value; if(!t&&!cc){ alert('Pick a carrier and/or enter a tracking ref.'); return; } var fcEl=pick('pp-fcost-new',po); var fc=fcEl?Number(fcEl.value)||0:0; btn.disabled=true;
                var row=btn.closest('tr[id^="pp-"]');
                postJSON(EP.submit,{po:po,supplier_id:sid,submitted_by:by,tracking:t,carrier:cc},function(j){
                  // update the PO card in place (shipment now linked); the new master shipment ref = the PO number
                  var done=function(){ var p=_ppData.pos.filter(function(x){return x.po===po;})[0]; if(p){ if(!p.shipment)p.shipment=po; if(cc)p.ship_carrier=cc; if(t)p.ship_carrier_ref=t; } refreshRow(row,po); };
                  if(fc>0){ postJSON(EP.shipmentCharge,{shipment_ref:po,freight_cost:fc},function(){ done(); }); } else done(); }); }; });
              scope.querySelectorAll('.pp-dtc-go').forEach(function(btn){ btn.onclick=function(){ var po=btn.dataset.po;
                function v(f){ var el=scope.querySelector('.pp-dtc[data-po="'+CSS.escape(po)+'"][data-f="'+f+'"]'); return el?el.value.trim():''; }
                var payload={po:po,cartons:v('cartons'),cbm:v('cbm'),gross_weight_kg:v('gross_weight_kg'),dimensions:v('dimensions'),entered_by:by};
                btn.disabled=true; var row=btn.closest('tr[id^="pp-"]');
                postJSON('/api/supply/dtc-shipment',payload,function(j){ if(j&&j.error){alert(j.error);btn.disabled=false;return;}
                  var p=_ppData.pos.filter(function(x){return x.po===po;})[0];
                  if(p){ p.dtc_cartons=payload.cartons===''?null:parseInt(payload.cartons,10); p.dtc_cbm=payload.cbm===''?null:Number(payload.cbm); p.dtc_weight=payload.gross_weight_kg===''?null:Number(payload.gross_weight_kg); p.dtc_dimensions=payload.dimensions; if(!p.dtc_entered_at)p.dtc_entered_at='just now'; }
                  refreshRow(row,po); }); }; });
              scope.querySelectorAll('.pp-fchg-go').forEach(function(btn){ btn.onclick=function(){ var ref=btn.dataset.ref;
                var ci=scope.querySelector('.pp-fcost[data-ref="'+CSS.escape(ref)+'"]'), ni=scope.querySelector('.pp-fnote[data-ref="'+CSS.escape(ref)+'"]');
                var fc=ci?Number(ci.value)||0:0; if(fc<=0){ alert('Enter a freight amount.'); return; } btn.disabled=true;
                postJSON(EP.shipmentCharge,{shipment_ref:ref,freight_cost:fc,description:(ni&&ni.value)||null},function(j){ if(j&&j.error){alert(j.error);btn.disabled=false;return;} if(ci)ci.value=''; if(ni)ni.value=''; btn.disabled=false; loadFreightCharges(scope); }); }; });
              // approve the Direct to Client details (packing & labelling)
              scope.querySelectorAll('.pp-dtc-accept').forEach(function(btn){ btn.onclick=function(){ var po=btn.dataset.po, row=btn.closest('tr[id^="pp-"]'); btn.disabled=true;
                postJSON(EP.dtcAccept,{po:po},function(j){ if(j&&j.error){alert(j.error);btn.disabled=false;return;}
                  var p=_ppData.pos.filter(function(x){return x.po===po;})[0]; if(p){ p.dtc_accepted_at=new Date().toISOString().slice(0,16).replace('T',' '); p.dtc_accepted_by=STATE.by;
                    // re-snapshot the approved DtC details locally (server does the same) so the change highlights clear
                    p.dtc_approved_snapshot={pack_polybags:!!p.pack_polybags,pack_polybags_notes:p.pack_polybags_notes||'',pack_dnb_barcodes:!!p.pack_dnb_barcodes,pack_dnb_barcodes_notes:p.pack_dnb_barcodes_notes||'',pack_rfid_barcodes:!!p.pack_rfid_barcodes,pack_rfid_barcodes_notes:p.pack_rfid_barcodes_notes||'',pack_dnb_carton:!!p.pack_dnb_carton,pack_dnb_carton_notes:p.pack_dnb_carton_notes||'',pack_client_carton:!!p.pack_client_carton,pack_client_carton_notes:p.pack_client_carton_notes||'',pack_pallet_notes:p.pack_pallet_notes||'',pack_other_notes:p.pack_other_notes||'',client_requirements:p.client_requirements||'',sales_order_ref:p.sales_order_ref||'',client_po_ref:p.client_po_ref||'',client:p.client||'',final_delivery_address:p.final_delivery_address||''}; } refreshRow(row,po); }); }; });
              // jump to this PO's shipment in the Shipment Plan tab (search overrides the pills so it shows whatever its status)
              scope.querySelectorAll('.pp-go-shipplan').forEach(function(btn){ btn.onclick=function(){ PORTAL_TAB='shipmentplan'; PORTAL_SP_PO=btn.dataset.ref||''; renderPP(); }; });
              // live: warn when the invoice amount differs from the Step-1 calculated total
              scope.querySelectorAll('.pp-inv').forEach(function(inp){ inp.oninput=function(){ var w=inp.closest('.ppx').querySelector('.pp-inv-warn'); if(!w)return;
                var calc=Number(inp.dataset.calc)||0, v=Number(String(inp.value||'').replace(/,/g,''))||0; w.style.display=(inp.value!==''&&Math.abs(v-calc)>0.01)?'':'none'; }; });
              scope.querySelectorAll('.pp-inv-go').forEach(function(btn){ btn.onclick=function(){ var po=btn.dataset.po, row=btn.closest('tr[id^="pp-"]'); var val=pick('pp-inv',po).value; var fin=pick('pp-inv-file',po); var f=fin&&fin.files[0]; if(!val&&!f)return; btn.disabled=true;
                var go=function(attId){ postJSON(EP.submit,{po:po,supplier_id:sid,submitted_by:by,invoice_value:val||null,invoice_attachment_id:attId||null},function(){ (_ppData.subsByPo[po]=_ppData.subsByPo[po]||[]).push({kind:'invoice_value',value:val,status:'pending',submitted_at:new Date().toISOString().slice(0,10)}); refreshRow(row,po); }); };
                if(f){ var rd=new FileReader(); rd.onload=function(){ postJSON(EP.upload,{po:po,supplier_id:sid,filename:f.name,mime:f.type,data_base64:rd.result,uploaded_by:by},function(j){ go(j.id); }); }; rd.readAsDataURL(f); } else go(null); }; });
              // upload a typed document (Commercial Invoice / Packing List / …) → store + show in the Documents list
              scope.querySelectorAll('.pp-doc-go').forEach(function(btn){ btn.onclick=function(){ var po=btn.dataset.po;
                var typeEl=pick('pp-doc-type',po), fin=pick('pp-doc-file',po), f=fin&&fin.files&&fin.files[0];
                if(!f){ alert('Choose a file to upload.'); return; } var cat=typeEl?typeEl.value:'Other'; var row=btn.closest('tr[id^="pp-"]'); btn.disabled=true;
                var rd=new FileReader(); rd.onload=function(){ postJSON(EP.upload,{po:po,supplier_id:sid,filename:f.name,mime:f.type,data_base64:rd.result,uploaded_by:by,category:cat},function(j){
                  (_ppData.docsByPo=_ppData.docsByPo||{}); (_ppData.docsByPo[po]=_ppData.docsByPo[po]||[]).unshift({id:j.id,filename:f.name,category:cat,uploaded_at:'',approval_status:'draft'});
                  rerenderRow(row,po,'invoice'); }); }; rd.readAsDataURL(f); }; });
              // remove a supplier document
              scope.querySelectorAll('.pp-doc-rm').forEach(function(btn){ btn.onclick=function(){ if(!confirm('Remove this document?'))return; var id=btn.dataset.id, po=btn.dataset.po, row=btn.closest('tr[id^="pp-"]');
                postJSON(EP.docRemove,{id:id},function(){ if(po&&_ppData.docsByPo&&_ppData.docsByPo[po])_ppData.docsByPo[po]=_ppData.docsByPo[po].filter(function(d){return String(d.id)!==String(id);}); rerenderRow(row,po,'invoice'); }); }; });
              // submit a document for Dock & Bay approval
              scope.querySelectorAll('.pp-doc-submit').forEach(function(btn){ btn.onclick=function(){ if(!confirm('Submit this document to Dock & Bay for approval?'))return; var id=btn.dataset.id, po=btn.dataset.po, row=btn.closest('tr[id^="pp-"]'); btn.disabled=true;
                postJSON(EP.docSubmit,{att_id:id},function(j){ if(j&&j.error){alert(j.error);btn.disabled=false;return;}
                  if(_ppData.docsByPo&&_ppData.docsByPo[po])_ppData.docsByPo[po].forEach(function(d){ if(String(d.id)===String(id)){ d.approval_status='submitted'; d.review_notes=''; } });
                  rerenderRow(row,po,'invoice'); }); }; });
            } }
    function loadPreview(){ tabsEl.style.display=''; body.innerHTML='<div class="count">Loading…</div>';
      opts.getData().then(function(d){ if(d&&d.notesByPo){ Object.keys(d.notesByPo).forEach(function(k){ shortNotes(d.notesByPo[k]); }); } _ppData=d; renderPP(); }).catch(function(e){ body.innerHTML='<div class="count" style="color:#dc2626">'+esc(e&&e.message||e)+'</div>'; }); }
    function reload(){ if(typeof opts.onChange==='function')try{opts.onChange();}catch(e){} loadPreview(); }
    tabsEl.querySelectorAll('.rtab').forEach(function(t){ t.onclick=function(){ PORTAL_TAB=t.dataset.pt; renderPP(); }; });
    loadPreview();
  }
  window.DBPortalView={ mount: mount };
})();
