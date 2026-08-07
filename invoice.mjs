// invoice.mjs — Commercial/Tax Invoice + Packing List generator.
// Fills the supplier-invoice template (templates/invoice-packing-template.xlsx) as a formatting shell with
// LIVE data computed from Supabase (generic template approach — we don't rely on the template's own lookups).
// Commercial Invoice = one PO; Tax Invoice = a shipment (group of POs). Returns an .xlsx Buffer.
import ExcelJS from 'exceljs';

const TEMPLATE_URL = new URL('./templates/invoice-packing-template.xlsx', import.meta.url);
const FIRST_ROW = 13;          // first line-item row in both sheets
const LAST_ROW = 39;           // last line row before the Total row (row 40)
const MAX_LINES = LAST_ROW - FIRST_ROW + 1;   // 27

// Branch label → delivery country (UK/US/EU/AU/CA); anything else → UK (the consignee fallback).
export function branchToCountry(branch) {
  const b = String(branch || '').toUpperCase();
  for (const c of ['UK', 'US', 'EU', 'AU', 'CA']) if (new RegExp('(^|[^A-Z])' + c + '([^A-Z]|$)').test(b)) return c;
  return 'UK';
}
function casePack(p) { return parseInt(p.case_pack_size, 10) || parseInt(p.carton_qty, 10) || 0; }
function cartonDims(p, country) {
  const us = country === 'US';
  const g = (u, s) => { const v = parseFloat(us ? p[s] : p[u]); return isFinite(v) ? v : (parseFloat(us ? p[u] : p[s]) || 0); };
  return { l: g('uk_carton_length', 'us_carton_length'), w: g('uk_carton_width', 'us_carton_width'),
           h: g('uk_carton_height', 'us_carton_height'), wt: g('uk_carton_weight', 'us_carton_weight') };
}
function hsFor(p, country) { return p['hscode_' + country.toLowerCase()] || p.hscode_us || ''; }
// Product SIZE(cm*cm) for the packing list = the dims in parentheses from products.size_long
// (e.g. "Large (160x90cm)" → "160x90cm"). Blank if none.
function sizeCm(p) { const m = /\(([^)]+)\)/.exec(String(p.size_long || '')); return m ? m[1] : ''; }
// Certification "GRS" + Recycled Content "100%" show ONLY when the product is fully GRS-approved
// (products.grs_approved == "1 checked out of 1"); otherwise both columns are blank.
function isGrsApproved(p) { return String(p.grs_approved || '').trim() === '1 checked out of 1'; }
function supplierBlock(s) {
  return [s.business_name || s.name, s.address_1, s.address_2, [s.city, s.state, s.postcode].filter(Boolean).join(', '),
          s.country, s.contact_name && ('Attn: ' + s.contact_name), s.email, s.phone].filter(Boolean).join('\n');
}
function ymd(d) { if (!d) return ''; const t = new Date(d); return isNaN(t) ? '' : t.toISOString().slice(0, 10); }

