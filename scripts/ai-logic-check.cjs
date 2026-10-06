#!/usr/bin/env node
// v28.166 (Ben): staleness check for the Ask Claude APP LOGIC library (lib/ai-logic/*.md).
// Each logic file lists `sources:` (file :: functionName) and a `fingerprints:` map (file::fn: sha1 first 12 chars of the
// function's text). This script re-hashes every source function and reports per file:
//   OK      every fingerprint matches
//   STALE   a source function changed since the file was last verified (re-read the code, fix the rules, then --update)
//   MISSING a source function (or file) can't be found, or has no fingerprint yet
// Usage:
//   node scripts/ai-logic-check.cjs                 check all files; exit 1 if any STALE or MISSING
//   node scripts/ai-logic-check.cjs --update <topic> after re-verifying that topic: rewrite its fingerprints + verified_version
//                                                    (package.json version; `--version v28.166` overrides it)
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..'), DIR = path.join(ROOT, 'lib', 'ai-logic');

function parseFront(txt) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(txt); if (!m) return null;
  const meta = { sources: [], fingerprints: {} }; let cur = null;
  m[1].split(/\r?\n/).forEach(l => { if (!l.trim()) return;
    const li = /^\s+-\s+(.*)$/.exec(l); if (li && cur === 'sources') { meta.sources.push(li[1].trim()); return; }
    const kv = /^\s+(\S.*?):\s+(\S+)\s*$/.exec(l); if (kv && cur === 'fingerprints') { meta.fingerprints[kv[1]] = kv[2]; return; }
    const top = /^([A-Za-z_]+):\s*(.*)$/.exec(l); if (top) { cur = top[1]; if (!['sources', 'fingerprints'].includes(cur)) meta[cur] = top[2].trim(); } });
  return { meta, head: m[0], body: txt.slice(m[0].length) };
}

