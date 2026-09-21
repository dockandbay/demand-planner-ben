// Isolated render of the new SUBS['dhl-tracking'] panel: extract it from inject.html, provide the same
// free vars the app gives it (b = config-body, esc), wire a REAL fetch to :8124, run it, assert the DOM.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const src = fs.readFileSync('supply/inject.html', 'utf8');
const a = src.indexOf("SUBS['dhl-tracking']=function");
const b = src.indexOf("SUBS['permissions']=function");
if (a < 0 || b < 0) { console.log('COULD NOT LOCATE renderer'); process.exit(1); }
const code = src.slice(a, b).replace("SUBS['dhl-tracking']=", 'var render=').trim().replace(/;$/, '') + ';';

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push(String(e && (e.message || e)).slice(0, 200)));
const dom = new JSDOM('<!doctype html><body><div id="config-body"></div></body>', {
  runScripts: 'outside-only', url: 'http://localhost:8124/', virtualConsole: vc,
});
const w = dom.window, d = w.document;
w.fetch = (u, o) => globalThis.fetch(new URL(String(u), 'http://localhost:8124'), o);
w.eval(`
  var b = document.getElementById('config-body');
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  ${code}
  render();
`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let ok = false;
  for (let i = 0; i < 15; i++) { await sleep(400); if (d.getElementById('dt-save') && d.getElementById('dt-num')) { ok = true; break; } }
  const ids = ['dt-enabled','dt-interval','dt-transit','dt-stop','dt-save','dt-poll','dt-num','dt-test','dt-result'];
  const present = ids.filter(id => d.getElementById(id));
  console.log('controls rendered:', present.length + '/' + ids.length, '->', present.join(', '));
  const iv = d.getElementById('dt-interval'), tr = d.getElementById('dt-transit'), st = d.getElementById('dt-stop');
  if (iv) console.log('field values from live config:  interval=' + iv.value + '  transit=' + tr.value + '  stop_days=' + st.value);
  const bodyTxt = d.getElementById('config-body').textContent || '';
  console.log('key-present indicator:', /API key (present|not set)/.test(bodyTxt) ? 'rendered' : 'MISSING');
  console.log('annot header:', /DHL Unified Shipment Tracking API/.test(bodyTxt) ? 'rendered' : 'MISSING');
  console.log('JS errors:', errors.length); errors.slice(0, 6).forEach(e => console.log('  -', e));
  console.log('RESULT:', ok && present.length === ids.length ? 'PASS' : 'FAIL/PARTIAL');
  process.exit(0);
})();
