// v28.814 (Ben 13-Nov-26): SUPPLIER WEEKLY WRAP-UP. Pure functions: from the supplier portal's own data (portalBootstrapBuild = what the
// portal loads) and the home-page extras (/api/portal/home: new POs, profile prompts) build the Sunday email: "Needs your attention"
// (same rules and counts as the portal home page and menu badges), payments in the last 7 days and new purchase orders in the last 7 days.
// The action rules are ported 1:1 from supply/portal-view.js (poActionCount, sampActions, shipActCount, prodApprovalState, computeUnread,
// the profile prompts); when a portal rule changes, change it here too. Nothing here reads the database or sends anything.

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fdd = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? m[3] + '-' + MON[+m[2] - 1] + '-' + m[1].slice(2) : String(s || ''); };
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = n => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── ported portal rules (supply/portal-view.js) ──
const prodActionable = p => { const pn = parseInt(p && p.prod_no, 10); return !(isFinite(pn) && pn <= 54); };
const ppIsDtc = p => { const b = String(p && p.branch || '').toLowerCase(); return (b.indexOf('direct to client') >= 0 || b.indexOf('b2b jlew') >= 0 || b.indexOf('b2b next') >= 0) || String(p.sales_order_ref || '').trim() !== ''; };
const ppShipped = p => /ship|deliver|complete/i.test((p && p.status) || '') || (p && p.production_status) === 'shipped';
const dtcActionDue = p => ppIsDtc(p) && !(p && p.dtc_accepted_at) && !ppShipped(p);
const supEndOf = subs => { let v = ''; (subs || []).forEach(s => { if (s.kind === 'completion_date' && s.status !== 'dismissed' && s.value) v = s.value; }); return v; };
function prodStatusException(ps, start, end, today) { ps = ps || '';
  if ((ps === '' || ps === 'not_started') && start && start < today) return 'start';
  if (ps !== 'ready_to_ship' && ps !== 'shipped' && end && end < today) return 'end';
  return ''; }
const prodAttention = (ps, start, end, subs, today) => { const e = prodStatusException(ps, start, supEndOf(subs) || end || '', today); if (e) return e; return ps ? '' : 'unset'; };
function invoiceDue(p, subs, today) { subs = subs || []; const pn = parseInt(p.prod_no, 10); if (isFinite(pn) && pn < 57) return false;
  if (/future/i.test(p.status || '')) return false; if (subs.some(s => s.kind === 'invoice_value')) return false;
  if (p.final_invoice != null && p.final_invoice !== '' && Number(p.final_invoice) > 0 && p.final_payment_due) return false;
  if (String(p.production_status || '').toLowerCase() === 'shipped') return true;
  const eff = supEndOf(subs) || p.prod_end || ''; if (!eff) return false; return eff < today; }
const poCdVal = (p, subs) => supEndOf(subs) || (p && (p.prod_completion_date || p.completion_date)) || '';
const poCdMissing = (p, subs) => !!(p && p.require_confirmation) && p.production_status !== 'shipped' && !poCdVal(p, subs);
// one PO's open actions as labelled items (the portal counts the same items; poActionCount = items.length)
function poActionItems(p, D, today) { if (!prodActionable(p)) return []; const po = p.po, sb = (D.subsByPo && D.subsByPo[po]) || [], nts = (D.notesByPo && D.notesByPo[po]) || [];
  const out = [], unread = nts.filter(n => n.author_kind === 'internal' && !n.read).length;
  const cdS = String(p.crossdock_skus || '').split(',').map(s => s.trim()).filter(Boolean), xdm = (D.xdByPo && D.xdByPo[po]) || {};
  const xdReq = cdS.length > 0 && (/shipping/i.test(p.status || '') || (p.prod_end && p.prod_end < today)), xdMiss = cdS.filter(s => { const q = xdm[s]; return q == null || q === ''; }).length;
  if (p.require_confirmation && !p.supplier_confirmed) out.push('Confirm the PO');
  if (poCdMissing(p, sb)) out.push('Enter the production completion date');
  const pe = p.require_confirmation ? prodAttention(p.production_status, p.prod_start, p.prod_end, sb, today) : '';
  if (pe) out.push(pe === 'unset' ? 'Set your production status' : pe === 'start' ? 'Production start has passed: update your production status' : 'Completion date has passed: update your production status');
  if (dtcActionDue(p)) out.push('Approve the Direct to Client details');
  if (invoiceDue(p, sb, today)) out.push('Submit your invoice');
  if (xdReq && xdMiss > 0) out.push('Enter the crossdock quantities');
  if (unread) out.push(unread + ' unread message' + (unread > 1 ? 's' : '') + ' from Dock & Bay');
  return out; }