// Find a function's full text: `function name(`, `name = function`, `name: function`, or `const|let|var name = (...) =>`.
// From the match, take everything up to the matching close brace (skipping strings, template literals and comments).
const srcCache = {};
function fnText(file, name) {
  const fp = path.join(ROOT, file); if (!fs.existsSync(fp)) return null;
  const src = srcCache[fp] || (srcCache[fp] = fs.readFileSync(fp, 'utf8'));
  // v28.166: a .sql migration is fixed once applied, so a whole-file hash is the right fingerprint
  if (/\.sql$/.test(file)) return src;
  // v28.166: an Express route (`/api/...`) or a `case 'x':` block inside a route handler
  if (/^\//.test(name)) { const re = new RegExp("\\bapp\\.(?:get|post|put|patch|delete|all)\\(\\s*['\"`]" + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "['\"`]"); const m = re.exec(src); return m ? blockFrom(src, m.index) : null; }
  const cs = /^case\s+'([^']+)'$/.exec(name); if (cs) { const at = src.indexOf("case '" + cs[1] + "'"); if (at < 0) return null; const nx = src.slice(at + 6).search(/\n\s*(?:case\s+'|default\s*:)/); return src.slice(at, nx < 0 ? at + 4000 : at + 6 + nx); }
  const n = name.replace(/[$]/g, '\\$');
  const pats = [new RegExp('(?:async\\s+)?function\\s*\\*?\\s*' + n + '\\s*\\('), new RegExp('\\b' + n + '\\s*[:=]\\s*(?:async\\s+)?function\\b'),
    new RegExp('\\b(?:const|let|var)\\s+' + n + '\\s*=\\s*(?:async\\s*)?(?:\\([^)]*\\)|[A-Za-z_$][\\w$]*)\\s*=>'), new RegExp('\\b(?:const|let|var)\\s+' + n + '\\s*=\\s*(?:`|\\{|\\[)')];
  let at = -1; for (const re of pats) { const m = re.exec(src); if (m) { at = m.index; break; } }
  if (at < 0) { const cm = new RegExp('\\b(?:const|let|var)\\s+' + n + '\\s*=[^\\n]*').exec(src); return cm && /;\s*$/.test(cm[0]) ? cm[0] : null; }
  if (/=\s*`$/.test(src.slice(at, src.indexOf('`', at) + 1))) return blockFrom(src, at);
  let i = src.indexOf('{', at); if (i < 0) return null;
  // arrow with an expression body: no brace before the end of the line
  const eol = src.indexOf('\n', at); if (eol >= 0 && i > eol && /=>/.test(src.slice(at, eol))) return src.slice(at, eol);
  let depth = 0;
  for (; i < src.length; i++) { const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { i = src.indexOf('\n', i); if (i < 0) break; continue; }
    if (c === '/' && d === '*') { i = src.indexOf('*/', i + 2) + 1; if (i <= 0) break; continue; }
    if (c === '"' || c === "'" || c === '`') { const q = c; i++; while (i < src.length && src[i] !== q) { if (src[i] === '\\') i++; else if (q !== '`' && src[i] === '\n') break; i++; } continue; }
    if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) return src.slice(at, i + 1); } }
  return blockFrom(src, at);
}
// v28.166: fallback for code the brace scanner can't follow (regex literals with quotes, etc.): from the definition line to the
// first later line that closes at column 0 (`}` / `});` / a closing backtick). Every top-level function in these files ends that way.
function blockFrom(src, at) {
  const ls = src.lastIndexOf('\n', at) + 1, rest = src.slice(ls), m = /\n(?:\}[^\n]*|`[^\n]*)(?=\n|$)/.exec(rest);
  return m ? rest.slice(0, m.index + m[0].length) : null;
}
const hash = t => crypto.createHash('sha1').update(t).digest('hex').slice(0, 12);
// v28.166: a source line may name several items (`file :: a, b, /api/x`) and carry a note in brackets; each item gets its own fingerprint.
const keysOf = s => { const [f, rest] = s.split('::').map(x => x.trim()); if (!rest) return [{ file: f, fn: f, key: f + '::*' }];
  const clean = rest.replace(/\([^)]*\)/g, '').trim(); let base = '';
  return clean.split(/\s*,\s*/).filter(Boolean).map(fn => { fn = fn.trim(); if (/^\/api\//.test(fn)) base = fn.replace(/\/[^/]*$/, ''); else if (/^\/[^/]+$/.test(fn) && base) fn = base + fn; return { file: f, fn, key: f + '::' + fn }; }); };

const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter(f => f.endsWith('.md')).sort() : [];
const args = process.argv.slice(2), upd = args[0] === '--update' ? args[1] : null;
if (args[0] === '--update' && !upd) { console.error('usage: --update <topic>'); process.exit(2); }
let bad = 0, updated = false;
for (const f of files) {
  const fp = path.join(DIR, f), txt = fs.readFileSync(fp, 'utf8'), pf = parseFront(txt);
  if (!pf) { console.log('MISSING  ' + f + ': no front matter'); bad++; continue; }
  const topic = pf.meta.topic || f.replace(/\.md$/, '');
  const now = {}, issues = [];
  pf.meta.sources.flatMap(keysOf).forEach(k => { const t = fnText(k.file, k.fn); if (t == null) { issues.push('MISSING ' + k.key + ' (function not found)'); return; } now[k.key] = hash(t);
    const was = pf.meta.fingerprints[k.key]; if (!was) issues.push('MISSING ' + k.key + ' (no fingerprint)'); else if (was !== now[k.key]) issues.push('STALE   ' + k.key + ' (' + was + ' -> ' + now[k.key] + ')'); });
  if (upd && upd === topic) {
    const vi = args.indexOf('--version'), ver = 'v' + String(vi > 0 && args[vi + 1] ? args[vi + 1] : JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version).replace(/^v/, '');
    let head = pf.head.replace(/^verified_version:.*$/m, 'verified_version: ' + ver);
    const fpBlock = 'fingerprints:\n' + Object.keys(now).map(k => '  ' + k + ': ' + now[k]).join('\n');
    head = /^fingerprints:/m.test(head) ? head.replace(/^fingerprints:[^\n]*(?:\n[ \t]+[^\n]*)*/m, fpBlock) : head.replace(/\r?\n---\r?\n?$/, '\n' + fpBlock + '\n---\n');
    fs.writeFileSync(fp, head + pf.body); updated = true;
    console.log('UPDATED  ' + topic + ': ' + Object.keys(now).length + ' fingerprints, verified_version ' + ver + (issues.some(x => x.startsWith('MISSING') && /not found/.test(x)) ? ' (WARNING: some sources not found)' : ''));
    continue;
  }
  if (!issues.length) console.log('OK       ' + topic + ' (' + Object.keys(now).length + ' sources, verified ' + (pf.meta.verified_version || '?') + ')');
  else { bad++; const st = issues.some(x => x.startsWith('STALE')) ? 'STALE  ' : 'MISSING'; console.log(st + '  ' + topic + ' (verified ' + (pf.meta.verified_version || '?') + ')'); issues.forEach(x => console.log('           ' + x)); }
}
if (upd && !updated) { console.error('no logic file with topic "' + upd + '"'); process.exit(2); }
process.exit(bad && !upd ? 1 : 0);
