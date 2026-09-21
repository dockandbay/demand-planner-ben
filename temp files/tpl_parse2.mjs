import ExcelJS from 'exceljs';
const D = process.argv[2];
const num = v => { if(v==null) return 0; if(typeof v==='object' && 'result' in v) v=v.result; const n=parseFloat(String(v).replace(/[^0-9.\-]/g,'')); return isNaN(n)?0:n; };

// ---------- Blade (ifulfilment) Orders BOC ----------
{
  const wb=new ExcelJS.Workbook(); await wb.xlsx.readFile(`${D}/3_eu_ifulfilment_2026-07_DOC_-_May_26.xlsx`);
  const ws=wb.getWorksheet('Orders BOC');
  const hdr={}; ws.getRow(1).eachCell({includeEmpty:false},(c,i)=>hdr[String(c.value).trim()]=i);
  const col=n=>hdr[n];
  let n=0,items=0,pkgs=0,admin=0,vol=0,pick=0,ship=0,cons=0,total=0,exShip=0;
  const chan={};
  for(let r=2;r<=ws.rowCount;r++){ const row=ws.getRow(r); const id=row.getCell(col('Id')).value; if(!id) continue; n++;
    items+=num(row.getCell(col('Total Items')).value); pkgs+=num(row.getCell(col('Total Packages')).value);
    admin+=num(row.getCell(col('Admin Fee')).value); vol+=num(row.getCell(col('Volume Usage Fee')).value);
    pick+=num(row.getCell(col('Pick Charge')).value); ship+=num(row.getCell(col('Shipping Fee')).value);
    cons+=num(row.getCell(col('Consumables Cost')).value);
    total+=num(row.getCell(col('Total Cost')).value); exShip+=num(row.getCell(col('Total Excl Shipping')).value);
    const ch=String(row.getCell(col('Classification')).value||'?'); chan[ch]=(chan[ch]||0)+1;
  }
  console.log('=== BLADE / iFulfilment (Orders BOC sheet, "DOC - May 26") ===');
  console.log(`orders: ${n}   items: ${items}   packages: ${pkgs}   (B2C/B2B: ${JSON.stringify(chan)})`);
  console.log(`admin €${admin.toFixed(0)} | volume €${vol.toFixed(0)} | pick €${pick.toFixed(0)} | shipping €${ship.toFixed(0)} | consumables €${cons.toFixed(0)}`);
  console.log(`TOTAL cost €${total.toFixed(2)}   excl-shipping €${exShip.toFixed(2)}`);
  console.log(`per ORDER: total €${(total/n).toFixed(3)}  |  pick+pack(excl ship) €${(exShip/n).toFixed(3)}  |  shipping €${(ship/n).toFixed(3)}`);
  console.log(`per ITEM:  total €${(total/items).toFixed(3)}  |  pick+pack(excl ship) €${(exShip/items).toFixed(3)}`);
}

// ---------- Coghlans DOK50360: dump Invoice + Order Processing readable ----------
{
  const wb=new ExcelJS.Workbook(); await wb.xlsx.readFile(`${D}/5_au_coghlans_2026-07_DOK50360.xlsx`);
  for(const sn of ['Invoice','Order Processing']){
    const ws=wb.getWorksheet(sn); if(!ws){console.log('no sheet',sn);continue;}
    console.log(`\n=== COGHLANS DOK50360 — sheet "${sn}" ===`);
    for(let r=1;r<=ws.rowCount;r++){ const vals=[]; ws.getRow(r).eachCell({includeEmpty:false},(c,i)=>{let v=c.value; if(v&&typeof v==='object'&&'result'in v)v=v.result; if(v&&typeof v==='object'&&'richText'in v)v=v.richText.map(t=>t.text).join(''); vals.push(`${i}:${String(v).slice(0,40)}`);}); if(vals.length) console.log(`r${r}: ${vals.join(' | ')}`); }
  }
}
