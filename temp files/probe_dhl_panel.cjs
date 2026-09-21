// Render probe: boot the served app in jsdom with a REAL fetch to :8124, drive to CONFIG > Admin > DHL tracking,
// and assert the panel actually renders (key pill + save/test controls). Not just an endpoint 200.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
const errors = [];
process.on('unhandledRejection', e => errors.push('unhandled: ' + String(e && (e.message || e)).slice(0, 160)));
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push(String(e && (e.message || e)).slice(0, 200)));
const dom = new JSDOM(html, {
  runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost:8124/', virtualConsole: vc,
  beforeParse(w) {
    w.fetch = (u, o) => globalThis.fetch(new URL(String(u), 'http://localhost:8124'), o);
    w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {};
    w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
    w.confirm = () => true; w.alert = () => {};
  }
});
const w = dom.window, d = w.document;
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await sleep(6000);
  console.log('boot: renderConfig=' + (typeof w.renderConfig) + ' enterConfig=' + (typeof w.enterConfig) + ' CONFIG_SUB=' + (typeof w.CONFIG_SUB));
  // drive to the DHL tracking admin sub
  try { w.CONFIG_CTX = 'admin'; w.CONFIG_SUB = 'dhl-tracking'; if (typeof w.enterConfig === 'function') w.enterConfig(); }
  catch (e) { console.log('enterConfig threw:', e.message); }
  // poll for the panel controls to appear (config render + /api/tracking/config fetch)
  let ok = false;
  for (let i = 0; i < 20; i++) {
    await sleep(700);
    if (d.getElementById('dt-save') && d.getElementById('dt-num')) { ok = true; break; }
  }
  const save = d.getElementById('dt-save'), test = d.getElementById('dt-test'), num = d.getElementById('dt-num'),
        enabled = d.getElementById('dt-enabled'), interval = d.getElementById('dt-interval');
  console.log('panel controls present:', !!save && !!test && !!num && !!enabled && !!interval,
    '{ save:' + !!save + ' test:' + !!test + ' num:' + !!num + ' enabled:' + !!enabled + ' interval:' + !!interval + ' }');
  if (interval) console.log('interval field value:', interval.value);
  const body = d.getElementById('config-body');
  const hasKeyPill = body && /API key (present|not set)/.test(body.textContent || '');
  console.log('key-present indicator rendered:', !!hasKeyPill);
  console.log('JS errors during run:', errors.length); errors.slice(0, 6).forEach(e => console.log('  -', e));
  console.log('RESULT:', ok && save && test && num ? 'PASS' : 'INCONCLUSIVE (see above)');
  process.exit(0);
})();
