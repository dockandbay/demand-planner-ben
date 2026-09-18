import 'dotenv/config'; import pg from 'pg';
const c=new pg.Client({connectionString:process.env.DATABASE_URL}); await c.connect();
// find a portal user whose supplier owns a PO
const u=(await c.query(`SELECT spu.email, spu.supplier_name, (SELECT po FROM planner.purchase_orders po WHERE po.supplier_name=spu.supplier_name AND EXISTS(SELECT 1 FROM planner.purchase_order_lines l WHERE l.po=po.po) LIMIT 1) po
  FROM planner.supplier_portal_users spu WHERE active=true AND coalesce(spu.supplier_name,'')<>'' AND EXISTS(SELECT 1 FROM planner.purchase_orders po WHERE po.supplier_name=spu.supplier_name) LIMIT 1`)).rows[0];
if(!u||!u.po){ console.log('no portal user with a PO found'); process.exit(0); }
// a PO NOT owned by this supplier
const other=(await c.query(`SELECT po FROM planner.purchase_orders WHERE coalesce(supplier_name,'')<>'' AND supplier_name<>$1 AND EXISTS(SELECT 1 FROM planner.purchase_order_lines l WHERE l.po=purchase_orders.po) LIMIT 1`,[u.supplier_name])).rows[0];
const tok='TESTSESS-'+Math.floor(Date.now()/1000);
await c.query(`INSERT INTO planner.portal_sessions (token,email,supplier_id,expires_at) VALUES ($1,$2,NULL, now()+interval '1 hour')`,[tok,u.email]);
console.log(JSON.stringify({email:u.email, supplier:u.supplier_name, ownPo:u.po, otherPo:other&&other.po, token:tok}));
await c.end();
