// v28.553 (Ben 28-Oct-26, ILG daily stock report): a small reader for legacy Excel 97-2003 .xls files (BIFF8 inside a Compound File),
// enough for flat report tables: shared strings, inline labels, numbers (NUMBER / RK / MULRK) and formula results that are numbers.
// No dependency (exceljs reads .xlsx only). Returns the cells of every worksheet as rows of values: [{ name, rows: [[...], ...] }].
const ENDOFCHAIN = 0xFFFFFFFE, FREESECT = 0xFFFFFFFF;

function cfbStream(buf, wanted) {
  if (buf.readUInt32LE(0) !== 0xE011CFD0 || buf.readUInt32LE(4) !== 0xE11AB1A1) throw new Error('not an Excel 97-2003 (.xls) file');
  const secSize = 1 << buf.readUInt16LE(30), miniSize = 1 << buf.readUInt16LE(32);
  const nFat = buf.readUInt32LE(44), dirStart = buf.readUInt32LE(48), miniCutoff = buf.readUInt32LE(56);
  const miniFatStart = buf.readUInt32LE(60), difStart = buf.readUInt32LE(68);
  const sec = (n) => buf.subarray(512 + n * secSize, 512 + (n + 1) * secSize);
  // FAT sector list: 109 in the header, the rest in DIFAT sectors
  const fatSecs = []; for (let i = 0; i < 109 && fatSecs.length < nFat; i++) fatSecs.push(buf.readUInt32LE(76 + i * 4));
  for (let d = difStart, guard = 0; d !== ENDOFCHAIN && d !== FREESECT && fatSecs.length < nFat && guard < 10000; guard++) {
    const s = sec(d); for (let i = 0; i < secSize / 4 - 1 && fatSecs.length < nFat; i++) fatSecs.push(s.readUInt32LE(i * 4)); d = s.readUInt32LE(secSize - 4); }
  const fat = []; fatSecs.forEach(n => { const s = sec(n); for (let i = 0; i < secSize / 4; i++) fat.push(s.readUInt32LE(i * 4)); });
  const chain = (start, f) => { const out = []; for (let n = start, g = 0; n !== ENDOFCHAIN && n !== FREESECT && g < 1e6; g++) { out.push(n); n = f[n]; } return out; };
  const readChain = (start) => Buffer.concat(chain(start, fat).map(sec));
  const dir = readChain(dirStart), entries = [];
  for (let o = 0; o + 128 <= dir.length; o += 128) { const nl = dir.readUInt16LE(o + 64); if (!nl) { entries.push(null); continue; }
    entries.push({ name: dir.subarray(o, o + nl - 2).toString('utf16le'), type: dir[o + 66], start: dir.readUInt32LE(o + 116), size: dir.readUInt32LE(o + 120) }); }
  const root = entries[0], e = entries.find(x => x && x.type === 2 && wanted.includes(x.name));
  if (!e) throw new Error('no workbook stream in the .xls file');
  if (e.size >= miniCutoff) return readChain(e.start).subarray(0, e.size);
  const ministream = readChain(root.start), minifat = []; if (miniFatStart !== ENDOFCHAIN) { const m = readChain(miniFatStart); for (let i = 0; i < m.length / 4; i++) minifat.push(m.readUInt32LE(i * 4)); }
  return Buffer.concat(chain(e.start, minifat).map(n => ministream.subarray(n * miniSize, (n + 1) * miniSize))).subarray(0, e.size);
}
function rkNum(v) { let n; if (v & 2) n = v >> 2; else { const b = Buffer.alloc(8); b.writeUInt32LE(v & 0xFFFFFFFC, 4); n = b.readDoubleLE(0); } return (v & 1) ? n / 100 : n; }
// one BIFF8 unicode string at a position that may span CONTINUE records (segs = list of record bodies, each a fresh start)
function readStrings(segs, count) {
  const out = []; let si = 0, p = 8, seg = segs[0];
  const need = (n) => { while (p >= seg.length) { si++; seg = segs[si]; p = 0; if (!seg) throw new Error('SST overrun'); } return n; };
  for (let k = 0; k < count; k++) {
    need(); if (p + 3 > seg.length) { si++; seg = segs[si]; p = 0; }
    const cch = seg.readUInt16LE(p); let flags = seg[p + 2]; p += 3;
    let rich = 0, ext = 0; if (flags & 8) { rich = seg.readUInt16LE(p); p += 2; } if (flags & 4) { ext = seg.readUInt32LE(p); p += 4; }
    let s = '', left = cch, wide = flags & 1;
    while (left > 0) { if (p >= seg.length) { si++; seg = segs[si]; p = 0; wide = seg[p] & 1; p += 1; }   // a CONTINUE restarts with a flags byte
      const can = wide ? Math.min(left, (seg.length - p) >> 1) : Math.min(left, seg.length - p);
      s += wide ? seg.subarray(p, p + can * 2).toString('utf16le') : seg.subarray(p, p + can).toString('latin1'); p += can * (wide ? 2 : 1); left -= can; }
    let skip = rich * 4 + ext; while (skip > 0) { if (p >= seg.length) { si++; seg = segs[si]; p = 0; } const t = Math.min(skip, seg.length - p); p += t; skip -= t; }
    out.push(s); }
  return out;
}