// Pull everything the doc needs for a set of POs (one for Commercial, many for Tax).
async function gather(pool, pos, master) {
  const poRows = (await pool.query(
    `SELECT po, supplier_name, supplier_id, branch, delivery_date_overide,
            client, sales_order_ref, client_po_ref, final_delivery_address
       FROM planner.purchase_orders WHERE po = ANY($1)`, [pos])).rows;
  if (!poRows.length) throw new Error('PO(s) not found: ' + pos.join(', '));
  // Supplier + delivery country come from the MASTER PO (the one the shipment is named after); for a single-PO
  // Commercial Invoice that's just the PO itself.
  const masterRow = poRows.find((p) => p.po === master) || poRows[0];
  const supName = masterRow.supplier_name;
  const sup = (await pool.query(`SELECT * FROM planner.suppliers WHERE id=$1 OR name=$2 LIMIT 1`,
    [masterRow.supplier_id || null, supName])).rows[0] || { name: supName };
  const lines = (await pool.query(
    `SELECT l.po, l.sku, l.qty, l.cost_price,
            p.sku_invoice_title, p.grs_approved, p.size_long, p.hscode_uk, p.hscode_us, p.hscode_eu, p.hscode_ca, p.hscode_au,
            p.case_pack_size, p.carton_qty,
            p.uk_carton_length, p.uk_carton_width, p.uk_carton_height, p.uk_carton_weight,
            p.us_carton_length, p.us_carton_width, p.us_carton_height, p.us_carton_weight
       FROM planner.purchase_order_lines l LEFT JOIN planner.products p ON upper(p.sku)=upper(l.sku)
      WHERE l.po = ANY($1) AND coalesce(l.qty,0) > 0
      ORDER BY l.po, l.sku`, [pos])).rows;
  const country = branchToCountry(masterRow.branch);
  const cons = (await pool.query(`SELECT * FROM planner.invoice_consignees WHERE country=$1`, [country])).rows[0]
            || (await pool.query(`SELECT * FROM planner.invoice_consignees WHERE country='UK'`)).rows[0] || {};
  return { poRows, sup, lines, country, cons };
}

function clearRow(ws, r, cols) { cols.forEach(c => { ws.getCell(c + r).value = null; }); }

