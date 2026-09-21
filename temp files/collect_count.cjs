const fs=require('fs'),path=require('path');const url=(fs.readFileSync(path.join(process.cwd(),'.env'),'utf8').match(/^DATABASE_URL=(.*)$/m)||[])[1].trim().replace(/^["']|["']$/g,'');const {Client}=require('pg');
function nums(raw){return String(raw||'').split(',').map(x=>x.replace(/\s+/g,'')).filter(x=>x.length>=8&&x.length<=40&&/\d/.test(x)&&/^[A-Za-z0-9]+$/.test(x));}
(async()=>{const c=new Client({connectionString:url});await c.connect();
 const seen=new Set();
 const sr=(await c.query(`SELECT carrier,tracking_code,carrier_2,tracking_code_2 FROM planner.sample_requests WHERE received_at IS NULL AND ((carrier ILIKE 'dhl%' AND coalesce(tracking_code,'')<>'') OR (carrier_2 ILIKE 'dhl%' AND coalesce(tracking_code_2,'')<>''))`)).rows;
 for(const r of sr){ if(/^dhl/i.test(r.carrier||''))nums(r.tracking_code).forEach(n=>seen.add(n)); if(/^dhl/i.test(r.carrier_2||''))nums(r.tracking_code_2).forEach(n=>seen.add(n)); }
 const sh=(await c.query(`SELECT carrier_ref FROM planner.shipments WHERE carrier ILIKE 'dhl%' AND coalesce(carrier_ref,'')<>'' AND arrival_date IS NULL AND coalesce(lower(status),'') NOT IN ('complete','completed','delivered','arrived','closed','cancelled')`)).rows;
 for(const r of sh)nums(r.carrier_ref).forEach(n=>seen.add(n));
 // also: raw count BEFORE filtering, for comparison
 const rawSh=(await c.query(`SELECT count(*)::int n FROM planner.shipments WHERE carrier ILIKE 'dhl%' AND coalesce(carrier_ref,'')<>''`)).rows[0].n;
 console.log('sandbox DHL shipment rows (raw, unfiltered):',rawSh);
 console.log('pollable AFTER hardening (dedup, valid, not complete):',seen.size);
 console.log('sample of pollable numbers:',[...seen].slice(0,8));
 await c.end();})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