const sampActive = s => { const u = String(s.status_calc || s.status || '').toUpperCase(); return u !== 'CANCELLED' && u !== 'SHIPPED'; };
function sampItems(s, today) { const out = [], u = String(s.status || '').toLowerCase();
  if (sampActive(s) && !s.supplier_expected) out.push('Enter the expected completion date');
  if (sampActive(s) && !s.production_status) out.push('Set your production status');
  if (sampActive(s) && s.supplier_expected && s.supplier_expected < today && s.production_status === 'in_production') out.push('Expected date has passed: update the status');
  if (s.production_status === 'shipped' && !String(s.tracking_code || '').trim() && u !== 'cancelled' && u !== 'complete' && u !== 'completed') out.push('Add the tracking code');
  if (Number(s.unread_dnb) > 0) out.push(s.unread_dnb + ' unread message' + (s.unread_dnb > 1 ? 's' : ''));
  return out; }
function shipItems(s, D) { if (!s) return [];
  if (s.is_fob) { const subs = (D.subsByPo && D.subsByPo[s.master_po]) || []; const cdq = subs.filter(x => x.kind === 'completion_date'); const cd = cdq.length ? cdq[cdq.length - 1] : null;
    const out = []; if (!cd || cd.status === 'dismissed') out.push('Enter the production completion date');
    const un = ((D.notesByPo && D.notesByPo[s.master_po]) || []).filter(n => n.author_kind === 'internal' && !n.read).length; if (un) out.push(un + ' unread message' + (un > 1 ? 's' : ''));
    return out; }
  const out = []; if (Number(s.unread_dnb) > 0) out.push(s.unread_dnb + ' unread message' + (s.unread_dnb > 1 ? 's' : ''));
  if (String(s.status || '').toLowerCase() === 'shipping' && !String(s.carrier_ref || '').trim() && !s.flex_id && (D.pos || []).some(p => p.po === s.master_po)) out.push('Add the tracking code');
  return out; }
const CERT = { grs: 'GRS certificate', bsci: 'BSCI / SMETA audit', oeko: 'OEKO-TEX certificate', iso: 'ISO certificate', other: 'Licence' };
function profileItem(x) {
  if (x.kind === 'returned') return 'Dock & Bay sent your profile back: open it to see what needs changing';
  if (x.kind === 'draft') return 'Finish and submit your profile changes';
  if (x.kind === 'incomplete') return 'Complete your supplier profile';
  if (x.kind === 'warehouse') return 'Read and acknowledge the updated warehouse requirements';
  if (x.kind === 'cert_expired') return (CERT[x.cert] || 'Certificate') + ' expired ' + fdd(x.valid_to) + ': upload the renewed one';
  if (x.kind === 'cert_expiring') return (CERT[x.cert] || 'Certificate') + ' expires ' + fdd(x.valid_to) + ': upload the renewed one';
  return null; }   // in_review = no action

