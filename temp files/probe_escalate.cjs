const fs=require('fs'),path=require('path');
const url=(fs.readFileSync(path.join(process.cwd(),'.env'),'utf8').match(/^DATABASE_URL=(.*)$/m)||[])[1].trim().replace(/^["']|["']$/g,'');
const {Client}=require('pg');
(async()=>{ const c=new Client({connectionString:url}); await c.connect();
  // pick a sample with null supplier_id but a supplier_name
  const s=(await c.query(`SELECT ref, supplier_name FROM planner.sample_requests WHERE supplier_id IS NULL AND coalesce(supplier_name,'')<>'' LIMIT 1`)).rows[0];
  if(!s){ console.log('no null-supplier_id sample in sandbox to test with'); }
  else {
    // OLD behaviour: resolve by supplier_id only → null → no emails
    const oldSid=(await c.query(`SELECT supplier_id FROM planner.sample_requests WHERE ref=$1`,[s.ref])).rows[0]?.supplier_id;
    // NEW behaviour: fall back to name
    let newSid=oldSid; if(!newSid) newSid=(await c.query(`SELECT id FROM planner.suppliers WHERE lower(name)=lower($1)`,[s.supplier_name])).rows[0]?.id;
    const emails=newSid?(await c.query(`SELECT DISTINCT lower(email) e FROM planner.supplier_portal_users WHERE supplier_id=$1 AND active=true AND coalesce(email,'')<>''`,[newSid])).rows.map(x=>x.e):[];
    console.log('sample ref:',s.ref,'| supplier_name:',s.supplier_name);
    console.log('OLD (by supplier_id):',oldSid,'-> emails: 0 (this is the bug)');
    console.log('NEW (name fallback): supplier_id',newSid,'-> emails:',JSON.stringify(emails));
    console.log('RESULT:',(!oldSid && emails.length)?'FIX WORKS (was 0, now '+emails.length+')':'inconclusive');
  }
  await c.end();
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
