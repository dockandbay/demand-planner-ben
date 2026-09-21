// v27.718 validation: exercise the poller's SQL paths without a DHL key. Sandbox only. Cleans up after itself.
const fs = require('fs'), path = require('path');
const env = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
const url = (env.match(/^DATABASE_URL=(.*)$/m) || [])[1].trim().replace(/^["']|["']$/g, '');
const { Client } = require('pg');
(async () => {
  const c = new Client({ connectionString: url });
  await c.connect();
  // 1) collectTrackingNumbers SELECTs must be valid SQL (return 0+ rows, no error)
  const sr = await c.query(`SELECT count(*)::int n FROM planner.sample_requests WHERE (carrier ILIKE 'dhl%' AND coalesce(tracking_code,'')<>'') OR (carrier_2 ILIKE 'dhl%' AND coalesce(tracking_code_2,'')<>'')`);
  const sh = await c.query(`SELECT count(*)::int n FROM planner.shipments WHERE carrier ILIKE 'dhl%' AND coalesce(carrier_ref,'')<>''`);
  console.log('collect selects OK — DHL sample rows:', sr.rows[0].n, '| DHL shipment rows:', sh.rows[0].n);
  // 2) upsert INSERT...ON CONFLICT round-trips (stub row, then upsert again to hit the conflict branch)
  const num = '__PROBE_DHL_0001';
  const upsert = `INSERT INTO planner.carrier_tracking (tracking_number,carrier,status_code,status_text,eta,delivered_at,last_event,events,last_polled_at,source_table,source_id,updated_at)
    VALUES ($1,'DHL',$2,$3,$4,$5,$6,$7::jsonb,now(),'shipments','__PROBE_REF',now())
    ON CONFLICT (tracking_number) DO UPDATE SET status_code=excluded.status_code, status_text=excluded.status_text, eta=excluded.eta, delivered_at=excluded.delivered_at, last_event=excluded.last_event, events=excluded.events, last_polled_at=now(), updated_at=now()`;
  await c.query(upsert, [num, 'transit', 'In transit', '2026-09-19', null, 'Departed facility', JSON.stringify([{ description: 'Departed facility' }])]);
  await c.query(upsert, [num, 'delivered', 'Delivered', '2026-09-18', '2026-09-18T14:03:00Z', 'Delivered to recipient', JSON.stringify([{ description: 'Delivered to recipient' }])]);
  const row = (await c.query(`SELECT tracking_number,status_code,to_char(eta,'YYYY-MM-DD') eta,delivered_at,last_event FROM planner.carrier_tracking WHERE tracking_number=$1`, [num])).rows[0];
  console.log('upsert+conflict OK — row now:', JSON.stringify(row));
  // 3) shipments write-back UPDATE is valid SQL (0 rows matched on the fake ref is fine)
  const wb = await c.query(`UPDATE planner.shipments SET tracked_delivery_date=$1, tracked_source='dhl', updated_at=now() WHERE carrier_ref=$2 AND carrier ILIKE 'dhl%'`, ['2026-09-18', '__PROBE_REF']);
  console.log('shipments write-back SQL OK — rows matched:', wb.rowCount);
  // cleanup
  await c.query(`DELETE FROM planner.carrier_tracking WHERE tracking_number=$1`, [num]);
  console.log('cleaned up probe row.');
  await c.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
