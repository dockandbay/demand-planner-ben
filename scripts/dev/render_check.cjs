// jsdom render check: load the served app HTML, run its scripts with a stubbed fetch, report JS errors + shell DOM.
const { JSDOM, VirtualConsole } = require('/Users/bm/Documents/CLAUDE/horizon-demand-and-supply-planner/node_modules/jsdom');
const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8');
const errors = []; process.on('unhandledRejection', e => errors.push('unhandled: ' + String(e && (e.message || e)).slice(0, 160))); process.on('uncaughtException', e => errors.push('uncaught: ' + String(e && (e.message || e)).slice(0, 160))); const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push(String(e && (e.message || e)).slice(0, 200)));
vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ').slice(0, 160)));
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost:8124/', virtualConsole: vc,
  beforeParse(w) {
    w.fetch = (u) => Promise.resolve({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: () => Promise.resolve(/\/api\/(me|version|portal\/bootstrap|supply\/perm|config\/permissions)/.test(String(u)) ? {} : []), text: () => Promise.resolve('') });
    w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {};
    w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
    w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  } });
setTimeout(() => {
  const d = dom.window.document;
  const row = d.getElementById('view-tabs-row');
  const kids = row ? [...row.children].map(e => (e.id || e.className || e.tagName).toString().slice(0, 24) + (e.textContent.trim() ? ':' + e.textContent.trim().slice(0, 14) : '')) : ['NO ROW'];
  console.log('top bar children:', kids.join(' | '));
  console.log('theme link:', !!d.querySelector('link[href^="/hz-theme.css"]'));
  console.log('L2 bars:', ['demand-tabs', 'supply-subnav', 'buymove-tabs', 'report-tabs'].map(id => { const e = d.getElementById(id); return id + '=' + (e ? (e.className || 'present') : 'absent'); }).join(' '));
  console.log('JS errors:', errors.length); errors.slice(0, 8).forEach(e => console.log('  -', e));
  process.exit(0);
}, 9000);
