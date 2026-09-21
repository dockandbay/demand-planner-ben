const fs=require('fs');const {JSDOM}=require('jsdom');
const src=fs.readFileSync('supply/inject.html','utf8');
// extract from the pill helper start to the log click handler (self-contained block)
const a=src.indexOf('function hzTrkDate(');
const b=src.indexOf("document.addEventListener('click',function(e){ var el=e.target&&e.target.closest?e.target.closest('.hz-trkpill[data-num]')");
const block=src.slice(a,b);
const dom=new JSDOM('<!doctype html><body></body>',{runScripts:'outside-only',url:'http://localhost:8124/'});
const w=dom.window;
w.eval('function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}\nvar window={};\n'+block);
// grab a real row from the endpoint
(async()=>{
 const j=await (await globalThis.fetch('http://localhost:8124/api/tracking/detail?number=PROBE_LOG_727')).json();
 const html=w.eval('hzTrackLogHtml')(j.row);
 const d=new JSDOM('<!doctype html><body>'+html+'</body>').window.document;
 const txt=d.body.textContent.replace(/\s+/g,' ').trim();
 console.log('log contains delivery line:', /Estimated delivery 20-Sep-26/.test(txt));
 console.log('log lists both events:', /Departed facility/.test(txt) && /Shipment picked up/.test(txt));
 console.log('log shows locations:', /SHENZHEN/.test(txt));
 console.log('sample text:', txt.slice(0,140));
 // cleanup
 const {Client}=require('pg');const url=(fs.readFileSync('.env','utf8').match(/^DATABASE_URL=(.*)$/m)||[])[1].trim().replace(/^["']|["']$/g,'');
 const c=new Client({connectionString:url});await c.connect();await c.query("DELETE FROM planner.carrier_tracking WHERE tracking_number='PROBE_LOG_727'");await c.end();
 console.log('cleaned up probe row.');
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
