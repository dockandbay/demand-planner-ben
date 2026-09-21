const fs=require('fs'),path=require('path');const url=(fs.readFileSync(path.join(process.cwd(),'.env'),'utf8').match(/^DATABASE_URL=(.*)$/m)||[])[1].trim().replace(/^["']|["']$/g,'');const {Client}=require('pg');
(async()=>{const c=new Client({connectionString:url});await c.connect();
 const r=(await c.query(`SELECT tracking_code, carrier FROM planner.sample_requests WHERE carrier ILIKE 'dhl%' AND coalesce(tracking_code,'')<>'' LIMIT 1`)).rows[0]
   || (await c.query(`SELECT carrier_ref AS tracking_code, carrier FROM planner.shipments WHERE carrier ILIKE 'dhl%' AND coalesce(carrier_ref,'')<>'' LIMIT 1`)).rows[0];
 console.log(JSON.stringify(r||{}));await c.end();})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
