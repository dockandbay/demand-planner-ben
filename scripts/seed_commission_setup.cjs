// v28.326: seed the commission set-up from Ben's lists (Claude Analyses/COMMISSION_SEED_2026-10-13.csv): agencies with their rate,
// currency (from the history's order prefixes) and Fulfil agent codes; customer rates; order overrides. Idempotent (upsert by name / order).
// Ben 13-Oct-26: ignore Ideco12; leave out Les Raffineurs (blank); Schauben = Appelman (the live group "Shauben" is renamed).
// Usage: node scripts/seed_commission_setup.cjs [--db ENV_NAME]
const fs = require('fs'); const { Client } = require('pg');
try { process.loadEnvFile('.env'); } catch (_) {}
const dbEnv = process.argv.includes('--db') ? process.argv[process.argv.indexOf('--db') + 1] : 'DATABASE_URL';
const CUR = { 'Agent - Schauben': 'USD', 'Agent - Harper Group': 'USD', 'Agent - Patrickco': 'USD', 'Agent - Roadrunner': 'USD', 'Agent - Pablo': 'USD', 'Agent - Ideco': 'EUR', 'Agent - TJ': 'EUR', 'Agent - Spruce': 'CAD', 'Agent - TR Partners': 'GBP', 'Agent - UK': 'GBP', 'UK - National Trust': 'GBP' };
const CODES = { 'Agent - Schauben': ['appelman'], 'Agent - Harper Group': ['harpergroup', 'harpers'], 'Agent - Ideco': ['ideco'], 'Agent - TJ': ['TJ'], 'Agent - Patrickco': ['patrick'], 'Agent - Roadrunner': ['roadrunners'] };
const NO_COMM = new Set(['Agent - Faire', 'No Agent', 'Agent - UK', 'Distributors', 'UK - National Trust']);
const SKIP = new Set(['Agent - Ideco12', 'Les Raffineurs']);
(async () => {
  const rows = fs.readFileSync('Claude Analyses/COMMISSION_SEED_2026-10-13.csv', 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).slice(1).map(l => l.split(','));
  const c = new Client({ connectionString: process.env[dbEnv], ssl: { rejectUnauthorized: false } }); await c.connect();
  try { await c.query('BEGIN');
    await c.query(`UPDATE planner.rep_groups SET name='Agent - Schauben' WHERE name IN ('Shauben','Schauben') AND NOT EXISTS (SELECT 1 FROM planner.rep_groups WHERE name='Agent - Schauben')`);
    const gid = {}; let ag = 0, cr = 0, ov = 0;
    for (const [t, key, rate] of rows) { if (t !== 'agency' || SKIP.has(key)) continue;
      const r = await c.query(`INSERT INTO planner.rep_groups (name, default_rate, currency, currency_checked, fulfil_codes, no_commission, xero_group_uk_name) VALUES ($1,$2,$3,$4,$5,$6,$1)
        ON CONFLICT (name) DO UPDATE SET default_rate=EXCLUDED.default_rate, currency=CASE WHEN planner.rep_groups.currency_checked THEN planner.rep_groups.currency ELSE EXCLUDED.currency END,
          fulfil_codes=CASE WHEN cardinality(planner.rep_groups.fulfil_codes)>0 THEN planner.rep_groups.fulfil_codes ELSE EXCLUDED.fulfil_codes END, no_commission=EXCLUDED.no_commission,
          xero_group_uk_name=coalesce(planner.rep_groups.xero_group_uk_name, EXCLUDED.xero_group_uk_name) RETURNING id`,
        [key, Number(rate) || 0, CUR[key] || 'USD', !!CUR[key], CODES[key] || [], NO_COMM.has(key)]); gid[key] = r.rows[0].id; ag++; }
    for (const [t, key, rate, , , note] of rows) { if (t !== 'customer' || SKIP.has(key) || rate === '') continue;
      await c.query(`INSERT INTO planner.commission_customer_rates (customer_name, rate, note, created_by) VALUES ($1,$2,$3,'seed') ON CONFLICT (lower(customer_name)) DO UPDATE SET rate=EXCLUDED.rate`, [key, Number(rate), note || null]); cr++; }
    for (const [t, key, rate, alt, amt] of rows) { if (t !== 'order') continue; const g = gid[alt]; if (!g) { console.warn('no agent ' + alt + ' for ' + key); continue; }
      await c.query(`DELETE FROM planner.commission_overrides WHERE order_ref=$1`, [key]);
      await c.query(`INSERT INTO planner.commission_overrides (order_ref, rep_group_id, rate, commissionable_amount, reason, created_by) VALUES ($1,$2,$3,$4,$5,'seed')`,
        [key, g, rate === '' ? null : Number(rate), amt === '' ? null : Number(amt), 'from the commission sheet (13-Oct-26)']); ov++; }
    await c.query('COMMIT'); console.log('Seeded: ' + ag + ' agents, ' + cr + ' customer rates, ' + ov + ' order overrides');
  } catch (e) { await c.query('ROLLBACK').catch(() => {}); console.error('Seed failed: ' + e.message); process.exitCode = 1; } finally { await c.end(); }
})();
