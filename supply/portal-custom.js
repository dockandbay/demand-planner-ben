// v28.504 (Ben 27-Oct-26): supplier portal tab ORDERS ▸ Custom orders. The Customiser's weekly Tuesday custom towel batches for this
// supplier: list, then one batch with its steps (1 accept or flag a problem, 2 line progress cut / stitched / packed, 3 first unit
// photo, 4 mark made, 5 cartons + DHL AWB), downloads (PO PDF, production zip, artwork per line) and the timeline.
// Data comes through HORIZON's proxy to the Customiser (server.mjs custProxy): /api/portal/custom/* for suppliers,
// /api/supply/custom-portal/<supplier>/* for the staff preview. Used by supply/portal.html and the CONFIG ▸ Portal preview in inject.html.
(function () {
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fd(v) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || '')); return m ? m[3] + '-' + MON[+m[2] - 1] + '-' + m[1].slice(2) : ''; }
  function fdt(v) { var d = new Date(v); if (!v || isNaN(d.getTime())) return fd(v); function p(n) { return (n < 10 ? '0' : '') + n; } return p(d.getDate()) + '-' + MON[d.getMonth()] + '-' + String(d.getFullYear()).slice(2) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); }
  var STATUS = { sent: ['To accept', 'amber'], confirmed: ['In production', 'blue'], made: ['Made: enter cartons', 'violet'], shipped: ['Shipped', 'pos'], closed: ['Closed', 'mut'] };
  var CSS = '.hzc{display:grid;gap:12px}.hzc table{border-collapse:collapse;width:100%;font-size:13px}.hzc th,.hzc td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line,#e5e9f0);vertical-align:top}'
    + '.hzc th{font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted,#5b6b83);font-weight:600}.hzc tr.hzc-row{cursor:pointer}.hzc tr.hzc-row:hover td{background:var(--hover,#f7f9fc)}'
    + '.hzc-card{background:var(--card,#fff);border:1px solid var(--line,#e5e9f0);border-radius:10px;padding:12px 14px;display:grid;gap:8px}.hzc-card h3{margin:0;font-size:14px}'
    + '.hzc-pill{display:inline-block;padding:1px 8px;border-radius:999px;font-size:11px;font-weight:600;white-space:nowrap}.hzc-amber{background:var(--amber-bg,#fdf3d7);color:var(--amber,#b45309)}'
    + '.hzc-blue{background:var(--blue-soft,#eaf1fd);color:var(--blue-ink,#1a4fb5)}.hzc-violet{background:var(--violet-bg,#f1ebfc);color:var(--violet,#7048c9)}.hzc-pos{background:var(--pos-bg,#e8f6ee);color:var(--pos,#118a4e)}'
    + '.hzc-mut{background:var(--line2,#eef1f6);color:var(--muted,#5b6b83)}.hzc-neg{background:var(--neg-bg,#fdeeec);color:var(--neg,#d23227)}.hzc-row2{display:flex;gap:8px;flex-wrap:wrap;align-items:center}'
    + '.hzc-btn{border:1px solid var(--line,#e5e9f0);background:var(--card,#fff);border-radius:7px;padding:5px 11px;font:inherit;font-size:13px;cursor:pointer;color:var(--ink,#101828);text-decoration:none}'
    + '.hzc-btn.pri{background:var(--blue,#2361d8);border-color:var(--blue,#2361d8);color:#fff}.hzc-btn:disabled{opacity:.5;cursor:default}.hzc input,.hzc textarea{font:inherit;font-size:13px;border:1px solid var(--line,#e5e9f0);border-radius:6px;padding:4px 6px;background:var(--card,#fff);color:var(--ink,#101828)}'
    + '.hzc-msg{font-size:12px;color:var(--muted,#5b6b83)}.hzc-msg.err{color:var(--neg,#d23227)}.hzc-step{font-size:11px;font-weight:700;color:var(--faint,#8b98ad);letter-spacing:.05em;text-transform:uppercase}.hzc-scroll{overflow-x:auto}'
    + '.hzc-done{color:var(--pos,#118a4e);font-weight:600}.hzc-mut2{color:var(--muted,#5b6b83);font-size:12px}';
  function pill(cls, t) { return '<span class="hzc-pill hzc-' + cls + '">' + esc(t) + '</span>'; }
  function statusPill(b) { if (b.supplier_status === 'problem') return pill('neg', 'Problem flagged'); var s = STATUS[b.status] || [b.status, 'mut']; return pill(s[1], s[0]); }

  // opts: { base: '/api/portal/custom/' (ends with /), canWrite: bool, onCount: fn(n) }
  function render(host, opts) {
    var base = opts.base, ST = { list: null, open: null, flagLabel: {} };
    if (!document.getElementById('hzc-css')) { var st = document.createElement('style'); st.id = 'hzc-css'; st.textContent = CSS; document.head.appendChild(st); }
    function api(path, body) {
      return fetch(base + path, body === undefined ? { headers: { accept: 'application/json' } } : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || j.error) throw new Error(j.error || ('HTTP ' + r.status)); return j; }); });
    }
    function loadList() {
      host.innerHTML = '<div class="hzc"><div class="hzc-msg">Loading custom orders…</div></div>';
      api('batches').then(function (j) { ST.list = j.batches || []; ST.flagLabel = j.flag_label || {}; ST.example = j.example; drawList(); })
        .catch(function (e) { host.innerHTML = '<div class="hzc"><div class="hzc-msg err">' + esc(e.message) + '</div></div>'; });
    }
    function drawList() {
      var L = ST.list, todo = L.filter(function (b) { return b.status === 'sent' || b.status === 'confirmed' || (b.status === 'made' && b.n_awb < Math.max(1, b.n_cartons)); }).length;
      if (opts.onCount) opts.onCount(todo);
      var h = '<div class="hzc"><div class="hzc-card"><h3>Custom orders</h3><div class="hzc-mut2">Personalised towels from the Dock &amp; Bay Customiser. A new batch arrives every Tuesday: accept it by Wednesday, make it within the week (by the due Tuesday), then enter the cartons with their DHL AWB.' + (ST.example ? ' <b>These are example batches for testing.</b>' : '') + '</div></div>';
      if (!L.length) { host.innerHTML = h + '<div class="hzc-msg">No custom order batches yet.</div></div>'; return; }
      h += '<div class="hzc-card hzc-scroll"><table><thead><tr><th>PO</th><th>Tuesday</th><th>Accept by</th><th>Made by</th><th>Lines</th><th>Towels</th><th>Progress</th><th>Cartons</th><th>Status</th></tr></thead><tbody>';
      L.forEach(function (b) {
        var flags = (b.flags || []).map(function (f) { return pill('neg', ST.flagLabel[f] || f); }).join(' ');
        h += '<tr class="hzc-row" data-id="' + esc(b.id) + '"><td><b>' + esc(b.po_ref) + '</b><div class="hzc-mut2">' + esc(b.node_name || b.node) + '</div></td><td>' + fd(b.batch_date) + '</td><td>' + fd(b.accept_by) + '</td><td>' + fd(b.due_date) + '</td>'
          + '<td>' + (b.n_lines || 0) + '</td><td>' + (b.n_units || 0) + '</td><td>' + (b.n_lines_packed || 0) + ' of ' + (b.n_lines || 0) + ' packed' + (b.photo_id ? ' · photo' : '') + '</td>'
          + '<td>' + (b.n_cartons ? b.n_cartons + ' (' + (b.n_awb || 0) + ' with AWB)' : '') + '</td><td>' + statusPill(b) + (flags ? '<div>' + flags + '</div>' : '') + '</td></tr>';
      });
      host.innerHTML = h + '</tbody></table></div></div>';
      host.querySelectorAll('tr.hzc-row').forEach(function (tr) { tr.onclick = function () { openBatch(tr.dataset.id); }; });
    }
    function openBatch(id) {
      host.innerHTML = '<div class="hzc"><div class="hzc-msg">Loading the batch…</div></div>';
      api('batches/' + id).then(function (j) { ST.open = j.batch; ST.stages = j.stages || ['cut', 'stitched', 'packed']; ST.flagLabel = j.flag_label || ST.flagLabel; drawBatch(); })
        .catch(function (e) { host.innerHTML = '<div class="hzc"><button class="hzc-btn" data-back>Back to custom orders</button><div class="hzc-msg err">' + esc(e.message) + '</div></div>'; host.querySelector('[data-back]').onclick = loadList; });
    }
    function act(path, body, btn, msgEl) {
      if (!opts.canWrite) { if (msgEl) { msgEl.className = 'hzc-msg err'; msgEl.textContent = 'Read only: SUPPLY edit rights are needed to change this in the preview.'; } return; }
      if (btn) btn.disabled = true; if (msgEl) { msgEl.className = 'hzc-msg'; msgEl.textContent = 'Saving…'; }
      api('batches/' + ST.open.id + '/' + path, body || {}).then(function () { openBatch(ST.open.id); })
        .catch(function (e) { if (btn) btn.disabled = false; if (msgEl) { msgEl.className = 'hzc-msg err'; msgEl.textContent = e.message; } });
    }
    function drawBatch() {
      var b = ST.open, accepted = b.supplier_status === 'accepted', made = ['made', 'shipped', 'closed'].indexOf(b.status) >= 0, prog = b.progress || {}, ro = !opts.canWrite;
      var dl = base + 'batches/' + b.id;
      var h = '<div class="hzc"><div class="hzc-row2"><button class="hzc-btn" data-back>Back to custom orders</button><b>' + esc(b.po_ref) + '</b>' + statusPill(b)
        + (b.flags || []).map(function (f) { return pill('neg', ST.flagLabel[f] || f); }).join(' ') + '<span class="hzc-mut2">Tuesday ' + fd(b.batch_date) + ' · accept by ' + fd(b.accept_by) + ' · made by ' + fd(b.due_date) + '</span></div>';
      h += '<div class="hzc-card"><h3>Documents</h3><div class="hzc-row2"><a class="hzc-btn" href="' + dl + '/po">PO (PDF)</a><a class="hzc-btn" href="' + dl + '/production">Production files (zip)</a>'
        + (b.lines || []).map(function (l, i) { return '<a class="hzc-btn" href="' + dl + '/artwork?line=' + encodeURIComponent(l.id) + '">Artwork line ' + (i + 1) + '</a>'; }).join('') + '</div><div class="hzc-mut2">The zip holds the print-ready file for every towel (true size, bleed, margin QR), pouch labels and the PO.</div></div>';
      // 1 accept / problem
      h += '<div class="hzc-card"><div class="hzc-step">Step 1</div><h3>Accept the batch</h3>';
      if (accepted) h += '<div class="hzc-done">Accepted ' + fdt(b.accepted_at) + (b.accepted_by ? ' by ' + esc(b.accepted_by) : '') + '</div>';
      else if (['sent', 'confirmed'].indexOf(b.status) >= 0) h += (b.supplier_status === 'problem' ? '<div class="hzc-msg err">Problem flagged: ' + esc(b.problem_reason) + '</div>' : '')
        + '<div class="hzc-row2"><button class="hzc-btn pri" data-accept' + (ro ? ' disabled' : '') + '>Accept</button><input data-reason placeholder="Or describe a problem" style="flex:1;min-width:200px"><button class="hzc-btn" data-problem' + (ro ? ' disabled' : '') + '>Flag a problem</button></div><div class="hzc-msg" data-m1></div>';
      else h += '<div class="hzc-mut2">Nothing to accept.</div>';
      h += '</div>';
      // 2 lines
      h += '<div class="hzc-card hzc-scroll"><div class="hzc-step">Step 2</div><h3>Line progress</h3><table><thead><tr><th>#</th><th>Order</th><th>Towel</th><th>Design</th><th>Qty</th><th>Unit refs</th><th>Stage</th></tr></thead><tbody>';
      (b.lines || []).forEach(function (l, i) {
        var cur = prog[l.id] || '', ix = ST.stages.indexOf(cur), next = ST.stages[ix + 1];
        var btn = (!made && accepted && next && !ro) ? '<button class="hzc-btn" data-stage="' + esc(next) + '" data-line="' + esc(l.id) + '">Mark ' + esc(next) + '</button>' : '';
        h += '<tr><td>' + (i + 1) + '</td><td>' + esc(l.external_ref || '') + '<div class="hzc-mut2">' + esc(l.market || '') + (l.via_node ? ' via ' + esc(l.via_node) : '') + '</div></td><td>' + esc(l.product_name || l.product_code) + '</td><td>' + esc(l.design || '') + '</td><td>' + (l.qty || 0) + '</td>'
          + '<td class="hzc-mut2">' + esc((l.units || []).map(function (u) { return u.ref; }).join(' ')) + '</td><td>' + (cur ? '<span class="' + (cur === 'packed' ? 'hzc-done' : '') + '">' + esc(cur) + '</span> ' : '<span class="hzc-mut2">not started</span> ') + btn + '</td></tr>';
      });
      h += '</tbody></table>' + (accepted ? '' : '<div class="hzc-mut2">Accept the batch first.</div>') + '<div class="hzc-msg" data-m2></div></div>';
      // 3 photo
      h += '<div class="hzc-card"><div class="hzc-step">Step 3</div><h3>Photo of the first unit</h3>';
      var photos = (b.files || []).filter(function (f) { return f.kind === 'first_unit_photo'; });
      if (photos.length) h += '<div class="hzc-row2">' + photos.map(function (f) { return '<a href="' + base + 'files/' + esc(f.id) + '" target="_blank" rel="noopener"><img src="' + base + 'files/' + esc(f.id) + '" alt="first unit photo" style="height:90px;border-radius:6px;border:1px solid var(--line,#e5e9f0)"></a>'; }).join('') + '</div>';
      if (!made && accepted && !ro) h += '<div class="hzc-row2"><input type="file" accept="image/jpeg,image/png,image/webp" data-photo><input data-uref placeholder="Unit ref (optional)" style="width:130px"><button class="hzc-btn" data-upload>Upload</button></div><div class="hzc-mut2">JPEG, PNG or WebP, under 8 MB.</div>';
      h += '<div class="hzc-msg" data-m3></div></div>';
      // 4 made
      h += '<div class="hzc-card"><div class="hzc-step">Step 4</div><h3>Mark made</h3>';
      if (made) h += '<div class="hzc-done">Made ' + fdt(b.made_at) + (b.made_by ? ' by ' + esc(b.made_by) : '') + '</div>';
      else h += '<div class="hzc-row2"><button class="hzc-btn pri" data-made' + ((!accepted || ro) ? ' disabled' : '') + '>Mark the batch made</button><span class="hzc-mut2">Needs every line packed and the first unit photo.</span></div>';
      h += '<div class="hzc-msg" data-m4></div></div>';
      // 5 cartons
      var cs = (b.cartons || []).length ? b.cartons.map(function (c) { return { weight_kg: c.weight_kg, length_cm: c.length_cm, width_cm: c.width_cm, height_cm: c.height_cm, awb: c.awb || '' }; }) : [{ weight_kg: '', length_cm: '', width_cm: '', height_cm: '', awb: '' }];
      ST.cartons = cs;
      h += '<div class="hzc-card hzc-scroll"><div class="hzc-step">Step 5</div><h3>Cartons and DHL AWB</h3>';
      if (!made) h += '<div class="hzc-mut2">Mark the batch made first.</div>';
      else {
        h += '<table><thead><tr><th>#</th><th>Weight (kg)</th><th>Length (cm)</th><th>Width (cm)</th><th>Height (cm)</th><th>DHL AWB (10 digits)</th></tr></thead><tbody data-ctn>' + cartonRows(cs, b.status === 'closed' || ro) + '</tbody></table>';
        if (b.status !== 'closed' && !ro) h += '<div class="hzc-row2"><button class="hzc-btn" data-addc>Add a carton</button><button class="hzc-btn pri" data-savec>Save cartons</button><span class="hzc-mut2">When every carton has an AWB the batch is shipped and the customers are told.</span></div>';
      }
      h += '<div class="hzc-msg" data-m5></div></div>';
      // timeline
      if ((b.timeline || []).length) h += '<div class="hzc-card"><h3>Timeline</h3>' + b.timeline.slice(0, 30).map(function (t) { return '<div class="hzc-mut2">' + fdt(t.at) + ' · ' + esc(t.type) + (t.actor ? ' · ' + esc(t.actor) : '') + '</div>'; }).join('') + '</div>';
      host.innerHTML = h + '</div>';
      wire();
    }
    function cartonRows(cs, ro) {
      return cs.map(function (c, i) { function inp(k, w) { return '<input data-c="' + i + '" data-k="' + k + '" value="' + esc(c[k] == null ? '' : c[k]) + '" style="width:' + w + 'px"' + (ro ? ' disabled' : '') + '>'; }
        return '<tr><td>' + (i + 1) + '</td><td>' + inp('weight_kg', 70) + '</td><td>' + inp('length_cm', 70) + '</td><td>' + inp('width_cm', 70) + '</td><td>' + inp('height_cm', 70) + '</td><td>' + inp('awb', 120) + '</td></tr>'; }).join('');
    }
    function q(sel) { return host.querySelector(sel); }
    function wire() {
      q('[data-back]').onclick = loadList;
      var a = q('[data-accept]'); if (a) a.onclick = function () { act('respond', { decision: 'accept' }, a, q('[data-m1]')); };
      var p = q('[data-problem]'); if (p) p.onclick = function () { var r = (q('[data-reason]').value || '').trim(); if (r.length < 3) { var m = q('[data-m1]'); m.className = 'hzc-msg err'; m.textContent = 'Say what the problem is.'; return; } act('respond', { decision: 'problem', note: r }, p, q('[data-m1]')); };
      host.querySelectorAll('[data-stage]').forEach(function (bt) { bt.onclick = function () { act('lines', { line_id: bt.dataset.line, stage: bt.dataset.stage }, bt, q('[data-m2]')); }; });
      var up = q('[data-upload]'); if (up) up.onclick = function () { var f = q('[data-photo]').files[0], m = q('[data-m3]'); if (!f) { m.className = 'hzc-msg err'; m.textContent = 'Choose a photo.'; return; }
        if (f.size > 8 * 1024 * 1024) { m.className = 'hzc-msg err'; m.textContent = 'The photo must be under 8 MB.'; return; }
        var rd = new FileReader(); rd.onload = function () { act('photo', { data_base64: String(rd.result).replace(/^data:[^,]*,/, ''), mime: f.type, filename: f.name, unit_ref: q('[data-uref]').value || null }, up, m); }; rd.readAsDataURL(f); };
      var md = q('[data-made]'); if (md) md.onclick = function () { act('made', {}, md, q('[data-m4]')); };
      var ad = q('[data-addc]'); if (ad) ad.onclick = function () { readCartons(); ST.cartons.push({ weight_kg: '', length_cm: '', width_cm: '', height_cm: '', awb: '' }); q('[data-ctn]').innerHTML = cartonRows(ST.cartons, false); };
      var sv = q('[data-savec]'); if (sv) sv.onclick = function () { readCartons(); act('cartons', { cartons: ST.cartons }, sv, q('[data-m5]')); };
    }
    function readCartons() { host.querySelectorAll('[data-c]').forEach(function (i) { var c = ST.cartons[+i.dataset.c]; if (c) c[i.dataset.k] = i.value.trim(); }); }
    loadList();
  }
  // Ask whether this supplier has custom orders; cb(status) only when linked.
  function status(base, cb) { fetch(base + 'status', { headers: { accept: 'application/json' } }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j && j.linked) cb(j); }).catch(function () {}); }
  window.HZCustomOrders = { render: render, status: status };
})();
