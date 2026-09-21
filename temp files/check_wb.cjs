const fs=require('fs'),path=require('path');const url=(fs.readFileSync(path.join(process.cwd(),'.env'),'utf8').match(/^DATABASE_URL=(.*)$/m)||[])[1].trim().replace(/^["']|["']$/g,'');const {Client}=require('pg');
(async()=>{const c=new Client({connectionString:url});await c.connect();
 const r=(await c.query(`SELECT shipment_ref,carrier_ref,tracked_delivery_date::text,tracked_source,status FROM planner.shipments WHERE carrier_ref IN ('8006751841','5059719851')`)).rows;
 r.forEach(x=>console.log(x.shipment_ref,'| ref',x.carrier_ref,'| tracked_delivery_date',x.tracked_delivery_date,'| source',x.tracked_source));
 // events size sanity
 const ev=(await c.query(`SELECT tracking_number, pg_column_size(events) sz, jsonb_array_length(events) n FROM planner.carrier_tracking WHERE tracking_number IN ('8918670961','8006751841','5059719851')`)).rows;
 ev.forEach(x=>console.log('events',x.tracking_number,'bytes',x.sz,'count',x.n));
 await c.end();})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
