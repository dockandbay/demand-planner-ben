// v27.720 verify: seed 2 cache rows, extract the pill helpers from inject.html, run hzFillTrackPills against
// the REAL /api/tracking/status in jsdom, assert both placeholders become correct pills. Cleans up the rows.
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const env = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
const url = (env.match(/^DATABASE_URL=(.*)$/m) || [])[1].trim().replace(/^["']|["']$/g, '');
const { Client } = require('pg');

const src = fs.readFileSync('supply/inject.html', 'utf8');
const a = src.indexOf('function hzTrkDate(');
const b = src.indexOf('exposed for jsdom render probes');
if (a < 0 || b < 0) { console.log('COULD NOT EXTRACT helpers'); process.exit(1); }
const helpers = src.slice(a, src.lastIndexOf('try{', b)).trim();   // hzTrkDate + hzTrackPillHtml + hzFillTrackPills

const N1 = 'PROBE_DHL_720_A', N2 = 'PROBE_DHL_720_B';
(async () => {
  const c = new Client({ connectionString: url });
  await c.connect();
  const put = (n, code, text, eta, del, ev) => c.query(
    `INSERT INTO planner.carrier_tracking (tracking_number,carrier,status_code,status_text,eta,delivered_at,last_event,events,last_polled_at)
     VALUES ($1,'DHL',$2,$3,$4,$5,$6,'[]'::jsonb,now())
     ON CONFLICT (tracking_number) DO UPDATE SET status_code=excluded.status_code,status_text=excluded.status_text,eta=excluded.eta,delivered_at=excluded.delivered_at,last_event=excluded.last_event,last_polled_at=now()`,
    [n, code, text, eta, del, ev]);
  await put(N1, 'transit', 'In transit', '2026-09-19', null, 'Departed DHL facility');
  await put(N2, 'delivered', 'Delivered', '2026-09-18', '2026-09-18T14:03:00Z', 'Delivered to recipient');

  const dom = new JSDOM('<!doctype html><body><span class="hz-trkpill" data-trk="' + N1 + '"></span><span class="hz-trkpill" data-trk="' + N2 + '"></span></body>', { runScripts: 'outside-only', url: 'http://localhost:8124/' });
  const w = dom.window, d = w.document;
  w.fetch = (u, o) => globalThis.fetch(new URL(String(u), 'http://localhost:8124'), o);
  w.eval('function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\\"/g,"&quot;");}\n' + helpers + '\nhzFillTrackPills(document);');

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let ok = false;
  for (let i = 0; i < 15; i++) { await sleep(300); if (!d.querySelector('.hz-trkpill[data-trk]')) { ok = true; break; } }
  const spans = [].slice.call(d.querySelectorAll('span'));
  const texts = spans.map(s => (s.textContent || '').trim()).filter(t => t);
  console.log('pills filled (no placeholders left):', ok);
  console.log('rendered pill text:', JSON.stringify(texts));
  const hasTransit = texts.some(t => /In transit/.test(t) && /ETA 19-Sep-26/.test(t));
  const hasDelivered = texts.some(t => /Delivered/.test(t) && /18-Sep-26/.test(t));
  console.log('transit pill (ETA 19-Sep-26):', hasTransit, '| delivered pill (18-Sep-26):', hasDelivered);

  await c.query(`DELETE FROM planner.carrier_tracking WHERE tracking_number = ANY($1)`, [[N1, N2]]);
  console.log('cleaned up seeded rows.');
  console.log('RESULT:', ok && hasTransit && hasDelivered ? 'PASS' : 'FAIL');
  await c.end();
  process.exit(0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
