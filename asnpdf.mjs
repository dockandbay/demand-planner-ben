// asnpdf.mjs — minimal, dependency-free PDF generator for ASN pallet labels.
// One A4 LANDSCAPE page per ASN (1 ASN per pallet): large centred text —
//   line 1: DOCK & BAY PTY LTD   line 2: ASN# <asn>   line 3: PALLET <n>
// Uses the built-in Helvetica-Bold font (no embedding). Returns a Buffer.

function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }
// Helvetica-Bold is ~0.56em average width — good enough to centre text on the page.
function centreX(text, size, pageW) { const w = String(text).length * size * 0.56; return Math.max(24, (pageW - w) / 2); }

export function buildAsnLabelsPdf(company, asns) {
  const W = 842, H = 595;   // A4 landscape, points
  const list = (asns || []).length ? asns : [''];
  // Big text spread down the page so it fills the sheet.
  const pageContent = list.map((asn, i) => {
    const lines = [
      { t: company || 'DOCK & BAY PTY LTD', s: 44, y: H - 150 },
      { t: 'ASN# ' + (asn || ''), s: 70, y: H - 310 },
      { t: 'PALLET ' + (i + 1), s: 56, y: H - 460 },
    ];
    return lines.map((ln) => 'BT /F1 ' + ln.s + ' Tf ' + centreX(ln.t, ln.s, W).toFixed(1) + ' ' + ln.y + ' Td (' + esc(ln.t) + ') Tj ET').join('\n') + '\n';
  });

  // Object layout: 1=Catalog, 2=Pages, 3=Font, then per page i: page=4+2i, content=5+2i.
  const objs = [];
  objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  const kids = pageContent.map((_, i) => (4 + 2 * i) + ' 0 R').join(' ');
  objs[2] = '<< /Type /Pages /Kids [' + kids + '] /Count ' + pageContent.length + ' >>';
  objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';
  pageContent.forEach((content, i) => {
    const pageNo = 4 + 2 * i, contentNo = 5 + 2 * i;
    objs[pageNo] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /Font << /F1 3 0 R >> >> /Contents ' + contentNo + ' 0 R >>';
    objs[contentNo] = '<< /Length ' + Buffer.byteLength(content, 'utf8') + ' >>\nstream\n' + content + 'endstream';
  });

  // Serialise with an xref table.
  let out = '%PDF-1.4\n';
  const offsets = [];
  for (let n = 1; n < objs.length; n++) {
    if (objs[n] == null) continue;
    offsets[n] = Buffer.byteLength(out, 'utf8');
    out += n + ' 0 obj\n' + objs[n] + '\nendobj\n';
  }
  const xrefStart = Buffer.byteLength(out, 'utf8');
  const size = objs.length;   // highest obj number + 1
  out += 'xref\n0 ' + size + '\n0000000000 65535 f \n';
  for (let n = 1; n < size; n++) {
    const off = offsets[n] != null ? offsets[n] : 0;
    out += String(off).padStart(10, '0') + ' 00000 n \n';
  }
  out += 'trailer\n<< /Size ' + size + ' /Root 1 0 R >>\nstartxref\n' + xrefStart + '\n%%EOF';
  return Buffer.from(out, 'utf8');
}
