import { readFileSync, readdirSync } from 'fs';
import ExcelJS from 'exceljs';
const D = process.argv[2];

// ---------- ILG CSV aggregate ----------
function parseCsvLine(line){ const out=[]; let cur='',q=false; for(let i=0;i<line.length;i++){const c=line[i]; if(q){ if(c==='"'){ if(line[i+1]==='"'){cur+='"';i++;} else q=false; } else cur+=c; } else { if(c==='"')q=true; else if(c===','){out.push(cur);cur='';} else cur+=c; } } out.push(cur); return out; }
function aggCsv(path){
  const txt = readFileSync(path,'utf8').split(/\r?\n/).filter(Boolean);
  const hdr = parseCsvLine(txt[0]);
  const ix = n => hdr.indexOf(n);
  const iBasic=ix('Basic charge'), iExtra=ix('Extras Charge'), iGross=ix('Gross'), iVat=ix('VAT'), iPieces=ix('Total no. of pieces'), iSvc=ix('Service'), iCountry=ix('Delivery Country'), iDate=ix('Date');
  let n=0, basic=0, extra=0, gross=0, vat=0, pieces=0; const svc={}, dates={};
  for(let r=1;r<txt.length;r++){ const c=parseCsvLine(txt[r]); if(c.length<hdr.length) continue; n++;
    basic+=+c[iBasic]||0; extra+=+c[iExtra]||0; gross+=+c[iGross]||0; vat+=+c[iVat]||0; pieces+=+c[iPieces]||0;
    const s=c[iSvc]||'(blank)'; svc[s]=(svc[s]||0)+1; const m=(c[iDate]||'').replace(/^\d+-/,''); dates[m]=(dates[m]||0)+1;
  }
  const net=basic+extra;
  console.log(`\n=== ${path.split('/').pop()} ===`);
  console.log(`lines(orders/consignments): ${n}`);
  console.log(`pieces total: ${pieces}`);
  console.log(`net (basic+extras): £${net.toFixed(2)}   gross(incl VAT): £${gross.toFixed(2)}   VAT: £${vat.toFixed(2)}`);
  console.log(`per ORDER  net: £${(net/n).toFixed(3)}   gross: £${(gross/n).toFixed(3)}`);
  console.log(`per PIECE  net: £${(net/pieces).toFixed(3)}   gross: £${(gross/pieces).toFixed(3)}`);
  console.log(`month spread:`, JSON.stringify(dates));
  console.log(`top services:`, Object.entries(svc).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>`${k}=${v}`).join(' | '));
}
for (const f of readdirSync(D).filter(f=>f.endsWith('.csv') && f.includes('ilg'))) aggCsv(`${D}/${f}`);

// ---------- XLSX dump ----------
for (const f of readdirSync(D).filter(f=>f.endsWith('.xlsx'))) {
  const wb = new ExcelJS.Workbook();
  try { await wb.xlsx.readFile(`${D}/${f}`); } catch(e){ console.log(`\n=== ${f} === READ FAIL ${e.message}`); continue; }
  console.log(`\n=== XLSX ${f} ===`);
  wb.eachSheet(ws=>{
    console.log(`  sheet "${ws.name}" rows=${ws.rowCount} cols=${ws.columnCount}`);
    for(let r=1;r<=Math.min(6,ws.rowCount);r++){ const vals=[]; ws.getRow(r).eachCell({includeEmpty:false},c=>vals.push(String(c.value).slice(0,22))); if(vals.length) console.log(`   r${r}: ${vals.join(' | ')}`); }
  });
}
