// v28.178 (Ben): dev check for the demand Web Worker (perf #7.3). The worker is built from the engine's own function sources, so
// every top-level function _hzDemandGen can reach must be in _hzWorkerFns() and every top-level variable it reads must be in
// _HZ_W_VARS (posted by _hzWorkerData, or reset in the worker). A missing function fails loudly (ReferenceError → chunked fallback +
// health event); a missing variable behind a `typeof X` guard would silently differ, which is what this script catches.
// Usage: npm i --no-save acorn acorn-walk && node scripts/dev/demand-worker-closure.cjs   (exit 1 on a mismatch)
const fs = require('fs'), path = require('path'), acorn = require('acorn'), walk = require('acorn-walk');
const html = fs.readFileSync(path.join(__dirname, '../../artifact_v16.7.html'), 'utf8');
const off = html.indexOf('<script>') + 8, src = html.slice(off, html.indexOf('</script>', off));
const ast = acorn.parse(src, { ecmaVersion: 2022, sourceType: 'script' });
const top = {};
for (const st of ast.body) {
  if (st.type === 'FunctionDeclaration') top[st.id.name] = { fn: true, node: st };
  else if (st.type === 'VariableDeclaration') for (const d of st.declarations) if (d.id.type === 'Identifier') top[d.id.name] = { fn: !!(d.init && /Function/.test(d.init.type)), node: d };
}
function free(node) {
  const decl = new Set(), used = new Set();
  walk.full(node, n => {
    if (n.type === 'VariableDeclarator') walk.full(n.id, q => { if (q.type === 'Identifier') decl.add(q.name); });
    if ((n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression') && n.id && n !== node) decl.add(n.id.name);
    if (/Function/.test(n.type)) for (const p of n.params) walk.full(p, q => { if (q.type === 'Identifier') decl.add(q.name); });
    if (n.type === 'CatchClause' && n.param) walk.full(n.param, q => { if (q.type === 'Identifier') decl.add(q.name); });
  });
  walk.ancestor(node, { Identifier(n, anc) { const p = anc[anc.length - 2];
    if (p && p.type === 'MemberExpression' && p.property === n && !p.computed) return;
    if (p && p.type === 'Property' && p.key === n && !p.computed && !p.shorthand) return;
    if (p && (p.type === 'LabeledStatement' || p.type === 'BreakStatement' || p.type === 'ContinueStatement')) return;
    used.add(n.name); } });
  return [...used].filter(x => !decl.has(x));
}
const fns = new Set(), vars = new Set(), q = ['_hzDemandGen'];
while (q.length) { const f = q.pop(); if (fns.has(f)) continue; fns.add(f);
  for (const x of free(top[f].node)) { if (!top[x]) continue; if (top[x].fn) q.push(x); else vars.add(x); } }
const body = n => src.slice(top[n].node.start, top[n].node.end);
const listed = new Set((body('_hzWorkerFns').match(/return \[([\s\S]*?)\]/)[1]).split(',').map(s => s.trim()).filter(Boolean));
const wv = new Set(body('_HZ_W_VARS').replace(/^_HZ_W_VARS=/, '').replace(/['+\s]/g, '').split(',').filter(Boolean));
const missF = [...fns].filter(f => !listed.has(f)), extraF = [...listed].filter(f => !fns.has(f));
const missV = [...vars].filter(v => !wv.has(v));
console.log('engine functions', fns.size, '· data globals', vars.size);
console.log('functions missing from _hzWorkerFns:', missF.join(', ') || 'none', '· listed but unused:', extraF.join(', ') || 'none');
console.log('globals missing from _HZ_W_VARS:', missV.join(', ') || 'none');
process.exit(missF.length || missV.length ? 1 : 0);
