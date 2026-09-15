import ExcelJS from 'exceljs';
import fs from 'fs';
// branch -> warehouse (mirror server.mjs _INV_BRANCH_MAP; null/undefined = exclude)
const MAP={
 'UK ILG':'uk_3pl','US Geneva':'us_3pl','AU Coghlans':'au_3pl','US AWD':'us_awd','US FBA':'us_fba',
 'EU iFulfillment':'eu_3pl','UK FBA':'uk_fba','UK ILG non grs':'uk_nongrs','US Geneva non GRS':'us_nongrs',
 'AU FBA':'au_fba','EU FBA':'eu_fba','EU ILG':'eu_3pl',
};
const [,,xlsx,date]=process.argv;
if(!xlsx||!date){console.error('usage: parse.mjs <xlsx> <YYYY-MM-DD>');process.exit(1);}
const wb=new ExcelJS.Workbook(); await wb.xlsx.readFile(xlsx);
const ws=wb.worksheets[0];
const agg={}; const skipped={};
for(let r=2;r<=ws.rowCount;r++){
  const row=ws.getRow(r);
  let b=row.getCell(1).value, sku=row.getCell(3).value, q=Number(row.getCell(4).value);
  if(b&&b.text)b=b.text; if(sku&&sku.text)sku=sku.text;
  if(b==null||sku==null||!isFinite(q))continue;
  b=String(b).trim(); sku=String(sku).trim();
  if(b==='Grand Total'||sku===''||sku==='Grand Total'){skipped['(total row)']=(skipped['(total row)']||0)+1;continue;}
  const wh=MAP[b];
  if(wh===undefined){skipped['UNMAPPED:'+b]=(skipped['UNMAPPED:'+b]||0)+1;continue;}
  if(wh===null){skipped['excluded:'+b]=(skipped['excluded:'+b]||0)+1;continue;}
  const k=wh+'\t'+sku; agg[k]=(agg[k]||0)+q;   // keep zeros — a 0 snapshot is meaningful
}
const rows=Object.keys(agg).map(k=>{const p=k.split('\t');return {wh:p[0],sku:p[1],u:agg[k]};});
let kunits=0; rows.forEach(r=>{kunits+=r.u;});
rows.sort((a,b)=>a.wh<b.wh?-1:a.wh>b.wh?1:(a.sku<b.sku?-1:1));
const esc=s=>String(s).replace(/'/g,"''");
const vals=rows.map(r=>"('"+esc(r.sku)+"','"+r.wh+"','"+date+"',"+r.u+",'cin7_backfill')").join(',\n');
const sql="-- "+date+"  ("+rows.length+" sku-rows, "+kunits+"u)  from "+xlsx.split('/').pop()+"\n"
 +"INSERT INTO planner.inventory_snapshots (sku, warehouse, snapshot_date, available, source) VALUES\n"+vals
 +"\nON CONFLICT (sku, warehouse, snapshot_date) DO UPDATE SET available=EXCLUDED.available, source=EXCLUDED.source;\n";
fs.writeFileSync(new URL('./'+date+'.sql',import.meta.url),sql);
console.log('DATE',date,'-> kept',rows.length,'rows /',kunits,'u across',[...new Set(rows.map(r=>r.wh))].sort().join(','));
console.log('skipped:',Object.entries(skipped).map(([k,v])=>k+'='+v).join('  '));
