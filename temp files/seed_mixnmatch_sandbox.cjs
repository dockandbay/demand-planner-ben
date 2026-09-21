// Seed MIXNMATCH (category + subcategory + 22 products + 66 set_bom) from LIVE into SANDBOX so the set-smoothing
// two-totals bug can be reproduced + fixed. Insert-only (ON CONFLICT DO NOTHING) — never deletes/overwrites.
require('dotenv/config'); const fs=require('fs'); const {Client}=require('pg');
const F=process.argv[2];
const raw=fs.readFileSync(F,'utf8');
const outer=JSON.parse(raw);                 // { result: "...<untrusted>...[{seed:...}]..." }
const r=outer.result;
const s0=r.indexOf('[{"seed"'), s1=r.lastIndexOf('}]')+2;
const arr=JSON.parse(r.slice(s0,s1));        // [{ seed: "<json string>" }]
const seed=JSON.parse(arr[0].seed);          // { cat, subcat, products[], boms[] }
console.log('parsed seed: cat=%s subcat=%s products=%d boms=%d',
  !!seed.cat, !!seed.subcat, (seed.products||[]).length, (seed.boms||[]).length);

(async()=>{
  const c=new Client({connectionString:process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}});
  await c.connect();
  const host=(process.env.DATABASE_URL||'').replace(/:[^:@/]+@/,':***@').slice(0,55);
  console.log('connected sandbox:', host);
  let cat=0,sub=0,prod=0,bom=0;
  async function up(sql,json){ const res=await c.query(sql,[JSON.stringify(json)]); return res.rowCount; }
  try{
    await c.query('BEGIN');
    if(seed.cat)    cat = await up("INSERT INTO planner.categories    SELECT * FROM jsonb_populate_record(NULL::planner.categories,    $1::jsonb) ON CONFLICT DO NOTHING", seed.cat);
    if(seed.subcat) sub = await up("INSERT INTO planner.subcategories SELECT * FROM jsonb_populate_record(NULL::planner.subcategories, $1::jsonb) ON CONFLICT DO NOTHING", seed.subcat);
    for(const p of (seed.products||[])) prod += await up("INSERT INTO planner.products SELECT * FROM jsonb_populate_record(NULL::planner.products, $1::jsonb) ON CONFLICT DO NOTHING", p);
    for(const b of (seed.boms||[]))     bom  += await up("INSERT INTO planner.set_bom  SELECT * FROM jsonb_populate_record(NULL::planner.set_bom,  $1::jsonb) ON CONFLICT DO NOTHING", b);
    await c.query('COMMIT');
    console.log('INSERTED → categories:%d subcategories:%d products:%d set_bom:%d', cat,sub,prod,bom);
    const chk=await c.query("SELECT count(*) n FROM planner.products WHERE category='MIXNMATCH' OR subcategory='MIXNMATCH'");
    const chkb=await c.query("SELECT count(*) n FROM planner.set_bom WHERE output_sku LIKE 'BUNDLE-MIXMATCH-%'");
    console.log('sandbox now: MIXNMATCH products=%s, set_bom rows=%s', chk.rows[0].n, chkb.rows[0].n);
  }catch(e){ await c.query('ROLLBACK'); console.error('ROLLED BACK:', e.message); }
  finally{ await c.end(); }
})();
