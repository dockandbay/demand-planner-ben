import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
for (const path of process.argv.slice(2)) {
  const buf = readFileSync(path);
  try { const d = await pdfParse(buf); console.log(`\n===== ${path.split('/').pop()} (pages ${d.numpages}) =====`); console.log(d.text.replace(/\n{3,}/g,'\n\n').slice(0,3500)); }
  catch(e){ console.log(`\n===== ${path.split('/').pop()} FAIL ${e.message}`); }
}
