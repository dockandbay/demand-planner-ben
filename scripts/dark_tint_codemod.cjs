// Dark-mode grid tint codemod (v27.585). Context-anchored: only rewrites hex that directly follows
//   `background:` / `background-color:` / `color:`  inside inline styles or <style> blocks.
// This never touches canvas drawing (fillStyle/strokeStyle), SVG attrs (fill=/stroke=) or jsPDF (setFillColor…),
// because none of those use a `background:`/`color:` CSS prefix. Maps the straggler hexes onto the existing
// design tokens (which now carry dark values in hz-theme.css), so light stays visually the same and dark works.
// Usage: node scripts/dark_tint_codemod.cjs <file> [--dry]
const fs = require('fs');
const [file, flag] = process.argv.slice(2);
const dry = flag === '--dry';

// hex (lowercased, 6 or 3 digit) -> token, for BACKGROUND contexts (surfaces + semantic tints)
const BG = {
  // whites / cards
  '#ffffff':'--card','#fff':'--card','#fefefe':'--card','#fdfdfd':'--card','#fcfcfc':'--card',
  // near-white grey surfaces
  '#f8fafc':'--hover','#f9fafb':'--hover','#f7f8fb':'--hover','#f5f5f5':'--hover','#f1f5f9':'--hover',
  '#f8fbff':'--hover','#fafaf8':'--hover','#f6f7f9':'--hover','#f8f8f8':'--hover','#fafafa':'--hover','#f7f9fc':'--hover','#fbfcfd':'--row-alt',
  // mid light greys (headers / bands)
  '#f3f3f1':'--band','#eaeae8':'--band','#e7e5e0':'--band','#e8e8e6':'--band','#e9eef5':'--band','#f2f4f8':'--band',
  '#f3f4f6':'--hdr-tint','#eef2f9':'--hdr-cur',
  // lines
  '#eef2f7':'--line2','#eef1f6':'--line2','#eee':'--line2','#f1f1f1':'--line2','#ececec':'--line2',
  // level-3 tint
  '#f0f6ff':'--l3-bg',
  // blues
  '#eff6ff':'--blue-soft','#dbeafe':'--blue-soft','#e0f2fe':'--blue-soft','#eaf1fd':'--blue-soft','#e8f0fe':'--blue-soft',
  // greens
  '#dcfce7':'--pos-bg','#ecfdf5':'--pos-bg','#f0fdf4':'--pos-bg','#f0fff0':'--pos-bg','#bbf7d0':'--pos-bg','#d1fae5':'--pos-bg','#e8f6ee':'--pos-bg',
  // reds
  '#fee2e2':'--neg-bg','#fef2f2':'--neg-bg','#ffd6d1':'--neg-bg','#fdeeec':'--neg-bg','#fff1f0':'--neg-bg',
  '#fecaca':'--neg-cell','#fca5a5':'--neg-cell','#fbdcd8':'--neg-cell',
  // ambers / yellows / oranges
  '#fff7ed':'--amber-bg','#fef3c7':'--amber-bg','#fef9c3':'--amber-bg','#fffbeb':'--amber-bg','#ffffc5':'--amber-bg',
  '#fde68a':'--amber-bg','#fdf3d7':'--amber-bg','#fffde7':'--amber-bg','#fdeec8':'--prod-bg',
  // violets
  '#f5f3ff':'--violet-bg','#f3e8ff':'--violet-bg','#ede9fe':'--violet-bg','#eef2ff':'--violet-bg','#f1ebfc':'--violet-bg',
  // dark navies used AS a background (stay dark in both themes)
  '#0f172a':'--nav','#0d1626':'--nav','#111827':'--nav','#0b1220':'--nav',
  '#1e293b':'--nav-2','#16213a':'--nav-2','#374151':'--nav-2','#1f2937':'--nav-2','#334155':'--nav-2',
  // --- extended stragglers (pass 2) ---
  '#e0e0e0':'--line','#ebebea':'--line','#c4c4c4':'--faint','#e5e5e5':'--line','#e5e7eb':'--line',
  '#f0f0f0':'--line2','#eef0f6':'--line2','#eef1f5':'--line2','#f0f1f3':'--line2','#eceff3':'--line2',
  '#fafcff':'--hover','#fffaf5':'--hover','#fbfcfe':'--hover','#f9fbff':'--hover','#fcfdff':'--hover',
  '#ffedd5':'--amber-bg','#fdfbd4':'--amber-bg','#fffbf1':'--amber-bg','#fefce8':'--amber-bg','#fffde7':'--amber-bg','#fff8e1':'--amber-bg',
  '#fef4f4':'--neg-bg','#fff1f0':'--neg-bg',
  '#f0fdfa':'--pos-bg','#f0fff4':'--pos-bg','#ebfbf1':'--pos-bg',
  '#f0f9ff':'--blue-soft','#ecfeff':'--blue-soft','#e8f0fe':'--blue-soft','#bfdbfe':'--blue-soft','#edf2ff':'--violet-bg',
  '#ff746c':'--neg','#dc2626':'--neg','#16a34a':'--pos','#2563eb':'--blue','#fbbf24':'--prod','#93c5fd':'--blue-soft',
  '#3730a3':'--violet','#6b21a8':'--violet','#0b6':'--pos','#0a8':'--pos',
  '#1a1a1a':'--nav','#000':'--nav','#000000':'--nav',
  // --- pass 3 tail ---
  '#f5f8ff':'--hover','#faf5ff':'--violet-bg','#fcfcfd':'--card','#e8e8f4':'--violet-bg','#f5f5f3':'--hover','#f8faff':'--hover',
  '#eaf3de':'--pos-bg','#faeeda':'--amber-bg','#fdf3e0':'--amber-bg','#fed7aa':'--amber-bg','#fef08a':'--amber-bg','#fdeaea':'--neg-bg','#fff5f5':'--neg-bg',
  '#ef9f27':'--prod','#97c459':'--pos','#7c3aed':'--violet','#e0e0de':'--line','#e7ebf2':'--line2',
  '#f54927':'--neg','#f87c63':'--neg','#e0e7ff':'--violet-bg','#f2f8ff':'--blue-soft','#e0f0fb':'--blue-soft','#c9e5f7':'--blue-soft','#ddd6fe':'--violet-bg','#4c9be0':'--blue',
};