// D = portalBootstrapBuild(...) for the supplier, H = { new_pos (any window), profile } as /api/portal/home, opts { today, since (YYYY-MM-DD, 7 days ago) }
export function supplierWeekly(D, H, opts) {
  const today = opts.today, since = opts.since, pos = D.pos || [];
  const groups = [];   // { area, ref, link, items[] }
  pos.forEach(p => { const it = poActionItems(p, D, today); if (it.length) groups.push({ area: 'po', ref: p.po, items: it }); });
  (D.shipmentPlan || []).forEach(s => { const it = shipItems(s, D); if (it.length) groups.push({ area: 'shipment', ref: s.shipment_ref || s.master_po, items: it }); });
  (D.samples || []).forEach(s => { const it = sampItems(s, today); if (it.length) groups.push({ area: 'sample', ref: s.ref, items: it }); });
  if (D.productEnabled) (D.products || []).forEach(pr => { const it = []; if (Number(pr.dev_unaccepted) > 0) it.push('Accept the new development request'); if (Number(pr.unread_dnb) > 0) it.push(pr.unread_dnb + ' unread message' + (pr.unread_dnb > 1 ? 's' : '')); if (it.length) groups.push({ area: 'product', ref: pr.ref, items: it }); });
  const prof = ((H && H.profile) || []).map(profileItem).filter(Boolean);
  if (prof.length) groups.push({ area: 'profile', ref: 'Your supplier profile', items: prof });
  const actions = groups.reduce((a, g) => a + g.items.length, 0);
  const pays = (D.payments || []).filter(r => r.payment_date && String(r.payment_date).slice(0, 10) >= since)
    .map(r => ({ date: String(r.payment_date).slice(0, 10), ref: r.reference || r.po || r.description || '', type: r.payment_type || r.type || '', amount: Number(r.amount) || 0, run: r.payment_run_ref || '' }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount);
  const shown = {}; pos.forEach(p => { shown[p.po] = p; });
  const newPos = ((H && H.new_pos) || []).filter(x => shown[x.po] && String(x.created || '').slice(0, 10) >= since).map(x => { const p = shown[x.po];
    return { po: x.po, created: x.created, prod: p.prod_no || '', branch: p.branch || '', value: p.value_est != null ? Number(p.value_est) : (p.value != null ? Number(p.value) : null), confirm: !!(p.require_confirmation && !p.supplier_confirmed) }; });
  return { actions, groups, payments: pays, paid_total: Math.round(pays.reduce((a, r) => a + r.amount, 0) * 100) / 100, new_pos: newPos, empty: !actions && !pays.length && !newPos.length };
}

const AREA = { po: ['Purchase order', 'orders/pos'], shipment: ['Shipment', 'orders/shipmentplan'], sample: ['Sample', 'samples/samples'], product: ['Product', 'product/product'], profile: ['', ''] };   // portal hash = #/<section>/<tab>/<ref> (ppSetHash)
// The email (English with Chinese headings when zh). portalUrl = the portal's base URL.
export function supplierWeeklyHtml(name, W, opts) {
  const zh = !!opts.zh, cur = opts.currency || 'USD', url = String(opts.portalUrl || '').replace(/\/$/, ''), wk = fdd(opts.weekEnding);
  const T = (en, cn) => esc(en) + (zh && cn ? ' <span style="font-weight:400;color:#667085">' + cn + '</span>' : '');
  const link = (area, ref) => area === 'profile' ? url : url + '/#/' + AREA[area][1] + (ref ? '/' + encodeURIComponent(ref) : '');
  const th = 'text-align:left;padding:6px 8px;border-bottom:1px solid #e4e7ec;font-size:12px;color:#475467';
  const td = 'padding:6px 8px;border-bottom:1px solid #f2f4f7;vertical-align:top';
  const tile = (n, lbl, bg, fg) => '<td style="background:' + bg + ';border-radius:6px;padding:10px;text-align:center;width:33%"><div style="font-size:21px;font-weight:700;color:' + fg + '">' + n + '</div><div style="font-size:11px;color:#667085">' + lbl + '</div></td>';
  let h = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#101828;max-width:680px;line-height:1.45">'
    + '<div style="background:#0f2a4a;color:#fff;padding:16px 18px;border-radius:8px 8px 0 0"><div style="font-size:12px;opacity:.8">Dock &amp; Bay · ' + T('Weekly update', '每周更新') + '</div><div style="font-size:20px;font-weight:700;margin-top:2px">' + esc(name) + '</div><div style="font-size:12px;opacity:.8;margin-top:2px">Week ending ' + esc(wk) + '</div></div>'
    + '<div style="border:1px solid #e4e7ec;border-top:0;border-radius:0 0 8px 8px;padding:16px 18px">'
    + '<table style="width:100%;border-collapse:collapse;margin-bottom:16px"><tr>'
    + tile(W.actions, T('things need your attention', '待办事项'), W.actions ? '#fef2f2' : '#f2f4f7', W.actions ? '#b42318' : '#667085') + '<td style="width:8px"></td>'
    + tile(cur + ' ' + money(W.paid_total), T('paid in the last 7 days', '本周付款'), W.payments.length ? '#ecfdf3' : '#f2f4f7', W.payments.length ? '#027a48' : '#667085') + '<td style="width:8px"></td>'
    + tile(W.new_pos.length, T('new purchase orders', '新采购订单'), W.new_pos.length ? '#eff8ff' : '#f2f4f7', W.new_pos.length ? '#175cd3' : '#667085') + '</tr></table>';
  h += '<p style="margin:0 0 6px"><b>1. ' + T('Needs your attention', '需要您处理') + '</b></p>';
  if (W.groups.length) h += '<p style="margin:0 0 8px;font-size:12px;color:#667085">The same items your portal home page shows. Each link opens it in the portal.</p><table style="width:100%;border-collapse:collapse;font-size:13px"><tr style="background:#f9fafb"><th style="' + th + '">Item</th><th style="' + th + '">What is needed</th></tr>'
    + W.groups.map(g => '<tr><td style="' + td + ';white-space:nowrap"><a href="' + esc(link(g.area, g.ref)) + '" style="color:#175cd3">' + esc((AREA[g.area][0] ? AREA[g.area][0] + ' ' : '') + g.ref) + '</a></td><td style="' + td + '">' + g.items.map(esc).join('<br>') + '</td></tr>').join('') + '</table>';
  else h += '<p style="margin:0;font-size:13px;color:#667085">Nothing is waiting for you. Thank you!</p>';
  h += '<p style="margin:18px 0 6px"><b>2. ' + T('Payments in the last 7 days', '本周付款') + '</b></p>';
  if (W.payments.length) h += '<table style="width:100%;border-collapse:collapse;font-size:13px"><tr style="background:#f9fafb"><th style="' + th + '">Date</th><th style="' + th + '">Reference</th><th style="' + th + '">Type</th><th style="' + th + ';text-align:right">Amount (' + esc(cur) + ')</th></tr>'
    + W.payments.map(r => '<tr><td style="' + td + '">' + esc(fdd(r.date)) + '</td><td style="' + td + '">' + esc(r.ref) + '</td><td style="' + td + '">' + esc(r.type) + '</td><td style="' + td + ';text-align:right">' + money(r.amount) + '</td></tr>').join('')
    + '<tr><td colspan="3" style="padding:7px 8px"><b>Total</b></td><td style="padding:7px 8px;text-align:right"><b>' + money(W.paid_total) + '</b></td></tr></table><p style="margin:4px 0 0;font-size:12px;color:#667085">Remittance details are in the portal under Payments.</p>';
  else h += '<p style="margin:0;font-size:13px;color:#667085">No payments in the last 7 days.</p>';
  h += '<p style="margin:18px 0 6px"><b>3. ' + T('New purchase orders', '新采购订单') + '</b></p>';
  if (W.new_pos.length) h += '<table style="width:100%;border-collapse:collapse;font-size:13px"><tr style="background:#f9fafb"><th style="' + th + '">PO</th><th style="' + th + '">Raised</th><th style="' + th + '">Production</th><th style="' + th + '">Ship to</th><th style="' + th + ';text-align:right">Value (' + esc(cur) + ')</th></tr>'
    + W.new_pos.map(p => '<tr><td style="' + td + '"><a href="' + esc(link('po', p.po)) + '" style="color:#175cd3">' + esc(p.po) + '</a>' + (p.confirm ? ' <span style="font-size:11px;color:#b42318">please confirm</span>' : '') + '</td><td style="' + td + '">' + esc(fdd(p.created)) + '</td><td style="' + td + '">' + esc(p.prod) + '</td><td style="' + td + '">' + esc(p.branch) + '</td><td style="' + td + ';text-align:right">' + (p.value != null ? money(p.value) : '') + '</td></tr>').join('') + '</table>';
  else h += '<p style="margin:0;font-size:13px;color:#667085">No new purchase orders in the last 7 days.</p>';
  h += '<div style="margin-top:20px;text-align:center"><a href="' + esc(url) + '" style="display:inline-block;background:#175cd3;color:#fff;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:6px">' + T('Open the supplier portal', '打开供应商门户') + '</a></div>'
    + '<p style="margin:16px 0 0;font-size:11px;color:#98a2b3;text-align:center">Sent every Sunday by Dock &amp; Bay. Questions: reply to this email.</p></div></div>';
  return h;
}
