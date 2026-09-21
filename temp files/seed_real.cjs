const fs=require('fs'),path=require('path');const url=(fs.readFileSync(path.join(process.cwd(),'.env'),'utf8').match(/^DATABASE_URL=(.*)$/m)||[])[1].trim().replace(/^["']|["']$/g,'');const {Client}=require('pg');
const REAL=['8918670961','8006751841','5059719851']; const JUNK=['34534543','234234234','DHLtest1235'];
(async()=>{const c=new Client({connectionString:url});await c.connect();
 for(let i=0;i<3;i++){
   const a=await c.query(`UPDATE planner.shipments SET carrier_ref=$1, status='Shipping', arrival_date=NULL WHERE carrier_ref=$2`,[REAL[i],JUNK[i]]);
   const b=await c.query(`UPDATE planner.sample_requests SET tracking_code=$1 WHERE tracking_code=$2`,[REAL[i],JUNK[i]]);
   console.log(JUNK[i],'->',REAL[i],'| shipments updated:',a.rowCount,'samples updated:',b.rowCount);
 }
 await c.end();})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