// hex -> token, for COLOR (text) contexts. #fff/#ffffff deliberately NOT here (white text usually sits on a
// coloured/dark control and should stay white). Dark inks flip to light; semantic text keeps its hue via the vivid token.
const TX = {
  '#0f172a':'--ink','#111827':'--ink','#1a1a1a':'--ink','#111':'--ink','#0a0a0a':'--ink','#000':'--ink','#000000':'--ink','#222':'--ink','#101828':'--ink',
  '#333':'--ink-soft','#334155':'--ink-soft','#1f2937':'--ink-soft','#374151':'--ink-soft','#3f3f46':'--ink-soft','#344054':'--ink-soft',
  '#444':'--muted','#475569':'--muted','#555':'--muted','#64748b':'--muted','#64758b':'--muted','#666':'--muted','#6b7280':'--muted','#4b5563':'--muted','#525252':'--muted','#5b6b83':'--muted',
  '#888':'--faint','#94a3b8':'--faint','#9ca3af':'--faint','#999':'--faint','#aaa':'--faint','#8b98ad':'--faint','#777':'--faint','#7c93b8':'--faint',
  '#16a34a':'--pos','#166534':'--pos','#15803d':'--pos','#22c55e':'--pos','#118a4e':'--pos','#14532d':'--pos',
  '#dc2626':'--neg','#b91c1c':'--neg','#ef4444':'--neg','#991b1b':'--neg','#d23227':'--neg','#7f1d1d':'--neg',
  '#b45309':'--amber','#92400e':'--amber','#d97706':'--amber','#854d0e':'--amber','#9a3412':'--amber',
  '#2563eb':'--blue','#1d4ed8':'--blue','#2361d8':'--blue','#1e40af':'--blue-ink','#1a4fb5':'--blue-ink','#1e3a8a':'--blue-ink',
  '#7c3aed':'--violet','#6d28d9':'--violet','#5b21b6':'--violet',
  // --- extended stragglers (dark/semantic text only; light-on-dark text like #7dd3fc/#a78bfa/#cbd5e1 left untouched on purpose) ---
  '#9e2b1f':'--neg','#a32d2d':'--neg','#b1382c':'--neg',
  '#7c2d12':'--amber','#92710a':'--amber','#9a3412':'--amber','#f59e0b':'--amber',
  '#0369a1':'--blue-ink','#075985':'--blue-ink','#1f6fb2':'--blue','#0891b2':'--blue','#0e7490':'--blue','#06283d':'--ink','#1e3a8a':'--blue-ink',
  '#6b21a8':'--violet','#3b0764':'--violet',
  '#0f766e':'--pos','#065f46':'--pos','#14532d':'--pos',
  '#44403c':'--ink-soft','#3f3f46':'--ink-soft',
  // --- pass 3 tail (dark/semantic text only) ---
  '#166d43':'--pos','#059669':'--pos','#2e6f40':'--pos','#0f3d22':'--pos',
  '#be185d':'--neg',
  '#9a6a3a':'--amber','#713f12':'--amber',
  '#3730a3':'--violet','#4f46e5':'--violet','#4338ca':'--violet','#4c1d95':'--violet',
  '#0b3a66':'--blue-ink','#bbb':'--faint',
};

let src = fs.readFileSync(file, 'utf8');
let nBg = 0, nTx = 0;
const missBg = {}, missTx = {};

// BACKGROUND: match `background:` or `background-color:` then optional space then #hex
src = src.replace(/(background(?:-color)?\s*:\s*)#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, (full, pre, hex) => {
  const k = ('#' + hex).toLowerCase();
  const t = BG[k];
  if (!t) { missBg[k] = (missBg[k] || 0) + 1; return full; }
  nBg++; return pre + 'var(' + t + ')';
});

// COLOR (text): `color:` NOT preceded by '-' (so not background-color/border-color/outline-color/…) or a word char
src = src.replace(/(^|[^-\w])(color\s*:\s*)#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, (full, lead, pre, hex) => {
  const k = ('#' + hex).toLowerCase();
  const t = TX[k];
  if (!t) { missTx[k] = (missTx[k] || 0) + 1; return full; }
  nTx++; return lead + pre + 'var(' + t + ')';
});

if (!dry) fs.writeFileSync(file, src);
const topMiss = (o) => Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,15).map(([h,c])=>h+'×'+c).join('  ');
console.log(file + (dry ? ' [DRY]' : ''));
console.log('  background hex → token: ' + nBg);
console.log('  color hex → token:      ' + nTx);
console.log('  UNMAPPED background hex (left as-is): ' + (topMiss(missBg) || 'none'));
console.log('  UNMAPPED color hex (left as-is):      ' + (topMiss(missTx) || 'none'));