// Build the workbook for a set of POs. type: 'commercial' | 'tax'; ref = invoice number (PO no / shipment ref).
export async function buildInvoice(pool, { type, pos, ref, dateISO, master }) {
  const { poRows, sup, lines, country, cons } = await gather(pool, pos, master || pos[0]);
  // Merge lines by SKU — a shipment can repeat a SKU across POs; each invoice line is one SKU. Sum qty and
  // keep the exact amount (Σ qty×price), so the unit price shown is a weighted average if costs ever differ.
  const bySku = new Map();
  for (const l of lines) {
    const k = String(l.sku).toUpperCase();
    const qty = parseInt(l.qty, 10) || 0, price = parseFloat(l.cost_price) || 0;
    if (!bySku.has(k)) bySku.set(k, { ...l, qty: 0, amt: 0 });
    const m = bySku.get(k); m.qty += qty; m.amt = Math.round((m.amt + qty * price) * 100) / 100;
  }
  const items = [...bySku.values()];
  if (items.length > 400) throw new Error(`${items.length} lines is too many for one document.`);   // sanity cap
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE_URL);
  ['HS Codes', 'SKU_LOOKUP', 'Country'].forEach(n => { const ws = wb.getWorksheet(n); if (ws) wb.removeWorksheet(ws.id); });
  const inv = wb.getWorksheet('Invoice'), pk = wb.getWorksheet('Packing List');
  // Flatten every formula on the two sheets to its cached value — we compute all values ourselves, and this
  // avoids ExcelJS "shared formula master" write errors when we overwrite formula cells with static data.
  [inv, pk].forEach((ws) => ws.eachRow({ includeEmpty: true }, (row) => row.eachCell({ includeEmpty: true }, (cell) => {
    const v = cell.value;
    if (v && typeof v === 'object' && ('formula' in v || 'sharedFormula' in v)) cell.value = (v.result !== undefined ? v.result : null);
  })));
  // Grow the line-item block when there are more SKUs than the template's base rows (13–39). Duplicate the last
  // styled line row so the table (and the Total row + footer below it) expand cleanly.
  const N = items.length;
  const extra = Math.max(0, N - MAX_LINES);
  if (extra > 0) { inv.duplicateRow(LAST_ROW, extra, true); pk.duplicateRow(LAST_ROW, extra, true); }
  const lastLineRow = LAST_ROW + extra;   // last line-item row
  const totalRow = lastLineRow + 1;        // the "Total" row (row 40 in the base template)
  const title = type === 'tax' ? 'Tax Invoice' : 'Commercial Invoice';
  const date = dateISO || ymd(new Date().toISOString());
  const supBlock = supplierBlock(sup);
  const fullName = sup.business_name || sup.name || '';   // company full name → top header (A1)
  // Header line 1 = company name; if the supplier has a Textile Exchange ID, add it beneath (GRS compliance).
  const header1 = fullName + (sup.te_id ? '\nTextile Exchange-ID (TE-ID): ' + sup.te_id : '');
  const deliveryTerm = sup.incoterm || 'FOB';
  const origin = sup.country || 'China';

  // ---- Invoice header ----
  inv.getCell('A1').value = header1;   // was "Supplier Invoice"
  inv.getCell('A2').value = supBlock;
  inv.getCell('A3').value = title;
  inv.getCell('B4').value = ref;
  inv.getCell('F4').value = date;
  inv.getCell('B5').value = cons.notify_party || '';   // NOTIFY PARTY
  inv.getCell('F5').value = 'TT';                        // Payment Term
  inv.getCell('F6').value = country;                    // Delivery Country
  inv.getCell('F7').value = deliveryTerm;               // Delivery Term
  inv.getCell('F8').value = origin;                     // Country of Origin
  inv.getCell('B9').value = cons.consignee || '';       // CONSIGNEE
  inv.getCell('F9').value = 'Shanghai';                 // Port of Loading
  inv.getCell('F10').value = cons.port_of_discharge || '';
  // clear the lookup-helper block on the right (J:M) so nothing #REFs after we drop the lookup sheets
  for (let r = 2; r <= 13; r++) ['J', 'K', 'L', 'M'].forEach(c => { inv.getCell(c + r).value = null; });

  // ---- Invoice lines ----
  let qtyTot = 0, amtTot = 0;
  items.forEach((l, i) => {
    const r = FIRST_ROW + i;
    const qty = l.qty, amt = l.amt, price = qty ? Math.round((amt / qty) * 10000) / 10000 : 0;
    qtyTot += qty; amtTot += amt;
    const grs = isGrsApproved(l);
    inv.getCell('A' + r).value = l.sku;
    inv.getCell('B' + r).value = grs ? 'GRS' : '';
    inv.getCell('C' + r).value = grs ? '100%' : '';
    inv.getCell('D' + r).value = l.sku_invoice_title || '';
    inv.getCell('E' + r).value = hsFor(l, country);
    inv.getCell('F' + r).value = qty;
    inv.getCell('G' + r).value = price;
    inv.getCell('H' + r).value = amt;
  });
  for (let r = FIRST_ROW + items.length; r <= lastLineRow; r++) clearRow(inv, r, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
  inv.getCell('F' + totalRow).value = qtyTot;
  inv.getCell('H' + totalRow).value = Math.round(amtTot * 100) / 100;
  inv.getCell('A' + (totalRow + 1)).value = '';   // clear the leftover hard-coded payment note

  // ---- Packing List ----
  pk.getCell('A1').value = header1;   // was "Supplier Details"
  pk.getCell('A2').value = supBlock;
  pk.getCell('B4').value = ref;
  pk.getCell('F4').value = date;
  pk.getCell('B5').value = cons.consignee || '';      // PL: CONSIGNEE (top)
  pk.getCell('F5').value = 'TT';
  pk.getCell('F7').value = deliveryTerm;
  pk.getCell('B9').value = cons.notify_party || '';   // PL: NOTIFY PARTY
  pk.getCell('F9').value = 'Shanghai';
  // Columns: A SKU | B SIZE(cm*cm) product dims | C Description | D Q'TY(CTN) | E Q'TY(PCS) | F GW(kg) |
  // G Carton Dimensions (LxWxH) | H Order Quantity. Relabel the last two header cells (template had
  // "Order Quantity" + "short shipment") to match the supplier packing-list layout.
  ['11', '12'].forEach((hr) => { pk.getCell('G' + hr).value = 'Carton Dimensions'; pk.getCell('H' + hr).value = 'Order Quantity'; });
  let ctnTot = 0, pcsTot = 0, gwTot = 0, ordTot = 0;
  items.forEach((l, i) => {
    const r = FIRST_ROW + i;
    const qty = l.qty, cp = casePack(l), d = cartonDims(l, country);
    const ctns = cp > 0 ? Math.round((qty / cp) * 10) / 10 : 0;   // partial cartons → 1 decimal place
    const gw = +(ctns * (d.wt || 0)).toFixed(1);
    ctnTot += ctns; pcsTot += qty; gwTot += gw; ordTot += qty;
    pk.getCell('A' + r).value = l.sku;
    pk.getCell('B' + r).value = sizeCm(l);                                                            // product size (cm)
    pk.getCell('C' + r).value = l.sku_invoice_title || '';
    pk.getCell('D' + r).value = ctns;
    pk.getCell('E' + r).value = qty;
    pk.getCell('F' + r).value = gw;
    pk.getCell('G' + r).value = (d.l && d.w && d.h) ? `${Math.round(d.l)}x${Math.round(d.w)}x${Math.round(d.h)}` : '';   // carton dims
    pk.getCell('H' + r).value = qty;                                                                 // order quantity
  });
  for (let r = FIRST_ROW + items.length; r <= lastLineRow; r++) clearRow(pk, r, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
  pk.getCell('D' + totalRow).value = +ctnTot.toFixed(1);
  pk.getCell('E' + totalRow).value = pcsTot;
  pk.getCell('F' + totalRow).value = +gwTot.toFixed(1);
  pk.getCell('G' + totalRow).value = '';
  pk.getCell('H' + totalRow).value = ordTot;
  // Centre the quantity columns (CTN / PCS / GW / Order Qty / short shipment) — headers, data rows and totals.
  for (let r = 11; r <= totalRow; r++) ['D', 'E', 'F', 'G', 'H'].forEach((c) => {
    const cell = pk.getCell(c + r);
    cell.alignment = { ...(cell.alignment || {}), horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  const safeRef = String(ref).replace(/[^A-Za-z0-9._-]+/g, '_');
  const filename = `${type === 'tax' ? 'Tax' : 'Commercial'} Invoice - ${safeRef}.xlsx`;
  const suppliers = [...new Set(poRows.map((p) => p.supplier_name).filter(Boolean))];
  return { buffer, filename, lineCount: items.length, country, supplier: sup.business_name || sup.name, poCount: poRows.length, suppliers };
}

// Direct-to-Client Packing List. Same template, but: SELLER block = Dock & Bay (the UK consignee record);
// invoice no = client sales-order ref (+ client PO in brackets); CONSIGNEE = client name + final delivery
// address; column B = Carton Size (carton dims); no short-shipment column. Packing List sheet only.
export async function buildDtcPackingList(pool, { pos, master }) {
  const { poRows, lines, country, cons } = await gather(pool, pos, master || pos[0]);
  const masterRow = poRows.find((p) => p.po === (master || pos[0])) || poRows[0];
  const bySku = new Map();
  for (const l of lines) { const k = String(l.sku).toUpperCase(); const qty = parseInt(l.qty, 10) || 0;
    if (!bySku.has(k)) bySku.set(k, { ...l, qty: 0 }); bySku.get(k).qty += qty; }
  const items = [...bySku.values()];
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE_URL);
  wb.worksheets.slice().forEach((ws) => { if (ws.name !== 'Packing List') wb.removeWorksheet(ws.id); });
  const pk = wb.getWorksheet('Packing List');
  pk.eachRow({ includeEmpty: true }, (row) => row.eachCell({ includeEmpty: true }, (cell) => {
    const v = cell.value; if (v && typeof v === 'object' && ('formula' in v || 'sharedFormula' in v)) cell.value = (v.result !== undefined ? v.result : null);
  }));
  const extra = Math.max(0, items.length - MAX_LINES);
  if (extra > 0) pk.duplicateRow(LAST_ROW, extra, true);
  const lastLineRow = LAST_ROW + extra, totalRow = lastLineRow + 1;
  const date = ymd(new Date().toISOString());
  // Seller = Dock & Bay AU entity (CONFIG ▸ Consignees ▸ AU = Dock & Bay PTY LTD); fall back to UK, then cons.
  const dnbRow = (await pool.query(`SELECT consignee FROM planner.invoice_consignees WHERE country='AU'`)).rows[0]
              || (await pool.query(`SELECT consignee FROM planner.invoice_consignees WHERE country='UK'`)).rows[0] || {};
  const dnb = dnbRow.consignee || cons.consignee || 'Dock & Bay PTY LTD';
  const so = String(masterRow.sales_order_ref || '').trim(), cpo = String(masterRow.client_po_ref || '').trim();
  const docNo = ((so || cpo) ? (so + (cpo && cpo !== so ? ` (${cpo})` : '')) : masterRow.po);
  const clientBlock = [masterRow.client, masterRow.final_delivery_address].filter(Boolean).join('\n');
  pk.getCell('A1').value = dnb.split('\n')[0] || 'Dock & Bay LTD';       // seller = D&B
  pk.getCell('A2').value = dnb;
  pk.getCell('B4').value = docNo;                                       // invoice no = client SO (+ client PO)
  pk.getCell('F4').value = date;
  pk.getCell('B5').value = clientBlock;                                 // CONSIGNEE = client + address
  pk.getCell('F5').value = 'TT';
  pk.getCell('B9').value = '';
  pk.getCell('F9').value = 'Shanghai';
  ['11', '12'].forEach((hr) => { pk.getCell('B' + hr).value = 'Carton Size'; pk.getCell('G' + hr).value = 'Order Quantity'; pk.getCell('H' + hr).value = ''; });
  let ctnTot = 0, pcsTot = 0, gwTot = 0, ordTot = 0;
  items.forEach((l, i) => { const r = FIRST_ROW + i;
    const qty = l.qty, cp = casePack(l), d = cartonDims(l, country);
    const ctns = cp > 0 ? Math.round((qty / cp) * 10) / 10 : 0;
    const gw = +(ctns * (d.wt || 0)).toFixed(1);
    ctnTot += ctns; pcsTot += qty; gwTot += gw; ordTot += qty;
    pk.getCell('A' + r).value = l.sku;
    pk.getCell('B' + r).value = (d.l && d.w && d.h) ? `${Math.round(d.l)}x${Math.round(d.w)}x${Math.round(d.h)}` : '';   // Carton Size
    pk.getCell('C' + r).value = l.sku_invoice_title || '';
    pk.getCell('D' + r).value = ctns;
    pk.getCell('E' + r).value = qty;
    pk.getCell('F' + r).value = gw;
    pk.getCell('G' + r).value = qty;                                    // Order Quantity
    pk.getCell('H' + r).value = '';
  });
  for (let r = FIRST_ROW + items.length; r <= lastLineRow; r++) clearRow(pk, r, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
  pk.getCell('D' + totalRow).value = +ctnTot.toFixed(1);
  pk.getCell('E' + totalRow).value = pcsTot;
  pk.getCell('F' + totalRow).value = +gwTot.toFixed(1);
  pk.getCell('G' + totalRow).value = ordTot;
  pk.getCell('H' + totalRow).value = '';
  for (let r = 11; r <= totalRow; r++) ['D', 'E', 'F', 'G'].forEach((c) => { const cell = pk.getCell(c + r); cell.alignment = { ...(cell.alignment || {}), horizontal: 'center', vertical: 'middle', wrapText: true }; });
  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  const safe = String(docNo).replace(/[^A-Za-z0-9._-]+/g, '_');
  return { buffer, filename: `Direct to Client Packing List - ${safe}.xlsx`, lineCount: items.length };
}
