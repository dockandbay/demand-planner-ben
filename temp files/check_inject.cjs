// Syntax-check every <script> block in a served HTML fragment by compiling it with vm (throws on parse error).
const fs = require('fs'), vm = require('vm');
const html = fs.readFileSync(process.argv[2], 'utf8');
const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let m, i = 0, bad = 0;
while ((m = re.exec(html))) {
  const code = m[1];
  if (!code.trim()) continue;
  i++;
  try { new vm.Script(code, { filename: 'block' + i }); }
  catch (e) { bad++; console.log(`BLOCK ${i} SYNTAX ERROR: ${e.message}`); const ln = (e.stack.match(/block\d+:(\d+)/) || [])[1]; if (ln) { const lines = code.split('\n'); console.log('  near:', (lines[ln-1]||'').trim().slice(0,120)); } }
}
console.log(`checked ${i} script block(s), ${bad} with errors`);
process.exit(bad ? 1 : 0);
