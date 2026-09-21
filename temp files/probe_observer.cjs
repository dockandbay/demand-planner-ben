// v27.723 verify: boot the served app (installs the auto-fill observer), inject a .hz-trkpill placeholder,
// and confirm the observer populates it from a seeded cache row via the real endpoint. Cleans up.
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const env = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
const url = (env.match(/^DATABASE_URL=(.*)$/m) || [])[1].trim().replace(/^["']|["']$/g, '');
const { Client } = require('pg');
const html = fs.readFileSync('temp files/_root.html', 'utf8');
const N = 'PROBE_OBS_723';
const errors = [];
const vc = new VirtualConsole(); vc.on('jsdomError', e => errors.push(String(e && (e.message || e)).slice(0, 160)));
(async () => {
  const c = new Client({ connectionString: url }); await c.connect();
  await c.query(`INSERT INTO planner.carrier_tracking (tracking_number,carrier,status_code,status_text,eta,events,last_polled_at)
    VALUES ($1,'DHL','transit','In transit','2026-09-20','[]'::jsonb,now())
    ON CONFLICT (tracking_number) DO UPDATE SET status_code='transit',status_text='In transit',eta='2026-09-20',last_polled_at=now()`, [N]);

  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost:8124/', virtualConsole: vc,
    beforeParse(w) {
      w.fetch = (u, o) => globalThis.fetch(new URL(String(u), 'http://localhost:8124'), o);
      w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {};
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
    } });
  const w = dom.window, d = w.document;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  await sleep(5000);
  // inject a placeholder AFTER boot — the observer should notice and fill it
  const span = d.createElement('span'); span.className = 'hz-trkpill'; span.setAttribute('data-trk', N);
  d.body.appendChild(span);
  let filled = false;
  for (let i = 0; i < 15; i++) { await sleep(300); if (!span.getAttribute('data-trk') && /In transit/.test(span.textContent || '')) { filled = true; break; } }
  console.log('observer auto-filled the injected placeholder:', filled);
  console.log('pill text:', JSON.stringify((span.textContent || '').trim()));
  console.log('boot JS errors:', errors.length); errors.slice(0, 4).forEach(e => console.log('  -', e));
  await c.query(`DELETE FROM planner.carrier_tracking WHERE tracking_number=$1`, [N]);
  console.log('cleaned up.');
  console.log('RESULT:', filled ? 'PASS' : 'FAIL');
  await c.end(); process.exit(0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