export function readXls(buf) {
  const wb = cfbStream(Buffer.from(buf), ['Workbook', 'Book']);
  const recs = []; for (let o = 0; o + 4 <= wb.length;) { const t = wb.readUInt16LE(o), l = wb.readUInt16LE(o + 2); recs.push({ t, b: wb.subarray(o + 4, o + 4 + l), at: o }); o += 4 + l; }
  let sst = [];
  const sheets = []; let cur = null;
  for (let i = 0; i < recs.length; i++) { const { t, b } = recs[i];
    if (t === 0x00FC) { const segs = [b]; while (recs[i + 1] && recs[i + 1].t === 0x003C) { i++; segs.push(recs[i].b); } sst = readStrings(segs, b.readUInt32LE(4)); continue; }
    if (t === 0x0085) { const cch = b[6], w = b[7] & 1; sheets.push({ name: w ? b.subarray(8, 8 + cch * 2).toString('utf16le') : b.subarray(8, 8 + cch).toString('latin1'), pos: b.readUInt32LE(0), rows: [] }); continue; }   // BOUNDSHEET8 (name: ShortXLUnicodeString)
    if (t === 0x0809) { cur = sheets.find(s => s.pos === recs[i].at) || null; continue; }   // BOF of a sheet substream
    if (!cur) continue;
    const put = (r, c, v) => { const row = cur.rows[r] || (cur.rows[r] = []); row[c] = v; };
    if (t === 0x00FD) put(b.readUInt16LE(0), b.readUInt16LE(2), sst[b.readUInt32LE(6)]);            // LABELSST
    else if (t === 0x0203) put(b.readUInt16LE(0), b.readUInt16LE(2), b.readDoubleLE(6));              // NUMBER
    else if (t === 0x027E) put(b.readUInt16LE(0), b.readUInt16LE(2), rkNum(b.readInt32LE(6)));        // RK
    else if (t === 0x00BD) { const r = b.readUInt16LE(0), c0 = b.readUInt16LE(2), n = (b.length - 6) / 6; for (let k = 0; k < n; k++) put(r, c0 + k, rkNum(b.readInt32LE(4 + k * 6 + 2))); }   // MULRK
    else if (t === 0x0204) put(b.readUInt16LE(0), b.readUInt16LE(2), (() => { const cch = b.readUInt16LE(6), w = b[8] & 1; return w ? b.subarray(9, 9 + cch * 2).toString('utf16le') : b.subarray(9, 9 + cch).toString('latin1'); })());   // LABEL
    else if (t === 0x0006 && b.readUInt16LE(12) !== 0xFFFF) put(b.readUInt16LE(0), b.readUInt16LE(2), b.readDoubleLE(6));   // FORMULA with a number result
    else if (t === 0x000A) cur = null;   // EOF of the sheet
  }
  return sheets.map(s => ({ name: s.name, rows: Array.from(s.rows, r => (r ? Array.from(r, v => (v === undefined ? '' : v)) : [])) }));
}
